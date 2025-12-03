import { Request, Response, NextFunction } from "express";
import { AffiliateApplicationService } from "../../services/affiliate/affiliate-application.service";
import { AffiliateBalanceService } from "../../services/affiliate/affiliate-balance.service";
import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";

/**
 * ====================================
 * AFFILIATE APPLICATION MANAGEMENT
 * ====================================
 */

/**
 * Get all affiliate applications with filters
 * GET /api/admin/affiliate-applications
 */
export const getAllApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      page,
      limit,
      search,
      sortBy,
      sortOrder
    } = req.query;

    const result = await AffiliateApplicationService.getAllApplications({
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get application by ID
 * GET /api/admin/affiliate-applications/:id
 */
export const getApplicationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const application = await AffiliateApplicationService.getApplicationById(parseInt(id));

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve affiliate application
 * POST /api/admin/affiliate-applications/:id/approve
 */
export const approveApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { commissionRate, teamId, managerId, adminNotes } = req.body;
    const adminId = (req as any).user.id;

    const result = await AffiliateApplicationService.approveApplication(
      parseInt(id),
      adminId,
      { commissionRate, teamId, managerId, adminNotes }
    );

    res.json({
      success: true,
      message: 'Application approved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject affiliate application
 * POST /api/admin/affiliate-applications/:id/reject
 */
export const rejectApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    const adminId = (req as any).user.id;

    if (!rejectionReason) {
      throw new ApiError('Rejection reason is required', 400);
    }

    const result = await AffiliateApplicationService.rejectApplication(
      parseInt(id),
      adminId,
      { rejectionReason, adminNotes }
    );

    res.json({
      success: true,
      message: 'Application rejected',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get application statistics
 * GET /api/admin/affiliate-applications/statistics
 */
export const getApplicationStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await AffiliateApplicationService.getApplicationStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ====================================
 * AFFILIATE MANAGEMENT
 * ====================================
 */

/**
 * Get all affiliates
 * GET /api/admin/affiliates
 */
export const getAllAffiliates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`ap.is_active = $` + paramIndex++);
      params.push(status === 'active');
    }

    if (search) {
      conditions.push(`(
        ap.display_name ILIKE $` + paramIndex + ` OR
        ap.referral_code ILIKE $` + paramIndex + ` OR
        u.username ILIKE $` + paramIndex + ` OR
        u.email ILIKE $` + paramIndex + `
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_profiles ap
       JOIN users u ON ap.user_id = u.id
       ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get affiliates
    const allowedSortColumns = ['created_at', 'total_referrals', 'total_commission_earned', 'display_name'];
    const sortColumn = allowedSortColumns.includes(sortBy as string) ? sortBy : 'created_at';

    const result = await pool.query(
      `SELECT
        ap.*,
        u.username,
        u.email,
        up.first_name,
        up.last_name,
        COALESCE(ub.affiliate_balance, 0) as affiliate_balance,
        COALESCE(ub.affiliate_balance_locked, 0) as affiliate_balance_locked,
        COALESCE(ub.affiliate_total_earned, 0) as affiliate_total_earned,
        COALESCE(ub.affiliate_total_redeemed, 0) as affiliate_total_redeemed,
        COUNT(DISTINCT ac.id) as commission_count,
        COALESCE(SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END), 0) as pending_commissions
       FROM affiliate_profiles ap
       JOIN users u ON ap.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN user_balances ub ON ap.user_id = ub.user_id
       LEFT JOIN affiliate_commissions ac ON ap.user_id = ac.affiliate_id
       ${whereClause}
       GROUP BY ap.id, u.username, u.email, up.first_name, up.last_name,
                ub.affiliate_balance, ub.affiliate_balance_locked,
                ub.affiliate_total_earned, ub.affiliate_total_redeemed
       ORDER BY ap.${sortColumn} ${sortOrder}
       LIMIT $` + paramIndex + ` OFFSET $` + (paramIndex + 1) + ``,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: {
        affiliates: result.rows,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get affiliate details by ID
 * GET /api/admin/affiliates/:id
 */
export const getAffiliateDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        ap.*,
        u.username,
        u.email,
        up.first_name,
        up.last_name,
        up.phone_number,
        up.country,
        COALESCE(ub.affiliate_balance, 0) as affiliate_balance,
        COALESCE(ub.affiliate_balance_locked, 0) as affiliate_balance_locked,
        COALESCE(ub.affiliate_total_earned, 0) as affiliate_total_earned,
        COALESCE(ub.affiliate_total_redeemed, 0) as affiliate_total_redeemed,
        upline.referral_code as upline_referral_code,
        upline.display_name as upline_name,
        approver.username as approved_by_username
       FROM affiliate_profiles ap
       JOIN users u ON ap.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN user_balances ub ON ap.user_id = ub.user_id
       LEFT JOIN affiliate_profiles upline ON ap.upline_id = upline.user_id
       LEFT JOIN users approver ON ap.approved_by = approver.id
       WHERE ap.id = $1`,
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Affiliate not found', 404);
    }

    // Get referral statistics
    const referralStats = await pool.query(
      `SELECT
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN ar.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as referrals_last_30_days,
        COUNT(CASE WHEN ar.first_deposit_amount > 0 THEN 1 END) as deposited_referrals
       FROM affiliate_relationships ar
       WHERE ar.affiliate_id = $1`,
      [result.rows[0].user_id]
    );

    const affiliate = {
      ...result.rows[0],
      referral_stats: referralStats.rows[0]
    };

    res.json({
      success: true,
      data: affiliate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update affiliate
 * PUT /api/admin/affiliates/:id
 */
export const updateAffiliate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      displayName,
      commissionRate,
      minimumPayout,
      isActive,
      websiteUrl,
      socialMediaLinks,
      paymentMethods
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (displayName !== undefined) {
      updates.push(`display_name = $` + paramIndex++);
      params.push(displayName);
    }

    if (commissionRate !== undefined) {
      updates.push(`commission_rate = $` + paramIndex++);
      params.push(commissionRate);
    }

    if (minimumPayout !== undefined) {
      updates.push(`minimum_payout = $` + paramIndex++);
      params.push(minimumPayout);
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $` + paramIndex++);
      params.push(isActive);
    }

    if (websiteUrl !== undefined) {
      updates.push(`website_url = $` + paramIndex++);
      params.push(websiteUrl);
    }

    if (socialMediaLinks !== undefined) {
      updates.push(`social_media_links = $` + paramIndex++);
      params.push(JSON.stringify(socialMediaLinks));
    }

    if (paymentMethods !== undefined) {
      updates.push(`payment_methods = $` + paramIndex++);
      params.push(JSON.stringify(paymentMethods));
    }

    if (updates.length === 0) {
      throw new ApiError('No fields to update', 400);
    }

    // Add updated_at and updated_by
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const adminId = (req as any).user?.id;
    if (adminId) {
      updates.push(`updated_by = $` + paramIndex++);
      params.push(adminId);
    }

    const result = await pool.query(
      `UPDATE affiliate_profiles
       SET ${updates.join(', ')}
       WHERE id = $` + paramIndex + `
       RETURNING *`,
      [...params, parseInt(id)]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Affiliate not found', 404);
    }

    res.json({
      success: true,
      message: 'Affiliate updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ====================================
 * AFFILIATE BALANCE MANAGEMENT
 * ====================================
 */

/**
 * Get affiliate balance
 * GET /api/admin/affiliates/:id/balance
 */
export const getAffiliateBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Get user_id from affiliate profile
    const profileResult = await pool.query(
      'SELECT user_id FROM affiliate_profiles WHERE id = $1',
      [parseInt(id)]
    );

    if (profileResult.rows.length === 0) {
      throw new ApiError('Affiliate not found', 404);
    }

    const userId = profileResult.rows[0].user_id;
    const balance = await AffiliateBalanceService.getBalanceSummary(userId);

    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Adjust affiliate balance
 * POST /api/admin/affiliates/:id/balance/adjust
 */
export const adjustAffiliateBalance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    const adminId = (req as any).user.id;

    if (!amount || !description) {
      throw new ApiError('Amount and description are required', 400);
    }

    // Get user_id from affiliate profile
    const profileResult = await pool.query(
      'SELECT user_id FROM affiliate_profiles WHERE id = $1',
      [parseInt(id)]
    );

    if (profileResult.rows.length === 0) {
      throw new ApiError('Affiliate not found', 404);
    }

    const userId = profileResult.rows[0].user_id;
    const result = await AffiliateBalanceService.adjustBalance(
      userId,
      parseFloat(amount),
      description,
      adminId
    );

    res.json({
      success: true,
      message: 'Balance adjusted successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get affiliate balance history
 * GET /api/admin/affiliates/:id/balance-history
 */
export const getAffiliateBalanceHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page, limit, transactionType } = req.query;

    // Get user_id
    const profileResult = await pool.query(
      'SELECT user_id FROM affiliate_profiles WHERE id = $1',
      [parseInt(id)]
    );

    if (profileResult.rows.length === 0) {
      throw new ApiError('Affiliate not found', 404);
    }

    const userId = profileResult.rows[0].user_id;
    const history = await AffiliateBalanceService.getBalanceHistory(userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      transactionType: transactionType as string
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ====================================
 * COMMISSION MANAGEMENT
 * ====================================
 */

/**
 * Get affiliate commissions
 * GET /api/admin/affiliates/:id/commissions
 */
export const getAffiliateCommissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, status } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get user_id
    const profileResult = await pool.query(
      'SELECT user_id FROM affiliate_profiles WHERE id = $1',
      [parseInt(id)]
    );

    if (profileResult.rows.length === 0) {
      throw new ApiError('Affiliate not found', 404);
    }

    const userId = profileResult.rows[0].user_id;

    const conditions = ['ac.affiliate_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`ac.status = $` + paramIndex++);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_commissions ac WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get commissions
    const result = await pool.query(
      `SELECT
        ac.*,
        referred.username as referred_username,
        referred.email as referred_email,
        t.type as transaction_type,
        t.amount as transaction_amount
       FROM affiliate_commissions ac
       LEFT JOIN users referred ON ac.referred_user_id = referred.id
       LEFT JOIN transactions t ON ac.transaction_id = t.id
       WHERE ${whereClause}
       ORDER BY ac.created_at DESC
       LIMIT $` + paramIndex + ` OFFSET $` + (paramIndex + 1) + ``,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: {
        commissions: result.rows,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve commission
 * POST /api/admin/commissions/:commissionId/approve
 */
export const approveCommission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commissionId } = req.params;
    const adminId = (req as any).user.id;

    const result = await pool.query(
      'SELECT process_commission_approval($1, $2) as success',
      [parseInt(commissionId), adminId]
    );

    res.json({
      success: true,
      message: 'Commission approved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel commission
 * POST /api/admin/commissions/:commissionId/cancel
 */
export const cancelCommission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commissionId } = req.params;
    const adminId = (req as any).user.id;

    const result = await pool.query(
      `UPDATE affiliate_commissions
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [parseInt(commissionId)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Commission not found or cannot be cancelled'
      });
    }

    res.json({
      success: true,
      message: 'Commission cancelled successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve multiple commissions
 * POST /api/admin/commissions/approve-bulk
 */
export const approveBulkCommissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commissionIds } = req.body;
    const adminId = (req as any).user.id;

    if (!Array.isArray(commissionIds) || commissionIds.length === 0) {
      throw new ApiError('Commission IDs array is required', 400);
    }

    const client = await pool.connect();
    let successCount = 0;
    let failCount = 0;

    try {
      for (const commissionId of commissionIds) {
        try {
          await client.query(
            'SELECT process_commission_approval($1, $2)',
            [parseInt(commissionId), adminId]
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to approve commission ${commissionId}:`, error);
          failCount++;
        }
      }

      res.json({
        success: true,
        message: `Approved ${successCount} commissions, ${failCount} failed`,
        data: { successCount, failCount }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get all commissions (global list)
 * GET /api/admin/commissions
 */
export const getAllCommissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      commission_type,
      start_date,
      end_date,
      affiliate_id
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      conditions.push(`ac.status = $` + paramIndex++);
      params.push(status);
    }

    if (commission_type && commission_type !== 'all') {
      conditions.push(`ac.commission_type = $` + paramIndex++);
      params.push(commission_type);
    }

    if (start_date) {
      conditions.push(`ac.created_at >= $` + paramIndex++);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`ac.created_at <= $` + paramIndex++ + ` + INTERVAL '1 day'`);
      params.push(end_date);
    }

    if (affiliate_id) {
      conditions.push(`ac.affiliate_id = $` + paramIndex++);
      params.push(parseInt(affiliate_id as string));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_commissions ac ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get commissions with affiliate names
    const result = await pool.query(
      `SELECT
        ac.*,
        ap.display_name as affiliate_name,
        u.username as referred_username,
        u.email as referred_email
       FROM affiliate_commissions ac
       JOIN affiliate_profiles ap ON ac.affiliate_id = ap.user_id
       LEFT JOIN users u ON ac.referred_user_id = u.id
       ${whereClause}
       ORDER BY ac.created_at DESC
       LIMIT $` + paramIndex + ` OFFSET $` + (paramIndex + 1) + ``,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: {
        commissions: result.rows,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get commission statistics
 * GET /api/admin/commissions/stats
 */
export const getCommissionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, affiliate_id } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (start_date) {
      conditions.push(`created_at >= $` + paramIndex++);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $` + paramIndex++ + ` + INTERVAL '1 day'`);
      params.push(end_date);
    }

    if (affiliate_id) {
      conditions.push(`affiliate_id = $` + paramIndex++);
      params.push(parseInt(affiliate_id as string));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
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

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ====================================
 * REDEMPTION MANAGEMENT
 * ====================================
 */

/**
 * Get all redemptions
 * GET /api/admin/affiliate-redemptions
 */
export const getAllRedemptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, status, userId } = req.query;

    const redemptions = await AffiliateBalanceService.getAllRedemptions({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      userId: userId ? parseInt(userId as string) : undefined
    });

    res.json({
      success: true,
      data: redemptions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve redemption request (Admin)
 * POST /api/admin/affiliate-redemptions/:id/approve
 */
export const approveRedemption = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminId = (req as any).user.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Redemption ID is required'
      });
    }

    const result = await AffiliateBalanceService.approveRedemption(
      parseInt(id),
      adminId,
      admin_notes
    );

    res.json({
      success: true,
      message: 'Redemption approved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject redemption request (Admin)
 * POST /api/admin/affiliate-redemptions/:id/reject
 */
export const rejectRedemption = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, admin_notes } = req.body;
    const adminId = (req as any).user.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Redemption ID is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const result = await AffiliateBalanceService.rejectRedemption(
      parseInt(id),
      adminId,
      reason,
      admin_notes
    );

    res.json({
      success: true,
      message: 'Redemption rejected successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get redemption settings (locked percentage, lock days, etc.)
 * GET /api/admin/affiliate-redemptions/settings
 */
export const getRedemptionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      "SELECT setting_value FROM affiliate_settings WHERE setting_key = 'redemption_settings'"
    );

    const defaultSettings = {
      minimum_redemption: 50.00,
      instant_percentage: 50,
      lock_days: 7
    };

    const settings = result.rows[0]?.setting_value || defaultSettings;

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update redemption settings (locked percentage globally)
 * PUT /api/admin/affiliate-redemptions/settings
 * Body: { instant_percentage: number, lock_days: number, minimum_redemption: number }
 */
export const updateRedemptionSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { instant_percentage, lock_days, minimum_redemption } = req.body;

    if (instant_percentage < 0 || instant_percentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'Instant percentage must be between 0 and 100'
      });
    }

    if (lock_days < 0) {
      return res.status(400).json({
        success: false,
        message: 'Lock days must be 0 or greater'
      });
    }

    const settings = {
      instant_percentage: parseInt(instant_percentage),
      lock_days: parseInt(lock_days),
      minimum_redemption: parseFloat(minimum_redemption)
    };

    // Upsert settings
    await pool.query(
      `INSERT INTO affiliate_settings (setting_key, setting_value)
       VALUES ('redemption_settings', $1)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $1, updated_at = NOW()`,
      [JSON.stringify(settings)]
    );

    res.json({
      success: true,
      message: 'Redemption settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Override locked percentage for a specific redemption before approval
 * PUT /api/admin/affiliate-redemptions/:id/override-amounts
 * Body: { instant_amount: number, locked_amount: number, lock_days?: number }
 */
export const overrideRedemptionAmounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { instant_amount, locked_amount, lock_days } = req.body;

    // Get redemption
    const redemptionResult = await pool.query(
      'SELECT * FROM affiliate_redemptions WHERE id = $1',
      [parseInt(id)]
    );

    if (redemptionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Redemption not found'
      });
    }

    const redemption = redemptionResult.rows[0];

    if (redemption.instant_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only override amounts for pending redemptions'
      });
    }

    const totalAmount = parseFloat(redemption.total_amount);
    const newInstantAmount = parseFloat(instant_amount);
    const newLockedAmount = parseFloat(locked_amount);
    const calculatedTotal = newInstantAmount + newLockedAmount;

    // Validate amounts with tolerance for floating point precision
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Instant ($${newInstantAmount.toFixed(2)}) + Locked ($${newLockedAmount.toFixed(2)}) must equal total redemption amount ($${totalAmount.toFixed(2)}). Current total: $${calculatedTotal.toFixed(2)}`,
        data: {
          expected_total: totalAmount,
          calculated_total: calculatedTotal,
          instant_amount: newInstantAmount,
          locked_amount: newLockedAmount
        }
      });
    }

    if (newInstantAmount < 0 || newLockedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Amounts cannot be negative'
      });
    }

    if (newInstantAmount > totalAmount || newLockedAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Individual amounts cannot exceed total redemption amount ($${totalAmount.toFixed(2)})`
      });
    }

    // Calculate new unlock date if lock_days provided
    let unlockDate = redemption.unlock_date;
    if (lock_days !== undefined && newLockedAmount > 0) {
      unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + parseInt(lock_days));
    }

    // Update redemption amounts
    await pool.query(
      `UPDATE affiliate_redemptions
       SET instant_amount = $1,
           locked_amount = $2,
           unlock_date = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [newInstantAmount, newLockedAmount, unlockDate, parseInt(id)]
    );

    res.json({
      success: true,
      message: 'Redemption amounts overridden successfully',
      data: {
        redemption_id: parseInt(id),
        instant_amount: newInstantAmount,
        locked_amount: newLockedAmount,
        unlock_date: unlockDate
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ====================================
 * PAYOUT MANAGEMENT
 * ====================================
 */

/**
 * Get all affiliate payouts (Admin)
 * GET /api/admin/affiliate-payouts
 */
export const getAllPayouts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 50, status, payment_method, start_date, end_date } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      conditions.push(`ap.status = $` + paramIndex++);
      params.push(status);
    }

    if (payment_method && payment_method !== 'all') {
      conditions.push(`ap.payment_method = $` + paramIndex++);
      params.push(payment_method);
    }

    if (start_date) {
      conditions.push(`ap.created_at >= $` + paramIndex++);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`ap.created_at <= $` + paramIndex++ + ` + INTERVAL '1 day'`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_payouts ap ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get payouts with affiliate details
    const result = await pool.query(
      `SELECT
        ap.*,
        aff.display_name as affiliate_name,
        u.username as affiliate_username
       FROM affiliate_payouts ap
       JOIN users u ON ap.affiliate_id = u.id
       LEFT JOIN affiliate_profiles aff ON ap.affiliate_id = aff.user_id
       ${whereClause}
       ORDER BY ap.created_at DESC
       LIMIT $` + paramIndex + ` OFFSET $` + (paramIndex + 1) + ``,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: {
        payouts: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payout statistics (Admin)
 * GET /api/admin/affiliate-payouts/stats
 */
export const getPayoutStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (start_date) {
      conditions.push(`created_at >= $` + paramIndex++);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $` + paramIndex++ + ` + INTERVAL '1 day'`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
        COUNT(*)::TEXT as total_payouts,
        COALESCE(SUM(total_amount), 0)::TEXT as total_amount,
        COUNT(*) FILTER (WHERE status = 'pending')::TEXT as pending_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0)::TEXT as pending_amount,
        COUNT(*) FILTER (WHERE status = 'processing')::TEXT as processing_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'processing'), 0)::TEXT as processing_amount,
        COUNT(*) FILTER (WHERE status = 'completed')::TEXT as completed_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0)::TEXT as completed_amount,
        COUNT(*) FILTER (WHERE status = 'failed')::TEXT as failed_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'failed'), 0)::TEXT as failed_amount
       FROM affiliate_payouts
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request payout (Affiliate)
 * POST /api/affiliate/payouts
 */
