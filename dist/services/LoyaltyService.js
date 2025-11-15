"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("../db/postgres"));
const innova_campaigns_service_1 = __importDefault(require("./provider/innova-campaigns.service"));
class LoyaltyService {
    /**
     * Initialize player loyalty account
     */
    async initializePlayerLoyalty(userId) {
        // Check if already exists
        const existing = await postgres_1.default.query('SELECT id FROM player_loyalty WHERE user_id = $1', [userId]);
        if (existing.rows.length > 0) {
            return existing.rows[0];
        }
        // Get the starter tier (lowest points_required)
        const starterTier = await postgres_1.default.query('SELECT id FROM loyalty_tiers ORDER BY points_required ASC LIMIT 1');
        if (starterTier.rows.length === 0) {
            throw new Error('No loyalty tiers configured');
        }
        const result = await postgres_1.default.query(`INSERT INTO player_loyalty (user_id, tier_id, available_points, lifetime_points)
       VALUES ($1, $2, 0, 0)
       RETURNING *`, [userId, starterTier.rows[0].id]);
        return result.rows[0];
    }
    /**
     * Get player loyalty details
     */
    async getPlayerLoyalty(userId) {
        const result = await postgres_1.default.query(`SELECT pl.*, lt.name as tier_name, lt.points_required as tier_min_points,
              lt.icon_url as tier_icon, lt.color as tier_color, lt.benefits,
              lt.cashback_percentage, lt.bonus_multiplier
       FROM player_loyalty pl
       JOIN loyalty_tiers lt ON pl.tier_id = lt.id
       WHERE pl.user_id = $1`, [userId]);
        if (result.rows.length === 0) {
            // Initialize if doesn't exist
            return await this.initializePlayerLoyalty(userId);
        }
        return result.rows[0];
    }
    /**
     * Add loyalty points to player
     */
    async addPoints(userId, points, reason, referenceId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get or create player loyalty
            let playerLoyalty = await client.query('SELECT * FROM player_loyalty WHERE user_id = $1 FOR UPDATE', [userId]);
            if (playerLoyalty.rows.length === 0) {
                await this.initializePlayerLoyalty(userId);
                playerLoyalty = await client.query('SELECT * FROM player_loyalty WHERE user_id = $1 FOR UPDATE', [userId]);
            }
            const currentPlayer = playerLoyalty.rows[0];
            const newPoints = currentPlayer.available_points + points;
            const newLifetimePoints = currentPlayer.lifetime_points + points;
            // Update player points
            await client.query(`UPDATE player_loyalty
         SET available_points = $1, lifetime_points = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`, [newPoints, newLifetimePoints, userId]);
            // Record transaction
            await client.query(`INSERT INTO loyalty_point_transactions (user_id, points, transaction_type, reason, reference_id)
         VALUES ($1, $2, 'EARNED', $3, $4)`, [userId, points, reason, referenceId]);
            // Check for tier upgrade
            const newTier = await client.query(`SELECT id FROM loyalty_tiers
         WHERE points_required <= $1
         ORDER BY points_required DESC
         LIMIT 1`, [newLifetimePoints]);
            if (newTier.rows.length > 0 && newTier.rows[0].id !== currentPlayer.tier_id) {
                await client.query('UPDATE player_loyalty SET tier_id = $1 WHERE user_id = $2', [newTier.rows[0].id, userId]);
            }
            await client.query('COMMIT');
            return {
                success: true,
                newPoints,
                newLifetimePoints,
                pointsAdded: points
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Deduct loyalty points from player
     */
    async deductPoints(userId, points, reason, referenceId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const playerLoyalty = await client.query('SELECT * FROM player_loyalty WHERE user_id = $1 FOR UPDATE', [userId]);
            if (playerLoyalty.rows.length === 0) {
                throw new Error('Player loyalty account not found');
            }
            const currentPlayer = playerLoyalty.rows[0];
            if (currentPlayer.available_points < points) {
                throw new Error('Insufficient loyalty points');
            }
            const newPoints = currentPlayer.available_points - points;
            await client.query(`UPDATE player_loyalty
         SET available_points = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`, [newPoints, userId]);
            // Record transaction
            await client.query(`INSERT INTO loyalty_point_transactions (user_id, points, transaction_type, reason, reference_id)
         VALUES ($1, $2, 'SPENT', $3, $4)`, [userId, -points, reason, referenceId]);
            await client.query('COMMIT');
            return {
                success: true,
                newPoints,
                pointsDeducted: points
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all loyalty tiers
     */
    async getAllTiers() {
        const result = await postgres_1.default.query('SELECT * FROM loyalty_tiers ORDER BY min_points ASC');
        return result.rows;
    }
    /**
     * Create loyalty tier (Admin)
     */
    async createTier(tier) {
        const result = await postgres_1.default.query(`INSERT INTO loyalty_tiers (
        name, points_required, icon_url, color, benefits, cashback_percentage, bonus_multiplier, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`, [
            tier.name,
            tier.min_points,
            tier.icon || null,
            tier.color || null,
            JSON.stringify(tier.benefits),
            tier.cashback_percentage || 0,
            tier.bonus_multiplier || 1,
            tier.priority
        ]);
        return result.rows[0];
    }
    /**
     * Update loyalty tier (Admin)
     */
    async updateTier(tierId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(key === 'benefits' && typeof value === 'object' ? JSON.stringify(value) : value);
                paramIndex++;
            }
        });
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(tierId);
        const result = await postgres_1.default.query(`UPDATE loyalty_tiers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    /**
     * Get all shop items
     */
    async getShopItems(status, category) {
        let query = 'SELECT * FROM loyalty_shop_items WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (status) {
            // Map status to is_active boolean
            const isActive = status === 'ACTIVE' || status === 'active';
            query += ` AND is_active = $${paramIndex}`;
            params.push(isActive);
            paramIndex++;
        }
        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        query += ' ORDER BY points_cost ASC';
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Get shop item by ID
     */
    async getShopItemById(itemId) {
        const result = await postgres_1.default.query('SELECT * FROM loyalty_shop_items WHERE id = $1', [itemId]);
        return result.rows[0];
    }
    /**
     * Create shop item (Admin)
     */
    async createShopItem(item) {
        const rewardData = item.reward_amount ? { amount: item.reward_amount } : null;
        const isActive = item.status === 'ACTIVE';
        const result = await postgres_1.default.query(`INSERT INTO loyalty_shop_items (
        name, description, image_url, points_cost, type, reward_data,
        stock, max_per_user, is_active, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`, [
            item.name,
            item.description,
            item.image_url || null,
            item.cost_points,
            item.reward_type,
            rewardData ? JSON.stringify(rewardData) : null,
            item.stock_quantity || null,
            item.max_per_user || null,
            isActive,
            item.category || null
        ]);
        return result.rows[0];
    }
    /**
     * Update shop item (Admin)
     */
    async updateShopItem(itemId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(itemId);
        const result = await postgres_1.default.query(`UPDATE loyalty_shop_items SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    /**
     * Purchase shop item with loyalty points
     */
    async purchaseShopItem(userId, itemId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get shop item
            const itemResult = await client.query('SELECT * FROM loyalty_shop_items WHERE id = $1 FOR UPDATE', [itemId]);
            if (itemResult.rows.length === 0) {
                throw new Error('Shop item not found');
            }
            const item = itemResult.rows[0];
            if (!item.is_active) {
                throw new Error('Item is not available for purchase');
            }
            // Check stock
            if (item.stock !== null && item.stock <= 0) {
                throw new Error('Item is out of stock');
            }
            // Check max per user
            if (item.max_per_user !== null) {
                const purchaseCount = await client.query('SELECT COUNT(*) as count FROM loyalty_shop_purchases WHERE user_id = $1 AND item_id = $2', [userId, itemId]);
                if (parseInt(purchaseCount.rows[0].count) >= item.max_per_user) {
                    throw new Error('Maximum purchase limit reached for this item');
                }
            }
            // Get player loyalty
            const playerResult = await client.query('SELECT * FROM player_loyalty WHERE user_id = $1 FOR UPDATE', [userId]);
            if (playerResult.rows.length === 0) {
                throw new Error('Player loyalty account not found');
            }
            const player = playerResult.rows[0];
            if (player.available_points < item.points_cost) {
                throw new Error('Insufficient loyalty points');
            }
            // Deduct points
            await client.query('UPDATE player_loyalty SET available_points = available_points - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [item.points_cost, userId]);
            // Record transaction
            await client.query(`INSERT INTO loyalty_point_transactions (user_id, points, transaction_type, reason, reference_id)
         VALUES ($1, $2, 'SPENT', $3, $4)`, [userId, -item.points_cost, `Purchased: ${item.name}`, `shop_item_${itemId}`]);
            // Decrease stock if applicable
            if (item.stock !== null) {
                await client.query('UPDATE loyalty_shop_items SET stock = stock - 1 WHERE id = $1', [itemId]);
                // Auto-mark as out of stock if quantity reaches 0
                const updatedItem = await client.query('SELECT stock FROM loyalty_shop_items WHERE id = $1', [itemId]);
                if (updatedItem.rows[0].stock === 0) {
                    await client.query("UPDATE loyalty_shop_items SET is_active = false WHERE id = $1", [itemId]);
                }
            }
            // Create purchase record
            const purchaseResult = await client.query(`INSERT INTO loyalty_shop_purchases (user_id, item_id, points_spent, status)
         VALUES ($1, $2, $3, 'PENDING')
         RETURNING *`, [userId, itemId, item.points_cost]);
            // Apply reward based on type
            const rewardData = item.reward_data || {};
            if (item.type === 'CASH' && rewardData.amount) {
                await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [rewardData.amount, userId]);
                await client.query("UPDATE loyalty_shop_purchases SET status = 'COMPLETED' WHERE id = $1", [purchaseResult.rows[0].id]);
            }
            else if (item.type === 'BONUS' && rewardData.amount) {
                await client.query('UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2', [rewardData.amount, userId]);
                await client.query("UPDATE loyalty_shop_purchases SET status = 'COMPLETED' WHERE id = $1", [purchaseResult.rows[0].id]);
            }
            else if (item.type === 'FREE_SPINS' && rewardData.amount) {
                // Create Innova campaign for free spins
                await this.grantFreeSpinsCampaign(client, userId, item.id, rewardData.amount);
                await client.query("UPDATE loyalty_shop_purchases SET status = 'COMPLETED' WHERE id = $1", [purchaseResult.rows[0].id]);
            }
            // PHYSICAL items would remain PENDING for manual fulfillment
            await client.query('COMMIT');
            return {
                success: true,
                purchase: purchaseResult.rows[0],
                item: {
                    name: item.name,
                    reward_type: item.type,
                    reward_amount: rewardData.amount
                }
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get player's purchase history
     */
    async getPlayerPurchases(userId) {
        const result = await postgres_1.default.query(`SELECT lsp.*, lsi.name, lsi.description, lsi.reward_type, lsi.reward_amount
       FROM loyalty_shop_purchases lsp
       JOIN loyalty_shop_items lsi ON lsp.item_id = lsi.id
       WHERE lsp.user_id = $1
       ORDER BY lsp.created_at DESC`, [userId]);
        return result.rows;
    }
    /**
     * Get player's loyalty point transactions
     */
    async getPlayerTransactions(userId, limit = 50) {
        const result = await postgres_1.default.query(`SELECT * FROM loyalty_point_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`, [userId, limit]);
        return result.rows;
    }
    /**
     * Get loyalty leaderboard
     */
    async getLeaderboard(limit = 100) {
        const result = await postgres_1.default.query(`SELECT pl.user_id, pl.points, pl.lifetime_points, lt.name as tier_name,
              u.username, u.email
       FROM player_loyalty pl
       JOIN loyalty_tiers lt ON pl.tier_id = lt.id
       JOIN users u ON pl.user_id = u.id
       ORDER BY pl.lifetime_points DESC
       LIMIT $1`, [limit]);
        return result.rows;
    }
    /**
     * Grant free spins campaign through Innova API
     * Called when redeeming a FREE_SPINS loyalty shop item
     */
    async grantFreeSpinsCampaign(client, userId, shopItemId, freespinsCount) {
        try {
            console.log(`[LOYALTY] Granting free spins campaign for user ${userId}, shop item ${shopItemId}`);
            // Get user's currency
            const userResult = await client.query('SELECT currency FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }
            const currency = userResult.rows[0].currency || 'USD';
            // Default configuration for free spins
            // TODO: Make this configurable per shop item
            const defaultVendor = '100hp';
            const defaultGameId = 1073; // Hilo game
            const defaultBetAmount = 0.20; // $0.20 per spin
            // Generate unique campaign code
            const campaignCode = innova_campaigns_service_1.default.generateCampaignCode('loyalty', shopItemId, userId);
            // Calculate timestamps
            const beginsAt = innova_campaigns_service_1.default.getCurrentTimestamp();
            const expiresAt = innova_campaigns_service_1.default.getDefaultExpiryTimestamp(24); // 24 hours
            // Create campaign in Innova
            await innova_campaigns_service_1.default.createCampaign({
                vendor: defaultVendor,
                campaign_code: campaignCode,
                currency_code: currency,
                freespins_per_player: freespinsCount,
                begins_at: beginsAt,
                expires_at: expiresAt,
                games: [
                    {
                        game_id: defaultGameId,
                        total_bet: defaultBetAmount
                    }
                ],
                players: [userId.toString()]
            });
            console.log(`[LOYALTY] Innova campaign created: ${campaignCode}`);
            // Save campaign in database
            await client.query(`INSERT INTO user_free_spins_campaigns (
          user_id, campaign_code, source, source_id,
          vendor, game_id, currency_code,
          freespins_total, freespins_remaining,
          total_bet_amount, status,
          begins_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, to_timestamp($12), to_timestamp($13))`, [
                userId,
                campaignCode,
                'loyalty',
                shopItemId,
                defaultVendor,
                defaultGameId,
                currency,
                freespinsCount,
                freespinsCount, // freespins_remaining starts at total
                defaultBetAmount * freespinsCount, // total_bet_amount
                'pending',
                beginsAt,
                expiresAt
            ]);
            console.log(`[LOYALTY] Free spins campaign saved to database for user ${userId}`);
        }
        catch (error) {
            console.error(`[LOYALTY] Error granting free spins campaign:`, error.message);
            throw new Error(`Failed to grant free spins: ${error.message}`);
        }
    }
}
exports.default = new LoyaltyService();
