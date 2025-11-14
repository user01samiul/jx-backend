/**
 * KYC Free Spins Campaign Service
 *
 * Manages campaign eligibility for KYC verification free spins using Innova Gaming Platform API.
 *
 * IMPORTANT ARCHITECTURE:
 * - The operator (JackpotX) does NOT directly grant free spins
 * - This service tracks campaign ELIGIBILITY only
 * - Innova's platform activates actual free spins when user launches game
 * - Operator receives changebalance callbacks as spins are used
 * - Operator tracks usage and converts winnings to bonus after completion
 *
 * Flow:
 * 1. KYC approved → grantCampaign() creates eligibility record (status: pending)
 * 2. User launches game → Game launch includes campaign info in token
 * 3. Innova detects campaign → Activates 100 free spins in game
 * 4. User plays spins → Innova sends changebalance callbacks with context.campaign_code
 * 5. Spins used → updateCampaignUsage() tracks progress from callbacks
 * 6. All spins complete → completeCampaign() converts winnings to bonus with 40x wagering
 */

import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";

// Campaign Configuration Constants
const CAMPAIGN_CONFIG = {
  CODE: 'KYC_VERIFICATION_100_SPINS',
  GAME_ID: 5755, // 20 Super Hot Clover Chance
  GAME_NAME: '20 Super Hot Clover Chance',
  SPINS_TOTAL: 100,
  SPIN_VALUE: 0.20, // $0.20 USD per spin
  TOTAL_VALUE: 20.00, // 100 × $0.20 = $20 USD
  VALIDITY_HOURS: 24, // Campaign expires 24 hours after granting
  WAGERING_REQUIREMENT: 40, // 40x wagering on free spin winnings
  MAX_WIN_CAP: 20.00, // Maximum $20 USD after completing wagering
  MAX_BET_DURING_WAGERING: 5.00, // Maximum $5 USD bet while wagering bonus
} as const;

// Types
export interface KYCCampaign {
  id: number;
  user_id: number;
  campaign_code: string;
  game_id: number;
  spins_total: number;
  spin_value: number;
  total_value: number;
  granted_at: Date;
  expires_at: Date;
  activated_at: Date | null;
  completed_at: Date | null;
  spins_used: number;
  spins_remaining: number;
  total_bet_amount: number;
  total_win_amount: number;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  bonus_credited: boolean;
  user_promotion_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignUsageUpdate {
  spins_used: number;
  spins_remaining: number;
  bet_amount?: number;
  win_amount?: number;
}

/**
 * Grant KYC campaign eligibility to a user
 * Called when user's KYC verification is approved
 */
export const grantKYCCampaign = async (userId: number): Promise<KYCCampaign> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`[KYC Campaign] Granting campaign to user_id: ${userId}`);

    // Check if user already has a campaign
    const existingCheck = await client.query(
      'SELECT id, status FROM kyc_free_spins_campaigns WHERE user_id = $1',
      [userId]
    );

    if (existingCheck.rows.length > 0) {
      const existing = existingCheck.rows[0];
      throw new ApiError(`User already has a KYC campaign (ID: ${existing.id}, Status: ${existing.status})`, 400);
    }

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CAMPAIGN_CONFIG.VALIDITY_HOURS);

    // Create campaign eligibility record
    const insertQuery = `
      INSERT INTO kyc_free_spins_campaigns (
        user_id,
        campaign_code,
        game_id,
        spins_total,
        spin_value,
        total_value,
        expires_at,
        spins_remaining,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      userId,
      CAMPAIGN_CONFIG.CODE,
      CAMPAIGN_CONFIG.GAME_ID,
      CAMPAIGN_CONFIG.SPINS_TOTAL,
      CAMPAIGN_CONFIG.SPIN_VALUE,
      CAMPAIGN_CONFIG.TOTAL_VALUE,
      expiresAt,
      CAMPAIGN_CONFIG.SPINS_TOTAL,
      'pending'
    ]);

    await client.query('COMMIT');

    const campaign = result.rows[0] as KYCCampaign;

    console.log(`[KYC Campaign] Campaign granted successfully:`, {
      campaign_id: campaign.id,
      user_id: userId,
      campaign_code: campaign.campaign_code,
      spins_total: campaign.spins_total,
      expires_at: campaign.expires_at
    });

    return campaign;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[KYC Campaign] Error granting campaign:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get campaign by user ID
 */
export const getCampaignByUserId = async (userId: number): Promise<KYCCampaign | null> => {
  const result = await pool.query(
    'SELECT * FROM kyc_free_spins_campaigns WHERE user_id = $1',
    [userId]
  );

  return result.rows.length > 0 ? (result.rows[0] as KYCCampaign) : null;
};

/**
 * Get campaign by campaign code
 */
export const getCampaignByCode = async (userId: number, campaignCode: string): Promise<KYCCampaign | null> => {
  const result = await pool.query(
    'SELECT * FROM kyc_free_spins_campaigns WHERE user_id = $1 AND campaign_code = $2',
    [userId, campaignCode]
  );

  return result.rows.length > 0 ? (result.rows[0] as KYCCampaign) : null;
};

/**
 * Activate campaign (when user first launches the game)
 */
export const activateCampaign = async (userId: number, campaignCode: string): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`[KYC Campaign] Activating campaign for user_id: ${userId}, code: ${campaignCode}`);

    const result = await client.query(
      `UPDATE kyc_free_spins_campaigns
       SET status = 'active',
           activated_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND campaign_code = $2
         AND status = 'pending'
       RETURNING id`,
      [userId, campaignCode]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Campaign not found or already activated', 404);
    }

    await client.query('COMMIT');

    console.log(`[KYC Campaign] Campaign activated successfully for user_id: ${userId}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[KYC Campaign] Error activating campaign:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update campaign usage from changebalance callbacks
 * Called when Innova sends callbacks with context.campaign_code
 */
