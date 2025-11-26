"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BonusPlanService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
const bonus_transaction_service_1 = require("./bonus-transaction.service");
class BonusPlanService {
    /**
     * Create a new bonus plan
     */
    static async createPlan(planData, adminUserId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(`INSERT INTO bonus_plans (
          name, brand_id, start_date, end_date, start_time, end_time, expiry_days,
          trigger_type, min_deposit, max_deposit, payment_method_ids,
          award_type, amount, currency, wager_requirement_multiplier,
          wager_requirement_type, wager_requirement_action, is_incremental,
          game_type_id, description, image_url, is_playable,
          playable_bonus_qualifies, release_playable_winnings, cancel_on_withdrawal,
          max_trigger_all, max_trigger_per_player, min_bonus_threshold,
          bonus_max_release, recurrence_type, allow_sportsbook, allow_poker,
          additional_award, bonus_code, max_code_usage, current_code_usage,
          loyalty_points_required, vip_level_required, cashback_percentage,
          cashback_calculation_period, status, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, NOW(), NOW()
        ) RETURNING *`, [
                planData.name,
                planData.brand_id || 1,
                planData.start_date,
                planData.end_date,
                planData.start_time || null,
                planData.end_time || null,
                planData.expiry_days,
                planData.trigger_type,
                planData.min_deposit || null,
                planData.max_deposit || null,
                planData.payment_method_ids ? JSON.stringify(planData.payment_method_ids) : null,
                planData.award_type,
                planData.amount,
                planData.currency || 'NGN',
                planData.wager_requirement_multiplier,
                planData.wager_requirement_type || 'bonus',
                planData.wager_requirement_action || 'release',
                planData.is_incremental || false,
                planData.game_type_id || null,
                planData.description || null,
                planData.image_url || null,
                planData.is_playable !== undefined ? planData.is_playable : true,
                planData.playable_bonus_qualifies || false,
                planData.release_playable_winnings || false,
                planData.cancel_on_withdrawal !== undefined ? planData.cancel_on_withdrawal : true,
                planData.max_trigger_all || null,
                planData.max_trigger_per_player || 1,
                planData.min_bonus_threshold || null,
                planData.bonus_max_release || null,
                planData.recurrence_type || 'non_recurring',
                planData.allow_sportsbook || false,
                planData.allow_poker || false,
                planData.additional_award || false,
                planData.bonus_code || null,
                planData.max_code_usage || null,
                planData.current_code_usage || 0,
                planData.loyalty_points_required || null,
                planData.vip_level_required || null,
                planData.cashback_percentage || null,
                planData.cashback_calculation_period || null,
                planData.status || 'active',
                adminUserId
            ]);
            const createdPlan = result.rows[0];
            // Create audit log
            await bonus_transaction_service_1.BonusTransactionService.createAuditLog({
                bonus_plan_id: createdPlan.id,
                admin_user_id: adminUserId,
                action_type: 'bonus_plan_created',
                action_description: `Bonus plan "${planData.name}" created`,
                new_value: createdPlan
            });
            await client.query('COMMIT');
            return this.formatPlan(createdPlan);
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23505' && error.constraint === 'bonus_plans_bonus_code_key') {
                throw new apiError_1.ApiError('Bonus code already exists', 400);
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update a bonus plan
     */
    static async updatePlan(planId, updates, adminUserId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get old values for audit
            const oldResult = await client.query('SELECT * FROM bonus_plans WHERE id = $1', [planId]);
            if (oldResult.rows.length === 0) {
                throw new apiError_1.ApiError('Bonus plan not found', 404);
            }
            const oldPlan = oldResult.rows[0];
            // Build update query dynamically
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined && key !== 'id') {
                    updateFields.push(`${key} = $${paramIndex}`);
                    updateValues.push(value);
                    paramIndex++;
                }
            });
            if (updateFields.length === 0) {
                throw new apiError_1.ApiError('No fields to update', 400);
            }
            updateFields.push('updated_at = NOW()');
            updateValues.push(planId);
            const result = await client.query(`UPDATE bonus_plans
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`, updateValues);
            const updatedPlan = result.rows[0];
            // Create audit log
            await bonus_transaction_service_1.BonusTransactionService.createAuditLog({
                bonus_plan_id: planId,
                admin_user_id: adminUserId,
                action_type: 'bonus_plan_updated',
                action_description: `Bonus plan "${updatedPlan.name}" updated`,
                old_value: oldPlan,
                new_value: updatedPlan
            });
            await client.query('COMMIT');
            return this.formatPlan(updatedPlan);
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
     * Get a bonus plan by ID
     */
    static async getPlanById(planId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query('SELECT * FROM bonus_plans WHERE id = $1', [planId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.formatPlan(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all bonus plans with filters
     */
    static async getPlans(filters = {}) {
        const client = await postgres_1.default.connect();
        try {
            const { status, trigger_type, brand_id, limit = 50, offset = 0 } = filters;
            let whereConditions = [];
            let params = [];
            let paramIndex = 1;
            if (status) {
                whereConditions.push(`status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }
            if (trigger_type) {
                whereConditions.push(`trigger_type = $${paramIndex}`);
                params.push(trigger_type);
                paramIndex++;
            }
            if (brand_id) {
                whereConditions.push(`brand_id = $${paramIndex}`);
                params.push(brand_id);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(' AND ')}`
                : '';
            // Get total count
            const countResult = await client.query(`SELECT COUNT(*) as total FROM bonus_plans ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total);
            // Get plans
            params.push(limit, offset);
            const result = await client.query(`SELECT * FROM bonus_plans
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, params);
            return {
                plans: result.rows.map(row => this.formatPlan(row)),
                total
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get active deposit bonuses
     */
    static async getActiveDepositBonuses(depositAmount, paymentMethodId) {
        const client = await postgres_1.default.connect();
        try {
            const now = new Date();
            let query = `
        SELECT * FROM bonus_plans
        WHERE status = 'active'
        AND trigger_type = 'deposit'
        AND start_date <= $1
        AND end_date >= $1
        AND (min_deposit IS NULL OR min_deposit <= $2)
        AND (max_deposit IS NULL OR max_deposit >= $2)
      `;
            const params = [now, depositAmount];
            if (paymentMethodId) {
                query += ` AND (payment_method_ids IS NULL OR payment_method_ids @> $3::jsonb)`;
                params.push(JSON.stringify([paymentMethodId]));
            }
            query += ' ORDER BY amount DESC';
            const result = await client.query(query, params);
            return result.rows.map(row => this.formatPlan(row));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get bonus plan by code
     */
    static async getPlanByCode(code) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`SELECT * FROM bonus_plans
         WHERE bonus_code = $1
         AND status = 'active'`, [code]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.formatPlan(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Increment code usage
     */
    static async incrementCodeUsage(planId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query(`UPDATE bonus_plans
         SET current_code_usage = current_code_usage + 1,
             updated_at = NOW()
         WHERE id = $1`, [planId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete a bonus plan
     */
    static async deletePlan(planId, adminUserId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get plan info for audit
            const planResult = await client.query('SELECT * FROM bonus_plans WHERE id = $1', [planId]);
            if (planResult.rows.length === 0) {
                throw new apiError_1.ApiError('Bonus plan not found', 404);
            }
            const plan = planResult.rows[0];
            // Check if there are active instances
            const instancesResult = await client.query(`SELECT COUNT(*) as count FROM bonus_instances
         WHERE bonus_plan_id = $1
         AND status IN ('active', 'wagering')`, [planId]);
            if (parseInt(instancesResult.rows[0].count) > 0) {
                throw new apiError_1.ApiError('Cannot delete bonus plan with active instances', 400);
            }
            // Soft delete by setting status to inactive
            await client.query(`UPDATE bonus_plans
         SET status = 'inactive',
             updated_at = NOW()
         WHERE id = $1`, [planId]);
            // Create audit log
            await bonus_transaction_service_1.BonusTransactionService.createAuditLog({
                bonus_plan_id: planId,
                admin_user_id: adminUserId,
                action_type: 'bonus_plan_deleted',
                action_description: `Bonus plan "${plan.name}" deleted`,
                old_value: plan
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
     * Format plan data
     */
    static formatPlan(row) {
        return {
            id: row.id,
            name: row.name,
            brand_id: row.brand_id,
            start_date: row.start_date,
            end_date: row.end_date,
            start_time: row.start_time,
            end_time: row.end_time,
            expiry_days: row.expiry_days,
            trigger_type: row.trigger_type,
            min_deposit: row.min_deposit ? parseFloat(row.min_deposit) : undefined,
            max_deposit: row.max_deposit ? parseFloat(row.max_deposit) : undefined,
            payment_method_ids: row.payment_method_ids,
            award_type: row.award_type,
            amount: parseFloat(row.amount),
            currency: row.currency,
            wager_requirement_multiplier: parseFloat(row.wager_requirement_multiplier),
            wager_requirement_type: row.wager_requirement_type,
            wager_requirement_action: row.wager_requirement_action,
            is_incremental: row.is_incremental,
            game_type_id: row.game_type_id,
            description: row.description,
            image_url: row.image_url,
            is_playable: row.is_playable,
            playable_bonus_qualifies: row.playable_bonus_qualifies,
            release_playable_winnings: row.release_playable_winnings,
            cancel_on_withdrawal: row.cancel_on_withdrawal,
            max_trigger_all: row.max_trigger_all,
            max_trigger_per_player: row.max_trigger_per_player,
            min_bonus_threshold: row.min_bonus_threshold ? parseFloat(row.min_bonus_threshold) : undefined,
            bonus_max_release: row.bonus_max_release ? parseFloat(row.bonus_max_release) : undefined,
            recurrence_type: row.recurrence_type,
            allow_sportsbook: row.allow_sportsbook,
            allow_poker: row.allow_poker,
            additional_award: row.additional_award,
            bonus_code: row.bonus_code,
            max_code_usage: row.max_code_usage,
            current_code_usage: row.current_code_usage,
            loyalty_points_required: row.loyalty_points_required,
            vip_level_required: row.vip_level_required,
            cashback_percentage: row.cashback_percentage ? parseFloat(row.cashback_percentage) : undefined,
            cashback_calculation_period: row.cashback_calculation_period,
            status: row.status,
            created_by: row.created_by
        };
    }
    /**
     * Clone a bonus plan
     */
    static async clonePlan(planId, overrides, adminUserId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get the original plan
            const originalPlan = await this.getPlanById(planId);
            if (!originalPlan) {
                throw new apiError_1.ApiError('Bonus plan not found', 404);
            }
            // Create new plan with overrides
            const newPlanData = {
                ...originalPlan,
                ...overrides,
                name: overrides.name || `${originalPlan.name} (Copy)`,
                bonus_code: overrides.bonus_code || null, // Don't copy the code
                current_code_usage: 0,
                status: overrides.status || 'inactive' // Default to inactive
            };
            // Remove fields that shouldn't be copied
            delete newPlanData.id;
            delete newPlanData.created_at;
            delete newPlanData.updated_at;
            // Create the new plan
            const result = await client.query(`INSERT INTO bonus_plans (
          brand_id, name, start_date, end_date, start_time, end_time,
          expiry_days, trigger_type, min_deposit, max_deposit, payment_method_ids,
          award_type, amount, currency, wager_requirement_multiplier,
          wager_requirement_type, wager_requirement_action, is_incremental,
          game_type_id, description, image_url, is_playable, playable_bonus_qualifies,
          release_playable_winnings, cancel_on_withdrawal, max_trigger_all,
          max_trigger_per_player, min_bonus_threshold, bonus_max_release,
          recurrence_type, allow_sportsbook, allow_poker, additional_award,
          bonus_code, max_code_usage, current_code_usage, loyalty_points_required,
          vip_level_required, cashback_percentage, cashback_calculation_period,
          status, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
          $42, NOW(), NOW()
        ) RETURNING *`, [
                newPlanData.brand_id || null,
                newPlanData.name,
                newPlanData.start_date,
                newPlanData.end_date,
                newPlanData.start_time || null,
                newPlanData.end_time || null,
                newPlanData.expiry_days,
                newPlanData.trigger_type,
                newPlanData.min_deposit || null,
                newPlanData.max_deposit || null,
                newPlanData.payment_method_ids || null,
                newPlanData.award_type,
                newPlanData.amount,
                newPlanData.currency || 'USD',
                newPlanData.wager_requirement_multiplier,
                newPlanData.wager_requirement_type || 'bonus',
                newPlanData.wager_requirement_action || 'release',
                newPlanData.is_incremental || false,
                newPlanData.game_type_id || null,
                newPlanData.description || null,
                newPlanData.image_url || null,
                newPlanData.is_playable !== undefined ? newPlanData.is_playable : true,
                newPlanData.playable_bonus_qualifies !== undefined ? newPlanData.playable_bonus_qualifies : true,
                newPlanData.release_playable_winnings !== undefined ? newPlanData.release_playable_winnings : true,
                newPlanData.cancel_on_withdrawal !== undefined ? newPlanData.cancel_on_withdrawal : true,
                newPlanData.max_trigger_all || null,
                newPlanData.max_trigger_per_player || null,
                newPlanData.min_bonus_threshold || null,
                newPlanData.bonus_max_release || null,
                newPlanData.recurrence_type || 'non_recurring',
                newPlanData.allow_sportsbook || false,
                newPlanData.allow_poker || false,
                newPlanData.additional_award || false,
                newPlanData.bonus_code || null,
                newPlanData.max_code_usage || null,
                0, // current_code_usage
                newPlanData.loyalty_points_required || null,
                newPlanData.vip_level_required || null,
                newPlanData.cashback_percentage || null,
                newPlanData.cashback_calculation_period || null,
                newPlanData.status,
                adminUserId
            ]);
            // Create audit log
            await client.query(`INSERT INTO bonus_audit_log (
          bonus_plan_id, admin_user_id, action_type, action_description,
          new_value, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`, [
                result.rows[0].id,
                adminUserId,
                'bonus_plan_cloned',
                `Bonus plan cloned from plan #${planId}`,
                JSON.stringify(result.rows[0])
            ]);
            await client.query('COMMIT');
            return this.formatPlan(result.rows[0]);
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
     * Get analytics for a bonus plan
     */
    static async getPlanAnalytics(planId) {
        const client = await postgres_1.default.connect();
        try {
            // Get the plan
            const plan = await this.getPlanById(planId);
            if (!plan) {
                throw new apiError_1.ApiError('Bonus plan not found', 404);
            }
            // Get statistics
            const statsResult = await client.query(`SELECT
          COUNT(*) as total_granted,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
          COUNT(CASE WHEN status IN ('active', 'wagering') THEN 1 END) as total_active,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as total_expired,
          COUNT(CASE WHEN status = 'forfeited' THEN 1 END) as total_forfeited,
          COALESCE(SUM(bonus_amount), 0) as total_bonus_value_granted,
          COALESCE(SUM(CASE WHEN status IN ('active', 'wagering') THEN remaining_bonus ELSE 0 END), 0) as total_bonus_value_active,
          COALESCE(SUM(wager_progress_amount), 0) as total_wagered,
          COALESCE(AVG(wager_percentage_complete), 0) as avg_completion_percentage,
          COALESCE(AVG(
            CASE WHEN status = 'completed' AND completed_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (completed_at - granted_at)) / 3600
            END
          ), 0) as average_time_to_complete_hours
        FROM bonus_instances
        WHERE bonus_plan_id = $1`, [planId]);
            const stats = statsResult.rows[0];
            // Calculate completion rate
            const completionRate = stats.total_granted > 0
                ? (parseFloat(stats.total_completed) / parseFloat(stats.total_granted)) * 100
                : 0;
            // Calculate ROI percentage (wagering generated / bonus cost * 100)
            const totalBonusCost = parseFloat(stats.total_bonus_value_granted) || 0;
            const totalWagered = parseFloat(stats.total_wagered) || 0;
            const roiPercentage = totalBonusCost > 0 ? (totalWagered / totalBonusCost) * 100 : 0;
            return {
                bonus_plan_id: planId,
                bonus_plan_name: plan.name,
                total_granted: parseInt(stats.total_granted) || 0,
                total_completed: parseInt(stats.total_completed) || 0,
                total_active: parseInt(stats.total_active) || 0,
                total_expired: parseInt(stats.total_expired) || 0,
                total_forfeited: parseInt(stats.total_forfeited) || 0,
                completion_rate: parseFloat(completionRate.toFixed(2)),
                total_bonus_value_granted: totalBonusCost,
                total_bonus_value_active: parseFloat(stats.total_bonus_value_active) || 0,
                total_wagered: totalWagered,
                avg_completion_percentage: parseFloat(stats.avg_completion_percentage) || 0,
                average_time_to_complete_hours: parseFloat(stats.average_time_to_complete_hours) || 0,
                roi_percentage: parseFloat(roiPercentage.toFixed(2))
            };
        }
        finally {
            client.release();
        }
    }
}
exports.BonusPlanService = BonusPlanService;