export const requestPayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { amount, payment_method, notes } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout amount'
      });
    }

    // Check if user is an affiliate
    const affiliateCheck = await pool.query(
      'SELECT id FROM affiliate_profiles WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (affiliateCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User is not an active affiliate'
      });
    }

    // Check available balance
    const balanceResult = await pool.query(
      'SELECT affiliate_balance FROM user_balances WHERE user_id = $1',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User balance not found'
      });
    }

    const availableBalance = parseFloat(balanceResult.rows[0].affiliate_balance);

    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`
      });
    }

    // Get pending commissions for this user
    const commissionsResult = await pool.query(
      `SELECT id FROM affiliate_commissions
       WHERE affiliate_id = $1 AND status = 'approved'
       ORDER BY created_at ASC`,
      [userId]
    );

    const commissionIds = commissionsResult.rows.map(row => row.id);

    // Create payout request
    const result = await pool.query(
      `INSERT INTO affiliate_payouts (
        affiliate_id, total_amount, commission_ids, payment_method, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $1)
      RETURNING *`,
      [userId, amount, commissionIds, payment_method, notes]
    );

    res.json({
      success: true,
      message: 'Payout request submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process payout (Admin)
 * PUT /api/admin/affiliate-payouts/:id/process
 */
export const processPayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, payment_reference, notes } = req.body;
    const adminId = (req as any).user.userId;

    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Check if payout exists
    const payoutCheck = await pool.query(
      'SELECT * FROM affiliate_payouts WHERE id = $1',
      [id]
    );

    if (payoutCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    const payout = payoutCheck.rows[0];

    // Update payout
    const updateResult = await pool.query(
      `UPDATE affiliate_payouts
       SET status = $1,
           payment_reference = COALESCE($2, payment_reference),
           notes = COALESCE($3, notes),
           processed_at = CASE
             WHEN $1 IN ('completed', 'failed', 'cancelled') THEN NOW()
             ELSE processed_at
           END,
           processed_by = $4,
           updated_at = NOW(),
           updated_by = $4
       WHERE id = $5
       RETURNING *`,
      [status, payment_reference, notes, adminId, id]
    );

    // If completed, update affiliate balance
    if (status === 'completed' && payout.status !== 'completed') {
      await pool.query(
        `UPDATE user_balances
         SET affiliate_balance = affiliate_balance - $1,
             affiliate_total_redeemed = affiliate_total_redeemed + $1
         WHERE user_id = $2`,
        [payout.total_amount, payout.affiliate_id]
      );

      // Update commission statuses
      if (payout.commission_ids && payout.commission_ids.length > 0) {
        await pool.query(
          `UPDATE affiliate_commissions
           SET status = 'paid', paid_at = NOW()
           WHERE id = ANY($1)`,
          [payout.commission_ids]
        );
      }
    }

    res.json({
      success: true,
      message: `Payout ${status} successfully`,
      data: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get affiliate payout statistics (for affiliate user)
 * GET /api/affiliate/payouts/stats
 */
export const getAffiliatePayoutStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { start_date, end_date } = req.query;

    const conditions: string[] = ['affiliate_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (start_date) {
      conditions.push(`created_at >= $` + paramIndex++);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $` + paramIndex++ + ` + INTERVAL '1 day'`);
      params.push(end_date);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT
        COUNT(*)::TEXT as total_payouts,
        COALESCE(SUM(total_amount), 0)::TEXT as total_amount,
        COUNT(*) FILTER (WHERE status = 'pending')::TEXT as pending_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0)::TEXT as pending_amount,
        COUNT(*) FILTER (WHERE status = 'processing')::TEXT as processing_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'processing'), 0)::TEXT as processing_amount,
        COUNT(*) FILTER (WHERE status = 'completed')::TEXT as completed_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0)::TEXT as completed_amount,
        COUNT(*) FILTER (WHERE status = 'failed')::TEXT as failed_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'failed'), 0)::TEXT as failed_amount
       FROM affiliate_payouts
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ====================================
 * MARKETING MATERIALS MANAGEMENT
 * ====================================
 */

