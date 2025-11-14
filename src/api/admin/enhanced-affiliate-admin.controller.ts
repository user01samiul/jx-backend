import { Request, Response } from "express";
import pool from "../../db/postgres";
import { EnhancedAffiliateService } from "../../services/affiliate/enhanced-affiliate.service";

// =====================================================
// ADMIN AFFILIATE SYSTEM MANAGEMENT
// =====================================================

export const getAdminAffiliateSystemOverview = async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      // Get comprehensive system overview
      const overviewResult = await client.query(`
        SELECT 
          -- Overall statistics
          (SELECT COUNT(*) FROM affiliate_profiles) as total_affiliates,
          (SELECT COUNT(*) FROM affiliate_profiles WHERE is_active = true) as active_affiliates,
          (SELECT COUNT(*) FROM affiliate_teams) as total_teams,
          (SELECT COUNT(*) FROM users WHERE id IN (SELECT DISTINCT manager_id FROM affiliate_teams)) as total_managers,
          
          -- Financial statistics
          (SELECT COALESCE(SUM(total_commission_earned), 0) FROM affiliate_profiles) as total_commission_paid,
          (SELECT COALESCE(SUM(total_payouts_received), 0) FROM affiliate_profiles) as total_payouts_processed,
          (SELECT COALESCE(SUM(commission_amount), 0) FROM affiliate_commissions WHERE status = 'pending') as pending_commissions,
          
          -- Performance statistics
          (SELECT COALESCE(SUM(total_referrals), 0) FROM affiliate_profiles) as total_referrals,
          (SELECT COUNT(*) FROM affiliate_relationships WHERE first_deposit_amount > 0) as successful_conversions,
          
          -- MLM statistics
          (SELECT COALESCE(SUM(downline_count), 0) FROM affiliate_profiles) as total_downline_affiliates,
          (SELECT COALESCE(SUM(total_downline_commission), 0) FROM affiliate_profiles) as total_downline_commission
      `);

      // Get recent activities
      const recentActivities = await client.query(`
        SELECT 
          'new_affiliate' as type,
          ap.created_at,
          u.username as affiliate_name,
          'New affiliate joined' as description,
          NULL as amount
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        WHERE ap.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'commission' as type,
          ac.created_at,
          u.username as affiliate_name,
          CONCAT('Commission earned: ', ac.commission_type) as description,
          ac.commission_amount as amount
        FROM affiliate_commissions ac
        JOIN users u ON ac.affiliate_id = u.id
        WHERE ac.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'payout' as type,
          ap.created_at,
          u.username as affiliate_name,
          'Payout processed' as description,
          ap.total_amount as amount
        FROM affiliate_payouts ap
        JOIN users u ON ap.affiliate_id = u.id
        WHERE ap.created_at >= CURRENT_DATE - INTERVAL '7 days'
        
        ORDER BY created_at DESC
        LIMIT 20
      `);

      // Get top performing affiliates
      const topAffiliates = await client.query(`
        SELECT 
          ap.id,
          u.username,
          ap.display_name,
          ap.total_commission_earned,
          ap.total_referrals,
          ap.downline_count,
          ap.is_active,
          at.name as team_name,
          um.username as manager_name
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        LEFT JOIN affiliate_teams at ON ap.team_id = at.id
        LEFT JOIN users um ON ap.manager_id = um.id
        ORDER BY ap.total_commission_earned DESC
        LIMIT 10
      `);

      // Get team performance
      const teamPerformance = await client.query(`
        SELECT 
          at.id,
          at.name,
          at.manager_id,
          um.username as manager_name,
          COUNT(ap.id) as affiliate_count,
          COALESCE(SUM(ap.total_commission_earned), 0) as total_commission,
          COALESCE(SUM(ap.total_referrals), 0) as total_referrals,
          CASE 
            WHEN COUNT(ap.id) > 0 THEN 
              COALESCE(SUM(ap.total_commission_earned), 0) / COUNT(ap.id)
            ELSE 0 
          END as avg_commission_per_affiliate
        FROM affiliate_teams at
        LEFT JOIN users um ON at.manager_id = um.id
        LEFT JOIN affiliate_profiles ap ON at.id = ap.team_id
        GROUP BY at.id, at.name, at.manager_id, um.username
        ORDER BY total_commission DESC
      `);

      res.json({
        success: true,
        data: {
          overview: overviewResult.rows[0],
          recent_activities: recentActivities.rows,
          top_affiliates: topAffiliates.rows,
          team_performance: teamPerformance.rows
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const adminCreateAffiliate = async (req: Request, res: Response) => {
  try {
    const { userId, profileData, uplineReferralCode, managerId, teamId } = req.validated?.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user already has affiliate profile
      const existingProfile = await client.query(
        'SELECT id FROM affiliate_profiles WHERE user_id = $1',
        [userId]
      );

      if (existingProfile.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User already has an affiliate profile"
        });
      }

      // Create affiliate profile
      const profile = await EnhancedAffiliateService.createEnhancedAffiliateProfile(
        userId,
        {
          ...profileData,
          manager_id: managerId,
          team_id: teamId
        },
        uplineReferralCode
      );

      // Assign affiliate role to user
      const roleResult = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        ['Affiliate']
      );

      if (roleResult.rows.length > 0) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id) 
           VALUES ($1, $2) 
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [userId, roleResult.rows[0].id]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: "Affiliate created successfully",
        data: profile
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const adminUpdateAffiliateSettings = async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const updateData = req.validated?.body;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE affiliate_profiles 
         SET 
           display_name = COALESCE($1, display_name),
           commission_rate = COALESCE($2, commission_rate),
           minimum_payout = COALESCE($3, minimum_payout),
           is_active = COALESCE($4, is_active),
           manager_id = COALESCE($5, manager_id),
           team_id = COALESCE($6, team_id),
           payment_methods = COALESCE($7, payment_methods),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [
          updateData.display_name,
          updateData.commission_rate,
          updateData.minimum_payout,
          updateData.is_active,
          updateData.manager_id,
          updateData.team_id,
          updateData.payment_methods,
          affiliateId
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }

      res.json({
        success: true,
        message: "Affiliate settings updated successfully",
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const adminGetAffiliateAnalytics = async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const { period = '30' } = req.query; // days

    const client = await pool.connect();
    try {
      // Get affiliate profile
      const profileResult = await client.query(
        `SELECT ap.*, u.username, u.email
         FROM affiliate_profiles ap
         JOIN users u ON ap.user_id = u.id
         WHERE ap.id = $1`,
        [affiliateId]
      );

      if (profileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Affiliate not found"
        });
      }

      const profile = profileResult.rows[0];

      // Get commission analytics
      const commissionAnalytics = await client.query(
        `SELECT 
           DATE_TRUNC('day', created_at) as date,
           COUNT(*) as commission_count,
           COALESCE(SUM(commission_amount), 0) as total_commission,
           commission_type,
           level
         FROM affiliate_commissions 
         WHERE affiliate_id = $1 
           AND created_at >= CURRENT_DATE - INTERVAL '${period} days'
         GROUP BY DATE_TRUNC('day', created_at), commission_type, level
         ORDER BY date DESC`,
        [profile.user_id]
      );

      // Get referral analytics
      const referralAnalytics = await client.query(
        `SELECT 
           DATE_TRUNC('day', ar.created_at) as date,
           COUNT(*) as new_referrals,
           COUNT(CASE WHEN ar.first_deposit_amount > 0 THEN 1 END) as conversions,
           COALESCE(SUM(ar.first_deposit_amount), 0) as total_first_deposits
         FROM affiliate_relationships ar
         WHERE ar.affiliate_id = $1 
           AND ar.created_at >= CURRENT_DATE - INTERVAL '${period} days'
         GROUP BY DATE_TRUNC('day', ar.created_at)
         ORDER BY date DESC`,
        [profile.user_id]
      );

      // Get MLM structure analytics
      const mlmAnalytics = await client.query(
        `SELECT 
           level,
           COUNT(*) as affiliate_count,
           COALESCE(SUM(total_commission_earned), 0) as total_commission
         FROM affiliate_profiles
         WHERE upline_id = $1
         GROUP BY level
         ORDER BY level`,
        [profile.user_id]
      );

      // Get performance metrics
      const performanceMetrics = await client.query(
        `SELECT 
           COUNT(ar.id) as total_referrals,
           COUNT(CASE WHEN ar.first_deposit_amount > 0 THEN 1 END) as successful_conversions,
           CASE 
             WHEN COUNT(ar.id) > 0 THEN 
               (COUNT(CASE WHEN ar.first_deposit_amount > 0 THEN 1 END)::NUMERIC / COUNT(ar.id)::NUMERIC) * 100
             ELSE 0 
           END as conversion_rate,
           COALESCE(SUM(ar.first_deposit_amount), 0) as total_first_deposits,
           COALESCE(AVG(ar.first_deposit_amount), 0) as avg_first_deposit
         FROM affiliate_relationships ar
         WHERE ar.affiliate_id = $1`,
        [profile.user_id]
      );

      res.json({
        success: true,
        data: {
          profile,
          commission_analytics: commissionAnalytics.rows,
          referral_analytics: referralAnalytics.rows,
          mlm_analytics: mlmAnalytics.rows,
          performance_metrics: performanceMetrics.rows[0]
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const adminProcessCommissionPayout = async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const { commissionIds, paymentMethod, paymentReference, notes } = req.validated?.body;
    const adminId = (req as any).user.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get total amount from commissions
      const totalAmountResult = await client.query(
        `SELECT COALESCE(SUM(commission_amount), 0) as total_amount
         FROM affiliate_commissions 
         WHERE id = ANY($1) AND status = 'pending'`,
        [commissionIds]
      );

      const totalAmount = totalAmountResult.rows[0].total_amount;

      if (totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "No pending commissions found"
        });
      }

      // Create payout record
      const payoutResult = await client.query(
        `INSERT INTO affiliate_payouts (
          affiliate_id, total_amount, commission_ids, payment_method,
          payment_reference, status, processed_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          affiliateId,
          totalAmount,
          commissionIds,
          paymentMethod,
          paymentReference,
          'processing',
          adminId,
          notes
        ]
      );

      // Update commission status
      await client.query(
        `UPDATE affiliate_commissions 
         SET status = 'paid', paid_at = CURRENT_TIMESTAMP, paid_by = $1
         WHERE id = ANY($2)`,
        [adminId, commissionIds]
      );

      // Update affiliate profile
      await client.query(
        `UPDATE affiliate_profiles 
         SET total_payouts_received = total_payouts_received + $1
         WHERE user_id = $2`,
        [totalAmount, affiliateId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: "Commission payout processed successfully",
        data: payoutResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const adminGetMLMStructure = async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const { maxDepth = 3 } = req.query;

    const client = await pool.connect();
    try {
      // Get MLM tree structure
      const mlmTreeResult = await client.query(
        `SELECT * FROM get_mlm_tree($1, $2)`,
        [affiliateId, parseInt(maxDepth as string)]
      );

      // Get upline chain
      const uplineChainResult = await client.query(
        `WITH RECURSIVE upline_chain AS (
          SELECT user_id, upline_id, 0 as level
          FROM affiliate_profiles
          WHERE user_id = $1
          
          UNION ALL
          
          SELECT ap.user_id, ap.upline_id, uc.level + 1
          FROM affiliate_profiles ap
          JOIN upline_chain uc ON ap.user_id = uc.upline_id
          WHERE ap.upline_id IS NOT NULL
        )
        SELECT 
          uc.level,
          ap.user_id,
          u.username,
          ap.display_name,
          ap.total_commission_earned
        FROM upline_chain uc
        JOIN affiliate_profiles ap ON uc.upline_id = ap.user_id
        JOIN users u ON ap.user_id = u.id
        ORDER BY uc.level DESC`,
        [affiliateId]
      );

      res.json({
        success: true,
        data: {
          mlm_tree: mlmTreeResult.rows,
          upline_chain: uplineChainResult.rows
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const adminGetSystemSettings = async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    try {
      // Get default commission rates
      const commissionRates = {
        level_1: 5.0, // Direct referrals
        level_2: 2.0, // Level 2 referrals
        level_3: 1.0, // Level 3 referrals
        bet_revenue: 3.0, // Bet revenue commission
        deposit: 10.0, // First deposit commission
        minimum_payout: 50.0, // Minimum payout threshold
        max_mlm_levels: 3 // Maximum MLM levels
      };

      // Get team settings
      const teamSettings = await client.query(
        `SELECT 
          at.id,
          at.name,
          at.team_commission_rate,
          at.team_goals,
          um.username as manager_name
        FROM affiliate_teams at
        LEFT JOIN users um ON at.manager_id = um.id
        ORDER BY at.name`
      );

      // Get manager permissions
      const managerPermissions = await client.query(
        `SELECT 
          mp.*,
          u.username as manager_name
        FROM manager_permissions mp
        JOIN users u ON mp.manager_id = u.id
        ORDER BY u.username`
      );

      res.json({
        success: true,
        data: {
          commission_rates: commissionRates,
          team_settings: teamSettings.rows,
          manager_permissions: managerPermissions.rows
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const adminUpdateSystemSettings = async (req: Request, res: Response) => {
  try {
    const { commissionRates, teamSettings, managerPermissions } = req.validated?.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update team settings if provided
      if (teamSettings) {
        for (const team of teamSettings) {
          await client.query(
            `UPDATE affiliate_teams 
             SET team_commission_rate = $1, team_goals = $2
             WHERE id = $3`,
            [team.team_commission_rate, team.team_goals, team.id]
          );
        }
      }

      // Update manager permissions if provided
      if (managerPermissions) {
        for (const permission of managerPermissions) {
          await client.query(
            `UPDATE manager_permissions 
             SET 
               can_create_affiliates = $1,
               can_edit_commission_rates = $2,
               can_approve_payouts = $3,
               can_view_team_analytics = $4,
               can_manage_marketing_materials = $5,
               max_team_size = $6,
               commission_approval_limit = $7
             WHERE manager_id = $8`,
            [
              permission.can_create_affiliates,
              permission.can_edit_commission_rates,
              permission.can_approve_payouts,
              permission.can_view_team_analytics,
              permission.can_manage_marketing_materials,
              permission.max_team_size,
              permission.commission_approval_limit,
              permission.manager_id
            ]
          );
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: "System settings updated successfully"
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}; 