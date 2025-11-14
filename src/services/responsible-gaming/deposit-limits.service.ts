import pool from "../../db/postgres";
import { PoolClient } from "pg";

// =====================================================
// TYPES & INTERFACES
// =====================================================

export type LimitType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type LimitStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';

export interface DepositLimit {
    id: number;
    user_id: number;
    limit_type: LimitType;
    amount: number;
    currency: string;
    spent_amount: number;
    remaining_amount: number;
    percentage_used: number;
    status: LimitStatus;
    is_increase: boolean;
    pending_amount?: number;
    pending_effective_date?: Date;
    period_start_date: Date;
    period_end_date: Date;
    next_reset_date: Date;
    created_at: Date;
    updated_at: Date;
}

export interface CreateDepositLimitInput {
    user_id: number;
    limit_type: LimitType;
    amount: number;
    currency?: string;
}

export interface UpdateDepositLimitInput {
    user_id: number;
    limit_type: LimitType;
    new_amount: number;
}

export interface DepositLimitCheckResult {
    can_deposit: boolean;
    reason?: string;
    limit?: DepositLimit;
    would_exceed_limit: boolean;
    remaining_amount: number;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate next reset date based on limit type
 */
function calculateNextResetDate(limitType: LimitType, fromDate: Date = new Date()): Date {
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
function calculatePeriodDates(limitType: LimitType): { start: Date; end: Date } {
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
export async function createDepositLimit(
    input: CreateDepositLimitInput
): Promise<DepositLimit> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user already has an active limit of this type
        const existingCheck = await client.query(
            `SELECT id FROM deposit_limits
             WHERE user_id = $1 AND limit_type = $2 AND status = 'ACTIVE'`,
            [input.user_id, input.limit_type]
        );

        if (existingCheck.rows.length > 0) {
            throw new Error(`User already has an active ${input.limit_type} deposit limit`);
        }

        const currency = input.currency || 'USD';
        const { start, end } = calculatePeriodDates(input.limit_type);
        const nextReset = calculateNextResetDate(input.limit_type);

        const result = await client.query(
            `INSERT INTO deposit_limits (
                user_id, limit_type, amount, currency,
                period_start_date, period_end_date, next_reset_date,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
            RETURNING *`,
            [input.user_id, input.limit_type, input.amount, currency, start, end, nextReset]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Update deposit limit
 * Compliance: Decrease immediate, Increase delayed (next period)
 */
export async function updateDepositLimit(
    input: UpdateDepositLimitInput
): Promise<DepositLimit> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get current active limit
        const currentLimit = await client.query(
            `SELECT * FROM deposit_limits
             WHERE user_id = $1 AND limit_type = $2 AND status = 'ACTIVE'`,
            [input.user_id, input.limit_type]
        );

        if (currentLimit.rows.length === 0) {
            throw new Error(`No active ${input.limit_type} deposit limit found`);
        }

        const current = currentLimit.rows[0];
        const isIncrease = input.new_amount > current.amount;

        if (isIncrease) {
            // INCREASE: Set as pending, effective next period
            const nextReset = calculateNextResetDate(input.limit_type);

            const result = await client.query(
                `UPDATE deposit_limits
                 SET pending_amount = $1,
                     pending_effective_date = $2,
                     is_increase = TRUE,
                     status = 'PENDING',
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3
                 RETURNING *`,
                [input.new_amount, nextReset, current.id]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } else {
            // DECREASE: Immediate effect (responsible gaming compliance)
            const result = await client.query(
                `UPDATE deposit_limits
                 SET amount = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [input.new_amount, current.id]
            );

            await client.query('COMMIT');
            return result.rows[0];
        }
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get all active limits for a user
 */
export async function getUserDepositLimits(
    userId: number
): Promise<DepositLimit[]> {
    const result = await pool.query(
        `SELECT * FROM deposit_limits
         WHERE user_id = $1
         AND status IN ('ACTIVE', 'PENDING')
         ORDER BY limit_type`,
        [userId]
    );

    return result.rows;
}

/**
 * Get active limits grouped by type
 */
export async function getUserDepositLimitsGrouped(
    userId: number
): Promise<Record<LimitType, DepositLimit | null>> {
    const limits = await getUserDepositLimits(userId);

    const grouped: Record<LimitType, DepositLimit | null> = {
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
export async function checkDepositLimit(
    userId: number,
    depositAmount: number,
    currency: string = 'USD'
): Promise<DepositLimitCheckResult> {
    const limits = await pool.query(
        `SELECT * FROM deposit_limits
         WHERE user_id = $1
         AND currency = $2
         AND status = 'ACTIVE'
         ORDER BY
            CASE limit_type
                WHEN 'DAILY' THEN 1
                WHEN 'WEEKLY' THEN 2
                WHEN 'MONTHLY' THEN 3
            END`,
        [userId, currency]
    );

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
export async function recordDepositAgainstLimits(
    userId: number,
    depositAmount: number,
    currency: string = 'USD',
    client?: PoolClient
): Promise<void> {
    const shouldRelease = !client;
    const dbClient = client || await pool.connect();

    try {
        if (!client) await dbClient.query('BEGIN');

        // Update all active limits for this currency
        await dbClient.query(
            `UPDATE deposit_limits
             SET spent_amount = spent_amount + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2
             AND currency = $3
             AND status = 'ACTIVE'`,
            [depositAmount, userId, currency]
        );

        if (!client) await dbClient.query('COMMIT');
    } catch (error) {
        if (!client) await dbClient.query('ROLLBACK');
        throw error;
    } finally {
        if (shouldRelease) dbClient.release();
    }
}

/**
 * Reset expired limits and create new ones for next period
 */
export async function resetExpiredLimits(): Promise<number> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Find expired limits
        const expiredLimits = await client.query(
            `SELECT * FROM deposit_limits
             WHERE status = 'ACTIVE'
             AND next_reset_date <= CURRENT_TIMESTAMP`
        );

        for (const limit of expiredLimits.rows) {
            // Mark old limit as expired
            await client.query(
                `UPDATE deposit_limits
                 SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [limit.id]
            );

            // Create new limit for next period
            const { start, end } = calculatePeriodDates(limit.limit_type);
            const nextReset = calculateNextResetDate(limit.limit_type);

            await client.query(
                `INSERT INTO deposit_limits (
                    user_id, limit_type, amount, currency,
                    period_start_date, period_end_date, next_reset_date,
                    status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')`,
                [limit.user_id, limit.limit_type, limit.amount, limit.currency, start, end, nextReset]
            );
        }

        await client.query('COMMIT');
        return expiredLimits.rows.length;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Delete/Cancel a deposit limit
 */
export async function cancelDepositLimit(
    userId: number,
    limitType: LimitType
): Promise<boolean> {
    const result = await pool.query(
        `UPDATE deposit_limits
         SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND limit_type = $2 AND status IN ('ACTIVE', 'PENDING')
         RETURNING id`,
        [userId, limitType]
    );

    return result.rows.length > 0;
}

/**
 * Get deposit limit history for a user
 */
export async function getDepositLimitHistory(
    userId: number,
    limit?: number
): Promise<any[]> {
    const result = await pool.query(
        `SELECT * FROM deposit_limit_history
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit || 50]
    );

    return result.rows;
}
