import { Request, Response, NextFunction } from "express";
import {
  getUserWithBalanceService,
  getUserFavoriteGamesService,
  getUserRecentActivityService,
  getUserTransactionHistoryService,
  getUserBettingHistoryService,
  getUserActivitySummaryService,
  updateUserProfileService,
  enable2FAService,
  disable2FAService,
  get2FAStatusService,
  changePasswordService,
  getUserByUsernameService,
  getUserByEmailService,
  getUserCategoryBalancesService,
  transferUserCategoryBalanceService,
  getUserGameBetsService,
  skip2FAService
} from "../../services/user/user.service";
import {
  UpdateProfileInputType,
  ChangePasswordInputType,
  Skip2FAInputType
} from "./user.schema";
import { uploadToCDN } from "../../utils/cdn-upload";

export const getUserProfile = async (
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

    const user = await getUserWithBalanceService(userId);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  } 
};

export const getUserFavoriteGames = async (
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

    const favoriteGames = await getUserFavoriteGamesService(userId);
    res.status(200).json({ success: true, data: favoriteGames });
  } catch (err) {
    next(err);
  } 
};

/**
 * Returns recent user activity. Each activity record now includes username and email fields.
 */
export const getUserRecentActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await getUserRecentActivityService(userId, limit);
    res.status(200).json({ 
      success: true, 
      data: result.activities,
      total_count: result.total_count
    });
  } catch (err) {
    next(err);
  } 
};

export const getUserTransactionHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const transactions = await getUserTransactionHistoryService(userId, limit);
    res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  } 
};

export const getUserBettingHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const page = parseInt(req.query.page as string) || 1;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Calculate offset from page if page is provided
    const calculatedOffset = req.query.page ? (page - 1) * limit : offset;

    const result = await getUserBettingHistoryService(userId, limit, calculatedOffset);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        currentPage: Math.floor(result.offset / result.limit) + 1,
        totalPages: Math.ceil(result.total / result.limit),
        totalItems: result.total,
        itemsPerPage: result.limit
      },
      stats: result.stats
    });
  } catch (err) {
    next(err);
  }
};

// Get comprehensive user activity summary
export const getUserActivitySummary = async (
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

    const summary = await getUserActivitySummaryService(userId);
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// Keep the old function for backward compatibility
export const getUserBalance = async (
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

    const user = await getUserWithBalanceService(userId);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  } 
};

// =====================================================
// PROFILE MANAGEMENT CONTROLLERS
// =====================================================

export const updateUserProfile = async (
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

    // Parse profile data from body (multipart/form-data)
    const profileData: any = { ...req.body };

    // Handle avatar upload if file is present
    if (req.file) {
      const uploadResult = await uploadToCDN(req.file);

      if (!uploadResult.success) {
        res.status(400).json({
          success: false,
          message: "Failed to upload avatar",
          error: uploadResult.error
        });
        return;
      }

      profileData.avatar_url = uploadResult.url;
    }

    const updatedProfile = await updateUserProfileService(userId, profileData);
    res.status(200).json({ success: true, data: updatedProfile });
  } catch (err) {
    next(err);
  }
};

export const changeUserPassword = async (
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

    const passwordData = req.validated?.body as ChangePasswordInputType;
    await changePasswordService(userId, passwordData);
    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

// =====================================================
// 2FA MANAGEMENT CONTROLLERS
// =====================================================

export const get2FAStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let userId = (req as any).user?.userId;
    // Allow unauthenticated access via username or email query param
    if (!userId) {
      const { username, email } = req.query;
      let user;
      if (username) {
        user = await getUserByUsernameService(String(username));
      } else if (email) {
        user = await getUserByEmailService(String(email));
      } else {
        res.status(400).json({ success: false, message: "Missing username or email" });
        return;
      }
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      userId = user.id;
    }
    const status = await get2FAStatusService(userId);
    res.status(200).json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};

export const enable2FA = async (
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

    const result = await enable2FAService(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const disable2FA = async (
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

    const result = await disable2FAService(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const skip2FA = async (
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

    const authData = req.validated?.body as Skip2FAInputType;
    const result = await skip2FAService(userId, authData);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getUserCategoryBalances = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const balances = await getUserCategoryBalancesService(userId);
    res.json({ success: true, data: balances });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const transferUserCategoryBalance = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { category, amount, direction } = req.body;
    if (!category || !amount || !direction) {
      return res.status(400).json({ success: false, message: "category, amount, and direction are required" });
    }
    const result = await transferUserCategoryBalanceService(userId, category, amount, direction);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getUserGameBets = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = await getUserGameBetsService(userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};