import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import {
  // Admin Controllers
  createBonusPlan,
  updateBonusPlan,
  getBonusPlan,
  getBonusPlans,
  deleteBonusPlan,
  grantManualBonus,
  getBonusStatistics,
  getPlayerBonusesAdmin,
  getPlayerBonusWalletAdmin,
  forfeitBonusAdmin,
  setGameContribution,
  deleteGameContribution,
  getGameContribution,
  getAllGameContributions,
  searchGames,
  setCategoryContribution,
  deleteCategoryContribution,
  getAllCategoryContributions,
  getAvailableCategories,

  // Admin - Bulk Operations
  bulkGrantBonuses,
  bulkForfeitBonuses,

  // Admin - Advanced
  cloneBonusPlan,
  getBonusPlanAnalytics,

  // Admin - Transactions & Audit
  getPlayerBonusTransactionsAdmin,
  getAuditLogs,

  // Admin - Player Search & Listing
  searchPlayer,
  getAllPlayersWithBonuses,

  // Admin - Advanced Analytics & Charts
  getBonusAnalyticsOverview,
  getBonusTimeSeries,
  getBonusDistributionByStatus,
  getBonusDistributionByPlan,
  getBonusTopPerformingPlans,
  getBonusPlayerEngagement,
  getBonusFinancialMetrics,

  // User Controllers
  applyBonusCode,
  getMyBonuses,
  getMyActiveBonuses,
  getMyBonusWallet,
  getMyWageringProgress,
  getMyBonusTransactions,
  getMyBonusStats,
  getMyCombinedBalance,
  getAvailableBonuses,
  transferBonusToMain
} from "../api/bonus/bonus.controller";
import {
  createBonusPlanSchema,
  updateBonusPlanSchema,
  grantManualBonusSchema,
  getBonusPlansSchema,
  applyBonusCodeSchema,
  getUserBonusesSchema,
  forfeitBonusSchema,
  setGameContributionSchema,
  setCategoryContributionSchema,
  bulkGrantBonusesSchema,
  bulkForfeitBonusesSchema,
  cloneBonusPlanSchema,
  getAuditLogsSchema
} from "../api/bonus/bonus.schema";

const bonusRouter = Router();

// =====================================================
// ADMIN ROUTES - Bonus Plan Management
// =====================================================

/**
 * @swagger
 * /api/admin/bonus/plans:
 *   post:
 *     summary: Create a new bonus plan
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - start_date
 *               - end_date
 *               - expiry_days
 *               - trigger_type
 *               - award_type
 *               - amount
 *               - wager_requirement_multiplier
 *             properties:
 *               name:
 *                 type: string
 *               trigger_type:
 *                 type: string
 *                 enum: [deposit, coded, manual, loyalty, cashback]
 *               award_type:
 *                 type: string
 *                 enum: [flat_amount, percentage]
 *               amount:
 *                 type: number
 *               wager_requirement_multiplier:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bonus plan created successfully
 */
bonusRouter.post(
  '/admin/bonus/plans',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: createBonusPlanSchema }),
  createBonusPlan
);

/**
 * @swagger
 * /api/admin/bonus/plans/{id}:
 *   put:
 *     summary: Update a bonus plan
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bonus plan updated successfully
 */
bonusRouter.put(
  '/admin/bonus/plans/:id',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: updateBonusPlanSchema }),
  updateBonusPlan
);

/**
 * @swagger
 * /api/admin/bonus/plans/{id}:
 *   get:
 *     summary: Get a bonus plan by ID
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bonus plan details
 */
bonusRouter.get(
  '/admin/bonus/plans/:id',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getBonusPlan
);

/**
 * @swagger
 * /api/admin/bonus/plans:
 *   get:
 *     summary: Get all bonus plans with filters
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, expired]
 *       - in: query
 *         name: trigger_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of bonus plans
 */
bonusRouter.get(
  '/admin/bonus/plans',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  validate({ query: getBonusPlansSchema }),
  getBonusPlans
);

/**
 * @swagger
 * /api/admin/bonus/plans/{id}:
 *   delete:
 *     summary: Delete a bonus plan
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bonus plan deleted successfully
 */
bonusRouter.delete(
  '/admin/bonus/plans/:id',
  authenticate,
  authorize(['Admin']),
  deleteBonusPlan
);

/**
 * @swagger
 * /api/admin/bonus/grant-manual:
 *   post:
 *     summary: Grant manual bonus to a player
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - player_id
 *               - bonus_plan_id
 *               - notes
 *             properties:
 *               player_id:
 *                 type: integer
 *               bonus_plan_id:
 *                 type: integer
 *               custom_amount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Manual bonus granted successfully
 */
bonusRouter.post(
  '/admin/bonus/grant-manual',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: grantManualBonusSchema }),
  grantManualBonus
);

