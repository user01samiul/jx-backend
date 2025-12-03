import { Request, Response, NextFunction } from 'express';
import { AffiliateService } from '../../services/affiliate/affiliate.service';
import { EnhancedAffiliateService } from '../../services/affiliate/enhanced-affiliate.service';
import { AffiliateBalanceService } from '../../services/affiliate/affiliate-balance.service';
import { AffiliateApplicationService } from '../../services/affiliate/affiliate-application.service';
import { ApiError } from '../../utils/apiError';
import pool from '../../db/postgres';

/**
 * Get affiliate profile for current user
 */
export const getAffiliateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const profile = await AffiliateService.getAffiliateProfile(userId);
    
    if (!profile) {
      res.status(404).json({ success: false, message: "Affiliate profile not found" });
      return;
    }

    res.status(200).json({ 
      success: true, 
      data: profile 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create affiliate application for current user
 */
export const createAffiliateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { display_name, website_url, social_media } = req.body;

    // Create application instead of profile - requires admin approval
    const application = await AffiliateApplicationService.submitApplication({
      userId,
      displayName: display_name,
      websiteUrl: website_url,
      socialMediaLinks: social_media
    });

    res.status(201).json({
      success: true,
      message: "Affiliate application submitted successfully. Your application is pending admin review.",
      data: application
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get affiliate application status for current user
 */
export const getAffiliateApplicationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Check if user has affiliate profile
    const profile = await AffiliateService.getAffiliateProfile(userId);
    if (profile) {
      res.status(200).json({
        success: true,
        data: {
          status: 'approved',
          hasProfile: true,
          profile: profile
        }
      });
      return;
    }

    // Check if user has application
    const application = await AffiliateApplicationService.getUserApplicationStatus(userId);
    if (application) {
      res.status(200).json({
        success: true,
        data: {
          status: application.application_status, // 'pending' or 'rejected'
          hasProfile: false,
          application: {
            id: application.id,
            display_name: application.display_name,
            status: application.application_status,
            rejection_reason: application.rejection_reason,
            created_at: application.created_at,
            reviewed_at: application.reviewed_at
          }
        }
      });
      return;
    }

    // No application and no profile
    res.status(200).json({
      success: true,
      data: {
        status: 'none',
        hasProfile: false,
        application: null
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get affiliate statistics
 */
export const getAffiliateStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const stats = await EnhancedAffiliateService.getAffiliateStats(userId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get affiliate referrals
 */
export const getAffiliateReferrals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { page = 1, limit = 10, level } = req.query;
    
    const referrals = await EnhancedAffiliateService.getAffiliateReferrals(
      userId,
      Number(page),
      Number(limit),
      level as string
    );
    
    res.status(200).json({ 
      success: true, 
      data: referrals 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get affiliate commissions
 */
export const getAffiliateCommissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { page = 1, limit = 10, status, start_date, end_date } = req.query;
    
    const commissions = await EnhancedAffiliateService.getAffiliateCommissions(
      userId,
      Number(page),
      Number(limit),
      status as string,
      start_date as string,
      end_date as string
    );
    
    res.status(200).json({ 
      success: true, 
      data: commissions 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get affiliate commission statistics
 */
export const getAffiliateCommissionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { start_date, end_date } = req.query;

    const stats = await EnhancedAffiliateService.getAffiliateCommissionStats(
      userId,
      start_date as string,
      end_date as string
    );

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get affiliate team structure
 */
export const getAffiliateTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { level = 1 } = req.query;
    
    const team = await EnhancedAffiliateService.getAffiliateTeam(userId, Number(level));
    
    res.status(200).json({ 
      success: true, 
      data: team 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate affiliate link
 */
export const generateAffiliateLink = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { campaign_name, target_url } = req.body;
    
    const link = await EnhancedAffiliateService.generateAffiliateLink(
      userId,
      campaign_name,
      target_url
    );
    
    res.status(200).json({ 
      success: true, 
      data: link 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get affiliate dashboard data
 */
export const getAffiliateDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const dashboard = await EnhancedAffiliateService.getAffiliateDashboard(userId);
    
    res.status(200).json({ 
      success: true, 
      data: dashboard 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get all affiliate profiles
 */
export const getAllAffiliateProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const profiles = await EnhancedAffiliateService.getAllAffiliateProfiles(
      Number(page),
      Number(limit),
      status as string,
      search as string
    );
    
    res.status(200).json({ 
      success: true, 
      data: profiles 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Update affiliate commission rate
 */
export const updateAffiliateCommissionRate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { affiliate_id, commission_rate } = req.body;
    
    if (!affiliate_id || !commission_rate) {
      res.status(400).json({ success: false, message: "Affiliate ID and commission rate are required" });
      return;
    }

    const result = await EnhancedAffiliateService.updateAffiliateCommissionRate(
      affiliate_id,
      commission_rate
    );
    
    res.status(200).json({ 
      success: true, 
      message: "Commission rate updated successfully",
      data: result 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Get affiliate commission summary
 */
export const getAffiliateCommissionSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { start_date, end_date, affiliate_id } = req.query;

    const summary = await EnhancedAffiliateService.getAffiliateCommissionSummary(
      start_date as string,
      end_date as string,
      affiliate_id ? Number(affiliate_id) : undefined
    );

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Request redemption (Affiliate creates pending redemption request)
 */
export const requestRedemption = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { amount, notes } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
      return;
    }

    const result = await AffiliateBalanceService.processRedemption(
      userId,
      parseFloat(amount),
      notes
    );

    res.status(200).json({
      success: true,
      message: 'Redemption request submitted successfully. Awaiting admin approval.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get redemption history for current user
 */
export const getRedemptionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { page, limit } = req.query;

    const history = await AffiliateBalanceService.getRedemptionHistory(userId, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20
    });

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
};