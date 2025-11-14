import pool from "../../db/postgres";

// =====================================================
// TYPES & INTERFACES
// =====================================================

export type ExclusionType = 'TEMPORARY' | 'PERMANENT' | 'TIMEOUT' | 'COOLING_OFF';
export type ExclusionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

// Duration options: 1d, 3d, 7d, 14d, 30d, 60d, 90d, 180d, 365d, PERMANENT
export type ExclusionDuration = '1d' | '3d' | '7d' | '14d' | '30d' | '60d' | '90d' | '180d' | '365d' | 'PERMANENT';

export interface SelfExclusion {
    id: number;
    user_id: number;
    exclusion_type: ExclusionType;
    duration: ExclusionDuration;
    start_date: Date;
    end_date: Date | null;
    can_login: boolean;
    can_deposit: boolean;
    can_withdraw: boolean;
    can_play: boolean;
    can_receive_marketing: boolean;
    reason: string;
    notes?: string;
    status: ExclusionStatus;
    revoked_at?: Date;
    revoked_by?: number;
    revocation_reason?: string;
    earliest_revocation_date?: Date;
    ip_address?: string;
    user_agent?: string;
    created_at: Date;
}

export interface CreateSelfExclusionInput {
    user_id: number;
    exclusion_type: ExclusionType;
    duration: ExclusionDuration;
    reason: string;
    notes?: string;
    ip_address?: string;
    user_agent?: string;
}

export interface SelfExclusionStatus {
    is_excluded: boolean;
    exclusion?: SelfExclusion;
    can_login: boolean;
    can_deposit: boolean;
    can_withdraw: boolean;
    can_play: boolean;
    can_receive_marketing: boolean;
    end_date?: Date;
    days_remaining?: number;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Convert duration string to Date
 */
function calculateEndDate(duration: ExclusionDuration, startDate: Date = new Date()): Date | null {
    if (duration === 'PERMANENT') {
        return null;
    }

    const days = parseInt(duration.replace('d', ''));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    return endDate;
}

/**
 * Calculate earliest revocation date (cooling period)
 * Compliance: Cannot revoke before a minimum period
 */
function calculateEarliestRevocationDate(duration: ExclusionDuration, startDate: Date): Date | null {
    if (duration === 'PERMANENT') {
        // Permanent exclusions usually require manual admin intervention
        return null;
    }

    const days = parseInt(duration.replace('d', ''));

    // Cooling period rules (example - adjust based on jurisdiction):
    // - 1-7 days: no early revocation
    // - 8-30 days: minimum 7 days
    // - 31-180 days: minimum 14 days
    // - 181+ days: minimum 30 days

    let coolingDays = 0;

    if (days <= 7) {
        coolingDays = days; // Full period
    } else if (days <= 30) {
        coolingDays = 7;
    } else if (days <= 180) {
        coolingDays = 14;
    } else {
        coolingDays = 30;
    }

    const earliestDate = new Date(startDate);
    earliestDate.setDate(earliestDate.getDate() + coolingDays);

    return earliestDate;
}

// =====================================================
// SERVICE FUNCTIONS
// =====================================================

/**
 * Create a self-exclusion for a user
 * CRITICAL: This immediately restricts user access
 */
export async function createSelfExclusion(
    input: CreateSelfExclusionInput
): Promise<SelfExclusion> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user already has an active self-exclusion
        const existingCheck = await client.query(
            `SELECT id FROM self_exclusions
             WHERE user_id = $1 AND status = 'ACTIVE'`,
            [input.user_id]
        );

        if (existingCheck.rows.length > 0) {
            throw new Error('User already has an active self-exclusion');
        }

        const startDate = new Date();
        const endDate = calculateEndDate(input.duration, startDate);
        const earliestRevocation = calculateEarliestRevocationDate(input.duration, startDate);

        // Set permissions based on exclusion type
        let canLogin = false;
        let canDeposit = false;
        let canWithdraw = true; // Usually can still withdraw funds
        let canPlay = false;
        let canReceiveMarketing = false;

        if (input.exclusion_type === 'TIMEOUT') {
            // Timeout: Less restrictive, just cooling off
            canLogin = true;
            canWithdraw = true;
        } else if (input.exclusion_type === 'COOLING_OFF') {
            // Cooling off: Can login to view account but not play
            canLogin = true;
            canWithdraw = true;
        }

