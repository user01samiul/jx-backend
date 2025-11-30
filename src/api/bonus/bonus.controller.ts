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

/**
 * Get player bonus wallet (admin view)
 */
export const getPlayerBonusWalletAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const playerId = parseInt(req.params.playerId);

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

// =====================================================
// ADMIN CONTROLLERS - Player Search & Listing
// =====================================================

/**
 * Search for a player by ID, email, or username
 */
export const searchPlayer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || (query as string).trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
      return;
    }

    const searchTerm = (query as string).trim();
    const pool = require('../../db/postgres').default;

    // Try to parse as player ID first
    const playerId = parseInt(searchTerm);

    let result;

    if (!isNaN(playerId)) {
      // Search by ID
      result = await pool.query(
        `SELECT id, username, email, created_at
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [playerId]
      );
    } else {
      // Search by email or username
      result = await pool.query(
        `SELECT id, username, email, created_at
         FROM users
         WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
         LIMIT 1`,
        [searchTerm]
      );
    }

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Player not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get all players with bonuses (paginated)
 */
export const getAllPlayersWithBonuses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit, offset, status, search } = req.query;

    const limitNum = limit ? parseInt(limit as string) : 50;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    const pool = require('../../db/postgres').default;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Filter by bonus status if provided
    if (status && status !== 'all' && status !== '') {
      paramCount++;
      whereClause += ` AND bi.status = $${paramCount}`;
      params.push(status);
    }

    // Search filter for player
    if (search && (search as string).trim().length > 0) {
      const searchTerm = (search as string).trim();
      const searchId = parseInt(searchTerm);

      if (!isNaN(searchId)) {
        paramCount++;
        whereClause += ` AND u.id = $${paramCount}`;
        params.push(searchId);
      } else {
        paramCount++;
        whereClause += ` AND (LOWER(u.email) LIKE LOWER($${paramCount}) OR LOWER(u.username) LIKE LOWER($${paramCount}))`;
        params.push(`%${searchTerm}%`);
      }
    }

    // Get paginated players with bonus data
    paramCount++;
    params.push(limitNum);
    paramCount++;
    params.push(offsetNum);

    const result = await pool.query(
      `SELECT
        u.id as player_id,
        u.username,
        u.email,
        COUNT(DISTINCT bi.id) as total_bonuses,
        COUNT(DISTINCT CASE WHEN bi.status IN ('active', 'wagering') THEN bi.id END) as active_bonuses,
        COALESCE(SUM(bi.bonus_amount), 0) as total_bonus_amount,
        COALESCE(bw.total_bonus_balance, 0) as current_wallet_balance,
        MAX(bi.granted_at) as last_bonus_granted
       FROM users u
       INNER JOIN bonus_instances bi ON bi.player_id = u.id
       LEFT JOIN bonus_wallets bw ON bw.player_id = u.id
       ${whereClause}
       GROUP BY u.id, u.username, u.email, bw.total_bonus_balance
       ORDER BY MAX(bi.granted_at) DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       INNER JOIN bonus_instances bi ON bi.player_id = u.id
       ${whereClause}`,
      params.slice(0, -2) // Remove limit and offset params
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error: any) {
    console.error('Error fetching players with bonuses:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

// =====================================================
// ADMIN CONTROLLERS - Advanced Analytics & Charts
// =====================================================

/**
 * Get comprehensive bonus analytics overview
 * Returns enhanced statistics with more detailed metrics
 */
export const getBonusAnalyticsOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool = require('../../db/postgres').default;

    // Overall statistics
    const overallStats = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN status IN ('active', 'wagering') THEN id END) as active_bonuses,
        COUNT(DISTINCT CASE WHEN status IN ('active', 'wagering') THEN player_id END) as active_players,
        COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) as completed_bonuses,
        COUNT(DISTINCT CASE WHEN status = 'expired' THEN id END) as expired_bonuses,
        COUNT(DISTINCT CASE WHEN status = 'forfeited' THEN id END) as forfeited_bonuses,
        COALESCE(SUM(CASE WHEN status IN ('active', 'wagering') THEN remaining_bonus ELSE 0 END), 0) as total_active_value,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN bonus_amount ELSE 0 END), 0) as total_completed_value,
        COALESCE(SUM(wager_progress_amount), 0) as total_wagering_progress,
        COALESCE(SUM(wager_requirement_amount), 0) as total_wagering_required,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN (wager_progress_amount::float / NULLIF(wager_requirement_amount, 0)) * 100 END), 0) as avg_completion_rate,
        COALESCE(SUM(total_bets_count), 0) as total_bets_placed,
        COALESCE(SUM(total_wins_amount), 0) as total_wins_amount
      FROM bonus_instances
    `);

    // Wallet statistics
    const walletStats = await pool.query(`
      SELECT
        COALESCE(SUM(total_bonus_balance), 0) as total_wallet_balance,
        COALESCE(SUM(locked_bonus_balance), 0) as total_locked_balance,
        COALESCE(SUM(playable_bonus_balance), 0) as total_playable_balance,
        COALESCE(SUM(total_bonus_received), 0) as lifetime_bonuses_granted,
        COALESCE(SUM(total_bonus_wagered), 0) as lifetime_bonuses_wagered,
        COALESCE(SUM(total_bonus_released), 0) as lifetime_bonuses_released,
        COALESCE(SUM(total_bonus_forfeited), 0) as lifetime_bonuses_forfeited,
        COALESCE(SUM(total_bonus_transferred), 0) as lifetime_bonuses_transferred,
        COUNT(*) as total_wallets
      FROM bonus_wallets
    `);

    // Recent activity (last 7 days)
    const recentActivity = await pool.query(`
      SELECT
        COUNT(*) as bonuses_granted_7d,
        COALESCE(SUM(bonus_amount), 0) as value_granted_7d
      FROM bonus_instances
      WHERE granted_at >= NOW() - INTERVAL '7 days'
    `);

    // Conversion metrics
    const conversionMetrics = await pool.query(`
      SELECT
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status IN ('completed', 'expired', 'forfeited') THEN 1 END) as total_finished,
        COALESCE(AVG(CASE
          WHEN status = 'completed' AND activated_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (completed_at - activated_at)) / 3600
        END), 0) as avg_completion_time_hours
      FROM bonus_instances
    `);

    const stats = overallStats.rows[0];
    const wallet = walletStats.rows[0];
    const recent = recentActivity.rows[0];
    const conversion = conversionMetrics.rows[0];

    const totalFinished = parseInt(conversion.total_finished) || 1;
    const completedCount = parseInt(conversion.completed_count) || 0;
    const conversionRate = (completedCount / totalFinished) * 100;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          activeBonuses: parseInt(stats.active_bonuses) || 0,
          activePlayers: parseInt(stats.active_players) || 0,
          completedBonuses: parseInt(stats.completed_bonuses) || 0,
          expiredBonuses: parseInt(stats.expired_bonuses) || 0,
          forfeitedBonuses: parseInt(stats.forfeited_bonuses) || 0,
          totalActiveValue: parseFloat(stats.total_active_value) || 0,
          totalCompletedValue: parseFloat(stats.total_completed_value) || 0,
        },
        wagering: {
          totalProgress: parseFloat(stats.total_wagering_progress) || 0,
          totalRequired: parseFloat(stats.total_wagering_required) || 0,
          progressPercentage: parseFloat(stats.total_wagering_required) > 0
            ? (parseFloat(stats.total_wagering_progress) / parseFloat(stats.total_wagering_required)) * 100
            : 0,
          avgCompletionRate: parseFloat(stats.avg_completion_rate) || 0,
          totalBetsPlaced: parseFloat(stats.total_bets_placed) || 0,
          totalWinsAmount: parseFloat(stats.total_wins_amount) || 0,
        },
        wallets: {
          totalBalance: parseFloat(wallet.total_wallet_balance) || 0,
          lockedBalance: parseFloat(wallet.total_locked_balance) || 0,
          playableBalance: parseFloat(wallet.total_playable_balance) || 0,
          totalWallets: parseInt(wallet.total_wallets) || 0,
        },
        lifetime: {
          bonusesGranted: parseFloat(wallet.lifetime_bonuses_granted) || 0,
          bonusesWagered: parseFloat(wallet.lifetime_bonuses_wagered) || 0,
          bonusesReleased: parseFloat(wallet.lifetime_bonuses_released) || 0,
          bonusesForfeited: parseFloat(wallet.lifetime_bonuses_forfeited) || 0,
          bonusesTransferred: parseFloat(wallet.lifetime_bonuses_transferred) || 0,
        },
        recentActivity: {
          bonusesGranted7d: parseInt(recent.bonuses_granted_7d) || 0,
          valueGranted7d: parseFloat(recent.value_granted_7d) || 0,
        },
        conversion: {
          conversionRate: conversionRate || 0,
          avgCompletionTimeHours: parseFloat(conversion.avg_completion_time_hours) || 0,
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching bonus analytics overview:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get bonus time series data for charts
 * Supports daily, weekly, monthly grouping
 */
export const getBonusTimeSeries = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool = require('../../db/postgres').default;
    const { period = 'daily', days = 30 } = req.query;

    let dateFormat: string;
    let interval: string;

    switch (period) {
      case 'hourly':
        dateFormat = 'YYYY-MM-DD HH24:00';
        interval = `${days} hours`;
        break;
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        interval = `${days} days`;
        break;
      case 'weekly':
        dateFormat = 'IYYY-IW';
        interval = `${days} days`;
        break;
      case 'monthly':
        dateFormat = 'YYYY-MM';
        interval = `${days} days`;
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
        interval = `${days} days`;
    }

    // Bonuses granted over time
    const grantedSeries = await pool.query(`
      SELECT
        TO_CHAR(granted_at, '${dateFormat}') as period,
        COUNT(*) as bonuses_granted,
        COALESCE(SUM(bonus_amount), 0) as total_value,
        COUNT(DISTINCT player_id) as unique_players
      FROM bonus_instances
      WHERE granted_at >= NOW() - INTERVAL '${interval}'
      GROUP BY TO_CHAR(granted_at, '${dateFormat}')
      ORDER BY period ASC
    `);

    // Wagering progress over time
    const wageringSeries = await pool.query(`
      SELECT
        TO_CHAR(updated_at, '${dateFormat}') as period,
        COALESCE(SUM(wager_progress_amount), 0) as wagering_progress,
        COUNT(DISTINCT CASE WHEN status = 'wagering' THEN id END) as active_wagering_bonuses
      FROM bonus_instances
      WHERE updated_at >= NOW() - INTERVAL '${interval}'
        AND status IN ('wagering', 'completed')
      GROUP BY TO_CHAR(updated_at, '${dateFormat}')
      ORDER BY period ASC
    `);

    // Completions over time
    const completionsSeries = await pool.query(`
      SELECT
        TO_CHAR(completed_at, '${dateFormat}') as period,
        COUNT(*) as bonuses_completed,
        COALESCE(SUM(bonus_amount), 0) as completed_value
      FROM bonus_instances
      WHERE completed_at >= NOW() - INTERVAL '${interval}'
        AND status = 'completed'
      GROUP BY TO_CHAR(completed_at, '${dateFormat}')
      ORDER BY period ASC
    `);

    // Expirations and forfeitures over time
    const lostSeries = await pool.query(`
      SELECT
        TO_CHAR(updated_at, '${dateFormat}') as period,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as bonuses_expired,
        COUNT(CASE WHEN status = 'forfeited' THEN 1 END) as bonuses_forfeited,
        COALESCE(SUM(CASE WHEN status = 'expired' THEN remaining_bonus ELSE 0 END), 0) as expired_value,
        COALESCE(SUM(CASE WHEN status = 'forfeited' THEN remaining_bonus ELSE 0 END), 0) as forfeited_value
      FROM bonus_instances
      WHERE updated_at >= NOW() - INTERVAL '${interval}'
        AND status IN ('expired', 'forfeited')
      GROUP BY TO_CHAR(updated_at, '${dateFormat}')
      ORDER BY period ASC
    `);

    res.status(200).json({
      success: true,
      data: {
        granted: grantedSeries.rows,
        wagering: wageringSeries.rows,
        completions: completionsSeries.rows,
        lost: lostSeries.rows,
        metadata: {
          period,
          days: parseInt(days as string),
          dataPoints: grantedSeries.rows.length
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching bonus time series:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get bonus distribution by status (for pie/donut charts)
 */
export const getBonusDistributionByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool = require('../../db/postgres').default;

    const result = await pool.query(`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(bonus_amount), 0) as total_value,
        COALESCE(SUM(remaining_bonus), 0) as remaining_value,
        COALESCE(AVG(wager_progress_amount::float / NULLIF(wager_requirement_amount, 0) * 100), 0) as avg_progress_pct
      FROM bonus_instances
      GROUP BY status
      ORDER BY count DESC
    `);

    const distribution = result.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count),
      totalValue: parseFloat(row.total_value),
      remainingValue: parseFloat(row.remaining_value),
      avgProgressPct: parseFloat(row.avg_progress_pct),
      percentage: 0 // Will calculate below
    }));

    const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);
    distribution.forEach(item => {
      item.percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        distribution,
        total: totalCount
      }
    });
  } catch (error: any) {
    console.error('Error fetching bonus distribution by status:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get bonus distribution by plan (for bar charts)
 */
export const getBonusDistributionByPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool = require('../../db/postgres').default;
    const { limit = 10 } = req.query;

    const result = await pool.query(`
      SELECT
        bp.id as plan_id,
        bp.name as plan_name,
        bp.trigger_type as bonus_type,
        COUNT(bi.id) as total_granted,
        COUNT(DISTINCT bi.player_id) as unique_players,
        COUNT(CASE WHEN bi.status IN ('active', 'wagering') THEN 1 END) as active_bonuses,
        COUNT(CASE WHEN bi.status = 'completed' THEN 1 END) as completed_bonuses,
        COALESCE(SUM(bi.bonus_amount), 0) as total_value,
        COALESCE(SUM(CASE WHEN bi.status = 'completed' THEN bi.bonus_amount ELSE 0 END), 0) as completed_value,
        COALESCE(AVG(CASE
          WHEN bi.status = 'completed' THEN (bi.wager_progress_amount::float / NULLIF(bi.wager_requirement_amount, 0)) * 100
        END), 0) as avg_completion_rate
      FROM bonus_plans bp
      LEFT JOIN bonus_instances bi ON bi.bonus_plan_id = bp.id
      WHERE bp.status = 'active'
      GROUP BY bp.id, bp.name, bp.trigger_type
      ORDER BY total_granted DESC
      LIMIT $1
    `, [limit]);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        planId: row.plan_id,
        planName: row.plan_name,
        bonusType: row.bonus_type,
        totalGranted: parseInt(row.total_granted) || 0,
        uniquePlayers: parseInt(row.unique_players) || 0,
        activeBonuses: parseInt(row.active_bonuses) || 0,
        completedBonuses: parseInt(row.completed_bonuses) || 0,
        totalValue: parseFloat(row.total_value) || 0,
        completedValue: parseFloat(row.completed_value) || 0,
        avgCompletionRate: parseFloat(row.avg_completion_rate) || 0,
        conversionRate: parseInt(row.total_granted) > 0
          ? (parseInt(row.completed_bonuses) / parseInt(row.total_granted)) * 100
          : 0
      }))
    });
  } catch (error: any) {
    console.error('Error fetching bonus distribution by plan:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get top performing bonus plans with detailed metrics
 */
export const getBonusTopPerformingPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool = require('../../db/postgres').default;
    const { limit = 10, sortBy = 'completion_rate' } = req.query;

    let orderByClause = 'completion_rate DESC';

    switch (sortBy) {
      case 'total_granted':
        orderByClause = 'total_granted DESC';
        break;
      case 'completion_rate':
        orderByClause = 'completion_rate DESC';
        break;
      case 'total_value':
        orderByClause = 'total_value DESC';
        break;
      case 'player_engagement':
        orderByClause = 'unique_players DESC';
        break;
      default:
        orderByClause = 'completion_rate DESC';
    }

    const result = await pool.query(`
      SELECT
        bp.id as plan_id,
        bp.name as plan_name,
        bp.trigger_type as bonus_type,
        bp.amount as bonus_amount,
        bp.wager_requirement_multiplier as wager_requirement,
        COUNT(bi.id) as total_granted,
        COUNT(DISTINCT bi.player_id) as unique_players,
        COUNT(CASE WHEN bi.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN bi.status IN ('active', 'wagering') THEN 1 END) as active_count,
        COALESCE(SUM(bi.bonus_amount), 0) as total_value,
        COALESCE(SUM(bi.total_bets_count), 0) as total_bets,
        COALESCE(SUM(bi.total_wins_amount), 0) as total_wins,
        COALESCE(AVG(CASE
          WHEN bi.status = 'completed' AND bi.activated_at IS NOT NULL AND bi.completed_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (bi.completed_at - bi.activated_at)) / 3600
        END), 0) as avg_completion_hours,
        CASE
          WHEN COUNT(bi.id) > 0 THEN (COUNT(CASE WHEN bi.status = 'completed' THEN 1 END)::float / COUNT(bi.id)) * 100
          ELSE 0
        END as completion_rate
      FROM bonus_plans bp
      LEFT JOIN bonus_instances bi ON bi.bonus_plan_id = bp.id
      WHERE bp.status = 'active'
      GROUP BY bp.id, bp.name, bp.trigger_type, bp.amount, bp.wager_requirement_multiplier
      HAVING COUNT(bi.id) > 0
      ORDER BY ${orderByClause}
      LIMIT $1
    `, [limit]);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        planId: row.plan_id,
        planName: row.plan_name,
        bonusType: row.bonus_type,
        bonusAmount: parseFloat(row.bonus_amount) || 0,
        wagerRequirement: parseFloat(row.wager_requirement) || 0,
        totalGranted: parseInt(row.total_granted) || 0,
        uniquePlayers: parseInt(row.unique_players) || 0,
        completedCount: parseInt(row.completed_count) || 0,
        activeCount: parseInt(row.active_count) || 0,
        totalValue: parseFloat(row.total_value) || 0,
        totalBets: parseFloat(row.total_bets) || 0,
        totalWins: parseFloat(row.total_wins) || 0,
        avgCompletionHours: parseFloat(row.avg_completion_hours) || 0,
        completionRate: parseFloat(row.completion_rate) || 0,
        playerEngagement: parseInt(row.unique_players) / Math.max(parseInt(row.total_granted), 1),
        roi: parseFloat(row.total_bets) > 0
          ? ((parseFloat(row.total_bets) - parseFloat(row.total_value)) / parseFloat(row.total_value)) * 100
          : 0
      }))
    });
  } catch (error: any) {
    console.error('Error fetching top performing plans:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get player engagement metrics
 */
export const getBonusPlayerEngagement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool = require('../../db/postgres').default;

    // Player segmentation
    const segmentation = await pool.query(`
      SELECT
        CASE
          WHEN bonus_count = 1 THEN 'one_time'
          WHEN bonus_count BETWEEN 2 AND 5 THEN 'occasional'
          WHEN bonus_count BETWEEN 6 AND 10 THEN 'regular'
          ELSE 'heavy'
        END as segment,
        COUNT(*) as player_count,
        AVG(total_value) as avg_bonus_value,
        AVG(completion_rate) as avg_completion_rate
      FROM (
        SELECT
          player_id,
          COUNT(*) as bonus_count,
          SUM(bonus_amount) as total_value,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*)) * 100 as completion_rate
        FROM bonus_instances
        GROUP BY player_id
      ) player_stats
      GROUP BY
        CASE
          WHEN bonus_count = 1 THEN 'one_time'
          WHEN bonus_count BETWEEN 2 AND 5 THEN 'occasional'
          WHEN bonus_count BETWEEN 6 AND 10 THEN 'regular'
          ELSE 'heavy'
        END
      ORDER BY
        CASE
          CASE
            WHEN bonus_count = 1 THEN 'one_time'
            WHEN bonus_count BETWEEN 2 AND 5 THEN 'occasional'
            WHEN bonus_count BETWEEN 6 AND 10 THEN 'regular'
            ELSE 'heavy'
          END
          WHEN 'heavy' THEN 1
          WHEN 'regular' THEN 2
          WHEN 'occasional' THEN 3
          WHEN 'one_time' THEN 4
        END
    `);

    // Active vs inactive players
    const activityStats = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE
          WHEN bi.updated_at >= NOW() - INTERVAL '7 days' THEN bi.player_id
        END) as active_7d,
        COUNT(DISTINCT CASE
          WHEN bi.updated_at >= NOW() - INTERVAL '30 days' THEN bi.player_id
        END) as active_30d,
        COUNT(DISTINCT bi.player_id) as total_players,
        AVG(CASE
          WHEN bi.status IN ('active', 'wagering') THEN 1
          ELSE 0
        END) * 100 as active_bonus_rate
      FROM bonus_instances bi
    `);

    // Retention metrics
    const retention = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE
          WHEN first_bonus >= NOW() - INTERVAL '30 days'
          AND second_bonus IS NOT NULL
          THEN player_id
        END) as retained_players,
        COUNT(DISTINCT CASE
          WHEN first_bonus >= NOW() - INTERVAL '30 days'
          THEN player_id
        END) as new_players
      FROM (
        SELECT
          player_id,
          MIN(granted_at) as first_bonus,
          NTH_VALUE(granted_at, 2) OVER (PARTITION BY player_id ORDER BY granted_at) as second_bonus
        FROM bonus_instances
        GROUP BY player_id, granted_at
      ) retention_data
    `);

    const activityData = activityStats.rows[0];
    const retentionData = retention.rows[0];
    const retentionRate = parseInt(retentionData.new_players) > 0
      ? (parseInt(retentionData.retained_players) / parseInt(retentionData.new_players)) * 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        segmentation: segmentation.rows.map(row => ({
          segment: row.segment,
          playerCount: parseInt(row.player_count),
          avgBonusValue: parseFloat(row.avg_bonus_value) || 0,
          avgCompletionRate: parseFloat(row.avg_completion_rate) || 0
        })),
        activity: {
          active7d: parseInt(activityData.active_7d) || 0,
          active30d: parseInt(activityData.active_30d) || 0,
          totalPlayers: parseInt(activityData.total_players) || 0,
          activeBonusRate: parseFloat(activityData.active_bonus_rate) || 0
        },
        retention: {
          retainedPlayers: parseInt(retentionData.retained_players) || 0,
          newPlayers: parseInt(retentionData.new_players) || 0,
          retentionRate: retentionRate
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching player engagement metrics:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get financial metrics and ROI analysis
 */
export const getBonusFinancialMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pool = require('../../db/postgres').default;

    // Overall financial metrics
    const financialStats = await pool.query(`
      SELECT
        COALESCE(SUM(bonus_amount), 0) as total_bonus_cost,
        COALESCE(SUM(wager_progress_amount), 0) as total_wagering_activity,
        COALESCE(SUM(total_wins_amount), 0) as total_winnings_paid,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN remaining_bonus ELSE 0 END), 0) as total_released_to_players,
        COALESCE(SUM(CASE WHEN status IN ('expired', 'forfeited') THEN remaining_bonus ELSE 0 END), 0) as total_saved_from_expiry,
        COALESCE(SUM(total_bets_count), 0) as total_bets_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(*) as total_bonuses
      FROM bonus_instances
    `);

    // By bonus type
    const byType = await pool.query(`
      SELECT
        bp.trigger_type as bonus_type,
        COALESCE(SUM(bi.bonus_amount), 0) as cost,
        COALESCE(SUM(bi.wager_progress_amount), 0) as wagering_activity,
        COALESCE(SUM(bi.total_wins_amount), 0) as winnings,
        COALESCE(SUM(bi.total_bets_count), 0) as bets_count,
        COUNT(*) as count
      FROM bonus_instances bi
      JOIN bonus_plans bp ON bp.id = bi.bonus_plan_id
      GROUP BY bp.trigger_type
    `);

    // Recent trend (last 30 days)
    const recentTrend = await pool.query(`
      SELECT
        COALESCE(SUM(bonus_amount), 0) as cost_30d,
        COALESCE(SUM(wager_progress_amount), 0) as wagering_30d,
        COALESCE(SUM(total_bets_count), 0) as bets_count_30d,
        COUNT(*) as bonuses_30d
      FROM bonus_instances
      WHERE granted_at >= NOW() - INTERVAL '30 days'
    `);

    const stats = financialStats.rows[0];
    const trend = recentTrend.rows[0];

    const totalCost = parseFloat(stats.total_bonus_cost) || 0;
    const totalWageringActivity = parseFloat(stats.total_wagering_activity) || 0;
    const totalWinnings = parseFloat(stats.total_winnings_paid) || 0;
    const totalBetsCount = parseInt(stats.total_bets_count) || 0;

    // Net position: wagering activity shows player engagement, winnings show cost
    const netPosition = totalWageringActivity - totalWinnings - totalCost;
    const roi = totalCost > 0 ? ((netPosition / totalCost) * 100) : 0;
    const wageringMultiplier = totalCost > 0 ? (totalWageringActivity / totalCost) : 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalBonusCost: totalCost,
          totalWageringActivity: totalWageringActivity,
          totalWinningsPaid: totalWinnings,
          totalBetsCount: totalBetsCount,
          netPosition: netPosition,
          roi: roi,
          wageringMultiplier: wageringMultiplier,
          totalReleasedToPlayers: parseFloat(stats.total_released_to_players) || 0,
          totalSavedFromExpiry: parseFloat(stats.total_saved_from_expiry) || 0,
          completionRate: (parseInt(stats.completed_count) / Math.max(parseInt(stats.total_bonuses), 1)) * 100
        },
        byType: byType.rows.map(row => ({
          bonusType: row.bonus_type,
          cost: parseFloat(row.cost) || 0,
          wageringActivity: parseFloat(row.wagering_activity) || 0,
          winnings: parseFloat(row.winnings) || 0,
          betsCount: parseInt(row.bets_count) || 0,
          netPosition: (parseFloat(row.wagering_activity) - parseFloat(row.winnings) - parseFloat(row.cost)),
          roi: parseFloat(row.cost) > 0
            ? (((parseFloat(row.wagering_activity) - parseFloat(row.winnings) - parseFloat(row.cost)) / parseFloat(row.cost)) * 100)
            : 0,
          count: parseInt(row.count)
        })),
        recent30Days: {
          cost: parseFloat(trend.cost_30d) || 0,
          wageringActivity: parseFloat(trend.wagering_30d) || 0,
          betsCount: parseInt(trend.bets_count_30d) || 0,
          bonusesGranted: parseInt(trend.bonuses_30d) || 0,
          avgCostPerBonus: parseInt(trend.bonuses_30d) > 0
            ? parseFloat(trend.cost_30d) / parseInt(trend.bonuses_30d)
            : 0
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching financial metrics:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};
