"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDepositLimit = createDepositLimit;
exports.updateDepositLimit = updateDepositLimit;
exports.getUserDepositLimits = getUserDepositLimits;
exports.getUserDepositLimitsGrouped = getUserDepositLimitsGrouped;
exports.checkDepositLimit = checkDepositLimit;
exports.recordDepositAgainstLimits = recordDepositAgainstLimits;
exports.resetExpiredLimits = resetExpiredLimits;
exports.cancelDepositLimit = cancelDepositLimit;
exports.getDepositLimitHistory = getDepositLimitHistory;
const postgres_1 = __importDefault(require("../../db/postgres"));
// =====================================================
// UTILITY FUNCTIONS
// =====================================================
/**
 * Calculate next reset date based on limit type
 */
function calculateNextResetDate(limitType, fromDate = new Date()) {
    const resetDate = new Date(fromDate);
    switch (limitType) {
        case 'DAILY':
            resetDate.setDate(resetDate.getDate() + 1);
            resetDate.setHours(0, 0, 0, 0);
            break;
        case 'WEEKLY':
            // Reset on Monday
            const daysUntilMonday = (8 - resetDate.getDay()) % 7 || 7;
            resetDate.setDate(resetDate.getDate() + daysUntilMonday);
            resetDate.setHours(0, 0, 0, 0);
            break;
        case 'MONTHLY':
            resetDate.setMonth(resetDate.getMonth() + 1);
            resetDate.setDate(1);
            resetDate.setHours(0, 0, 0, 0);
            break;
    }
    return resetDate;
}
/**
 * Calculate period dates based on limit type
 */
function calculatePeriodDates(limitType) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    switch (limitType) {
        case 'DAILY':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'WEEKLY':
            // Start on Monday
            const dayOfWeek = start.getDay();
            const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
            start.setDate(start.getDate() - daysToMonday);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'MONTHLY':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
    }
    return { start, end };
}
// =====================================================
// SERVICE FUNCTIONS
// =====================================================
/**
 * Create a new deposit limit for a user
 * Compliance: Immediate activation
 */
