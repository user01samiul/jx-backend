import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";
import { BonusWalletService } from "./bonus-wallet.service";
import { BonusTransactionService } from "./bonus-transaction.service";
import { BonusPlanService } from "./bonus-plan.service";

export interface BonusInstance {
  id?: number;
  bonus_plan_id: number;
  player_id: number;
  bonus_type?: string;
  bonus_amount: number;
  remaining_bonus: number;
  deposit_amount?: number;
  deposit_transaction_id?: number;
  wager_requirement_amount: number;
  wager_requirement_multiplier?: number;
  wager_requirement_type?: string;
  wager_progress_amount: number;
  wager_percentage_complete: number;
  status: string;
  granted_at: Date;
  activated_at?: Date;
  expires_at?: Date;
  completed_at?: Date;
  code_used?: string;
  notes?: string;
  granted_by?: number;
  games_played?: any;
  total_bets_count: number;
  total_wins_amount: number;
  bonus_plan?: {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
    bonus_code?: string;
    bonus_type?: string;
  };
}

export class BonusInstanceService {
  /**
   * Grant a deposit bonus automatically
   */
  static async grantDepositBonus(
    playerId: number,
    depositAmount: number,
    depositTransactionId: number,
    paymentMethodId?: number
  ): Promise<BonusInstance[]> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find eligible bonuses
      const eligiblePlans = await BonusPlanService.getActiveDepositBonuses(
        depositAmount,
        paymentMethodId
      );

      const grantedBonuses: BonusInstance[] = [];