        const result = await client.query(
            `INSERT INTO self_exclusions (
                user_id, exclusion_type, duration, start_date, end_date,
                can_login, can_deposit, can_withdraw, can_play, can_receive_marketing,
                reason, notes, earliest_revocation_date, ip_address, user_agent, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ACTIVE')
            RETURNING *`,
            [
                input.user_id, input.exclusion_type, input.duration, startDate, endDate,
                canLogin, canDeposit, canWithdraw, canPlay, canReceiveMarketing,
                input.reason, input.notes, earliestRevocation,
                input.ip_address, input.user_agent
            ]
        );

        // Update user status to reflect self-exclusion
        await client.query(
            `UPDATE users
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [input.user_id]
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
 * Get active self-exclusion for a user
 */
export async function getUserSelfExclusion(
    userId: number
): Promise<SelfExclusion | null> {
    const result = await pool.query(
        `SELECT * FROM self_exclusions
         WHERE user_id = $1 AND status = 'ACTIVE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] || null;
}

/**
 * Check self-exclusion status with detailed permissions
 */
export async function checkSelfExclusionStatus(
    userId: number
): Promise<SelfExclusionStatus> {
    const exclusion = await getUserSelfExclusion(userId);

    if (!exclusion) {
        return {
            is_excluded: false,
            can_login: true,
            can_deposit: true,
            can_withdraw: true,
            can_play: true,
            can_receive_marketing: true
        };
    }

    let daysRemaining: number | undefined;
    if (exclusion.end_date) {
        const now = new Date();
        const end = new Date(exclusion.end_date);
        daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
        is_excluded: true,
        exclusion,
        can_login: exclusion.can_login,
        can_deposit: exclusion.can_deposit,
        can_withdraw: exclusion.can_withdraw,
        can_play: exclusion.can_play,
        can_receive_marketing: exclusion.can_receive_marketing,
        end_date: exclusion.end_date || undefined,
        days_remaining: daysRemaining
    };
}

/**
 * Revoke/End a self-exclusion early
 * COMPLIANCE: Only allowed after cooling period
 */
export async function revokeSelfExclusion(
    userId: number,
    revokedBy: number,
    reason: string
): Promise<SelfExclusion> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const exclusion = await getUserSelfExclusion(userId);

        if (!exclusion) {
            throw new Error('No active self-exclusion found');
        }

        // Check if within cooling period
        if (exclusion.earliest_revocation_date) {
            const now = new Date();
            const earliest = new Date(exclusion.earliest_revocation_date);

            if (now < earliest) {
                const daysRemaining = Math.ceil(
                    (earliest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );
                throw new Error(
                    `Cannot revoke self-exclusion before cooling period ends. ${daysRemaining} days remaining.`
                );
            }
        }

        // Permanent exclusions cannot be self-revoked
        if (exclusion.exclusion_type === 'PERMANENT') {
            throw new Error('Permanent self-exclusions require admin intervention');
        }

        const result = await client.query(
            `UPDATE self_exclusions
             SET status = 'REVOKED',
                 revoked_at = CURRENT_TIMESTAMP,
                 revoked_by = $1,
                 revocation_reason = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [revokedBy, reason, exclusion.id]
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
 * Expire old self-exclusions (cron job)
 */
export async function expireSelfExclusions(): Promise<number> {
    const result = await pool.query(
        `UPDATE self_exclusions
         SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
         WHERE status = 'ACTIVE'
         AND end_date IS NOT NULL
         AND end_date <= CURRENT_TIMESTAMP
         RETURNING id`
    );

    return result.rows.length;
}

/**
 * Get self-exclusion history for a user
 */
export async function getSelfExclusionHistory(
    userId: number
): Promise<SelfExclusion[]> {
    const result = await pool.query(
        `SELECT * FROM self_exclusions
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows;
}

/**
 * Admin: Force close a self-exclusion
 */
export async function adminCloseSelfExclusion(
    userId: number,
    adminId: number,
    reason: string
): Promise<SelfExclusion> {
    const result = await pool.query(
        `UPDATE self_exclusions
         SET status = 'REVOKED',
             revoked_at = CURRENT_TIMESTAMP,
             revoked_by = $1,
             revocation_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3 AND status = 'ACTIVE'
         RETURNING *`,
        [adminId, reason, userId]
    );

    if (result.rows.length === 0) {
        throw new Error('No active self-exclusion found');
    }

    return result.rows[0];
}
