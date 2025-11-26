"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const authorize_1 = require("../middlewares/authorize");
const validate_1 = require("../middlewares/validate");
const bonus_controller_1 = require("../api/bonus/bonus.controller");
const bonus_schema_1 = require("../api/bonus/bonus.schema");
const bonusRouter = (0, express_1.Router)();
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
bonusRouter.post('/admin/bonus/plans', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.createBonusPlanSchema }), bonus_controller_1.createBonusPlan);
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
bonusRouter.put('/admin/bonus/plans/:id', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.updateBonusPlanSchema }), bonus_controller_1.updateBonusPlan);
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
bonusRouter.get('/admin/bonus/plans/:id', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.getBonusPlan);
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
bonusRouter.get('/admin/bonus/plans', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), (0, validate_1.validate)({ query: bonus_schema_1.getBonusPlansSchema }), bonus_controller_1.getBonusPlans);
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
bonusRouter.delete('/admin/bonus/plans/:id', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin']), bonus_controller_1.deleteBonusPlan);
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
bonusRouter.post('/admin/bonus/grant-manual', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.grantManualBonusSchema }), bonus_controller_1.grantManualBonus);
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
bonusRouter.get('/admin/bonus/statistics', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), bonus_controller_1.getBonusStatistics);
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
bonusRouter.get('/admin/bonus/player/:playerId/bonuses', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.getPlayerBonusesAdmin);
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
bonusRouter.post('/admin/bonus/instances/:id/forfeit', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.forfeitBonusSchema }), bonus_controller_1.forfeitBonusAdmin);
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
bonusRouter.post('/admin/bonus/game-contribution', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.setGameContributionSchema }), bonus_controller_1.setGameContribution);
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
bonusRouter.delete('/admin/bonus/game-contribution/:gameId', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), bonus_controller_1.deleteGameContribution);
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
bonusRouter.get('/admin/bonus/game-contribution/:gameCode', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.getGameContribution);
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
bonusRouter.get('/admin/bonus/game-contributions', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.getAllGameContributions);
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
bonusRouter.get('/games/search', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.searchGames);
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
bonusRouter.post('/admin/bonus/category-contribution', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.setCategoryContributionSchema }), bonus_controller_1.setCategoryContribution);
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
bonusRouter.delete('/admin/bonus/category-contribution/:category', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), bonus_controller_1.deleteCategoryContribution);
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
bonusRouter.get('/admin/bonus/category-contributions', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.getAllCategoryContributions);
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
bonusRouter.get('/admin/bonus/available-categories', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.getAvailableCategories);
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
bonusRouter.post('/admin/bonus/bulk-grant', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.bulkGrantBonusesSchema }), bonus_controller_1.bulkGrantBonuses);
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
bonusRouter.post('/admin/bonus/bulk-forfeit', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.bulkForfeitBonusesSchema }), bonus_controller_1.bulkForfeitBonuses);
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
bonusRouter.post('/admin/bonus/plans/:id/clone', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ body: bonus_schema_1.cloneBonusPlanSchema }), bonus_controller_1.cloneBonusPlan);
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
bonusRouter.get('/admin/bonus/plans/:id/analytics', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.getBonusPlanAnalytics);
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
bonusRouter.get('/admin/bonus/player/:playerId/transactions', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager', 'Support']), bonus_controller_1.getPlayerBonusTransactionsAdmin);
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
bonusRouter.get('/admin/bonus/audit-logs', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin', 'Manager']), (0, validate_1.validate)({ query: bonus_schema_1.getAuditLogsSchema }), bonus_controller_1.getAuditLogs);
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
bonusRouter.post('/bonus/apply-code', authenticate_1.authenticate, (0, validate_1.validate)({ body: bonus_schema_1.applyBonusCodeSchema }), bonus_controller_1.applyBonusCode);
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
bonusRouter.get('/bonus/my-bonuses', authenticate_1.authenticate, (0, validate_1.validate)({ query: bonus_schema_1.getUserBonusesSchema }), bonus_controller_1.getMyBonuses);
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
bonusRouter.get('/bonus/active', authenticate_1.authenticate, bonus_controller_1.getMyActiveBonuses);
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
bonusRouter.get('/bonus/wallet', authenticate_1.authenticate, bonus_controller_1.getMyBonusWallet);
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
bonusRouter.get('/bonus/wagering-progress', authenticate_1.authenticate, bonus_controller_1.getMyWageringProgress);
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
bonusRouter.get('/bonus/transactions', authenticate_1.authenticate, bonus_controller_1.getMyBonusTransactions);
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
bonusRouter.get('/bonus/stats', authenticate_1.authenticate, bonus_controller_1.getMyBonusStats);
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
bonusRouter.get('/bonus/combined-balance', authenticate_1.authenticate, bonus_controller_1.getMyCombinedBalance);
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
bonusRouter.get('/bonus/available', authenticate_1.authenticate, bonus_controller_1.getAvailableBonuses);
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
bonusRouter.post('/bonus/transfer-to-main', authenticate_1.authenticate, bonus_controller_1.transferBonusToMain);
exports.default = bonusRouter;
