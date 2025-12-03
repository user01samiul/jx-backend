import pool from "../../db/postgres";

export interface AffiliateProfile {
  id: number;
  user_id: number;
  referral_code: string;
  display_name?: string;
  website_url?: string;
  social_media_links?: any;
  commission_rate: number;
  minimum_payout: number;
  payment_methods?: any;
  is_active: boolean;
  total_referrals: number;
  total_commission_earned: number;
  total_payouts_received: number;
  created_at: Date;
  updated_at: Date;
}

export interface AffiliateDashboard {
  total_referrals: number;
  active_referrals: number;
  total_commission_earned: number;
  pending_commission: number;
  total_payouts_received: number;
  available_for_payout: number;
  monthly_stats: {
    new_referrals: number;
    commission_earned: number;
    conversions: number;
  };
  recent_referrals: Array<{
    id: number;
    username: string;
    email: string;
    registration_date: Date;
    first_deposit_amount: number;
    first_deposit_date: Date;
    total_commission_earned: number;
    status: string;
  }>;
  recent_commissions: Array<{
    id: number;
    referred_user: string;
    commission_amount: number;
    commission_type: string;
    base_amount: number;
    status: string;
    created_at: Date;
  }>;
  recent_payouts: Array<{
    id: number;
    total_amount: number;
    status: string;
    created_at: Date;
  }>;
}

export interface AffiliateCommission {
  id: number;
  affiliate_id: number;
  referred_user_id: number;
  transaction_id: number;
  commission_amount: number;
  commission_rate: number;
  base_amount: number;
  commission_type: string;
  status: string;
  paid_at?: Date;
  notes?: string;
  created_at: Date;
}

export interface AffiliatePayout {
  id: number;
  affiliate_id: number;
  total_amount: number;
  commission_ids: number[];
  payment_method?: string;
  payment_reference?: string;
  status: string;
  processed_at?: Date;
  notes?: string;
  created_at: Date;
}

export class AffiliateService {
  /**
   * Create affiliate profile
   */
  static async createAffiliateProfile(userId: number, profileData: any): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if profile already exists
      const existingResult = await client.query(
        'SELECT id FROM affiliate_profiles WHERE user_id = $1',
        [userId]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Affiliate profile already exists for this user');
      }

      // Generate unique referral code
      const referralCode = this.generateReferralCode();

      // Create affiliate profile
      const profileResult = await client.query(
        `INSERT INTO affiliate_profiles (
          user_id, referral_code, display_name, website_url,
          social_media_links, commission_rate, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *`,
        [
          userId,
          referralCode,
          profileData.display_name,
          profileData.website_url || null,
          profileData.social_media ? JSON.stringify(profileData.social_media) : null,
          5.0 // Default commission rate
        ]
      );

      await client.query('COMMIT');
      return profileResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate unique referral code
   */
  private static generateReferralCode(): string {
    const prefix = 'AFF';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  }

  /**
   * Get affiliate profile by user ID
   */
  static async getAffiliateProfile(userId: number): Promise<AffiliateProfile | null> {
    const result = await pool.query(
      `SELECT
        ap.*,
        COALESCE(ub.affiliate_balance, 0) as affiliate_balance,
        COALESCE(ub.affiliate_balance_locked, 0) as affiliate_balance_locked,
        COALESCE(ub.affiliate_total_earned, 0) as affiliate_total_earned,
        COALESCE(ub.affiliate_total_redeemed, 0) as affiliate_total_redeemed
      FROM affiliate_profiles ap
      LEFT JOIN user_balances ub ON ap.user_id = ub.user_id
      WHERE ap.user_id = $1`,
      [userId]
    );

    const profile = result.rows[0] || null;

    if (profile) {
      // Get redemption settings to include minimum_redemption
      const settingsResult = await pool.query(
        "SELECT setting_value FROM affiliate_settings WHERE setting_key = 'redemption_settings'"
      );

      const redemptionSettings = settingsResult.rows[0]?.setting_value || {
        minimum_redemption: 50.00,
        instant_percentage: 50,
        lock_days: 7
      };

      // Add minimum_payout to profile (for FE compatibility)
      profile.minimum_payout = parseFloat(redemptionSettings.minimum_redemption);
    }

    return profile;
  }