// =====================================================
// ADMIN ROUTES - Statistics & Reports
// =====================================================

/**
 * @swagger
 * /api/admin/bonus/statistics:
 *   get:
 *     summary: Get bonus system statistics
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bonus statistics
 */
bonusRouter.get(
  '/admin/bonus/statistics',
  authenticate,
  authorize(['Admin', 'Manager']),
  getBonusStatistics
);

/**
 * @swagger
 * /api/admin/bonus/analytics/overview:
 *   get:
 *     summary: Get comprehensive bonus analytics overview
 *     tags: [Admin - Bonus Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enhanced analytics with detailed metrics
 */
bonusRouter.get(
  '/admin/bonus/analytics/overview',
  authenticate,
  authorize(['Admin', 'Manager']),
  getBonusAnalyticsOverview
);

/**
 * @swagger
 * /api/admin/bonus/analytics/time-series:
 *   get:
 *     summary: Get bonus time series data for charts
 *     tags: [Admin - Bonus Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly, monthly]
 *           default: daily
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Time series data for line/area charts
 */
bonusRouter.get(
  '/admin/bonus/analytics/time-series',
  authenticate,
  authorize(['Admin', 'Manager']),
  getBonusTimeSeries
);

/**
 * @swagger
 * /api/admin/bonus/analytics/distribution/status:
 *   get:
 *     summary: Get bonus distribution by status (for pie charts)
 *     tags: [Admin - Bonus Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribution data for pie/donut charts
 */
bonusRouter.get(
  '/admin/bonus/analytics/distribution/status',
  authenticate,
  authorize(['Admin', 'Manager']),
  getBonusDistributionByStatus
);

/**
 * @swagger
 * /api/admin/bonus/analytics/distribution/plan:
 *   get:
 *     summary: Get bonus distribution by plan (for bar charts)
 *     tags: [Admin - Bonus Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Distribution data for bar charts
 */
bonusRouter.get(
  '/admin/bonus/analytics/distribution/plan',
  authenticate,
  authorize(['Admin', 'Manager']),
  getBonusDistributionByPlan
);

/**
 * @swagger
 * /api/admin/bonus/analytics/top-plans:
 *   get:
 *     summary: Get top performing bonus plans
 *     tags: [Admin - Bonus Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [completion_rate, total_granted, total_value, player_engagement]
 *           default: completion_rate
 *     responses:
 *       200:
 *         description: Top performing plans with detailed metrics
 */
bonusRouter.get(
  '/admin/bonus/analytics/top-plans',
  authenticate,
  authorize(['Admin', 'Manager']),
  getBonusTopPerformingPlans
);

/**
 * @swagger
 * /api/admin/bonus/analytics/player-engagement:
 *   get:
 *     summary: Get player engagement metrics
 *     tags: [Admin - Bonus Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Player segmentation and engagement data
 */
bonusRouter.get(
  '/admin/bonus/analytics/player-engagement',
  authenticate,
  authorize(['Admin', 'Manager']),
  getBonusPlayerEngagement
);

/**
 * @swagger
 * /api/admin/bonus/analytics/financial:
 *   get:
 *     summary: Get financial metrics and ROI analysis
 *     tags: [Admin - Bonus Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial metrics, ROI, and profitability data
 */
bonusRouter.get(
  '/admin/bonus/analytics/financial',
  authenticate,
  authorize(['Admin', 'Manager']),
  getBonusFinancialMetrics
);

/**
 * @swagger
 * /api/admin/bonus/player/{playerId}/bonuses:
 *   get:
 *     summary: Get all bonuses for a specific player (admin view)
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player bonuses
 */
bonusRouter.get(
  '/admin/bonus/player/:playerId/bonuses',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getPlayerBonusesAdmin
);

/**
 * @swagger
 * /api/admin/bonus/player/{playerId}/wallet:
 *   get:
 *     summary: Get player bonus wallet (admin view)
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player bonus wallet details
 */
bonusRouter.get(
  '/admin/bonus/player/:playerId/wallet',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getPlayerBonusWalletAdmin
);

/**
 * @swagger
 * /api/admin/bonus/instances/{id}/forfeit:
 *   post:
 *     summary: Forfeit a bonus instance
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bonus forfeited successfully
 */
bonusRouter.post(
  '/admin/bonus/instances/:id/forfeit',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: forfeitBonusSchema }),
  forfeitBonusAdmin
);

// =====================================================
// ADMIN ROUTES - Game Contributions
// =====================================================

/**
 * @swagger
 * /api/admin/bonus/game-contribution:
 *   post:
 *     summary: Set wagering contribution for a game
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - game_code
 *               - contribution_percentage
 *             properties:
 *               game_code:
 *                 type: string
 *                 example: SLOT_STARBURST
 *               contribution_percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               is_restricted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Game contribution updated
 */
