import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";

export interface AffiliateBalanceSummary {
  user_id: number;
  affiliate_balance: number;
  affiliate_balance_locked: number;
  affiliate_total_earned: number;
  affiliate_total_redeemed: number;
  pending_commissions: number;
  approved_commissions: number;
  total_referrals: number;
}

export interface RedemptionResult {
  redemption_id: number;
  total_amount: number;
  instant_amount: number;
  locked_amount: number;
  unlock_date: Date;
  instant_transaction_id?: number;
}

export interface AffiliateBalanceTransaction {
  id: number;
  user_id: number;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  created_at: Date;
}

export class AffiliateBalanceService {
  /**
   * Get affiliate balance summary
   */
  static async getBalanceSummary(userId: number): Promise<AffiliateBalanceSummary> {
    const result = await pool.query(
      'SELECT * FROM get_affiliate_balance_summary($1)',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Affiliate balance not found', 404);
    }

    return result.rows[0];
  }

  /**
   * Get balance transaction history
   */
  static async getBalanceHistory(userId: number, filters: {
    page?: number;
    limit?: number;
    transactionType?: string;
  }): Promise<{ transactions: AffiliateBalanceTransaction[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 50, transactionType } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (transactionType) {
      conditions.push(`transaction_type = $${paramIndex++}`);
      params.push(transactionType);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_balance_transactions WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get transactions
    const result = await pool.query(
      `SELECT
        abt.*,
        ac.commission_type,
        ac.base_amount as commission_base_amount,
        ar.total_amount as redemption_total_amount
       FROM affiliate_balance_transactions abt
       LEFT JOIN affiliate_commissions ac ON abt.commission_id = ac.id
       LEFT JOIN affiliate_redemptions ar ON abt.redemption_id = ar.id
       WHERE ${whereClause}
       ORDER BY abt.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      transactions: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Request affiliate balance redemption (creates PENDING request for admin approval)
   */
  static async processRedemption(userId: number, amount: number, notes?: string): Promise<RedemptionResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current affiliate balance
      const balanceResult = await client.query(
        'SELECT affiliate_balance FROM user_balances WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        throw new ApiError('User balance not found', 404);
      }

      const currentBalance = parseFloat(balanceResult.rows[0].affiliate_balance);

      // Get redemption settings
      const settingsResult = await client.query(
        "SELECT setting_value FROM affiliate_settings WHERE setting_key = 'redemption_settings'"
      );

      const redemptionSettings = settingsResult.rows[0]?.setting_value || {
        minimum_redemption: 50.00,
        instant_percentage: 50,
        lock_days: 7
      };

      const minRedemption = parseFloat(redemptionSettings.minimum_redemption);
      const instantPercentage = parseInt(redemptionSettings.instant_percentage);
      const lockDays = parseInt(redemptionSettings.lock_days);

      // Validate redemption amount
      if (amount < minRedemption) {
        throw new ApiError(`Minimum redemption amount is ${minRedemption}`, 400);
      }

      if (amount > currentBalance) {
        throw new ApiError('Insufficient affiliate balance', 400);
      }

      // Calculate instant and locked amounts
      const instantAmount = (amount * instantPercentage) / 100;
      const lockedAmount = amount - instantAmount;
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + lockDays);

      // Lock the amount in affiliate_balance_locked (but don't transfer yet)
      await client.query(
        `UPDATE user_balances
         SET affiliate_balance = affiliate_balance - $1,
             affiliate_balance_locked = affiliate_balance_locked + $1
         WHERE user_id = $2`,
        [amount, userId]
      );

      // Create PENDING redemption record (waits for admin approval)
      const redemptionResult = await client.query(
        `INSERT INTO affiliate_redemptions (
          user_id, total_amount, instant_amount, locked_amount,
          instant_status, locked_status, unlock_date, notes
        ) VALUES ($1, $2, $3, $4, 'pending', 'locked', $5, $6)
        RETURNING id`,
        [userId, amount, instantAmount, lockedAmount, unlockDate, notes]
      );

      const redemptionId = redemptionResult.rows[0].id;

      // Create affiliate balance transaction for pending redemption
      await client.query(
        `INSERT INTO affiliate_balance_transactions (
          user_id, transaction_type, amount, balance_before, balance_after,
          redemption_id, description
        ) VALUES ($1, 'redemption_pending', $2, $3, $4, $5, $6)`,
        [
          userId,
          amount,
          currentBalance,
          currentBalance - amount,
          redemptionId,
          `Redemption request: $${amount} (pending admin approval)`
        ]
      );

      await client.query('COMMIT');

      return {
        redemption_id: redemptionId,
        total_amount: amount,
        instant_amount: instantAmount,
        locked_amount: lockedAmount,
        unlock_date: unlockDate,
        instant_transaction_id: null
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Approve redemption (ADMIN) - transfers money to main wallet
   */
  static async approveRedemption(redemptionId: number, adminId: number, adminNotes?: string): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get redemption details
      const redemptionResult = await client.query(
        'SELECT * FROM affiliate_redemptions WHERE id = $1 FOR UPDATE',
        [redemptionId]
      );

      if (redemptionResult.rows.length === 0) {
        throw new ApiError('Redemption not found', 404);
      }

      const redemption = redemptionResult.rows[0];

      // Check if already processed
      if (redemption.instant_status !== 'pending') {
        throw new ApiError(`Redemption already ${redemption.instant_status}`, 400);
      }

      const userId = redemption.user_id;
      const totalAmount = parseFloat(redemption.total_amount);
      const instantAmount = parseFloat(redemption.instant_amount);
      const lockedAmount = parseFloat(redemption.locked_amount);

      // Transfer ONLY INSTANT AMOUNT to main wallet immediately
      // Locked amount stays in affiliate_balance_locked until unlock_date
      await client.query(
        `UPDATE user_balances
         SET affiliate_balance_locked = affiliate_balance_locked - $1,
             balance = balance + $1,
             affiliate_total_redeemed = affiliate_total_redeemed + $1
         WHERE user_id = $2`,
        [instantAmount, userId]
      );

      // Create transaction in main transactions table for INSTANT amount only
      const mainTxResult = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, currency, status, description,
          metadata
        ) VALUES ($1, 'bonus', $2, 'USD', 'completed',
                 'Affiliate commission redeemed to main wallet (instant release)',
                 $3)
        RETURNING id`,
        [
          userId,
          instantAmount,
          JSON.stringify({
            redemption_id: redemptionId,
            redemption_type: 'instant_release',
            instant_amount: instantAmount,
            locked_amount: lockedAmount,
            total_amount: totalAmount
          })
        ]
      );

      const instantTransactionId = mainTxResult.rows[0].id;

      // Update redemption status - instant completed, locked still pending unlock
      await client.query(
        `UPDATE affiliate_redemptions
         SET instant_status = 'completed',
             locked_status = $1,
             instant_transaction_id = $2,
             processed_by = $3,
             processed_at = CURRENT_TIMESTAMP,
             admin_notes = $4
         WHERE id = $5`,
        [
          lockedAmount > 0 ? 'locked' : 'unlocked',
          instantTransactionId,
          adminId,
          adminNotes,
          redemptionId
        ]
      );

      // Create affiliate balance transaction for approval
      const description = lockedAmount > 0
        ? `Redemption approved: $${instantAmount.toFixed(2)} transferred immediately to main wallet, $${lockedAmount.toFixed(2)} locked until ${redemption.unlock_date ? new Date(redemption.unlock_date).toLocaleDateString() : 'unlock date'}.`
        : `Redemption approved: $${instantAmount.toFixed(2)} transferred to main wallet. You can now withdraw from your main balance.`;

      await client.query(
        `INSERT INTO affiliate_balance_transactions (
          user_id, transaction_type, amount, balance_before, balance_after,
          redemption_id, description
        ) VALUES ($1, 'redemption_approved', $2, 0, 0, $3, $4)`,
        [
          userId,
          instantAmount,
          redemptionId,
          description
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        redemption_id: redemptionId,
        transaction_id: instantTransactionId,
        total_amount: totalAmount,
        transferred_to_wallet: totalAmount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Process locked amounts that are ready to be released (CRON JOB)
   * Finds all redemptions with locked_status='locked' and unlock_date <= now
   */
  static async processLockedReleases(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      // Find all locked amounts ready for release
      const result = await pool.query(
        `SELECT id, user_id, locked_amount, unlock_date
         FROM affiliate_redemptions
         WHERE locked_status = 'locked'
           AND unlock_date <= CURRENT_TIMESTAMP
           AND instant_status = 'completed'
         ORDER BY unlock_date ASC
         LIMIT 100`
      );

      console.log(`[Locked Release] Found ${result.rows.length} redemptions ready for unlock`);

      for (const redemption of result.rows) {
        try {
          await this.releaseLockedAmount(redemption.id);
          processed++;
          console.log(`[Locked Release] Released redemption #${redemption.id}: $${redemption.locked_amount}`);
        } catch (err) {
          errors++;
          console.error(`[Locked Release] Failed to release redemption #${redemption.id}:`, err);
        }
      }

      return { processed, errors };
    } catch (error) {
      console.error('[Locked Release] Error processing locked releases:', error);
      throw error;
    }
  }

  /**
   * Release a single locked amount to main wallet
   */
  static async releaseLockedAmount(redemptionId: number): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get redemption details
      const redemptionResult = await client.query(
        'SELECT * FROM affiliate_redemptions WHERE id = $1 FOR UPDATE',
        [redemptionId]
      );

      if (redemptionResult.rows.length === 0) {
        throw new ApiError('Redemption not found', 404);
      }

      const redemption = redemptionResult.rows[0];

      if (redemption.locked_status !== 'locked') {
        throw new ApiError('Redemption locked amount already processed', 400);
      }

      const userId = redemption.user_id;
      const lockedAmount = parseFloat(redemption.locked_amount);

      if (lockedAmount <= 0) {
        // No locked amount to release
        await client.query(
          `UPDATE affiliate_redemptions
           SET locked_status = 'unlocked',
               unlocked_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [redemptionId]
        );
        await client.query('COMMIT');
        return { success: true, message: 'No locked amount to release' };
      }

      // Transfer locked amount to main wallet
      await client.query(
        `UPDATE user_balances
         SET affiliate_balance_locked = affiliate_balance_locked - $1,
             balance = balance + $1,
             affiliate_total_redeemed = affiliate_total_redeemed + $1
         WHERE user_id = $2`,
        [lockedAmount, userId]
      );

      // Create transaction in main transactions table
      const txResult = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, currency, status, description,
          metadata
        ) VALUES ($1, 'bonus', $2, 'USD', 'completed',
                 'Affiliate locked commission released to main wallet',
                 $3)
        RETURNING id`,
        [
          userId,
          lockedAmount,
          JSON.stringify({
            redemption_id: redemptionId,
            redemption_type: 'locked_release',
            locked_amount: lockedAmount
          })
        ]
      );

      const unlockTransactionId = txResult.rows[0].id;

      // Update redemption status
      await client.query(
        `UPDATE affiliate_redemptions
         SET locked_status = 'unlocked',
             unlock_transaction_id = $1,
             unlocked_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [unlockTransactionId, redemptionId]
      );

      // Create affiliate balance transaction
      await client.query(
        `INSERT INTO affiliate_balance_transactions (
          user_id, transaction_type, amount, balance_before, balance_after,
          redemption_id, description
        ) VALUES ($1, 'redemption_unlocked', $2, 0, 0, $3, $4)`,
        [
          userId,
          lockedAmount,
          redemptionId,
          `Locked amount released: $${lockedAmount.toFixed(2)} transferred to main wallet after security hold period.`
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        redemption_id: redemptionId,
        locked_amount: lockedAmount,
        transaction_id: unlockTransactionId
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject redemption (ADMIN) - refunds locked amount back to affiliate balance
   */
  static async rejectRedemption(redemptionId: number, adminId: number, reason: string, adminNotes?: string): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get redemption details
      const redemptionResult = await client.query(
        'SELECT * FROM affiliate_redemptions WHERE id = $1 FOR UPDATE',
        [redemptionId]
      );

      if (redemptionResult.rows.length === 0) {
        throw new ApiError('Redemption not found', 404);
      }

      const redemption = redemptionResult.rows[0];

      // Check if already processed
      if (redemption.instant_status !== 'pending') {
        throw new ApiError(`Redemption already ${redemption.instant_status}`, 400);
      }

      const userId = redemption.user_id;
      const totalAmount = parseFloat(redemption.total_amount);

      // Refund locked amount back to affiliate balance
      await client.query(
        `UPDATE user_balances
         SET affiliate_balance = affiliate_balance + $1,
             affiliate_balance_locked = affiliate_balance_locked - $1
         WHERE user_id = $2`,
        [totalAmount, userId]
      );

      // Update redemption status
      await client.query(
        `UPDATE affiliate_redemptions
         SET instant_status = 'rejected',
             locked_status = 'cancelled',
             processed_by = $1,
             processed_at = CURRENT_TIMESTAMP,
             rejection_reason = $2,
             admin_notes = $3,
             cancelled_by = $1,
             cancelled_at = CURRENT_TIMESTAMP,
             cancellation_reason = $2
         WHERE id = $4`,
        [adminId, reason, adminNotes, redemptionId]
      );

      // Create affiliate balance transaction for rejection
      await client.query(
        `INSERT INTO affiliate_balance_transactions (
          user_id, transaction_type, amount, balance_before, balance_after,
          redemption_id, description
        ) VALUES ($1, 'redemption_rejected', $2, 0, 0, $3, $4)`,
        [
          userId,
          totalAmount,
          redemptionId,
          `Redemption rejected: $${totalAmount} refunded to affiliate balance. Reason: ${reason}`
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        redemption_id: redemptionId,
        refunded_amount: totalAmount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get redemption history for user
   */
  static async getRedemptionHistory(userId: number, filters: {
    page?: number;
    limit?: number;
  }): Promise<{ redemptions: any[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM affiliate_redemptions WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);

    // Get redemptions with mapped status
    const result = await pool.query(
      `SELECT
        id,
        user_id,
        total_amount,
        instant_amount,
        locked_amount,
        instant_status,
        locked_status,
        CASE
          WHEN instant_status = 'pending' THEN 'requested'
          WHEN instant_status = 'completed' THEN 'completed'
          WHEN instant_status = 'rejected' THEN 'rejected'
          WHEN instant_status = 'failed' THEN 'failed'
          WHEN instant_status = 'cancelled' THEN 'cancelled'
          ELSE instant_status
        END as status,
        instant_transaction_id,
        unlock_transaction_id,
        unlock_date,
        processed_by,
        processed_at,
        unlocked_at,
        notes,
        admin_notes,
        rejection_reason,
        created_at,
        updated_at
       FROM affiliate_redemptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      redemptions: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get pending unlocks for user
   */
  static async getPendingUnlocks(userId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        id as redemption_id,
        locked_amount,
        unlock_date,
        EXTRACT(DAY FROM (unlock_date - CURRENT_TIMESTAMP))::INTEGER as days_until_unlock,
        EXTRACT(HOUR FROM (unlock_date - CURRENT_TIMESTAMP))::INTEGER as hours_until_unlock
       FROM affiliate_redemptions
       WHERE user_id = $1
         AND locked_status = 'locked'
         AND unlock_date > CURRENT_TIMESTAMP
       ORDER BY unlock_date ASC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Unlock redemptions that have reached unlock date (CRON JOB)
   */
  static async unlockPendingRedemptions(): Promise<number> {
    const client = await pool.connect();
    let unlockedCount = 0;

    try {
      // Get all redemptions ready to unlock
      const result = await client.query(
        `SELECT * FROM affiliate_redemptions
         WHERE locked_status = 'locked'
           AND unlock_date <= CURRENT_TIMESTAMP
         ORDER BY unlock_date ASC`
      );

      for (const redemption of result.rows) {
        try {
          await client.query('BEGIN');

          // Transfer from locked to main balance
          await client.query(
            `UPDATE user_balances
             SET affiliate_balance_locked = affiliate_balance_locked - $1,
                 balance = balance + $1
             WHERE user_id = $2`,
            [redemption.locked_amount, redemption.user_id]
          );

          // Create transaction in main transactions table
          const mainTxResult = await client.query(
            `INSERT INTO transactions (
              user_id, type, amount, currency, status, description,
              metadata, balance_before, balance_after
            ) VALUES ($1, 'bonus', $2, 'USD', 'completed',
                     'Affiliate commission redemption (unlocked)',
                     $3, $4, $5)
            RETURNING id`,
            [
              redemption.user_id,
              redemption.locked_amount,
              JSON.stringify({ redemption_id: redemption.id, redemption_type: 'unlocked' }),
              0,
              0
            ]
          );

          // Update redemption status
          await client.query(
            `UPDATE affiliate_redemptions
             SET locked_status = 'unlocked',
                 unlocked_at = CURRENT_TIMESTAMP,
                 unlock_transaction_id = $1
             WHERE id = $2`,
            [mainTxResult.rows[0].id, redemption.id]
          );

          // Create affiliate balance transaction
          await client.query(
            `INSERT INTO affiliate_balance_transactions (
              user_id, transaction_type, amount, balance_before, balance_after,
              redemption_id, description
            ) VALUES ($1, 'redemption_unlocked', $2, $3, $4, $5, $6)`,
            [
              redemption.user_id,
              redemption.locked_amount,
              0, // Locked balance doesn't change
              0,
              redemption.id,
              `Unlocked ${redemption.locked_amount} from redemption #${redemption.id}`
            ]
          );

          await client.query('COMMIT');
          unlockedCount++;
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Failed to unlock redemption ${redemption.id}:`, error);
        }
      }

      return unlockedCount;
    } finally {
      client.release();
    }
  }

  /**
   * Get all redemptions (ADMIN)
   */
  static async getAllRedemptions(filters: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: number;
  }): Promise<{ redemptions: any[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 50, status, userId } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`locked_status = $${paramIndex++}`);
      params.push(status);
    }

    if (userId) {
      conditions.push(`ar.user_id = $${paramIndex++}`);
      params.push(userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_redemptions ar ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get redemptions with user details
    const result = await pool.query(
      `SELECT
        ar.*,
        u.username,
        u.email,
        ap.referral_code,
        ap.display_name as affiliate_name
       FROM affiliate_redemptions ar
       JOIN users u ON ar.user_id = u.id
       LEFT JOIN affiliate_profiles ap ON ap.user_id = ar.user_id
       ${whereClause}
       ORDER BY ar.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      redemptions: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Adjust affiliate balance (ADMIN)
   */
  static async adjustBalance(
    userId: number,
    amount: number,
    description: string,
    adminId: number
  ): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current balance
      const balanceResult = await client.query(
        'SELECT affiliate_balance FROM user_balances WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        throw new ApiError('User balance not found', 404);
      }

      const balanceBefore = parseFloat(balanceResult.rows[0].affiliate_balance);
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) {
        throw new ApiError('Adjustment would result in negative balance', 400);
      }

      // Update balance
      await client.query(
        `UPDATE user_balances
         SET affiliate_balance = affiliate_balance + $1,
             affiliate_total_earned = CASE WHEN $1 > 0 THEN affiliate_total_earned + $1 ELSE affiliate_total_earned END
         WHERE user_id = $2`,
        [amount, userId]
      );

      // Create balance transaction
      const result = await client.query(
        `INSERT INTO affiliate_balance_transactions (
          user_id, transaction_type, amount, balance_before, balance_after,
          description, created_by
        ) VALUES ($1, 'adjustment', $2, $3, $4, $5, $6)
        RETURNING *`,
        [userId, amount, balanceBefore, balanceAfter, description, adminId]
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
}