  /**
   * Update affiliate profile
   */
  static async updateAffiliateProfile(userId: number, profileData: Partial<AffiliateProfile>): Promise<AffiliateProfile> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(profileData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'referral_code') {
        if (key === 'social_media_links' || key === 'payment_methods') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(userId);
    const result = await pool.query(
      `UPDATE affiliate_profiles 
       SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error("Affiliate profile not found");
    }

    return result.rows[0];
  }

  /**
   * Get affiliate dashboard data
   */
  static async getAffiliateDashboard(userId: number): Promise<AffiliateDashboard> {
    const client = await pool.connect();
    try {
      // Get basic stats
      const statsResult = await client.query(
        `SELECT 
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN ar.status = 'active' THEN 1 END) as active_referrals,
          COALESCE(SUM(ar.total_commission_earned), 0) as total_commission_earned,
          COALESCE(SUM(ac.commission_amount), 0) as pending_commission,
          COALESCE(SUM(ap.total_amount), 0) as total_payouts_received
        FROM affiliate_relationships ar
        LEFT JOIN affiliate_commissions ac ON ar.affiliate_id = ac.affiliate_id 
          AND ar.referred_user_id = ac.referred_user_id 
          AND ac.status = 'pending'
        LEFT JOIN affiliate_payouts ap ON ar.affiliate_id = ap.affiliate_id 
          AND ap.status = 'completed'
        WHERE ar.affiliate_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0];
      const availableForPayout = Math.max(0, stats.pending_commission - stats.total_payouts_received);

      // Get recent referrals
      const referralsResult = await client.query(
        `SELECT 
          ar.id, u.username, u.email, ar.created_at as registration_date,
          ar.first_deposit_amount, ar.first_deposit_date, ar.total_commission_earned, ar.status
        FROM affiliate_relationships ar
        JOIN users u ON ar.referred_user_id = u.id
        WHERE ar.affiliate_id = $1
        ORDER BY ar.created_at DESC
        LIMIT 10`,
        [userId]
      );