async function createDepositLimit(input) {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Check if user already has an active limit of this type
        const existingCheck = await client.query(`SELECT id FROM deposit_limits
             WHERE user_id = $1 AND limit_type = $2 AND status = 'ACTIVE'`, [input.user_id, input.limit_type]);
        if (existingCheck.rows.length > 0) {
            throw new Error(`User already has an active ${input.limit_type} deposit limit`);
        }
        const currency = input.currency || 'USD';
        const { start, end } = calculatePeriodDates(input.limit_type);
        const nextReset = calculateNextResetDate(input.limit_type);
        const result = await client.query(`INSERT INTO deposit_limits (
                user_id, limit_type, amount, currency,
                period_start_date, period_end_date, next_reset_date,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
            RETURNING *`, [input.user_id, input.limit_type, input.amount, currency, start, end, nextReset]);
        await client.query('COMMIT');
        return result.rows[0];
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
 * Update deposit limit
 * Compliance: Decrease immediate, Increase delayed (next period)
 */
async function updateDepositLimit(input) {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Get current active limit
        const currentLimit = await client.query(`SELECT * FROM deposit_limits
             WHERE user_id = $1 AND limit_type = $2 AND status = 'ACTIVE'`, [input.user_id, input.limit_type]);
        if (currentLimit.rows.length === 0) {
            throw new Error(`No active ${input.limit_type} deposit limit found`);
        }
        const current = currentLimit.rows[0];
        const isIncrease = input.new_amount > current.amount;
        if (isIncrease) {
            // INCREASE: Set as pending, effective next period
            const nextReset = calculateNextResetDate(input.limit_type);
            const result = await client.query(`UPDATE deposit_limits
                 SET pending_amount = $1,
                     pending_effective_date = $2,
                     is_increase = TRUE,
                     status = 'PENDING',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3
                 RETURNING *`, [input.new_amount, nextReset, current.id]);
            await client.query('COMMIT');
            return result.rows[0];
        }
        else {
            // DECREASE: Immediate effect (responsible gaming compliance)
            const result = await client.query(`UPDATE deposit_limits
                 SET amount = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`, [input.new_amount, current.id]);
            await client.query('COMMIT');
            return result.rows[0];
        }
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
 * Get all active limits for a user
 */
async function getUserDepositLimits(userId) {
    const result = await postgres_1.default.query(`SELECT * FROM deposit_limits
         WHERE user_id = $1
         AND status IN ('ACTIVE', 'PENDING')
         ORDER BY limit_type`, [userId]);
    return result.rows;
}
/**
 * Get active limits grouped by type
 */
async function getUserDepositLimitsGrouped(userId) {
    const limits = await getUserDepositLimits(userId);
    const grouped = {
        DAILY: null,
        WEEKLY: null,
        MONTHLY: null
    };
    limits.forEach(limit => {
        grouped[limit.limit_type] = limit;
    });
    return grouped;
}
/**
 * Check if user can make a deposit
 * Returns detailed information about limit status
 */
async function checkDepositLimit(userId, depositAmount, currency = 'USD') {
    const limits = await postgres_1.default.query(`SELECT * FROM deposit_limits
         WHERE user_id = $1
         AND currency = $2
         AND status = 'ACTIVE'
         ORDER BY
            CASE limit_type
                WHEN 'DAILY' THEN 1
                WHEN 'WEEKLY' THEN 2
                WHEN 'MONTHLY' THEN 3
            END`, [userId, currency]);
    // If no limits, allow deposit
    if (limits.rows.length === 0) {
        return {
            can_deposit: true,
            would_exceed_limit: false,
            remaining_amount: Infinity
        };
    }
    // Check each limit (most restrictive first)
    for (const limit of limits.rows) {
        const remainingAmount = limit.amount - limit.spent_amount;
        if (depositAmount > remainingAmount) {
            return {
                can_deposit: false,
                reason: `Deposit would exceed ${limit.limit_type.toLowerCase()} limit. Remaining: ${remainingAmount} ${currency}`,
                limit: limit,
                would_exceed_limit: true,
                remaining_amount: remainingAmount
            };
        }
    }
    // All checks passed
    const minRemaining = Math.min(...limits.rows.map(l => l.amount - l.spent_amount));
    return {
        can_deposit: true,
        would_exceed_limit: false,
        remaining_amount: minRemaining
    };
}
/**
 * Record a deposit against limits
 * Updates spent_amount for all active limits
 */
async function recordDepositAgainstLimits(userId, depositAmount, currency = 'USD', client) {
    const shouldRelease = !client;
    const dbClient = client || await postgres_1.default.connect();
    try {
        if (!client)
            await dbClient.query('BEGIN');
        // Update all active limits for this currency
        await dbClient.query(`UPDATE deposit_limits
             SET spent_amount = spent_amount + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2
             AND currency = $3
             AND status = 'ACTIVE'`, [depositAmount, userId, currency]);
        if (!client)
            await dbClient.query('COMMIT');
    }
    catch (error) {
        if (!client)
            await dbClient.query('ROLLBACK');
        throw error;
    }
    finally {
        if (shouldRelease)
            dbClient.release();
    }
}
/**
 * Reset expired limits and create new ones for next period
 */
async function resetExpiredLimits() {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Find expired limits
        const expiredLimits = await client.query(`SELECT * FROM deposit_limits
             WHERE status = 'ACTIVE'
             AND next_reset_date <= CURRENT_TIMESTAMP`);
        for (const limit of expiredLimits.rows) {
            // Mark old limit as expired
            await client.query(`UPDATE deposit_limits
                 SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`, [limit.id]);
            // Create new limit for next period
            const { start, end } = calculatePeriodDates(limit.limit_type);
            const nextReset = calculateNextResetDate(limit.limit_type);
            await client.query(`INSERT INTO deposit_limits (
                    user_id, limit_type, amount, currency,
                    period_start_date, period_end_date, next_reset_date,
                    status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')`, [limit.user_id, limit.limit_type, limit.amount, limit.currency, start, end, nextReset]);
        }
        await client.query('COMMIT');
        return expiredLimits.rows.length;
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
 * Delete/Cancel a deposit limit
 */
async function cancelDepositLimit(userId, limitType) {
    const result = await postgres_1.default.query(`UPDATE deposit_limits
         SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND limit_type = $2 AND status IN ('ACTIVE', 'PENDING')
         RETURNING id`, [userId, limitType]);
    return result.rows.length > 0;
}
/**
 * Get deposit limit history for a user
 */
async function getDepositLimitHistory(userId, limit) {
    const result = await postgres_1.default.query(`SELECT * FROM deposit_limit_history
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`, [userId, limit || 50]);
    return result.rows;
}
