import { Request, Response } from "express";
import { EnhancedAffiliateService } from "../../services/affiliate/enhanced-affiliate.service";
import pool from "../../db/postgres";

// =====================================================
// ENHANCED AFFILIATE PROFILE CONTROLLERS
// =====================================================

export const createEnhancedAffiliateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { profileData, uplineReferralCode } = req.validated?.body;

    const profile = await EnhancedAffiliateService.createEnhancedAffiliateProfile(
      userId, 
      profileData, 
      uplineReferralCode
    );

    res.status(201).json({
      success: true,
      message: "Enhanced affiliate profile created successfully",
      data: profile
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getEnhancedAffiliateDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const dashboard = await EnhancedAffiliateService.getEnhancedAffiliateDashboard(userId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMLMStructure = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const mlmStructure = await EnhancedAffiliateService.getMLMStructure(userId);

    res.json({
      success: true,
      data: mlmStructure
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// COMMISSION CALCULATION CONTROLLERS
// =====================================================

export const calculateBetRevenueCommission = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { referredUserId, periodStart, periodEnd } = req.validated?.body;

    const commission = await EnhancedAffiliateService.calculateBetRevenueCommission(
      userId,
      referredUserId,
      new Date(periodStart),
      new Date(periodEnd)
    );

    res.json({
      success: true,
      message: "Bet revenue commission calculated successfully",
      data: commission
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const calculateMLMCommissions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { referredUserId, transactionId, amount, commissionType } = req.validated?.body;

    const commissions = await EnhancedAffiliateService.calculateMLMCommissions(
      userId,
      referredUserId,
      transactionId,
      amount,
      commissionType
    );

    res.json({
      success: true,
      message: "MLM commissions calculated successfully",
      data: commissions
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// ADMIN AFFILIATE MANAGEMENT CONTROLLERS
// =====================================================

export const getAdminAffiliateDashboard = async (req: Request, res: Response) => {
  try {
    const dashboard = await EnhancedAffiliateService.getAdminAffiliateDashboard();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const adminGetAllAffiliates = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, team_id, manager_id } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const client = await pool.connect();
    try {
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        whereClause += ` AND ap.is_active = $${paramCount}`;
        params.push(status === 'active');
      }

      if (team_id) {
        paramCount++;
        whereClause += ` AND ap.team_id = $${paramCount}`;
        params.push(parseInt(team_id as string));
      }

      if (manager_id) {
        paramCount++;
        whereClause += ` AND ap.manager_id = $${paramCount}`;
        params.push(parseInt(manager_id as string));
      }

      // Get affiliates with pagination
      const affiliatesResult = await client.query(
        `SELECT 
          ap.*,
          u.username,
          u.email,
          u.status_id,
          at.name as team_name,
          um.username as manager_name
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        LEFT JOIN affiliate_teams at ON ap.team_id = at.id
        LEFT JOIN users um ON ap.manager_id = um.id
        ${whereClause}
        ORDER BY ap.total_commission_earned DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, parseInt(limit as string), offset]
      );

      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total
         FROM affiliate_profiles ap
         JOIN users u ON ap.user_id = u.id
         ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit as string));

      res.json({
        success: true,
        data: {
          affiliates: affiliatesResult.rows,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages
          }
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

export const adminUpdateAffiliate = async (req: Request, res: Response) => {
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
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [
          updateData.display_name,
          updateData.commission_rate,
          updateData.minimum_payout,
          updateData.is_active,
          updateData.manager_id,
          updateData.team_id,
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
        message: "Affiliate updated successfully",
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

export const adminGetAffiliateDetails = async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;

    const client = await pool.connect();
    try {
      // Get affiliate profile with user details
      const profileResult = await client.query(
        `SELECT 
          ap.*,
          u.username,
          u.email,
          u.status_id,
          at.name as team_name,
          um.username as manager_name
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        LEFT JOIN affiliate_teams at ON ap.team_id = at.id
        LEFT JOIN users um ON ap.manager_id = um.id
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

      // Get MLM structure
      const mlmStructure = await EnhancedAffiliateService.getMLMStructure(profile.user_id);

      // Get recent commissions
      const commissionsResult = await client.query(
        `SELECT 
          ac.*,
          u.username as referred_user
        FROM affiliate_commissions ac
        JOIN users u ON ac.referred_user_id = u.id
        WHERE ac.affiliate_id = $1
        ORDER BY ac.created_at DESC
        LIMIT 20`,
        [profile.user_id]
      );

      // Get recent referrals
      const referralsResult = await client.query(
        `SELECT 
          ar.*,
          u.username,
          u.email
        FROM affiliate_relationships ar
        JOIN users u ON ar.referred_user_id = u.id
        WHERE ar.affiliate_id = $1
        ORDER BY ar.created_at DESC
        LIMIT 20`,
        [profile.user_id]
      );

      res.json({
        success: true,
        data: {
          profile,
          mlm_structure: mlmStructure,
          recent_commissions: commissionsResult.rows,
          recent_referrals: referralsResult.rows
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

// =====================================================
// MANAGER CONTROLLERS
// =====================================================

export const getManagerDashboard = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;

    const dashboard = await EnhancedAffiliateService.getManagerDashboard(managerId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const managerGetTeamAffiliates = async (req: Request, res: Response) => {
  try {
    const managerId = (req as any).user.id;
    const { teamId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const client = await pool.connect();
    try {
      // Verify manager has access to this team
      const teamCheck = await client.query(
        'SELECT id FROM affiliate_teams WHERE id = $1 AND manager_id = $2',
        [teamId, managerId]
      );

      if (teamCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this team"
        });
      }

      // Get team affiliates
      const affiliatesResult = await client.query(
        `SELECT 
          ap.*,
          u.username,
          u.email,
          u.status_id
        FROM affiliate_profiles ap
        JOIN users u ON ap.user_id = u.id
        WHERE ap.team_id = $1
        ORDER BY ap.total_commission_earned DESC
        LIMIT $2 OFFSET $3`,
        [teamId, parseInt(limit as string), offset]
      );

      // Get total count
      const countResult = await client.query(
        'SELECT COUNT(*) as total FROM affiliate_profiles WHERE team_id = $1',
        [teamId]
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit as string));

      res.json({
        success: true,
        data: {
          affiliates: affiliatesResult.rows,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages
          }
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

// =====================================================
// REFERRAL TRACKING CONTROLLERS
// =====================================================

export const trackReferral = async (req: Request, res: Response) => {
  try {
    const { referralCode, visitorIp, userAgent, landingPage, sessionId } = req.validated?.body;

    // Find affiliate by referral code
    const client = await pool.connect();
    try {
      const affiliateResult = await client.query(
        'SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true',
        [referralCode]
      );

      if (affiliateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Invalid referral code"
        });
      }

      const affiliateId = affiliateResult.rows[0].user_id;

      // Track the click
      await client.query(
        `INSERT INTO affiliate_tracking (
          affiliate_id, referral_code, visitor_ip, user_agent, 
          landing_page, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [affiliateId, referralCode, visitorIp, userAgent, landingPage, sessionId]
      );

      res.json({
        success: true,
        message: "Referral tracked successfully"
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

export const recordReferralConversion = async (req: Request, res: Response) => {
  try {
    const { referralCode, conversionType, convertedUserId, conversionAmount } = req.validated?.body;

    const client = await pool.connect();
    try {
      // Find affiliate by referral code
      const affiliateResult = await client.query(
        'SELECT user_id FROM affiliate_profiles WHERE referral_code = $1 AND is_active = true',
        [referralCode]
      );

      if (affiliateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Invalid referral code"
        });
      }

      const affiliateId = affiliateResult.rows[0].user_id;

      // Record conversion
      await client.query(
        `INSERT INTO affiliate_tracking (
          affiliate_id, referral_code, conversion_type, 
          converted_user_id, conversion_amount
        ) VALUES ($1, $2, $3, $4, $5)`,
        [affiliateId, referralCode, conversionType, convertedUserId, conversionAmount]
      );

      // Create affiliate relationship if it doesn't exist
      await client.query(
        `INSERT INTO affiliate_relationships (
          affiliate_id, referred_user_id, referral_code
        ) VALUES ($1, $2, $3)
        ON CONFLICT (affiliate_id, referred_user_id) DO NOTHING`,
        [affiliateId, convertedUserId, referralCode]
      );

      // Update affiliate profile referral count
      await client.query(
        'UPDATE affiliate_profiles SET total_referrals = total_referrals + 1 WHERE user_id = $1',
        [affiliateId]
      );

      res.json({
        success: true,
        message: "Referral conversion recorded successfully"
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