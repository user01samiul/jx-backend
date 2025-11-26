import { Request, Response, NextFunction } from "express";
import { BonusPlanService } from "../../services/bonus/bonus-plan.service";
import { BonusInstanceService } from "../../services/bonus/bonus-instance.service";
import { BonusWalletService } from "../../services/bonus/bonus-wallet.service";
import { WageringEngineService } from "../../services/bonus/wagering-engine.service";
import { BonusTransactionService } from "../../services/bonus/bonus-transaction.service";
import { BonusEngineService } from "../../services/bonus/bonus-engine.service";
import {
  CreateBonusPlanInputType,
  UpdateBonusPlanInputType,
  GrantManualBonusInputType,
  ApplyBonusCodeInputType,
  SetGameContributionInputType,
  BulkSetGameContributionInputType
} from "./bonus.schema";

// =====================================================
// ADMIN CONTROLLERS - Bonus Plan Management
// =====================================================

export const createBonusPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planData = req.validated?.body as CreateBonusPlanInputType;
    const adminUserId = (req as any).user?.userId || 1;

    const plan = await BonusPlanService.createPlan(planData as any, adminUserId);

    res.status(201).json({
      success: true,
      message: 'Bonus plan created successfully',
      data: plan
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateBonusPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId = parseInt(req.params.id);
    const updates = req.validated?.body as UpdateBonusPlanInputType;
    const adminUserId = (req as any).user?.userId || 1;

    const plan = await BonusPlanService.updatePlan(planId, updates as any, adminUserId);

    res.status(200).json({
      success: true,
      message: 'Bonus plan updated successfully',
      data: plan
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getBonusPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId = parseInt(req.params.id);

    const plan = await BonusPlanService.getPlanById(planId);

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Bonus plan not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getBonusPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = req.validated?.query || {};

    const result = await BonusPlanService.getPlans(filters);

    res.status(200).json({
      success: true,
      data: result.plans,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteBonusPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId = parseInt(req.params.id);
    const adminUserId = (req as any).user?.userId || 1;

    await BonusPlanService.deletePlan(planId, adminUserId);

    res.status(200).json({
      success: true,
      message: 'Bonus plan deleted successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const grantManualBonus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.validated?.body as GrantManualBonusInputType;
    const adminUserId = (req as any).user?.userId || 1;

    const bonusInstance = await BonusInstanceService.grantManualBonus(
      data.player_id,
      data.bonus_plan_id,
      data.custom_amount || null,
      data.notes,
      adminUserId
    );

    res.status(201).json({
      success: true,
      message: 'Manual bonus granted successfully',
      data: bonusInstance
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// ADMIN CONTROLLERS - Statistics & Reports
// =====================================================

export const getBonusStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await BonusEngineService.getStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getPlayerBonusesAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = parseInt(req.params.playerId);
    const options = req.query;

    const result = await BonusInstanceService.getPlayerBonuses(playerId, options);

    res.status(200).json({
      success: true,
      data: result.bonuses,
      pagination: {
        total: result.total,
        limit: options.limit || 50,
        offset: options.offset || 0
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const forfeitBonusAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bonusInstanceId = parseInt(req.params.id);
    const { reason } = req.validated?.body || { reason: 'Admin action' };

    await BonusInstanceService.forfeitBonus(bonusInstanceId, reason);

    res.status(200).json({
      success: true,
      message: 'Bonus forfeited successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// ADMIN CONTROLLERS - Game Contributions
// =====================================================

export const setGameContribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = req.validated?.body as SetGameContributionInputType;

    await WageringEngineService.setGameContribution(
      data.game_id,
      data.contribution_percentage,
      data.is_restricted || false
    );

    res.status(200).json({
      success: true,
      message: 'Game contribution updated successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteGameContribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameId = parseInt(req.params.gameId);

    if (isNaN(gameId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid game ID'
      });
      return;
    }

    await WageringEngineService.deleteGameContribution(gameId);

    res.status(200).json({
      success: true,
      message: 'Game contribution deleted successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getGameContribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameCode = req.params.gameCode;

    const contribution = await WageringEngineService.getGameContribution(gameCode);

    res.status(200).json({
      success: true,
      data: contribution
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllGameContributions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, limit, offset } = req.query;

    const result = await WageringEngineService.getAllGameContributions({
      search: search as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.status(200).json({
      success: true,
      data: result.contributions,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const searchGames = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, limit } = req.query;

    if (!q || (q as string).length < 2) {
      res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
      return;
    }

    const games = await WageringEngineService.searchGames(
      q as string,
      limit ? parseInt(limit as string) : 20
    );

    res.status(200).json({
      success: true,
      data: games
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// ADMIN CONTROLLERS - Category Contributions
// =====================================================

export const setCategoryContribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, contribution_percentage, is_restricted } = req.body;

    await WageringEngineService.setCategoryContribution(
      category,
      contribution_percentage,
      is_restricted || false
    );

    res.status(200).json({
      success: true,
      message: 'Category contribution updated successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteCategoryContribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category } = req.params;

    await WageringEngineService.deleteCategoryContribution(category);

    res.status(200).json({
      success: true,
      message: 'Category contribution deleted successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllCategoryContributions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contributions = await WageringEngineService.getAllCategoryContributions();

    res.status(200).json({
      success: true,
      data: contributions
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAvailableCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await WageringEngineService.getAvailableCategories();

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// USER CONTROLLERS - Bonus Management
// =====================================================

export const applyBonusCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;
    const { code } = req.validated?.body as ApplyBonusCodeInputType;

    const bonusInstance = await BonusInstanceService.grantCodedBonus(playerId, code);

    res.status(201).json({
      success: true,
      message: 'Bonus code applied successfully',
      data: bonusInstance
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyBonuses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;
    const options = req.validated?.query || {};

    const result = await BonusInstanceService.getPlayerBonuses(playerId, options);

    res.status(200).json({
      success: true,
      data: result.bonuses,
      pagination: {
        total: result.total,
        limit: options.limit || 50,
        offset: options.offset || 0
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyActiveBonuses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;

    const bonuses = await BonusInstanceService.getPlayerActiveBonuses(playerId);

    res.status(200).json({
      success: true,
      data: bonuses
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyBonusWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;

    const wallet = await BonusWalletService.getBalance(playerId);

    res.status(200).json({
      success: true,
      data: wallet
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyWageringProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;

    const progress = await WageringEngineService.getPlayerActiveProgress(playerId);

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyBonusTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;
    const options = req.query;

    const result = await BonusTransactionService.getPlayerTransactions(playerId, options);

    res.status(200).json({
      success: true,
      data: {
        transactions: result.transactions,
        total: result.total
      },
      total: result.total
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyBonusStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;

    const stats = await BonusTransactionService.getPlayerStats(playerId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMyCombinedBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;

    const balance = await BonusEngineService.getCombinedBalance(playerId);

    res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAvailableBonuses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get all active bonus plans (ONLY bonus-related types, NOT promotions)
    const result = await BonusPlanService.getPlans({
      status: 'active'
    });

    // Filter only bonus types (deposit, coded, manual, loyalty, cashback)
    const bonusTypes = ['deposit', 'coded', 'manual', 'loyalty', 'instant_cashback', 'scheduled_cashback'];
    const bonusPlans = result.plans.filter((plan: any) => bonusTypes.includes(plan.trigger_type));

    // Separate by type for frontend
    const codedBonuses = bonusPlans.filter((plan: any) => plan.trigger_type === 'coded');
    const depositBonuses = bonusPlans.filter((plan: any) => plan.trigger_type === 'deposit');
    const loyaltyBonuses = bonusPlans.filter((plan: any) => plan.trigger_type === 'loyalty');
    const cashbackBonuses = bonusPlans.filter((plan: any) =>
      plan.trigger_type === 'instant_cashback' || plan.trigger_type === 'scheduled_cashback'
    );

    res.status(200).json({
      success: true,
      data: {
        coded: codedBonuses,         // User can manually apply with code
        deposit: depositBonuses,     // Auto-granted on deposit (informational)
        loyalty: loyaltyBonuses,     // VIP/loyalty bonuses (informational)
        cashback: cashbackBonuses    // Cashback bonuses (informational)
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const transferBonusToMain = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = (req as any).user?.userId;
    const { amount } = req.body;

    // Transfer funds from bonus wallet to main wallet
    const transferredAmount = await BonusWalletService.transferToMainWallet(playerId, amount);

    res.status(200).json({
      success: true,
      message: 'Bonus funds transferred to main wallet successfully',
      data: {
        transferred_amount: transferredAmount
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// ADMIN CONTROLLERS - Bulk Operations
// =====================================================

export const bulkGrantBonuses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { player_ids, bonus_plan_id, custom_amount, notes } = req.validated?.body as any;
    const adminUserId = (req as any).user?.userId || 1;

    const results = await BonusInstanceService.bulkGrantManualBonus(
      player_ids,
      bonus_plan_id,
      custom_amount,
      notes,
      adminUserId
    );

    res.status(201).json({
      success: true,
      message: `Successfully granted bonuses to ${results.success.length} players`,
      data: {
        success: results.success,
        failed: results.failed,
        total: player_ids.length
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const bulkForfeitBonuses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bonus_instance_ids, reason } = req.validated?.body as any;

    const results = await BonusInstanceService.bulkForfeitBonuses(bonus_instance_ids, reason);

    res.status(200).json({
      success: true,
      message: `Successfully forfeited ${results.success.length} bonuses`,
      data: {
        success: results.success,
        failed: results.failed,
        total: bonus_instance_ids.length
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// ADMIN CONTROLLERS - Bonus Plan Advanced
// =====================================================

export const cloneBonusPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId = parseInt(req.params.id);
    const overrides = req.validated?.body || {};
    const adminUserId = (req as any).user?.userId || 1;

    const clonedPlan = await BonusPlanService.clonePlan(planId, overrides, adminUserId);

    res.status(201).json({
      success: true,
      message: 'Bonus plan cloned successfully',
      data: clonedPlan
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getBonusPlanAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const planId = parseInt(req.params.id);

    const analytics = await BonusPlanService.getPlanAnalytics(planId);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// ADMIN CONTROLLERS - Transactions & Audit
// =====================================================

export const getPlayerBonusTransactionsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = parseInt(req.params.playerId);
    const options = req.query;

    const result = await BonusTransactionService.getPlayerTransactions(playerId, options);

    res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        limit: options.limit || 50,
        offset: options.offset || 0
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const options = req.query;

    const result = await BonusTransactionService.getAuditLogs(options);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: options.limit || 100,
        offset: options.offset || 0
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};
