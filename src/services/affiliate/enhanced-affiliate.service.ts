import pool from "../../db/postgres";

export interface EnhancedAffiliateProfile {
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
  level: number; // MLM level (1 = direct, 2 = indirect, etc.)
  upline_id?: number; // Direct upline affiliate
  downline_count: number;
  total_downline_commission: number;
  created_at: Date;
  updated_at: Date;
}

export interface MLMStructure {
  affiliate_id: number;
  level: number;
  upline_id?: number;
  downline_ids: number[];
  total_downline_commission: number;
  direct_referrals: number;
  indirect_referrals: number;
}

export interface EnhancedCommission {
  id: number;
  affiliate_id: number;
  referred_user_id: number;
  transaction_id: number;
  commission_amount: number;
  commission_rate: number;
  base_amount: number;
  commission_type: string;
  level: number; // MLM level
  status: string;
  paid_at?: Date;
  notes?: string;
  created_at: Date;
}

export interface BetRevenueCommission {
  affiliate_id: number;
  referred_user_id: number;
  bet_amount: number;
  win_amount: number;
  loss_amount: number;
  net_revenue: number;
  commission_rate: number;
  commission_amount: number;
  period_start: Date;
  period_end: Date;
}

export class EnhancedAffiliateService {
  /**
   * Create enhanced affiliate profile with MLM structure
   */
  static async createEnhancedAffiliateProfile(
    userId: number, 
    profileData: Partial<EnhancedAffiliateProfile>,
    uplineReferralCode?: string
  ): Promise<EnhancedAffiliateProfile> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate unique referral code
      const referralCodeResult = await client.query('SELECT generate_referral_code() as referral_code');
      const referralCode = referralCodeResult.rows[0].referral_code;

      // Determine upline and level
      let uplineId = null;
      let level = 1;
      
      if (uplineReferralCode) {
        const uplineResult = await client.query(
          'SELECT user_id, level FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true',
          [uplineReferralCode]
        );
        
        if (uplineResult.rows.length > 0) {
          uplineId = uplineResult.rows[0].user_id;
          level = uplineResult.rows[0].level + 1;
        }
      }

      // Create affiliate profile
      const profileResult = await client.query(
        `INSERT INTO affiliate_profiles (
          user_id, referral_code, display_name, website_url, social_media_links,
          commission_rate, minimum_payout, payment_methods, is_active,
          level, upline_id, downline_count, total_downline_commission
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          userId,
          referralCode,
          profileData.display_name,
          profileData.website_url,
          profileData.social_media_links,
          profileData.commission_rate || 5.0,
          profileData.minimum_payout || 50.0,
          profileData.payment_methods,
          true,
          level,
          uplineId,
          0,
          0
        ]
      );

      // Update upline's downline count if exists
      if (uplineId) {
        await client.query(
          'UPDATE affiliate_profiles SET downline_count = downline_count + 1 WHERE user_id = $1',
          [uplineId]
        );
      }

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
   * Calculate commission based on user betting activity and revenue
   */
  static async calculateBetRevenueCommission(
    affiliateId: number,
    referredUserId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<BetRevenueCommission> {
    const client = await pool.connect();
    try {
      // Get user's betting activity for the period
      const betResult = await client.query(
        `SELECT 
          COALESCE(SUM(bet_amount), 0) as total_bet_amount,
          COALESCE(SUM(CASE WHEN outcome = 'win' THEN win_amount ELSE 0 END), 0) as total_win_amount,
          COALESCE(SUM(CASE WHEN outcome = 'loss' THEN bet_amount ELSE 0 END), 0) as total_loss_amount
        FROM bets 
        WHERE user_id = $1 
          AND placed_at >= $2 
          AND placed_at <= $3`,
        [referredUserId, periodStart, periodEnd]
      );

      const betData = betResult.rows[0];
      const netRevenue = betData.total_bet_amount - betData.total_win_amount;

      // Get affiliate commission rate
      const affiliateResult = await client.query(
        'SELECT commission_rate FROM affiliate_profiles WHERE user_id = $1',
        [affiliateId]
      );

      const commissionRate = affiliateResult.rows[0]?.commission_rate || 5.0;
      const commissionAmount = (netRevenue * commissionRate) / 100;

      // Create commission record
      const commissionResult = await client.query(
        `INSERT INTO affiliate_commissions (
          affiliate_id, referred_user_id, commission_amount, commission_rate,
          base_amount, commission_type, level, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          affiliateId,
          referredUserId,
          commissionAmount,
          commissionRate,
          netRevenue,
          'bet_revenue',
          1, // Direct level
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

      return {
        affiliate_id: affiliateId,
        referred_user_id: referredUserId,
        bet_amount: parseFloat(betData.total_bet_amount),
        win_amount: parseFloat(betData.total_win_amount),
        loss_amount: parseFloat(betData.total_loss_amount),
        net_revenue: netRevenue,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        period_start: periodStart,
        period_end: periodEnd
      };
    } finally {
      client.release();
    }
  }