      for (const plan of eligiblePlans) {
        try {
          // Check eligibility (with row locking to prevent race conditions)
          const isEligible = await this.checkEligibility(playerId, plan.id!, client);

          if (!isEligible.eligible) {
            console.log(`Player ${playerId} not eligible for bonus ${plan.id}: ${isEligible.reason}`);
            continue;
          }

          // Calculate bonus amount
          let bonusAmount = 0;
          if (plan.award_type === 'percentage') {
            bonusAmount = depositAmount * (plan.amount / 100);
          } else {
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
          const wagerRequired = this.calculateWagerRequirement(
            bonusAmount,
            depositAmount,
            plan.wager_requirement_type!,
            plan.wager_requirement_multiplier
          );

          // Calculate expiry date
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + plan.expiry_days);

          // Create bonus instance (database constraints will prevent duplicates)
          const instanceResult = await client.query(
            `INSERT INTO bonus_instances (
              bonus_plan_id, player_id, bonus_amount, remaining_bonus,
              deposit_amount, deposit_transaction_id, wager_requirement_amount,
              wager_progress_amount, wager_percentage_complete, status,
              granted_at, expires_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, NOW(), NOW())
            RETURNING *`,
            [
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
            ]
          );

          const bonusInstance = instanceResult.rows[0];

          // Add to bonus wallet
          await BonusWalletService.addBonus(playerId, bonusAmount, false);

          // Create wagering progress
          await client.query(
            `INSERT INTO bonus_wager_progress (
              bonus_instance_id, player_id, required_wager_amount,
              current_wager_amount, remaining_wager_amount, completion_percentage,
              started_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [bonusInstance.id, playerId, wagerRequired, 0, wagerRequired, 0]
          );

          // Create transaction
          await BonusTransactionService.createTransaction({
            bonus_instance_id: bonusInstance.id,
            player_id: playerId,
            transaction_type: 'granted',
            amount: bonusAmount,
            description: `Deposit bonus granted for deposit of ${depositAmount}`
          }, client);

          // Create audit log
          await BonusTransactionService.createAuditLog({
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
        } catch (bonusError: any) {
          // Handle constraint violations for deposit bonuses
          if (bonusError.code === '23505') {
            console.log(`Deposit bonus ${plan.id} already granted for transaction ${depositTransactionId}`);
            // Skip this bonus and continue to next
            continue;
          }
          // Re-throw other errors
          throw bonusError;
        }
      }

      await client.query('COMMIT');

      return grantedBonuses;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Grant bonus using code
   */
  static async grantCodedBonus(playerId: number, code: string): Promise<BonusInstance> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get bonus plan by code
      const plan = await BonusPlanService.getPlanByCode(code);

      if (!plan) {
        throw new ApiError('Invalid or inactive bonus code', 400);
      }

      // Check if code usage limit reached
      if (plan.max_code_usage && plan.current_code_usage! >= plan.max_code_usage) {
        throw new ApiError('This bonus code has reached its maximum usage limit', 400);
      }

      // Check validity period
      const now = new Date();
      if (now < plan.start_date || now > plan.end_date) {
        throw new ApiError('This bonus code is expired or not yet active', 400);
      }

      // Check eligibility (with row locking to prevent race conditions)
      const eligibility = await this.checkEligibility(playerId, plan.id!, client);

      if (!eligibility.eligible) {
        throw new ApiError(eligibility.reason!, 400);
      }

      const bonusAmount = plan.amount;
      const wagerRequired = this.calculateWagerRequirement(
        bonusAmount,
        0,
        plan.wager_requirement_type!,
        plan.wager_requirement_multiplier
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.expiry_days);

      // Create bonus instance (database trigger will enforce max_trigger_per_player)
      const instanceResult = await client.query(
        `INSERT INTO bonus_instances (
          bonus_plan_id, player_id, bonus_amount, remaining_bonus,
          wager_requirement_amount, wager_progress_amount, wager_percentage_complete,
          status, granted_at, expires_at, code_used, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, NOW(), NOW())
        RETURNING *`,
        [
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
        ]
      );

      const bonusInstance = instanceResult.rows[0];

      // Increment code usage
      await BonusPlanService.incrementCodeUsage(plan.id!);

      // Add to bonus wallet
      await BonusWalletService.addBonus(playerId, bonusAmount, false);

      // Create wagering progress
      await client.query(
        `INSERT INTO bonus_wager_progress (
          bonus_instance_id, player_id, required_wager_amount,
          current_wager_amount, remaining_wager_amount, completion_percentage,
          started_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [bonusInstance.id, playerId, wagerRequired, 0, wagerRequired, 0]
      );

      // Create transaction
      await BonusTransactionService.createTransaction({
        bonus_instance_id: bonusInstance.id,
        player_id: playerId,
        transaction_type: 'granted',
        amount: bonusAmount,
        description: `Coded bonus applied: ${code}`
      }, client);

      // Create audit log
      await BonusTransactionService.createAuditLog({
        bonus_plan_id: plan.id,
        bonus_instance_id: bonusInstance.id,
        player_id: playerId,
        action_type: 'bonus_code_applied',
        action_description: `Bonus code "${code}" applied`,
        new_value: bonusInstance
      });

      await client.query('COMMIT');

      return this.formatInstance(bonusInstance);
    } catch (error: any) {
      await client.query('ROLLBACK');

      // Handle unique constraint violations (duplicate bonus claims)
      if (error.code === '23505') {
        // PostgreSQL unique violation error code
        if (error.message?.includes('idx_unique_coded_bonus_per_player')) {
          throw new ApiError('You have already claimed this bonus. Each bonus can only be claimed once.', 400);
        } else if (error.message?.includes('Maximum bonus claims reached')) {
          throw new ApiError('You have already claimed this bonus the maximum number of times allowed', 400);
        } else {
          throw new ApiError('This bonus has already been claimed', 400);
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Grant manual bonus (admin)
   */
  static async grantManualBonus(
    playerId: number,
    bonusPlanId: number,
    customAmount: number | null,
    notes: string,
    adminUserId: number
  ): Promise<BonusInstance> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const plan = await BonusPlanService.getPlanById(bonusPlanId);

      if (!plan) {
        throw new ApiError('Bonus plan not found', 404);
      }

      if (plan.trigger_type !== 'manual') {
        throw new ApiError('This bonus plan is not manual type', 400);
      }

      const bonusAmount = customAmount || plan.amount;
      const wagerRequired = this.calculateWagerRequirement(
        bonusAmount,
        0,
        plan.wager_requirement_type!,
        plan.wager_requirement_multiplier
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.expiry_days);

      // Create bonus instance
      const instanceResult = await client.query(
        `INSERT INTO bonus_instances (
          bonus_plan_id, player_id, bonus_amount, remaining_bonus,
          wager_requirement_amount, wager_progress_amount, wager_percentage_complete,
          status, granted_at, expires_at, notes, granted_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, NOW(), NOW())
        RETURNING *`,
        [
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
        ]
      );

      const bonusInstance = instanceResult.rows[0];

      // Add to bonus wallet
      await BonusWalletService.addBonus(playerId, bonusAmount, false);

      // Create wagering progress
      await client.query(
        `INSERT INTO bonus_wager_progress (
          bonus_instance_id, player_id, required_wager_amount,
          current_wager_amount, remaining_wager_amount, completion_percentage,
          started_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [bonusInstance.id, playerId, wagerRequired, 0, wagerRequired, 0]
      );

      // Create transaction
      await BonusTransactionService.createTransaction({
        bonus_instance_id: bonusInstance.id,
        player_id: playerId,
        transaction_type: 'granted',
        amount: bonusAmount,
        description: `Manual bonus granted by admin. Notes: ${notes}`
      }, client);

      // Create audit log
      await BonusTransactionService.createAuditLog({
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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get active bonuses for a player
   */
  static async getPlayerActiveBonuses(playerId: number): Promise<BonusInstance[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT bi.*,
                bp.id as plan_id,
                bp.name as plan_name,
                bp.description as plan_description,
                bp.image_url as plan_image_url,
                bp.bonus_code as plan_bonus_code,
                bp.trigger_type as plan_trigger_type,
                bp.wager_requirement_multiplier as plan_wager_multiplier,
                bp.wager_requirement_type as plan_wager_type,
                bp.is_playable as plan_is_playable,
                bp.cancel_on_withdrawal as plan_cancel_on_withdrawal,
                bp.playable_bonus_qualifies as plan_playable_bonus_qualifies,
                CASE
                  WHEN bi.wager_progress_amount >= bi.wager_requirement_amount THEN 'completed'
                  WHEN NOW() > bi.expires_at THEN 'expired'
                  WHEN bi.status = 'forfeited' THEN 'forfeited'
                  WHEN bi.status = 'cancelled' THEN 'cancelled'
                  ELSE bi.status
                END as computed_status
         FROM bonus_instances bi
         INNER JOIN bonus_plans bp ON bi.bonus_plan_id = bp.id
         WHERE bi.player_id = $1
         AND bi.status IN ('active', 'wagering')
         ORDER BY bi.granted_at DESC`,
        [playerId]
      );

      return result.rows.map(row => this.formatInstance(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get all bonuses for a player (including completed/expired)
   */
  static async getPlayerBonuses(
    playerId: number,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ): Promise<{ bonuses: BonusInstance[]; total: number }> {
    const client = await pool.connect();

    try {
      const { limit = 50, offset = 0, status } = options;

      let whereConditions = ['bi.player_id = $1'];
      let params: any[] = [playerId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`bi.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM bonus_instances bi WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get bonuses
      params.push(limit, offset);
      const result = await client.query(
        `SELECT bi.*,
                bp.id as plan_id,
                bp.name as plan_name,
                bp.description as plan_description,
                bp.image_url as plan_image_url,
                bp.bonus_code as plan_bonus_code,
                bp.trigger_type as plan_trigger_type,
                bp.wager_requirement_multiplier as plan_wager_multiplier,
                bp.wager_requirement_type as plan_wager_type,
                bp.is_playable as plan_is_playable,
                bp.cancel_on_withdrawal as plan_cancel_on_withdrawal,
                bp.playable_bonus_qualifies as plan_playable_bonus_qualifies,
                CASE
                  WHEN bi.wager_progress_amount >= bi.wager_requirement_amount THEN 'completed'
                  WHEN NOW() > bi.expires_at THEN 'expired'
                  WHEN bi.status = 'forfeited' THEN 'forfeited'
                  WHEN bi.status = 'cancelled' THEN 'cancelled'
                  ELSE bi.status
                END as computed_status
         FROM bonus_instances bi
         INNER JOIN bonus_plans bp ON bi.bonus_plan_id = bp.id
         WHERE ${whereClause}
         ORDER BY bi.granted_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return {
        bonuses: result.rows.map(row => this.formatInstance(row)),
        total
      };
    } finally {
      client.release();
    }
  }

  /**
   * Forfeit bonus (on withdrawal or rule violation)
   */
  static async forfeitBonus(bonusInstanceId: number, reason: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const instanceResult = await client.query(
        'SELECT * FROM bonus_instances WHERE id = $1',
        [bonusInstanceId]
      );

      if (instanceResult.rows.length === 0) {
        throw new ApiError('Bonus instance not found', 404);
      }

      const instance = instanceResult.rows[0];

      if (instance.status !== 'active' && instance.status !== 'wagering') {
        throw new ApiError('Bonus is not active', 400);
      }

      const remainingBonus = parseFloat(instance.remaining_bonus);

      // Update bonus instance status
      await client.query(
        `UPDATE bonus_instances
         SET status = 'forfeited',
             remaining_bonus = 0,
             updated_at = NOW()
         WHERE id = $1`,
        [bonusInstanceId]
      );

      // Forfeit from wallet
      await BonusWalletService.forfeitBonus(instance.player_id, remainingBonus);

      // Create transaction
      await BonusTransactionService.createTransaction({
        bonus_instance_id: bonusInstanceId,
        player_id: instance.player_id,
        transaction_type: 'forfeited',
        amount: remainingBonus,
        description: `Bonus forfeited: ${reason}`
      }, client);

      // Create audit log
      await BonusTransactionService.createAuditLog({
        bonus_instance_id: bonusInstanceId,
        player_id: instance.player_id,
        action_type: 'bonus_forfeited',
        action_description: `Bonus forfeited: ${reason}`,
        old_value: instance
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel all active bonuses on withdrawal request
   */
  static async cancelBonusesOnWithdrawal(playerId: number): Promise<void> {
    const activeBonuses = await this.getPlayerActiveBonuses(playerId);

    for (const bonus of activeBonuses) {
      const plan = await BonusPlanService.getPlanById(bonus.bonus_plan_id);

      if (plan && plan.cancel_on_withdrawal) {
        await this.forfeitBonus(bonus.id!, 'Withdrawal requested - bonus cancelled as per terms');
      }
    }
  }

  /**
   * Check player eligibility for a bonus
   */
  private static async checkEligibility(
    playerId: number,
    bonusPlanId: number,
    client: any
  ): Promise<{ eligible: boolean; reason?: string }> {
    // Check max trigger per player
    const planResult = await client.query(
      'SELECT max_trigger_per_player, name FROM bonus_plans WHERE id = $1',
      [bonusPlanId]
    );

    if (planResult.rows.length === 0) {
      return { eligible: false, reason: 'Bonus plan not found' };
    }

    const maxTrigger = planResult.rows[0].max_trigger_per_player;

    if (maxTrigger) {
      // Count existing instances
      // Note: We rely on the database trigger to enforce this, not row locking
      // The unique index and trigger provide race condition protection
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM bonus_instances
         WHERE player_id = $1 AND bonus_plan_id = $2`,
        [playerId, bonusPlanId]
      );

      const currentCount = parseInt(countResult.rows[0].count);

      if (currentCount >= maxTrigger) {
        if (maxTrigger === 1) {
          return { eligible: false, reason: 'You have already claimed this bonus. Each bonus can only be claimed once.' };
        } else {
          return { eligible: false, reason: `You have already claimed this bonus the maximum number of times allowed (${maxTrigger}x)` };
        }
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
  private static calculateWagerRequirement(
    bonusAmount: number,
    depositAmount: number,
    requirementType: string,
    multiplier: number
  ): number {
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
  private static formatInstance(row: any): any {
    const instance: any = {
      id: row.id,
      bonus_plan_id: row.bonus_plan_id,
      player_id: row.player_id,
      bonus_type: row.plan_trigger_type || 'bonus_code',
      bonus_amount: parseFloat(row.bonus_amount),
      remaining_bonus: parseFloat(row.remaining_bonus),
      deposit_amount: row.deposit_amount ? parseFloat(row.deposit_amount) : undefined,
      deposit_transaction_id: row.deposit_transaction_id,
      wager_requirement_amount: parseFloat(row.wager_requirement_amount),
      wager_requirement_multiplier: row.plan_wager_multiplier ? parseFloat(row.plan_wager_multiplier) : undefined,
      wager_requirement_type: row.plan_wager_type,
      wager_progress_amount: parseFloat(row.wager_progress_amount),
      wager_percentage_complete: parseFloat(row.wager_percentage_complete),
      status: row.computed_status || row.status,
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

    // Add nested bonus_plan object if plan data is available
    if (row.plan_id || row.plan_name) {
      instance.bonus_plan = {
        id: row.plan_id || row.bonus_plan_id,
        name: row.plan_name,
        description: row.plan_description,
        image_url: row.plan_image_url,
        bonus_code: row.plan_bonus_code,
        bonus_type: row.plan_trigger_type,
        is_playable: row.plan_is_playable !== undefined ? row.plan_is_playable : true,
        cancel_on_withdrawal: row.plan_cancel_on_withdrawal !== undefined ? row.plan_cancel_on_withdrawal : true,
        playable_bonus_qualifies: row.plan_playable_bonus_qualifies !== undefined ? row.plan_playable_bonus_qualifies : false
      };
    }

    return instance;
  }

  /**
   * Bulk grant manual bonuses to multiple players
   */
  static async bulkGrantManualBonus(
    playerIds: number[],
    bonusPlanId: number,
    customAmount: number | null,
    notes: string,
    adminUserId: number
  ): Promise<{ success: any[]; failed: any[] }> {
    const success: any[] = [];
    const failed: any[] = [];

    for (const playerId of playerIds) {
      try {
        const bonusInstance = await this.grantManualBonus(
          playerId,
          bonusPlanId,
          customAmount,
          notes,
          adminUserId
        );
        success.push({
          player_id: playerId,
          bonus_instance_id: bonusInstance.id
        });
      } catch (error: any) {
        failed.push({
          player_id: playerId,
          error: error.message
        });
      }
    }

    return { success, failed };
  }

  /**
   * Bulk forfeit bonuses
   */
  static async bulkForfeitBonuses(
    bonusInstanceIds: number[],
    reason: string
  ): Promise<{ success: any[]; failed: any[] }> {
    const success: any[] = [];
    const failed: any[] = [];

    for (const bonusInstanceId of bonusInstanceIds) {
      try {
        await this.forfeitBonus(bonusInstanceId, reason);
        success.push({
          bonus_instance_id: bonusInstanceId
        });
      } catch (error: any) {
        failed.push({
          bonus_instance_id: bonusInstanceId,
          error: error.message
        });
      }
    }

    return { success, failed };
  }
}