export const updateCampaignUsage = async (
  userId: number,
  campaignCode: string,
  update: CampaignUsageUpdate
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`[KYC Campaign] Updating campaign usage:`, {
      user_id: userId,
      campaign_code: campaignCode,
      update
    });

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (update.spins_used !== undefined) {
      updates.push(`spins_used = $${paramIndex++}`);
      values.push(update.spins_used);
    }

    if (update.spins_remaining !== undefined) {
      updates.push(`spins_remaining = $${paramIndex++}`);
      values.push(update.spins_remaining);
    }

    if (update.bet_amount !== undefined) {
      updates.push(`total_bet_amount = total_bet_amount + $${paramIndex++}`);
      values.push(update.bet_amount);
    }

    if (update.win_amount !== undefined) {
      updates.push(`total_win_amount = total_win_amount + $${paramIndex++}`);
      values.push(update.win_amount);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause parameters
    values.push(userId, campaignCode);

    const query = `
      UPDATE kyc_free_spins_campaigns
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex++} AND campaign_code = $${paramIndex++}
      RETURNING id, spins_used, spins_remaining, total_win_amount
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError('Campaign not found', 404);
    }

    const campaign = result.rows[0];

    console.log(`[KYC Campaign] Campaign updated:`, {
      campaign_id: campaign.id,
      spins_used: campaign.spins_used,
      spins_remaining: campaign.spins_remaining,
      total_win_amount: campaign.total_win_amount
    });

    // If all spins are used, mark as ready for completion
    if (campaign.spins_remaining === 0) {
      console.log(`[KYC Campaign] All spins used! Marking for completion...`);
      await completeCampaign(client, userId, campaignCode);
    }

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[KYC Campaign] Error updating campaign usage:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Complete campaign and convert winnings to bonus
 * Called automatically when all spins are used
 */
const completeCampaign = async (
  client: any,
  userId: number,
  campaignCode: string
): Promise<void> => {
  console.log(`[KYC Campaign] Completing campaign for user_id: ${userId}, code: ${campaignCode}`);

  // Get campaign details
  const campaignResult = await client.query(
    'SELECT * FROM kyc_free_spins_campaigns WHERE user_id = $1 AND campaign_code = $2',
    [userId, campaignCode]
  );

  if (campaignResult.rows.length === 0) {
    throw new ApiError('Campaign not found', 404);
  }

  const campaign = campaignResult.rows[0] as KYCCampaign;

  // Check if already completed
  if (campaign.status === 'completed' || campaign.bonus_credited) {
    console.log(`[KYC Campaign] Campaign already completed, skipping...`);
    return;
  }

  const totalWinnings = parseFloat(campaign.total_win_amount.toString());

  console.log(`[KYC Campaign] Total winnings from free spins: $${totalWinnings} USD`);

  // Only create bonus if there are winnings
  if (totalWinnings > 0) {
    // Create promotion for the bonus
    const wageringAmount = totalWinnings * CAMPAIGN_CONFIG.WAGERING_REQUIREMENT;

    console.log(`[KYC Campaign] Creating bonus:`, {
      bonus_amount: totalWinnings,
      wagering_requirement: CAMPAIGN_CONFIG.WAGERING_REQUIREMENT,
      wagering_amount: wageringAmount,
      max_win_cap: CAMPAIGN_CONFIG.MAX_WIN_CAP
    });

    // Create user_promotion entry
    const promotionInsert = await client.query(
      `INSERT INTO user_promotions (
        user_id,
        promotion_id,
        status,
        bonus_amount,
        wagering_required,
        wagering_completed,
        expires_at,
        claimed_at
      ) VALUES (
        $1,
        (SELECT id FROM promotions WHERE title LIKE '%KYC%' AND type = 'free_spins' LIMIT 1),
        'active',
        $2,
        $3,
        0,
        CURRENT_TIMESTAMP + INTERVAL '7 days',
        CURRENT_TIMESTAMP
      )
      RETURNING id`,
      [userId, totalWinnings, wageringAmount]
    );

    const userPromotionId = promotionInsert.rows[0].id;

    // Add bonus to user's bonus_balance
    await client.query(
      `UPDATE user_balances
       SET bonus_balance = bonus_balance + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [totalWinnings, userId]
    );

    // Create transaction record
    await client.query(
      `INSERT INTO transactions (
        user_id,
        type,
        amount,
        balance_after,
        metadata,
        created_at
      ) VALUES (
        $1,
        'bonus_credit',
        $2,
        (SELECT main_balance + bonus_balance FROM user_balances WHERE user_id = $1),
        $3,
        CURRENT_TIMESTAMP
      )`,
      [
        userId,
        totalWinnings,
        JSON.stringify({
          source: 'kyc_free_spins_campaign',
          campaign_code: campaignCode,
          campaign_id: campaign.id,
          spins_completed: campaign.spins_total,
          wagering_requirement: CAMPAIGN_CONFIG.WAGERING_REQUIREMENT,
          max_win_cap: CAMPAIGN_CONFIG.MAX_WIN_CAP
        })
      ]
    );

    // Update campaign to completed
    await client.query(
      `UPDATE kyc_free_spins_campaigns
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           bonus_credited = true,
           user_promotion_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2 AND campaign_code = $3`,
      [userPromotionId, userId, campaignCode]
    );

    console.log(`[KYC Campaign] Campaign completed! Bonus credited:`, {
      user_id: userId,
      bonus_amount: totalWinnings,
      wagering_required: wageringAmount,
      user_promotion_id: userPromotionId
    });

  } else {
    // No winnings, just mark as completed
    await client.query(
      `UPDATE kyc_free_spins_campaigns
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND campaign_code = $2`,
      [userId, campaignCode]
    );

    console.log(`[KYC Campaign] Campaign completed with no winnings`);
  }
};