  /**
   * Calculate MLM commissions for multiple levels
   */
  static async calculateMLMCommissions(
    baseAffiliateId: number,
    referredUserId: number,
    transactionId: number,
    amount: number,
    commissionType: string
  ): Promise<EnhancedCommission[]> {
    const client = await pool.connect();
    try {
      const commissions: EnhancedCommission[] = [];
      
      // Get MLM structure for the base affiliate
      const mlmStructure = await this.getMLMStructure(baseAffiliateId);
      
      // Calculate commissions for each level (up to 3 levels)
      for (let level = 1; level <= 3; level++) {
        const levelAffiliateId = level === 1 ? baseAffiliateId : mlmStructure.upline_id;

        if (!levelAffiliateId) break;

        // Fetch commission rate from affiliate profile (admin-set rate)
        const affiliateRateResult = await client.query(
          'SELECT commission_rate FROM affiliate_profiles WHERE user_id = $1',
          [levelAffiliateId]
        );

        // Use affiliate's custom commission rate, with fallback based on level
        const levelCommissionRate = affiliateRateResult.rows[0]?.commission_rate ||
                                    (level === 1 ? 5.0 : level === 2 ? 2.0 : 1.0);
        const commissionAmount = (amount * levelCommissionRate) / 100;

        // Create commission record
        const commissionResult = await client.query(
          `INSERT INTO affiliate_commissions (
            affiliate_id, referred_user_id, transaction_id, commission_amount,
            commission_rate, base_amount, commission_type, level, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            levelAffiliateId,
            referredUserId,
            transactionId,
            commissionAmount,
            levelCommissionRate,
            amount,
            commissionType,
            level,
            'pending'
          ]
        );

        commissions.push(commissionResult.rows[0]);

        // Update affiliate profile
        await client.query(
          `UPDATE affiliate_profiles 
           SET total_commission_earned = total_commission_earned + $1,
               total_downline_commission = total_downline_commission + $1
           WHERE user_id = $2`,
          [commissionAmount, levelAffiliateId]
        );

        // Get next level upline
        const uplineResult = await client.query(
          'SELECT upline_id FROM affiliate_profiles WHERE user_id = $1',
          [levelAffiliateId]
        );
        
        if (uplineResult.rows.length > 0) {
          mlmStructure.upline_id = uplineResult.rows[0].upline_id;
        } else {
          break;
        }
      }

      return commissions;
    } finally {
      client.release();
    }
  }

  /**
   * Get MLM structure for an affiliate
   */
  static async getMLMStructure(affiliateId: number): Promise<MLMStructure> {
    const result = await pool.query(
      `SELECT 
        user_id as affiliate_id,
        level,
        upline_id,
        downline_count,
        total_downline_commission
      FROM affiliate_profiles 
      WHERE user_id = $1`,
      [affiliateId]
    );

    if (result.rows.length === 0) {
      throw new Error('Affiliate not found');
    }

    const profile = result.rows[0];

    // Get downline affiliates
    const downlineResult = await pool.query(
      'SELECT user_id FROM affiliate_profiles WHERE upline_id = $1',
      [affiliateId]
    );

    const downlineIds = downlineResult.rows.map(row => row.user_id);

    // Get direct and indirect referrals
    const directReferrals = await pool.query(
      'SELECT COUNT(*) as count FROM affiliate_relationships WHERE affiliate_id = $1',
      [affiliateId]
    );

    const indirectReferrals = await pool.query(
      `SELECT COUNT(*) as count 
       FROM affiliate_relationships ar
       JOIN affiliate_profiles ap ON ar.referred_user_id = ap.user_id
       WHERE ap.upline_id = $1`,
      [affiliateId]
    );

    return {
      affiliate_id: profile.affiliate_id,
      level: profile.level,
      upline_id: profile.upline_id,
      downline_ids: downlineIds,
      total_downline_commission: parseFloat(profile.total_downline_commission),
      direct_referrals: parseInt(directReferrals.rows[0].count),
      indirect_referrals: parseInt(indirectReferrals.rows[0].count)
    };
  }

  /**
   * Get enhanced affiliate dashboard with MLM data
   */
  static async getEnhancedAffiliateDashboard(userId: number): Promise<any> {
    const client = await pool.connect();
    try {
      // Get basic affiliate profile
      const profileResult = await client.query(
        'SELECT * FROM affiliate_profiles WHERE user_id = $1',
        [userId]
      );

      if (profileResult.rows.length === 0) {
        throw new Error('Affiliate profile not found');
      }

      const profile = profileResult.rows[0];

      // Get MLM structure
      const mlmStructure = await this.getMLMStructure(userId);

      // Get commission statistics
      const commissionStats = await client.query(
        `SELECT 
          COUNT(*) as total_commissions,
          COALESCE(SUM(commission_amount), 0) as total_commission_earned,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_commission,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_commission
        FROM affiliate_commissions 
        WHERE affiliate_id = $1`,
        [userId]
      );

      // Get recent referrals
      const recentReferrals = await client.query(
        `SELECT 
          ar.id,
          u.username,
          u.email,
          ar.created_at as registration_date,
          ar.first_deposit_amount,
          ar.first_deposit_date,
          ar.total_commission_earned,
          ar.status
        FROM affiliate_relationships ar
        JOIN users u ON ar.referred_user_id = u.id
        WHERE ar.affiliate_id = $1
        ORDER BY ar.created_at DESC
        LIMIT 10`,
        [userId]
      );

      // Get recent commissions
      const recentCommissions = await client.query(
        `SELECT 
          ac.id,
          u.username as referred_user,
          ac.commission_amount,
          ac.commission_type,
          ac.base_amount,
          ac.level,
          ac.status,
          ac.created_at
        FROM affiliate_commissions ac
        JOIN users u ON ac.referred_user_id = u.id
        WHERE ac.affiliate_id = $1
        ORDER BY ac.created_at DESC
        LIMIT 10`,
        [userId]
      );

      // Get monthly performance
      const monthlyStats = await client.query(
        `SELECT 
          COUNT(ar.id) as new_referrals,
          COALESCE(SUM(ac.commission_amount), 0) as commission_earned,
          COUNT(CASE WHEN ar.first_deposit_amount > 0 THEN 1 END) as conversions
        FROM affiliate_relationships ar
        LEFT JOIN affiliate_commissions ac ON ar.affiliate_id = ac.affiliate_id 
          AND ar.referred_user_id = ac.referred_user_id
          AND ac.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        WHERE ar.affiliate_id = $1 
          AND ar.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [userId]
      );

      return {
        profile,
        mlm_structure: mlmStructure,
        commission_stats: commissionStats.rows[0],
        recent_referrals: recentReferrals.rows,
        recent_commissions: recentCommissions.rows,
        monthly_stats: monthlyStats.rows[0]
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get admin affiliate management dashboard
   */
  static async getAdminAffiliateDashboard(): Promise<any> {
    const client = await pool.connect();
    try {
      // Overall statistics
      const overallStats = await client.query(
        `SELECT 
          COUNT(*) as total_affiliates,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_affiliates,
          COALESCE(SUM(total_referrals), 0) as total_referrals,
          COALESCE(SUM(total_commission_earned), 0) as total_commission_earned,
          COALESCE(SUM(total_payouts_received), 0) as total_payouts_paid
        FROM affiliate_profiles`
      );

      // Team statistics
      const teamStats = await client.query(
        `SELECT 
          at.id as team_id,
          at.name as team_name,
          COUNT(ap.id) as affiliate_count,
          COUNT(CASE WHEN ap.is_active = true THEN 1 END) as active_affiliates,
          COALESCE(SUM(ap.total_referrals), 0) as total_referrals,
          COALESCE(SUM(ap.total_commission_earned), 0) as total_commission
        FROM affiliate_teams at
        LEFT JOIN affiliate_profiles ap ON at.id = ap.team_id
        GROUP BY at.id, at.name
        ORDER BY total_commission DESC`
      );

      // Top performing affiliates
      const topAffiliates = await client.query(
        `SELECT 
          ap.id,
          u.username,
          ap.display_name,
          ap.total_referrals,
          ap.total_commission_earned,
          ap.is_active,
          at.name as team_name
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        LEFT JOIN affiliate_teams at ON ap.team_id = at.id
        ORDER BY ap.total_commission_earned DESC
        LIMIT 10`
      );

      // Recent activities
      const recentActivities = await client.query(
        `SELECT 
          'commission' as type,
          ac.id,
          u.username as affiliate_name,
          ac.commission_amount,
          ac.commission_type,
          ac.created_at
        FROM affiliate_commissions ac
        JOIN users u ON ac.affiliate_id = u.id
        WHERE ac.created_at >= CURRENT_DATE - INTERVAL '7 days'
        UNION ALL
        SELECT 
          'payout' as type,
          ap.id,
          u.username as affiliate_name,
          ap.total_amount as commission_amount,
          'payout' as commission_type,
          ap.created_at
        FROM affiliate_payouts ap
        JOIN users u ON ap.affiliate_id = u.id
        WHERE ap.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 20`
      );

      return {
        overall_stats: overallStats.rows[0],
        team_stats: teamStats.rows,
        top_affiliates: topAffiliates.rows,
        recent_activities: recentActivities.rows
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get manager dashboard for affiliate managers
   */
  static async getManagerDashboard(managerId: number): Promise<any> {
    const client = await pool.connect();
    try {
      // Get teams managed by this manager
      const teamsResult = await client.query(
        `SELECT 
          at.id,
          at.name,
          at.description,
          at.team_commission_rate,
          COUNT(ap.id) as affiliate_count,
          COUNT(CASE WHEN ap.is_active = true THEN 1 END) as active_affiliates,
          COALESCE(SUM(ap.total_referrals), 0) as total_referrals,
          COALESCE(SUM(ap.total_commission_earned), 0) as total_commission
        FROM affiliate_teams at
        LEFT JOIN affiliate_profiles ap ON at.id = ap.team_id
        WHERE at.manager_id = $1
        GROUP BY at.id, at.name, at.description, at.team_commission_rate`,
        [managerId]
      );

      // Get affiliates under this manager
      const affiliatesResult = await client.query(
        `SELECT 
          ap.id,
          u.username,
          ap.display_name,
          ap.total_referrals,
          ap.total_commission_earned,
          ap.is_active,
          at.name as team_name
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        LEFT JOIN affiliate_teams at ON ap.team_id = at.id
        WHERE ap.manager_id = $1
        ORDER BY ap.total_commission_earned DESC`,
        [managerId]
      );

      // Get recent team activities
      const recentActivities = await client.query(
        `SELECT 
          ac.id,
          u.username as affiliate_name,
          ac.commission_amount,
          ac.commission_type,
          ac.created_at
        FROM affiliate_commissions ac
        JOIN users u ON ac.affiliate_id = u.id
        JOIN affiliate_profiles ap ON ac.affiliate_id = ap.user_id
        WHERE ap.manager_id = $1
          AND ac.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY ac.created_at DESC
        LIMIT 15`,
        [managerId]
      );

      return {
        teams: teamsResult.rows,
        affiliates: affiliatesResult.rows,
        recent_activities: recentActivities.rows
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get affiliate statistics
   */
  static async getAffiliateStats(userId: number): Promise<any> {
    const client = await pool.connect();
    try {
      // Get basic stats
      const statsResult = await client.query(
        `SELECT 
          total_referrals,
          total_commission_earned,
          commission_rate,
          is_active
        FROM affiliate_profiles 
        WHERE user_id = $1`,
        [userId]
      );

      if (statsResult.rows.length === 0) {
        throw new Error('Affiliate profile not found');
      }

      const profile = statsResult.rows[0];

      // Get monthly commission
      const monthlyResult = await client.query(
        `SELECT COALESCE(SUM(commission_amount), 0) as monthly_commission
         FROM affiliate_commissions 
         WHERE affiliate_id = $1 
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [userId]
      );

      // Get pending commission
      const pendingResult = await client.query(
        `SELECT COALESCE(SUM(commission_amount), 0) as pending_commission
         FROM affiliate_commissions 
         WHERE affiliate_id = $1 
         AND status = 'pending'`,
        [userId]
      );

      // Get conversion rate
      const conversionResult = await client.query(
        `SELECT 
          COUNT(*) as total_clicks,
          COUNT(CASE WHEN converted_user_id IS NOT NULL THEN 1 END) as conversions
        FROM affiliate_tracking 
        WHERE affiliate_id = $1 
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [userId]
      );

      const conversionRate = conversionResult.rows[0].total_clicks > 0 
        ? (conversionResult.rows[0].conversions / conversionResult.rows[0].total_clicks) * 100 
        : 0;

      return {
        total_referrals: profile.total_referrals || 0,
        total_commission_earned: profile.total_commission_earned || 0,
        commission_rate: profile.commission_rate || 5.0,
        monthly_commission: monthlyResult.rows[0].monthly_commission || 0,
        pending_commission: pendingResult.rows[0].pending_commission || 0,
        conversion_rate: conversionRate,
        is_active: profile.is_active
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get affiliate referrals
   */
  static async getAffiliateReferrals(
    userId: number,
    page: number = 1,
    limit: number = 10,
    level?: string
  ): Promise<any> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE ar.affiliate_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (level) {
        whereClause += ` AND ar.level = $${paramIndex}`;
        params.push(level);
        paramIndex++;
      }

      const referralsResult = await client.query(
        `SELECT
          ar.id,
          ar.referred_user_id,
          ar.level,
          ar.is_indirect,
          ar.status,
          ar.created_at as registered_at,
          ar.first_deposit_amount as total_deposits,
          ar.total_commission_earned as total_commission_generated,
          u.username,
          u.email,
          up.avatar_url,
          COALESCE(SUM(ac.commission_amount), 0) as total_commission
        FROM affiliate_relationships ar
        LEFT JOIN users u ON ar.referred_user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN affiliate_commissions ac ON ar.referred_user_id = ac.referred_user_id
          AND ar.affiliate_id = ac.affiliate_id
        ${whereClause}
        GROUP BY ar.id, ar.referred_user_id, ar.level, ar.is_indirect, ar.status, ar.created_at, ar.first_deposit_amount, ar.total_commission_earned, u.username, u.email, up.avatar_url
        ORDER BY ar.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total
         FROM affiliate_relationships ar
         ${whereClause}`,
        params
      );

      return {
        referrals: referralsResult.rows,
        pagination: {
          page,
          limit,
          total: countResult.rows[0].total,
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get affiliate commissions
   */
  static async getAffiliateCommissions(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE ac.affiliate_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND ac.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND ac.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND ac.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      const commissionsResult = await client.query(
        `SELECT 
          ac.id,
          ac.commission_amount,
          ac.commission_rate,
          ac.base_amount,
          ac.commission_type,
          ac.status,
          ac.created_at,
          u.username as referred_username,
          u.email as referred_email
        FROM affiliate_commissions ac
        LEFT JOIN users u ON ac.referred_user_id = u.id
        ${whereClause}
        ORDER BY ac.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total
         FROM affiliate_commissions ac
         ${whereClause}`,
        params
      );

      return {
        commissions: commissionsResult.rows,
        pagination: {
          page,
          limit,
          total: countResult.rows[0].total,
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get affiliate commission statistics
   */
  static async getAffiliateCommissionStats(
    userId: number,
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const client = await pool.connect();
    try {
      let whereClause = 'WHERE affiliate_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex} + INTERVAL '1 day'`;
        params.push(endDate);
        paramIndex++;
      }

      const statsResult = await client.query(
        `SELECT
          COUNT(*)::TEXT as total_commissions,
          COALESCE(SUM(commission_amount), 0)::TEXT as total_amount,
          COUNT(*) FILTER (WHERE status = 'pending')::TEXT as pending_count,
          COALESCE(SUM(commission_amount) FILTER (WHERE status = 'pending'), 0)::TEXT as pending_amount,
          COUNT(*) FILTER (WHERE status = 'paid')::TEXT as paid_count,
          COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0)::TEXT as paid_amount,
          COUNT(*) FILTER (WHERE status = 'cancelled')::TEXT as rejected_count,
          COALESCE(SUM(commission_amount) FILTER (WHERE status = 'cancelled'), 0)::TEXT as rejected_amount
        FROM affiliate_commissions
        ${whereClause}`,
        params
      );

      return statsResult.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get affiliate team structure
   */
  static async getAffiliateTeam(userId: number, level: number = 1): Promise<any> {
    const client = await pool.connect();
    try {
      const teamResult = await client.query(
        `SELECT
          ar.id,
          ar.referred_user_id,
          ar.level,
          ar.is_indirect,
          ar.created_at,
          u.username,
          u.email,
          up.avatar_url,
          ap.referral_code,
          ap.total_referrals as downline_referrals,
          COALESCE(SUM(ac.commission_amount), 0) as total_commission
        FROM affiliate_relationships ar
        LEFT JOIN users u ON ar.referred_user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN affiliate_profiles ap ON u.id = ap.user_id
        LEFT JOIN affiliate_commissions ac ON ar.referred_user_id = ac.referred_user_id
          AND ar.affiliate_id = ac.affiliate_id
        WHERE ar.affiliate_id = $1 AND ar.level = $2
        GROUP BY ar.id, ar.referred_user_id, ar.level, ar.is_indirect, ar.created_at, 
                 u.username, u.email, up.avatar_url, ap.referral_code, ap.total_referrals
        ORDER BY ar.created_at DESC`,
        [userId, level]
      );

      return {
        level,
        team_members: teamResult.rows,
        total_members: teamResult.rows.length
      };
    } finally {
      client.release();
    }
  }

  /**
   * Generate affiliate link
   */
  static async generateAffiliateLink(
    userId: number,
    campaignName: string,
    targetUrl: string
  ): Promise<any> {
    const client = await pool.connect();
    try {
      // Get affiliate referral code
      const affiliateResult = await client.query(
        'SELECT referral_code FROM affiliate_profiles WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      if (affiliateResult.rows.length === 0) {
        throw new Error('Active affiliate profile not found');
      }

      const referralCode = affiliateResult.rows[0].referral_code;
      const affiliateUrl = `${targetUrl}?ref=${referralCode}&campaign=${encodeURIComponent(campaignName)}`;

      // Store the link generation
      await client.query(
        `INSERT INTO affiliate_links (
          affiliate_id, campaign_name, target_url, affiliate_url, is_active
        ) VALUES ($1, $2, $3, $4, true)`,
        [userId, campaignName, targetUrl, affiliateUrl]
      );

      return {
        campaign_name: campaignName,
        target_url: targetUrl,
        affiliate_url: affiliateUrl,
        referral_code: referralCode
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get affiliate dashboard data
   */
  static async getAffiliateDashboard(userId: number): Promise<any> {
    const client = await pool.connect();
    try {
      // Get basic stats
      const stats = await this.getAffiliateStats(userId);

      // Get balance information from user_balances
      const balanceResult = await client.query(
        `SELECT
          COALESCE(affiliate_balance, 0) as affiliate_balance,
          COALESCE(affiliate_balance_locked, 0) as affiliate_balance_locked,
          COALESCE(affiliate_total_earned, 0) as affiliate_total_earned,
          COALESCE(affiliate_total_redeemed, 0) as affiliate_total_redeemed
        FROM user_balances
        WHERE user_id = $1`,
        [userId]
      );

      const balance = balanceResult.rows[0] || {
        affiliate_balance: 0,
        affiliate_balance_locked: 0,
        affiliate_total_earned: 0,
        affiliate_total_redeemed: 0
      };

      // Get recent referrals
      const recentReferralsResult = await client.query(
        `SELECT
          ar.referred_user_id,
          ar.created_at,
          u.username,
          u.email
        FROM affiliate_relationships ar
        LEFT JOIN users u ON ar.referred_user_id = u.id
        WHERE ar.affiliate_id = $1
        ORDER BY ar.created_at DESC
        LIMIT 5`,
        [userId]
      );

      // Get recent commissions
      const recentCommissionsResult = await client.query(
        `SELECT
          commission_amount,
          commission_type,
          status,
          created_at
        FROM affiliate_commissions
        WHERE affiliate_id = $1
        ORDER BY created_at DESC
        LIMIT 5`,
        [userId]
      );

      // Get pending commissions total
      const pendingCommissionsResult = await client.query(
        `SELECT COALESCE(SUM(commission_amount), 0) as pending_total
        FROM affiliate_commissions
        WHERE affiliate_id = $1 AND status = 'pending'`,
        [userId]
      );

      const pendingCommissionTotal = parseFloat(pendingCommissionsResult.rows[0]?.pending_total || 0);

      // Get monthly chart data
      const monthlyDataResult = await client.query(
        `SELECT
          DATE_TRUNC('day', created_at) as date,
          SUM(commission_amount) as daily_commission
        FROM affiliate_commissions
        WHERE affiliate_id = $1
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date`,
        [userId]
      );

      return {
        overview: {
          ...stats,
          ...balance,
          available_balance: balance.affiliate_balance || 0,
          pending_commission: pendingCommissionTotal,
          monthly_commission: stats.monthly_commission || 0
        },
        recent_referrals: recentReferralsResult.rows,
        recent_commissions: recentCommissionsResult.rows,
        monthly_chart_data: monthlyDataResult.rows
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all affiliate profiles (Admin)
   */
  static async getAllAffiliateProfiles(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string
  ): Promise<any> {
    const client = await pool.connect();
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        whereClause += ` AND ap.is_active = $${paramIndex}`;
        params.push(status === 'active');
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR ap.display_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const profilesResult = await client.query(
        `SELECT 
          ap.id,
          ap.user_id,
          ap.referral_code,
          ap.display_name,
          ap.commission_rate,
          ap.total_referrals,
          ap.total_commission_earned,
          ap.is_active,
          ap.created_at,
          u.username,
          u.email
        FROM affiliate_profiles ap
        LEFT JOIN users u ON ap.user_id = u.id
        ${whereClause}
        ORDER BY ap.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total
         FROM affiliate_profiles ap
         LEFT JOIN users u ON ap.user_id = u.id
         ${whereClause}`,
        params
      );

      return {
        profiles: profilesResult.rows,
        pagination: {
          page,
          limit,
          total: countResult.rows[0].total,
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update affiliate commission rate (Admin)
   */
  static async updateAffiliateCommissionRate(
    affiliateId: number,
    commissionRate: number
  ): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE affiliate_profiles 
         SET commission_rate = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING *`,
        [commissionRate, affiliateId]
      );

      if (result.rows.length === 0) {
        throw new Error('Affiliate profile not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get affiliate commission summary (Admin)
   */
  static async getAffiliateCommissionSummary(
    startDate?: string,
    endDate?: string,
    affiliateId?: number
  ): Promise<any> {
    const client = await pool.connect();
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (startDate) {
        whereClause += ` AND ac.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND ac.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (affiliateId) {
        whereClause += ` AND ac.affiliate_id = $${paramIndex}`;
        params.push(affiliateId);
        paramIndex++;
      }

      const summaryResult = await client.query(
        `SELECT 
          COUNT(*) as total_commissions,
          COALESCE(SUM(commission_amount), 0) as total_amount,
          COALESCE(AVG(commission_amount), 0) as avg_commission,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount
        FROM affiliate_commissions ac
        ${whereClause}`,
        params
      );

      return summaryResult.rows[0];
    } finally {
      client.release();
    }
  }
} 