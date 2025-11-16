"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("../db/postgres"));
const innova_campaigns_service_1 = __importDefault(require("./provider/innova-campaigns.service"));
class ChallengesService {
    /**
     * Create a new challenge template
     */
    async createTemplate(template) {
        const result = await postgres_1.default.query(`INSERT INTO challenge_templates (
        name, description, type, target_value, reward_type, reward_value,
        duration_hours, game_ids, min_bet, status, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [
            template.name,
            template.description,
            template.type,
            template.target_value,
            template.reward_type,
            template.reward_amount,
            template.duration_hours || null,
            template.game_ids ? JSON.stringify(template.game_ids) : null,
            template.min_bet || null,
            template.status,
            template.priority
        ]);
        return result.rows[0];
    }
    /**
     * Get all challenge templates
     */
    async getAllTemplates(status) {
        let query = 'SELECT * FROM challenge_templates';
        const params = [];
        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }
        query += ' ORDER BY priority DESC, created_at DESC';
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Get challenge template by ID
     */
    async getTemplateById(templateId) {
        const result = await postgres_1.default.query('SELECT * FROM challenge_templates WHERE id = $1', [templateId]);
        return result.rows[0];
    }
    /**
     * Update challenge template
     */
    async updateTemplate(templateId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(key === 'game_ids' && Array.isArray(value) ? JSON.stringify(value) : value);
                paramIndex++;
            }
        });
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(templateId);
        const result = await postgres_1.default.query(`UPDATE challenge_templates SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    /**
     * Delete challenge template
     */
    async deleteTemplate(templateId) {
        const result = await postgres_1.default.query('DELETE FROM challenge_templates WHERE id = $1', [templateId]);
        return result.rowCount > 0;
    }
    /**
     * Assign challenge to player
     */
    async assignChallengeToPlayer(userId, templateId) {
        // Check if template exists and is active
        const template = await this.getTemplateById(templateId);
        if (!template) {
            throw new Error('Challenge template not found');
        }
        if (template.status !== 'ACTIVE') {
            throw new Error('Challenge template is not active');
        }
        // Check if player already has this challenge active
        const existingChallenge = await postgres_1.default.query(`SELECT id FROM player_challenges
       WHERE user_id = $1 AND template_id = $2 AND status = 'ACTIVE'`, [userId, templateId]);
        if (existingChallenge.rows.length > 0) {
            throw new Error('Player already has this challenge active');
        }
        // Calculate expiration date
        const expiresAt = template.duration_hours
            ? new Date(Date.now() + template.duration_hours * 60 * 60 * 1000)
            : null;
        // Create player challenge
        const result = await postgres_1.default.query(`INSERT INTO player_challenges (
        user_id, template_id, progress, target, status, expires_at
      ) VALUES ($1, $2, 0, $3, 'ACTIVE', $4)
      RETURNING *`, [userId, templateId, template.target_value, expiresAt]);
        return result.rows[0];
    }
    /**
     * Get player's active challenges
     */
    async getPlayerChallenges(userId, status) {
        console.log('[CHALLENGES SERVICE] getPlayerChallenges called with userId:', userId, 'status:', status);
        let query = `
      SELECT pc.*, ct.name, ct.description, ct.type, ct.reward_type, ct.reward_value
      FROM player_challenges pc
      JOIN challenge_templates ct ON pc.template_id = ct.id
      WHERE pc.user_id = $1
    `;
        const params = [userId];
        if (status) {
            query += ' AND pc.status = $2';
            params.push(status);
        }
        query += ' ORDER BY pc.started_at DESC';
        console.log('[CHALLENGES SERVICE] Executing query:', query);
        console.log('[CHALLENGES SERVICE] With params:', params);
        const result = await postgres_1.default.query(query, params);
        console.log('[CHALLENGES SERVICE] Query result rowCount:', result.rowCount);
        console.log('[CHALLENGES SERVICE] Query result rows:', JSON.stringify(result.rows, null, 2));
        return result.rows;
    }
    /**
     * Update challenge progress
     */
    async updateChallengeProgress(userId, templateId, progressIncrement) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get active challenge
            const challengeResult = await client.query(`SELECT * FROM player_challenges
         WHERE user_id = $1 AND template_id = $2 AND status = 'ACTIVE'
         FOR UPDATE`, [userId, templateId]);
            if (challengeResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            const challenge = challengeResult.rows[0];
            // Check if expired
            if (challenge.expires_at && new Date(challenge.expires_at) < new Date()) {
                await client.query(`UPDATE player_challenges SET status = 'EXPIRED' WHERE id = $1`, [challenge.id]);
                await client.query('COMMIT');
                return Object.assign(Object.assign({}, challenge), { status: 'EXPIRED' });
            }
            // Update progress
            const newProgress = challenge.progress + progressIncrement;
            const isCompleted = newProgress >= challenge.target;
            const updateResult = await client.query(`UPDATE player_challenges
         SET progress = $1, status = $2, completed_at = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`, [
                newProgress,
                isCompleted ? 'COMPLETED' : 'ACTIVE',
                isCompleted ? new Date() : null,
                challenge.id
            ]);
            await client.query('COMMIT');
            return updateResult.rows[0];
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
     * Claim challenge reward
     */
    async claimChallengeReward(userId, challengeId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get completed challenge
            const challengeResult = await client.query(`SELECT pc.*, ct.reward_type, ct.reward_value
         FROM player_challenges pc
         JOIN challenge_templates ct ON pc.template_id = ct.id
         WHERE pc.id = $1 AND pc.user_id = $2 AND pc.status = 'COMPLETED'
         FOR UPDATE`, [challengeId, userId]);
            if (challengeResult.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new Error('Challenge not found or not completed');
            }
            const challenge = challengeResult.rows[0];
            // Mark as claimed
            await client.query(`UPDATE player_challenges SET status = 'CLAIMED', claimed_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [challengeId]);
            // Apply reward based on type
            switch (challenge.reward_type) {
                case 'CASH':
                    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [challenge.reward_value, userId]);
                    break;
                case 'BONUS':
                    await client.query('UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2', [challenge.reward_value, userId]);
                    break;
                case 'LOYALTY_POINTS':
                    await client.query(`UPDATE player_loyalty SET available_points = available_points + $1, lifetime_points = lifetime_points + $1
             WHERE user_id = $2`, [challenge.reward_value, userId]);
                    break;
                case 'FREE_SPINS':
                    // Create Innova campaign for free spins
                    await this.grantFreeSpinsCampaign(client, userId, challengeId, challenge);
                    break;
            }
            await client.query('COMMIT');
            return {
                success: true,
                reward_type: challenge.reward_type,
                reward_amount: challenge.reward_value
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
     * Auto-assign challenges to eligible players
     */
    async autoAssignChallenges() {
        // Get all active auto-assign templates
        const templates = await postgres_1.default.query(`SELECT * FROM challenge_templates
       WHERE status = 'ACTIVE' AND auto_assign = true
       ORDER BY priority DESC`);
        for (const template of templates.rows) {
            // Get users who don't have this challenge active
            const eligibleUsers = await postgres_1.default.query(`SELECT u.id FROM users u
         WHERE u.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM player_challenges pc
           WHERE pc.user_id = u.id
           AND pc.template_id = $1
           AND pc.status IN ('ACTIVE', 'COMPLETED')
         )
         LIMIT 100`, [template.id]);
            // Assign to eligible users
            for (const user of eligibleUsers.rows) {
                try {
                    await this.assignChallengeToPlayer(user.id, template.id);
                }
                catch (error) {
                    console.error(`Failed to auto-assign challenge ${template.id} to user ${user.id}:`, error);
                }
            }
        }
    }
    /**
     * Expire old challenges
     */
    async expireOldChallenges() {
        const result = await postgres_1.default.query(`UPDATE player_challenges
       SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'ACTIVE'
       AND expires_at IS NOT NULL
       AND expires_at < CURRENT_TIMESTAMP`);
        return result.rowCount;
    }
    /**
     * Grant free spins campaign through Innova API
     * Called when claiming a FREE_SPINS reward
     */
    async grantFreeSpinsCampaign(client, userId, challengeId, challenge) {
        try {
            console.log(`[CHALLENGES] Granting free spins campaign for user ${userId}, challenge ${challengeId}`);
            // Get user's currency
            const userResult = await client.query('SELECT currency FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length === 0) {
                throw new Error('User not found');
            }
            const currency = userResult.rows[0].currency || 'USD';
            const freespinsCount = Math.floor(challenge.reward_value); // reward_value is the number of spins
            // Default configuration for free spins
            // TODO: Make this configurable per challenge template
            const defaultVendor = '100hp';
            const defaultGameId = 1073; // Hilo game
            const defaultBetAmount = 0.20; // $0.20 per spin
            // Generate unique campaign code
            const campaignCode = innova_campaigns_service_1.default.generateCampaignCode('challenge', challengeId, userId);
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
            console.log(`[CHALLENGES] Innova campaign created: ${campaignCode}`);
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
                'challenge',
                challengeId,
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
            console.log(`[CHALLENGES] Free spins campaign saved to database for user ${userId}`);
        }
        catch (error) {
            console.error(`[CHALLENGES] Error granting free spins campaign:`, error.message);
            throw new Error(`Failed to grant free spins: ${error.message}`);
        }
    }
}
exports.default = new ChallengesService();