bonusRouter.post(
  '/admin/bonus/game-contribution',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: setGameContributionSchema }),
  setGameContribution
);

/**
 * @swagger
 * /api/admin/bonus/game-contribution/{gameId}:
 *   delete:
 *     summary: Delete a game contribution configuration
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The game ID
 *         example: 123
 *     responses:
 *       200:
 *         description: Game contribution deleted successfully
 *       404:
 *         description: Game contribution not found
 */
bonusRouter.delete(
  '/admin/bonus/game-contribution/:gameId',
  authenticate,
  authorize(['Admin', 'Manager']),
  deleteGameContribution
);

/**
 * @swagger
 * /api/admin/bonus/game-contribution/{gameCode}:
 *   get:
 *     summary: Get wagering contribution for a game
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameCode
 *         required: true
 *         schema:
 *           type: string
 *         example: SLOT_STARBURST
 *     responses:
 *       200:
 *         description: Game contribution details
 */
bonusRouter.get(
  '/admin/bonus/game-contribution/:gameCode',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getGameContribution
);

/**
 * @swagger
 * /api/admin/bonus/game-contributions:
 *   get:
 *     summary: Get all game contributions with pagination
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by game code, name, or provider
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of game contributions
 */
bonusRouter.get(
  '/admin/bonus/game-contributions',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getAllGameContributions
);

/**
 * @swagger
 * /api/games/search:
 *   get:
 *     summary: Search games by code or name (for autocomplete)
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (min 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of matching games
 */
bonusRouter.get(
  '/games/search',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  searchGames
);

// =====================================================
// ADMIN ROUTES - Category Contributions
// =====================================================

/**
 * @swagger
 * /api/admin/bonus/category-contribution:
 *   post:
 *     summary: Set wagering contribution for a game category
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - contribution_percentage
 *             properties:
 *               category:
 *                 type: string
 *                 example: slots
 *               contribution_percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               is_restricted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category contribution updated
 */
bonusRouter.post(
  '/admin/bonus/category-contribution',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: setCategoryContributionSchema }),
  setCategoryContribution
);

/**
 * @swagger
 * /api/admin/bonus/category-contribution/{category}:
 *   delete:
 *     summary: Delete a category contribution configuration
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: The category name
 *         example: slots
 *     responses:
 *       200:
 *         description: Category contribution deleted successfully
 *       404:
 *         description: Category contribution not found
 */
bonusRouter.delete(
  '/admin/bonus/category-contribution/:category',
  authenticate,
  authorize(['Admin', 'Manager']),
  deleteCategoryContribution
);

/**
 * @swagger
 * /api/admin/bonus/category-contributions:
 *   get:
 *     summary: Get all category contributions
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of category contributions
 */
bonusRouter.get(
  '/admin/bonus/category-contributions',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getAllCategoryContributions
);

/**
 * @swagger
 * /api/admin/bonus/available-categories:
 *   get:
 *     summary: Get all available game categories
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available categories
 */
bonusRouter.get(
  '/admin/bonus/available-categories',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getAvailableCategories
);

// =====================================================
// ADMIN ROUTES - Bulk Operations
// =====================================================

/**
 * @swagger
 * /api/admin/bonus/bulk-grant:
 *   post:
 *     summary: Bulk grant bonuses to multiple players
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - player_ids
 *               - bonus_plan_id
 *               - notes
 *             properties:
 *               player_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               bonus_plan_id:
 *                 type: integer
 *               custom_amount:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bonuses granted successfully
 */
bonusRouter.post(
  '/admin/bonus/bulk-grant',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: bulkGrantBonusesSchema }),
  bulkGrantBonuses
);

/**
 * @swagger
 * /api/admin/bonus/bulk-forfeit:
 *   post:
 *     summary: Bulk forfeit multiple bonuses
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bonus_instance_ids
 *               - reason
 *             properties:
 *               bonus_instance_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bonuses forfeited successfully
 */
bonusRouter.post(
  '/admin/bonus/bulk-forfeit',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: bulkForfeitBonusesSchema }),
  bulkForfeitBonuses
);

// =====================================================
// ADMIN ROUTES - Bonus Plan Advanced
// =====================================================

/**
 * @swagger
 * /api/admin/bonus/plans/{id}/clone:
 *   post:
 *     summary: Clone a bonus plan
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               bonus_code:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, expired]
 *     responses:
 *       201:
 *         description: Bonus plan cloned successfully
 */
bonusRouter.post(
  '/admin/bonus/plans/:id/clone',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ body: cloneBonusPlanSchema }),
  cloneBonusPlan
);

/**
 * @swagger
 * /api/admin/bonus/plans/{id}/analytics:
 *   get:
 *     summary: Get analytics for a bonus plan
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bonus plan analytics
 */