/**
 * Cancel campaign (manual cancellation)
 */
export const cancelCampaign = async (userId: number, campaignCode: string): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`[KYC Campaign] Cancelling campaign for user_id: ${userId}, code: ${campaignCode}`);

    const result = await client.query(
      `UPDATE kyc_free_spins_campaigns
       SET status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND campaign_code = $2
         AND status IN ('pending', 'active')
       RETURNING id`,
      [userId, campaignCode]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Campaign not found or already completed', 404);
    }

    await client.query('COMMIT');

    console.log(`[KYC Campaign] Campaign cancelled successfully`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[KYC Campaign] Error cancelling campaign:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Expire old campaigns (cron job)
 * Should be called periodically to clean up expired campaigns
 */
export const expireOldCampaigns = async (): Promise<number> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`[KYC Campaign] Expiring old campaigns...`);

    const result = await client.query(
      `UPDATE kyc_free_spins_campaigns
       SET status = 'expired',
           updated_at = CURRENT_TIMESTAMP
       WHERE expires_at < CURRENT_TIMESTAMP
         AND status IN ('pending', 'active')
       RETURNING id`
    );

    await client.query('COMMIT');

    const expiredCount = result.rows.length;

    console.log(`[KYC Campaign] Expired ${expiredCount} campaigns`);

    return expiredCount;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[KYC Campaign] Error expiring campaigns:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get campaign info for game launch token
 * Returns campaign data to include in Innova game launch request
 */
export const getCampaignForGameLaunch = async (userId: number, gameId: number): Promise<any | null> => {
  const result = await pool.query(
    `SELECT * FROM kyc_free_spins_campaigns
     WHERE user_id = $1
       AND game_id = $2
       AND status IN ('pending', 'active')
       AND expires_at > CURRENT_TIMESTAMP`,
    [userId, gameId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const campaign = result.rows[0] as KYCCampaign;

  // If pending, activate it
  if (campaign.status === 'pending') {
    await activateCampaign(userId, campaign.campaign_code);
  }

  // Return campaign data for game launch
  return {
    campaign_code: campaign.campaign_code,
    total_spins: campaign.spins_total,
    remaining_spins: campaign.spins_remaining,
    spin_value: parseFloat(campaign.spin_value.toString()),
    game_id: campaign.game_id
  };
};

// Export configuration for use in other modules
export const KYC_CAMPAIGN_CONFIG = CAMPAIGN_CONFIG;