      return {
        total_referrals: parseInt(stats.total_referrals),
        active_referrals: parseInt(stats.active_referrals),
        total_commission_earned: parseFloat(stats.total_commission_earned),
        pending_commission: parseFloat(stats.pending_commission),
        total_payouts_received: parseFloat(stats.total_payouts_received),
        available_for_payout: availableForPayout,
        monthly_stats: {
          new_referrals: 0,
          commission_earned: 0,
          conversions: 0
        },
        recent_referrals: referralsResult.rows,
        recent_commissions: [],
        recent_payouts: []
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get affiliate commissions with filtering
   */
  static async getAffiliateCommissions(
    userId: number,
    filters: {
      status?: string;
      commission_type?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ commissions: AffiliateCommission[]; total: number; pagination: any }> {
    const { status, commission_type, start_date, end_date, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ['ac.affiliate_id = $1'];
    let params: any[] = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereConditions.push(`ac.status = $${paramCount}`);
      params.push(status);
    }

    if (commission_type) {
      paramCount++;
      whereConditions.push(`ac.commission_type = $${paramCount}`);
      params.push(commission_type);
    }

    if (start_date) {
      paramCount++;
      whereConditions.push(`ac.created_at >= $${paramCount}`);
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`ac.created_at <= $${paramCount}`);
      params.push(end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_commissions ac WHERE ${whereClause}`,
      params
    );

    // Get commissions
    const commissionsResult = await pool.query(
      `SELECT ac.*, u.username as referred_user_username
       FROM affiliate_commissions ac
       JOIN users u ON ac.referred_user_id = u.id
       WHERE ${whereClause}
       ORDER BY ac.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return {
      commissions: commissionsResult.rows,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get affiliate payouts
   */
  static async getAffiliatePayouts(
    userId: number,
    filters: {
      status?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ payouts: AffiliatePayout[]; total: number; pagination: any }> {
    const { status, start_date, end_date, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ['ap.affiliate_id = $1'];
    let params: any[] = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      whereConditions.push(`ap.status = $${paramCount}`);
      params.push(status);
    }

    if (start_date) {
      paramCount++;
      whereConditions.push(`ap.created_at >= $${paramCount}`);
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      whereConditions.push(`ap.created_at <= $${paramCount}`);
      params.push(end_date);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_payouts ap WHERE ${whereClause}`,
      params
    );

    // Get payouts
    const payoutsResult = await pool.query(
      `SELECT * FROM affiliate_payouts ap
       WHERE ${whereClause}
       ORDER BY ap.created_at DESC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return {
      payouts: payoutsResult.rows,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Request payout for affiliate
   */
  static async requestPayout(userId: number, amount: number, paymentMethod: string): Promise<AffiliatePayout> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user has enough pending commission
      const pendingResult = await client.query(
        `SELECT COALESCE(SUM(commission_amount), 0) as pending_amount
         FROM affiliate_commissions
         WHERE affiliate_id = $1 AND status = 'pending'`,
        [userId]
      );

      const pendingAmount = parseFloat(pendingResult.rows[0].pending_amount);
      if (pendingAmount < amount) {
        throw new Error(`Insufficient pending commission. Available: $${pendingAmount}`);
      }

      // Get pending commission IDs
      const commissionIdsResult = await client.query(
        `SELECT id FROM affiliate_commissions
         WHERE affiliate_id = $1 AND status = 'pending'
         ORDER BY created_at ASC`,
        [userId]
      );

      const commissionIds = commissionIdsResult.rows.map(row => row.id);

      // Create payout record
      const payoutResult = await client.query(
        `INSERT INTO affiliate_payouts (
          affiliate_id, total_amount, commission_ids, payment_method
        ) VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, amount, commissionIds, paymentMethod]
      );

      // Update commission status to approved
      await client.query(
        `UPDATE affiliate_commissions
         SET status = 'approved'
         WHERE id = ANY($1)`,
        [commissionIds]
      );

      await client.query('COMMIT');
      return payoutResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Track affiliate click/visit
   */
  static async trackAffiliateClick(
    referralCode: string,
    visitorIp: string,
    userAgent: string,
    landingPage: string,
    sessionId?: string
  ): Promise<void> {
    const client = await pool.connect();
    try {
      // Get affiliate ID from referral code
      const affiliateResult = await client.query(
        'SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true',
        [referralCode]
      );

      if (affiliateResult.rows.length === 0) {
        throw new Error('Invalid or inactive referral code');
      }

      const affiliateId = affiliateResult.rows[0].user_id;

      // Record the click
      await client.query(
        `INSERT INTO affiliate_tracking (
          affiliate_id, referral_code, visitor_ip, user_agent, landing_page, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [affiliateId, referralCode, visitorIp, userAgent, landingPage, sessionId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Record conversion for affiliate
   */
  static async recordConversion(
    referralCode: string,
    conversionType: string,
    convertedUserId: number,
    conversionAmount?: number
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find affiliate by referral code
      const affiliateResult = await client.query(
        'SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true',
        [referralCode]
      );

      if (affiliateResult.rows.length === 0) {
        console.error(`[AFFILIATE] No active affiliate found for referral code: ${referralCode}`);
        return;
      }

      const affiliateId = affiliateResult.rows[0].user_id;

      // Check if relationship already exists
      const existingResult = await client.query(
        'SELECT id FROM affiliate_relationships WHERE affiliate_id = $1 AND referred_user_id = $2',
        [affiliateId, convertedUserId]
      );

      if (existingResult.rows.length > 0) {
        console.log(`[AFFILIATE] Relationship already exists for affiliate ${affiliateId} and user ${convertedUserId}`);
        return;
      }

      // Create affiliate relationship
      await client.query(
        `INSERT INTO affiliate_relationships (
          affiliate_id, referred_user_id, referral_code
        ) VALUES ($1, $2, $3)`,
        [
          affiliateId,
          convertedUserId,
          referralCode
        ]
      );

      // Update affiliate profile
      await client.query(
        `UPDATE affiliate_profiles 
         SET total_referrals = total_referrals + 1
         WHERE user_id = $1`,
        [affiliateId]
      );

      // Create MLM relationships for higher levels
      await this.createMLMRelationships(affiliateId, convertedUserId, 1);

      // If this is a deposit conversion, calculate commission
      if (conversionType === 'deposit' && conversionAmount && conversionAmount > 0) {
        await this.calculateCommission(
          affiliateId,
          convertedUserId,
          0, // No transaction ID for registration
          conversionAmount,
          'deposit'
        );
      }

      console.log(`[AFFILIATE] Conversion recorded: ${conversionType} for user ${convertedUserId} via affiliate ${affiliateId}`);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[AFFILIATE] Error recording conversion:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create MLM relationships for upline affiliates
   */
  static async createMLMRelationships(baseAffiliateId: number, referredUserId: number, level: number): Promise<void> {
    const client = await pool.connect();
    try {
      // Find upline affiliates (up to 3 levels)
      let currentAffiliateId = baseAffiliateId;
      
      for (let uplineLevel = 1; uplineLevel <= 3; uplineLevel++) {
        // Get upline affiliate
        const uplineResult = await client.query(
          'SELECT upline_id FROM affiliate_profiles WHERE user_id = $1',
          [currentAffiliateId]
        );

        if (uplineResult.rows.length === 0 || !uplineResult.rows[0].upline_id) {
          break; // No more upline
        }

        const uplineId = uplineResult.rows[0].upline_id;
        const relationshipLevel = level + uplineLevel;

        // Check if relationship already exists
        const existingResult = await client.query(
          'SELECT id FROM affiliate_relationships WHERE affiliate_id = $1 AND referred_user_id = $2',
          [uplineId, referredUserId]
        );

        if (existingResult.rows.length === 0) {
          // Create indirect relationship
          await client.query(
            `INSERT INTO affiliate_relationships (
              affiliate_id, referred_user_id, level, is_indirect
            ) VALUES ($1, $2, $3, true)`,
            [uplineId, referredUserId, relationshipLevel]
          );

          // Update upline downline count
          await client.query(
            `UPDATE affiliate_profiles 
             SET downline_count = downline_count + 1
             WHERE user_id = $1`,
            [uplineId]
          );

          console.log(`[AFFILIATE] MLM relationship created: Level ${relationshipLevel} for affiliate ${uplineId} and user ${referredUserId}`);
        }

        currentAffiliateId = uplineId;
      }
    } finally {
      client.release();
    }
  }

  /**
   * Calculate commission for affiliate
   */
  static async calculateCommission(
    affiliateId: number,
    referredUserId: number,
    transactionId: number,
    amount: number,
    commissionType: string
  ): Promise<number> {
    const client = await pool.connect();
    try {
      // Get affiliate profile
      const affiliateResult = await client.query(
        'SELECT commission_rate FROM affiliate_profiles WHERE user_id = $1 AND is_active = true',
        [affiliateId]
      );

      if (affiliateResult.rows.length === 0) {
        console.error(`[AFFILIATE] Affiliate ${affiliateId} not found or inactive`);
        return 0;
      }

      const commissionRate = affiliateResult.rows[0].commission_rate || 5.0;

      // Calculate commission using affiliate's custom rate for all types
      const commissionAmount = (amount * commissionRate) / 100;

      console.log(`[AFFILIATE] Calculating commission: ${commissionType}, amount: $${amount}, rate: ${commissionRate}%, commission: $${commissionAmount}`);

      // Create commission record
      const commissionResult = await client.query(
        `INSERT INTO affiliate_commissions (
          affiliate_id, referred_user_id, transaction_id, commission_amount,
          commission_rate, base_amount, commission_type, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          affiliateId,
          referredUserId,
          transactionId,
          commissionAmount,
          commissionRate,
          amount,
          commissionType,
          'pending'
        ]
      );

      // Update affiliate profile
      await client.query(
        `UPDATE affiliate_profiles 
         SET total_commission_earned = total_commission_earned + $1
         WHERE user_id = $2`,
        [commissionAmount, affiliateId]
      );

      console.log(`[AFFILIATE] Commission calculated: $${commissionAmount} for affiliate ${affiliateId}, type: ${commissionType}`);
      
      return commissionAmount;
    } finally {
      client.release();
    }
  }

  /**
   * Get marketing materials for affiliate
   */
  static async getMarketingMaterials(): Promise<any[]> {
    const result = await pool.query(
      'SELECT * FROM affiliate_marketing_materials WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  /**
   * Get affiliate statistics for admin
   */
  static async getAdminAffiliateStats(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT ap.user_id) as total_affiliates,
        COUNT(DISTINCT CASE WHEN ap.is_active = true THEN ap.user_id END) as active_affiliates,
        COUNT(DISTINCT ar.referred_user_id) as total_referrals,
        COALESCE(SUM(ac.commission_amount), 0) as total_commission_paid,
        COALESCE(SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END), 0) as pending_commission,
        COALESCE(SUM(ap.total_amount), 0) as total_payouts
      FROM affiliate_profiles ap
      LEFT JOIN affiliate_relationships ar ON ap.user_id = ar.affiliate_id
      LEFT JOIN affiliate_commissions ac ON ap.user_id = ac.affiliate_id
      LEFT JOIN affiliate_payouts ap ON ap.affiliate_id = ap.affiliate_id
    `);

    return result.rows[0];
  }
} 