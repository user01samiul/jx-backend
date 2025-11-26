"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BonusInstanceService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
const bonus_wallet_service_1 = require("./bonus-wallet.service");
const bonus_transaction_service_1 = require("./bonus-transaction.service");
const bonus_plan_service_1 = require("./bonus-plan.service");
class BonusInstanceService {
    /**
     * Grant a deposit bonus automatically
     */
    static async grantDepositBonus(playerId, depositAmount, depositTransactionId, paymentMethodId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Find eligible bonuses
            const eligiblePlans = await bonus_plan_service_1.BonusPlanService.getActiveDepositBonuses(depositAmount, paymentMethodId);
            const grantedBonuses = [];
            for (const plan of eligiblePlans) {
                // Check eligibility
                const isEligible = await this.checkEligibility(playerId, plan.id, client);
                if (!isEligible.eligible) {
                    console.log(`Player ${playerId} not eligible for bonus ${plan.id}: ${isEligible.reason}`);
                    continue;
                }
                // Calculate bonus amount
                let bonusAmount = 0;
                if (plan.award_type === 'percentage') {
                    bonusAmount = depositAmount * (plan.amount / 100);
                }
                else {
                    bonusAmount = plan.amount;
                }
                // Apply thresholds
                if (plan.min_bonus_threshold && bonusAmount < plan.min_bonus_threshold) {
                    console.log(`Bonus amount ${bonusAmount} below threshold ${plan.min_bonus_threshold}`);
                    continue;
                }
                if (plan.bonus_max_release && bonusAmount > plan.bonus_max_release) {
                    bonusAmount = plan.bonus_max_release;
                }
                // Calculate wagering requirement
                const wagerRequired = this.calculateWagerRequirement(bonusAmount, depositAmount, plan.wager_requirement_type, plan.wager_requirement_multiplier);
                // Calculate expiry date
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + plan.expiry_days);
                // Create bonus instance
                const instanceResult = await client.query(`INSERT INTO bonus_instances (
            bonus_plan_id, player_id, bonus_amount, remaining_bonus,
            deposit_amount, deposit_transaction_id, wager_requirement_amount,
            wager_progress_amount, wager_percentage_complete, status,
            granted_at, expires_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, NOW(), NOW())
          RETURNING *`, [
                    plan.id,
                    playerId,
                    bonusAmount,
                    bonusAmount,
                    depositAmount,
                    depositTransactionId,
                    wagerRequired,
                    0,
                    0,
                    'active',
                    expiresAt
                ]);
                const bonusInstance = instanceResult.rows[0];
                // Add to bonus wallet
                await bonus_wallet_service_1.BonusWalletService.addBonus(playerId, bonusAmount, false);
                // Create wagering progress
                await client.query(`INSERT INTO bonus_wager_progress (
            bonus_instance_id, player_id, required_wager_amount,
            current_wager_amount, remaining_wager_amount, completion_percentage,
            started_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`, [bonusInstance.id, playerId, wagerRequired, 0, wagerRequired, 0]);
                // Create transaction
                await bonus_transaction_service_1.BonusTransactionService.createTransaction({
                    bonus_instance_id: bonusInstance.id,
                    player_id: playerId,
                    transaction_type: 'granted',
                    amount: bonusAmount,
                    description: `Deposit bonus granted for deposit of ${depositAmount}`
                }, client);
                // Create audit log
                await bonus_transaction_service_1.BonusTransactionService.createAuditLog({
                    bonus_plan_id: plan.id,
                    bonus_instance_id: bonusInstance.id,
                    player_id: playerId,
                    action_type: 'bonus_granted',
                    action_description: `Deposit bonus "${plan.name}" granted automatically`,
                    new_value: bonusInstance
                });
                grantedBonuses.push(this.formatInstance(bonusInstance));
                // Usually only one deposit bonus per transaction
                break;
            }
            await client.query('COMMIT');
            return grantedBonuses;
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
     * Grant bonus using code
     */
    static async grantCodedBonus(playerId, code) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get bonus plan by code
            const plan = await bonus_plan_service_1.BonusPlanService.getPlanByCode(code);
            if (!plan) {
                throw new apiError_1.ApiError('Invalid or inactive bonus code', 400);
            }
            // Check if code usage limit reached
            if (plan.max_code_usage && plan.current_code_usage >= plan.max_code_usage) {
                throw new apiError_1.ApiError('Bonus code usage limit reached', 400);
            }
            // Check validity period
            const now = new Date();
            if (now < plan.start_date || now > plan.end_date) {
                throw new apiError_1.ApiError('Bonus code expired or not yet active', 400);
            }
            // Check eligibility
            const eligibility = await this.checkEligibility(playerId, plan.id, client);
            if (!eligibility.eligible) {
                throw new apiError_1.ApiError(eligibility.reason, 400);
            }
            const bonusAmount = plan.amount;
            const wagerRequired = this.calculateWagerRequirement(bonusAmount, 0, plan.wager_requirement_type, plan.wager_requirement_multiplier);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + plan.expiry_days);
            // Create bonus instance
            const instanceResult = await client.query(`INSERT INTO bonus_instances (
          bonus_plan_id, player_id, bonus_amount, remaining_bonus,
          wager_requirement_amount, wager_progress_amount, wager_percentage_complete,
          status, granted_at, expires_at, code_used, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, NOW(), NOW())
        RETURNING *`, [
                plan.id,
                playerId,
                bonusAmount,
                bonusAmount,
                wagerRequired,
                0,
                0,
                'active',
                expiresAt,
                code
            ]);
            const bonusInstance = instanceResult.rows[0];
            // Increment code usage
            await bonus_plan_service_1.BonusPlanService.incrementCodeUsage(plan.id);
            // Add to bonus wallet
            await bonus_wallet_service_1.BonusWalletService.addBonus(playerId, bonusAmount, false);
            // Create wagering progress
            await client.query(`INSERT INTO bonus_wager_progress (
          bonus_instance_id, player_id, required_wager_amount,
          current_wager_amount, remaining_wager_amount, completion_percentage,
          started_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`, [bonusInstance.id, playerId, wagerRequired, 0, wagerRequired, 0]);
            // Create transaction
            await bonus_transaction_service_1.BonusTransactionService.createTransaction({
                bonus_instance_id: bonusInstance.id,
                player_id: playerId,
                transaction_type: 'granted',
                amount: bonusAmount,
                description: `Coded bonus applied: ${code}`
            }, client);
            // Create audit log
            await bonus_transaction_service_1.BonusTransactionService.createAuditLog({
                bonus_plan_id: plan.id,
                bonus_instance_id: bonusInstance.id,
                player_id: playerId,
                action_type: 'bonus_code_applied',
                action_description: `Bonus code "${code}" applied`,
                new_value: bonusInstance
            });
            await client.query('COMMIT');
            return this.formatInstance(bonusInstance);
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
     * Grant manual bonus (admin)
     */
    static async grantManualBonus(playerId, bonusPlanId, customAmount, notes, adminUserId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const plan = await bonus_plan_service_1.BonusPlanService.getPlanById(bonusPlanId);
            if (!plan) {
                throw new apiError_1.ApiError('Bonus plan not found', 404);
            }
            if (plan.trigger_type !== 'manual') {
                throw new apiError_1.ApiError('This bonus plan is not manual type', 400);
            }
            const bonusAmount = customAmount || plan.amount;
            const wagerRequired = this.calculateWagerRequirement(bonusAmount, 0, plan.wager_requirement_type, plan.wager_requirement_multiplier);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + plan.expiry_days);
            // Create bonus instance
            const instanceResult = await client.query(`INSERT INTO bonus_instances (
          bonus_plan_id, player_id, bonus_amount, remaining_bonus,
          wager_requirement_amount, wager_progress_amount, wager_percentage_complete,
          status, granted_at, expires_at, notes, granted_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, NOW(), NOW())
        RETURNING *`, [
                bonusPlanId,
                playerId,
                bonusAmount,
                bonusAmount,
                wagerRequired,
                0,
                0,
                'active',
                expiresAt,
                notes,
                adminUserId
            ]);
            const bonusInstance = instanceResult.rows[0];
            // Add to bonus wallet
            await bonus_wallet_service_1.BonusWalletService.addBonus(playerId, bonusAmount, false);
            // Create wagering progress
            await client.query(`INSERT INTO bonus_wager_progress (
          bonus_instance_id, player_id, required_wager_amount,
          current_wager_amount, remaining_wager_amount, completion_percentage,
          started_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`, [bonusInstance.id, playerId, wagerRequired, 0, wagerRequired, 0]);
            // Create transaction
            await bonus_transaction_service_1.BonusTransactionService.createTransaction({
                bonus_instance_id: bonusInstance.id,
                player_id: playerId,
                transaction_type: 'granted',
                amount: bonusAmount,
                description: `Manual bonus granted by admin. Notes: ${notes}`
            }, client);
            // Create audit log
            await bonus_transaction_service_1.BonusTransactionService.createAuditLog({
                bonus_plan_id: bonusPlanId,
                bonus_instance_id: bonusInstance.id,
                player_id: playerId,
                admin_user_id: adminUserId,
                action_type: 'manual_bonus_granted',
                action_description: `Manual bonus granted by admin ${adminUserId}. Notes: ${notes}`,
                new_value: bonusInstance
            });
            await client.query('COMMIT');
            return this.formatInstance(bonusInstance);
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
     * Get active bonuses for a player
     */
    static async getPlayerActiveBonuses(playerId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`SELECT bi.*, bp.name as plan_name, bp.description as plan_description,
                bp.image_url as plan_image_url
         FROM bonus_instances bi
         INNER JOIN bonus_plans bp ON bi.bonus_plan_id = bp.id
         WHERE bi.player_id = $1
         AND bi.status IN ('active', 'wagering')
         ORDER BY bi.created_at DESC`, [playerId]);
            return result.rows.map(row => this.formatInstance(row));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all bonuses for a player (including completed/expired)
     */
    static async getPlayerBonuses(playerId, options = {}) {
        const client = await postgres_1.default.connect();
        try {
            const { limit = 50, offset = 0, status } = options;
            let whereConditions = ['bi.player_id = $1'];
            let params = [playerId];
            let paramIndex = 2;
            if (status) {
                whereConditions.push(`bi.status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }
            const whereClause = whereConditions.join(' AND ');
            // Get total count
            const countResult = await client.query(`SELECT COUNT(*) as total FROM bonus_instances bi WHERE ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total);
            // Get bonuses
            params.push(limit, offset);
            const result = await client.query(`SELECT bi.*, bp.name as plan_name, bp.description as plan_description,
                bp.image_url as plan_image_url
         FROM bonus_instances bi
         INNER JOIN bonus_plans bp ON bi.bonus_plan_id = bp.id
         WHERE ${whereClause}
         ORDER BY bi.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, params);
            return {
                bonuses: result.rows.map(row => this.formatInstance(row)),
                total
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Forfeit bonus (on withdrawal or rule violation)
     */
    static async forfeitBonus(bonusInstanceId, reason) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const instanceResult = await client.query('SELECT * FROM bonus_instances WHERE id = $1', [bonusInstanceId]);
            if (instanceResult.rows.length === 0) {
                throw new apiError_1.ApiError('Bonus instance not found', 404);
            }
            const instance = instanceResult.rows[0];
            if (instance.status !== 'active' && instance.status !== 'wagering') {
                throw new apiError_1.ApiError('Bonus is not active', 400);
            }
            const remainingBonus = parseFloat(instance.remaining_bonus);
            // Update bonus instance status
            await client.query(`UPDATE bonus_instances
         SET status = 'forfeited',
             remaining_bonus = 0,
             updated_at = NOW()
         WHERE id = $1`, [bonusInstanceId]);
            // Forfeit from wallet
            await bonus_wallet_service_1.BonusWalletService.forfeitBonus(instance.player_id, remainingBonus);
            // Create transaction
            await bonus_transaction_service_1.BonusTransactionService.createTransaction({
                bonus_instance_id: bonusInstanceId,
                player_id: instance.player_id,
                transaction_type: 'forfeited',
                amount: remainingBonus,
                description: `Bonus forfeited: ${reason}`
            }, client);
            // Create audit log
            await bonus_transaction_service_1.BonusTransactionService.createAuditLog({
                bonus_instance_id: bonusInstanceId,
                player_id: instance.player_id,
                action_type: 'bonus_forfeited',
                action_description: `Bonus forfeited: ${reason}`,
                old_value: instance
            });
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
     * Cancel all active bonuses on withdrawal request
     */
    static async cancelBonusesOnWithdrawal(playerId) {
        const activeBonuses = await this.getPlayerActiveBonuses(playerId);
        for (const bonus of activeBonuses) {
            const plan = await bonus_plan_service_1.BonusPlanService.getPlanById(bonus.bonus_plan_id);
            if (plan && plan.cancel_on_withdrawal) {
                await this.forfeitBonus(bonus.id, 'Withdrawal requested - bonus cancelled as per terms');
            }
        }
    }
    /**
     * Check player eligibility for a bonus
     */
    static async checkEligibility(playerId, bonusPlanId, client) {
        // Check max trigger per player
        const planResult = await client.query('SELECT max_trigger_per_player FROM bonus_plans WHERE id = $1', [bonusPlanId]);
        if (planResult.rows.length === 0) {
            return { eligible: false, reason: 'Bonus plan not found' };
        }
        const maxTrigger = planResult.rows[0].max_trigger_per_player;
        if (maxTrigger) {
            const countResult = await client.query(`SELECT COUNT(*) as count FROM bonus_instances
         WHERE player_id = $1 AND bonus_plan_id = $2`, [playerId, bonusPlanId]);
            if (parseInt(countResult.rows[0].count) >= maxTrigger) {
                return { eligible: false, reason: 'Maximum bonus claims reached for this promotion' };
            }
        }
        // Additional eligibility checks can be added here
        // - VIP level
        // - Country restrictions
        // - Player tags
        // - Bonus exclusions
        // etc.
        return { eligible: true };
    }
    /**
     * Calculate wagering requirement
     */
    static calculateWagerRequirement(bonusAmount, depositAmount, requirementType, multiplier) {
        switch (requirementType) {
            case 'bonus':
                return bonusAmount * multiplier;
            case 'bonus_plus_deposit':
                return (bonusAmount + depositAmount) * multiplier;
            case 'deposit':
                return depositAmount * multiplier;
            default:
                return bonusAmount * multiplier;
        }
    }
    /**
     * Format instance data
     */
    static formatInstance(row) {
        return {
            id: row.id,
            bonus_plan_id: row.bonus_plan_id,
            player_id: row.player_id,
            bonus_amount: parseFloat(row.bonus_amount),
            remaining_bonus: parseFloat(row.remaining_bonus),
            deposit_amount: row.deposit_amount ? parseFloat(row.deposit_amount) : undefined,
            deposit_transaction_id: row.deposit_transaction_id,
            wager_requirement_amount: parseFloat(row.wager_requirement_amount),
            wager_progress_amount: parseFloat(row.wager_progress_amount),
            wager_percentage_complete: parseFloat(row.wager_percentage_complete),
            status: row.status,
            granted_at: row.granted_at,
            activated_at: row.activated_at,
            expires_at: row.expires_at,
            completed_at: row.completed_at,
            code_used: row.code_used,
            notes: row.notes,
            granted_by: row.granted_by,
            games_played: row.games_played,
            total_bets_count: parseInt(row.total_bets_count) || 0,
            total_wins_amount: parseFloat(row.total_wins_amount) || 0
        };
    }
}
exports.BonusInstanceService = BonusInstanceService;