bonusRouter.get(
  '/admin/bonus/plans/:id/analytics',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getBonusPlanAnalytics
);

// =====================================================
// ADMIN ROUTES - Transactions & Audit
// =====================================================

/**
 * @swagger
 * /api/admin/bonus/player/{playerId}/transactions:
 *   get:
 *     summary: Get player bonus transactions (admin view)
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player bonus transactions
 */
bonusRouter.get(
  '/admin/bonus/player/:playerId/transactions',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getPlayerBonusTransactionsAdmin
);

/**
 * @swagger
 * /api/admin/bonus/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: admin_user_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: player_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: bonus_plan_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit logs
 */
bonusRouter.get(
  '/admin/bonus/audit-logs',
  authenticate,
  authorize(['Admin', 'Manager']),
  validate({ query: getAuditLogsSchema }),
  getAuditLogs
);

// =====================================================
// ADMIN ROUTES - Player Search & Listing
// =====================================================

/**
 * @swagger
 * /api/admin/bonus/players/search:
 *   get:
 *     summary: Search for a player by ID, email, or username
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Player ID, email, or username to search for
 *     responses:
 *       200:
 *         description: Player found
 *       404:
 *         description: Player not found
 */
bonusRouter.get(
  '/admin/bonus/players/search',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  searchPlayer
);

/**
 * @swagger
 * /api/admin/bonus/players/with-bonuses:
 *   get:
 *     summary: Get all players who have bonuses (paginated)
 *     tags: [Admin - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, wagering, completed, expired, forfeited]
 *         description: Filter by bonus status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by player ID, email, or username
 *     responses:
 *       200:
 *         description: List of players with bonuses
 */
bonusRouter.get(
  '/admin/bonus/players/with-bonuses',
  authenticate,
  authorize(['Admin', 'Manager', 'Support']),
  getAllPlayersWithBonuses
);

// =====================================================
// USER ROUTES - Bonus Management
// =====================================================

/**
 * @swagger
 * /api/bonus/apply-code:
 *   post:
 *     summary: Apply a bonus code
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bonus code applied successfully
 */
bonusRouter.post(
  '/bonus/apply-code',
  authenticate,
  validate({ body: applyBonusCodeSchema }),
  applyBonusCode
);

/**
 * @swagger
 * /api/bonus/my-bonuses:
 *   get:
 *     summary: Get my bonuses (all statuses)
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User bonuses
 */
bonusRouter.get(
  '/bonus/my-bonuses',
  authenticate,
  validate({ query: getUserBonusesSchema }),
  getMyBonuses
);

/**
 * @swagger
 * /api/bonus/active:
 *   get:
 *     summary: Get my active bonuses
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active bonuses
 */
bonusRouter.get(
  '/bonus/active',
  authenticate,
  getMyActiveBonuses
);

/**
 * @swagger
 * /api/bonus/wallet:
 *   get:
 *     summary: Get my bonus wallet balance
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bonus wallet details
 */
bonusRouter.get(
  '/bonus/wallet',
  authenticate,
  getMyBonusWallet
);

/**
 * @swagger
 * /api/bonus/wagering-progress:
 *   get:
 *     summary: Get my wagering progress
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wagering progress for active bonuses
 */
bonusRouter.get(
  '/bonus/wagering-progress',
  authenticate,
  getMyWageringProgress
);

/**
 * @swagger
 * /api/bonus/transactions:
 *   get:
 *     summary: Get my bonus transactions
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bonus transactions
 */
bonusRouter.get(
  '/bonus/transactions',
  authenticate,
  getMyBonusTransactions
);

/**
 * @swagger
 * /api/bonus/stats:
 *   get:
 *     summary: Get my bonus statistics
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User bonus statistics
 */
bonusRouter.get(
  '/bonus/stats',
  authenticate,
  getMyBonusStats
);

/**
 * @swagger
 * /api/bonus/combined-balance:
 *   get:
 *     summary: Get combined balance (main + bonus)
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Combined balance
 */
bonusRouter.get(
  '/bonus/combined-balance',
  authenticate,
  getMyCombinedBalance
);

/**
 * @swagger
 * /api/bonus/available:
 *   get:
 *     summary: Get available bonuses (promotional codes)
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available bonus promotions
 */
bonusRouter.get(
  '/bonus/available',
  authenticate,
  getAvailableBonuses
);

/**
 * @swagger
 * /api/bonus/transfer-to-main:
 *   post:
 *     summary: Transfer completed bonus funds to main wallet
 *     tags: [User - Bonus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to transfer (optional, defaults to all releasable)
 *     responses:
 *       200:
 *         description: Bonus funds transferred successfully
 */
bonusRouter.post(
  '/bonus/transfer-to-main',
  authenticate,
  transferBonusToMain
);

export default bonusRouter;