/**
 * Get marketing materials
 * GET /api/affiliate/marketing-materials
 */
export const getMarketingMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Type filter
    if (type && type !== 'all') {
      conditions.push(`type = $` + paramIndex++);
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM affiliate_marketing_materials ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    // Get materials
    const result = await pool.query(
      `SELECT * FROM affiliate_marketing_materials
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $` + paramIndex + ` OFFSET $` + (paramIndex + 1) + ``,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      success: true,
      data: {
        materials: result.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get marketing material statistics
 * GET /api/affiliate/marketing-materials/stats
 */
export const getMarketingMaterialStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*)::TEXT as total_materials,
        COUNT(*) FILTER (WHERE is_active = true)::TEXT as active_materials,
        COUNT(*) FILTER (WHERE is_active = false)::TEXT as inactive_materials,
        COUNT(*) FILTER (WHERE type = 'banner')::TEXT as banner_count,
        COUNT(*) FILTER (WHERE type = 'text_link')::TEXT as text_link_count,
        COUNT(*) FILTER (WHERE type = 'landing_page')::TEXT as landing_page_count,
        COUNT(*) FILTER (WHERE type = 'email_template')::TEXT as email_template_count,
        COUNT(*) FILTER (WHERE type = 'social_media')::TEXT as social_media_count
       FROM affiliate_marketing_materials`
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create marketing material (Admin)
 * POST /api/affiliate/admin/marketing-materials
 */
export const createMarketingMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, type, content, target_url, image_url, is_active } = req.body;
    const adminId = (req as any).user.userId;

    // Validate required fields
    if (!name || !type || !content || !target_url) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, content, target_url'
      });
    }

    // Validate type
    const validTypes = ['banner', 'text_link', 'landing_page', 'email_template', 'social_media'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be one of: ' + validTypes.join(', ')
      });
    }

    const result = await pool.query(
      `INSERT INTO affiliate_marketing_materials (
        name, description, type, content, target_url, image_url, is_active, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *`,
      [name, description, type, content, target_url, image_url, is_active !== false, adminId]
    );

    res.json({
      success: true,
      message: 'Marketing material created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update marketing material (Admin)
 * PUT /api/affiliate/admin/marketing-materials/:id
 */
export const updateMarketingMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, type, content, target_url, image_url, is_active } = req.body;
    const adminId = (req as any).user.userId;

    // Check if material exists
    const checkResult = await pool.query(
      'SELECT id FROM affiliate_marketing_materials WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marketing material not found'
      });
    }

    const result = await pool.query(
      `UPDATE affiliate_marketing_materials
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           type = COALESCE($3, type),
           content = COALESCE($4, content),
           target_url = COALESCE($5, target_url),
           image_url = COALESCE($6, image_url),
           is_active = COALESCE($7, is_active),
           updated_at = NOW(),
           updated_by = $8
       WHERE id = $9
       RETURNING *`,
      [name, description, type, content, target_url, image_url, is_active, adminId, id]
    );

    res.json({
      success: true,
      message: 'Marketing material updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete marketing material (Admin)
 * DELETE /api/affiliate/admin/marketing-materials/:id
 */
export const deleteMarketingMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if material exists
    const checkResult = await pool.query(
      'SELECT id FROM affiliate_marketing_materials WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marketing material not found'
      });
    }

    await pool.query(
      'DELETE FROM affiliate_marketing_materials WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Marketing material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ====================================
 * SETTINGS MANAGEMENT
 * ====================================
 */

/**
 * Get affiliate settings
 * GET /api/admin/affiliate-settings
 */
export const getAffiliateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      'SELECT * FROM affiliate_settings ORDER BY setting_key'
    );

    const settings = result.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update affiliate settings
 * PUT /api/admin/affiliate-settings
 */
export const updateAffiliateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settingKey, settingValue } = req.body;
    const adminId = (req as any).user.id;

    if (!settingKey || !settingValue) {
      throw new ApiError('Setting key and value are required', 400);
    }

    const result = await pool.query(
      `INSERT INTO affiliate_settings (setting_key, setting_value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [settingKey, JSON.stringify(settingValue), adminId]
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ====================================
 * DASHBOARD & STATISTICS
 * ====================================
 */

/**
 * Get affiliate dashboard statistics
 * GET /api/admin/affiliate-dashboard
 */
export const getAffiliateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get overview statistics
    const overviewResult = await pool.query(`
      SELECT
        COUNT(DISTINCT ap.id) as total_affiliates,
        COUNT(DISTINCT CASE WHEN ap.is_active THEN ap.id END) as active_affiliates,
        COUNT(DISTINCT ar.referred_user_id) as total_referrals,
        COALESCE(SUM(CASE WHEN ac.status = 'pending' THEN ac.commission_amount ELSE 0 END), 0) as pending_commissions_amount,
        COUNT(CASE WHEN ac.status = 'pending' THEN 1 END) as pending_commissions_count,
        COALESCE(SUM(CASE WHEN ac.status = 'approved' THEN ac.commission_amount ELSE 0 END), 0) as approved_commissions_amount,
        COALESCE(SUM(CASE WHEN ac.status = 'paid' THEN ac.commission_amount ELSE 0 END), 0) as paid_commissions_amount,
        COALESCE(SUM(ub.affiliate_balance), 0) as total_affiliate_balance,
        COALESCE(SUM(ub.affiliate_balance_locked), 0) as total_locked_balance
      FROM affiliate_profiles ap
      LEFT JOIN affiliate_relationships ar ON ap.user_id = ar.affiliate_id
      LEFT JOIN affiliate_commissions ac ON ap.user_id = ac.affiliate_id
      LEFT JOIN user_balances ub ON ap.user_id = ub.user_id
    `);

    // Get application statistics
    const applicationStats = await AffiliateApplicationService.getApplicationStatistics();

    // Get top affiliates by earnings
    const topAffiliatesResult = await pool.query(`
      SELECT
        ap.id,
        ap.user_id,
        ap.referral_code,
        ap.display_name,
        u.username,
        ap.total_referrals,
        COALESCE(ub.affiliate_total_earned, 0) as total_commission_earned,
        COALESCE(ub.affiliate_balance, 0) as affiliate_balance,
        COUNT(ac.id) as commission_count
      FROM affiliate_profiles ap
      JOIN users u ON ap.user_id = u.id
      LEFT JOIN user_balances ub ON ap.user_id = ub.user_id
      LEFT JOIN affiliate_commissions ac ON ap.user_id = ac.affiliate_id
      WHERE ap.is_active = true
      GROUP BY ap.id, ap.user_id, ap.referral_code, ap.display_name, u.username, ap.total_referrals, ub.affiliate_total_earned, ub.affiliate_balance
      ORDER BY COALESCE(ub.affiliate_total_earned, 0) DESC
      LIMIT 10
    `);

    // Get recent redemptions
    const recentRedemptionsResult = await pool.query(`
      SELECT
        ar.*,
        u.username,
        ap.display_name,
        ap.referral_code
      FROM affiliate_redemptions ar
      JOIN users u ON ar.user_id = u.id
      LEFT JOIN affiliate_profiles ap ON ap.user_id = ar.user_id
      ORDER BY ar.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        overview: overviewResult.rows[0],
        applicationStats,
        topAffiliates: topAffiliatesResult.rows,
        recentRedemptions: recentRedemptionsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};
