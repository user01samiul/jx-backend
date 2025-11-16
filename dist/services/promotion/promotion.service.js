"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
class PromotionService {
    /**
     * Check if user is eligible for a specific promotion
     */
    static async checkEligibility(userId, promotionId) {
        const client = await postgres_1.default.connect();
        try {
            // Get promotion details
            const promotionResult = await client.query("SELECT * FROM promotions WHERE id = $1 AND is_active = true", [promotionId]);
            if (promotionResult.rows.length === 0) {
                return { eligible: false, reason: "Promotion not found or inactive" };
            }
            const promotion = promotionResult.rows[0];
            // Check if already claimed
            const claimedResult = await client.query("SELECT * FROM user_promotions WHERE user_id = $1 AND promotion_id = $2", [userId, promotionId]);
            if (claimedResult.rows.length > 0) {
                return { eligible: false, reason: "Promotion already claimed" };
            }
            // Check promotion type specific eligibility
            switch (promotion.type) {
                case 'welcome_bonus':
                    return await this.checkWelcomeBonusEligibility(client, userId, promotion);
                case 'deposit_bonus':
                case 'reload_bonus':
                    return await this.checkDepositBonusEligibility(client, userId, promotion);
                case 'free_spins':
                    return await this.checkFreeSpinsEligibility(client, userId, promotion);
                case 'cashback':
                    return await this.checkCashbackEligibility(client, userId, promotion);
                default:
                    return { eligible: true };
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Get wagering progress for user's active promotions
     */
    static async getWageringProgress(userId) {
        const result = await postgres_1.default.query(`SELECT 
        up.promotion_id,
        up.user_id,
        p.wagering_requirement,
        up.wagering_completed,
        (p.wagering_requirement - up.wagering_completed) as remaining_wagering,
        CASE 
          WHEN p.wagering_requirement > 0 
          THEN (up.wagering_completed / p.wagering_requirement) * 100 
          ELSE 100 
        END as progress_percentage,
        (up.wagering_completed >= p.wagering_requirement) as is_completed
      FROM user_promotions up
      JOIN promotions p ON up.promotion_id = p.id
      WHERE up.user_id = $1 AND up.status = 'active' AND p.wagering_requirement > 0
      ORDER BY up.claimed_at DESC`, [userId]);
        return result.rows.map(row => ({
            promotion_id: row.promotion_id,
            user_id: row.user_id,
            wagering_requirement: Number(row.wagering_requirement),
            wagering_completed: Number(row.wagering_completed),
            remaining_wagering: Number(row.remaining_wagering),
            progress_percentage: Number(row.progress_percentage),
            is_completed: row.is_completed
        }));
    }
    /**
     * Update wagering progress when user places bets
     */
    static async updateWageringProgress(userId, betAmount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get active promotions with wagering requirements
            const activePromotionsResult = await client.query(`SELECT up.promotion_id, up.wagering_completed, p.wagering_requirement
         FROM user_promotions up
         JOIN promotions p ON up.promotion_id = p.id
         WHERE up.user_id = $1 AND up.status = 'active' AND p.wagering_requirement > 0`, [userId]);
            for (const promotion of activePromotionsResult.rows) {
                const newWageringCompleted = Number(promotion.wagering_completed) + betAmount;
                // Update wagering progress
                await client.query(`UPDATE user_promotions 
           SET wagering_completed = $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND promotion_id = $3`, [newWageringCompleted, userId, promotion.promotion_id]);
                // Check if wagering requirement is completed
                if (newWageringCompleted >= promotion.wagering_requirement) {
                    await client.query(`UPDATE user_promotions 
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND promotion_id = $2`, [userId, promotion.promotion_id]);
                }
            }
            await client.query('COMMIT');
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
     * Transfer bonus balance to main balance (after wagering completion)
     */
    static async transferBonusToMain(userId, amount) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if user has enough bonus balance
            const balanceResult = await client.query("SELECT bonus_balance FROM user_balances WHERE user_id = $1", [userId]);
            const currentBonusBalance = Number(balanceResult.rows[0]?.bonus_balance || 0);
            if (currentBonusBalance < amount) {
                return false;
            }
            // Get current main balance
            const mainBalanceResult = await client.query("SELECT balance FROM user_balances WHERE user_id = $1", [userId]);
            const currentMainBalance = Number(mainBalanceResult.rows[0]?.balance || 0);
            // Update balances
            await client.query(`UPDATE user_balances 
         SET bonus_balance = bonus_balance - $1, balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`, [amount, userId]);
            // Create transfer transaction
            await client.query(`INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, currency, status, description, reference_id, created_at)
         VALUES ($1, 'adjustment', $2, $3, $4, 'USD', 'completed', $5, $6, CURRENT_TIMESTAMP)`, [userId, amount, currentMainBalance, currentMainBalance + amount, `Bonus transfer: $${amount}`, `bonus_transfer_${Date.now()}`]);
            await client.query('COMMIT');
            return true;
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
     * Get user's bonus balance summary
     */
    static async getBonusBalanceSummary(userId) {
        const result = await postgres_1.default.query(`SELECT 
        ub.bonus_balance,
        COUNT(up.id) as active_promotions,
        SUM(up.bonus_amount) as total_bonus_claimed,
        SUM(up.wagering_completed) as total_wagering_completed,
        SUM(p.wagering_requirement) as total_wagering_required
      FROM user_balances ub
      LEFT JOIN user_promotions up ON ub.user_id = up.user_id AND up.status = 'active'
      LEFT JOIN promotions p ON up.promotion_id = p.id
      WHERE ub.user_id = $1
      GROUP BY ub.bonus_balance`, [userId]);
        const row = result.rows[0] || {};
        return {
            bonus_balance: Number(row.bonus_balance || 0),
            active_promotions: Number(row.active_promotions || 0),
            total_bonus_claimed: Number(row.total_bonus_claimed || 0),
            total_wagering_completed: Number(row.total_wagering_completed || 0),
            total_wagering_required: Number(row.total_wagering_required || 0),
            wagering_progress: row.total_wagering_required > 0
                ? (Number(row.total_wagering_completed || 0) / Number(row.total_wagering_required)) * 100
                : 100
        };
    }
    // Private helper methods
    static async checkWelcomeBonusEligibility(client, userId, promotion) {
        // Check if user has claimed any welcome bonus before
        const existingWelcomeBonus = await client.query(`SELECT up.id FROM user_promotions up 
       JOIN promotions p ON up.promotion_id = p.id 
       WHERE up.user_id = $1 AND p.type = 'welcome_bonus'`, [userId]);
        if (existingWelcomeBonus.rows.length > 0) {
            return { eligible: false, reason: "Welcome bonus can only be claimed once" };
        }
        // Check if user has made required deposits
        const depositResult = await client.query("SELECT COALESCE(SUM(amount), 0) as total_deposits FROM transactions WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'", [userId]);
        const totalDeposits = Number(depositResult.rows[0].total_deposits);
        if (totalDeposits < (promotion.min_deposit_amount || 0)) {
            return {
                eligible: false,
                reason: `Minimum deposit of $${promotion.min_deposit_amount} required`,
                required_deposit: promotion.min_deposit_amount,
                current_deposit: totalDeposits
            };
        }
        return { eligible: true };
    }
    static async checkDepositBonusEligibility(client, userId, promotion) {
        // Check if user has made required deposits
        const depositResult = await client.query("SELECT COALESCE(SUM(amount), 0) as total_deposits FROM transactions WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'", [userId]);
        const totalDeposits = Number(depositResult.rows[0].total_deposits);
        if (totalDeposits < (promotion.min_deposit_amount || 0)) {
            return {
                eligible: false,
                reason: `Minimum deposit of $${promotion.min_deposit_amount} required`,
                required_deposit: promotion.min_deposit_amount,
                current_deposit: totalDeposits
            };
        }
        return { eligible: true };
    }
    static async checkFreeSpinsEligibility(client, userId, promotion) {
        // Check if user has made required deposits
        const depositResult = await client.query("SELECT COALESCE(SUM(amount), 0) as total_deposits FROM transactions WHERE user_id = $1 AND type = 'deposit' AND status = 'completed'", [userId]);
        const totalDeposits = Number(depositResult.rows[0].total_deposits);
        if (totalDeposits < (promotion.min_deposit_amount || 0)) {
            return {
                eligible: false,
                reason: `Minimum deposit of $${promotion.min_deposit_amount} required`,
                required_deposit: promotion.min_deposit_amount,
                current_deposit: totalDeposits
            };
        }
        return { eligible: true };
    }
    static async checkCashbackEligibility(client, userId, promotion) {
        // For cashback, check if user has wagered enough
        const wageredResult = await client.query("SELECT COALESCE(SUM(amount), 0) as total_wagered FROM transactions WHERE user_id = $1 AND type = 'bet' AND status = 'completed'", [userId]);
        const totalWagered = Number(wageredResult.rows[0].total_wagered);
        if (totalWagered < 100) { // Minimum wagering requirement for cashback
            return {
                eligible: false,
                reason: "Minimum wagering of $100 required for cashback"
            };
        }
        return { eligible: true };
    }
}
exports.PromotionService = PromotionService;
