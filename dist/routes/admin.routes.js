"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middlewares/validate");
const authenticate_1 = require("../middlewares/authenticate");
const authorize_1 = require("../middlewares/authorize");
const admin_schema_1 = require("../api/admin/admin.schema");
const admin_category_schema_1 = require("../api/admin/admin.category.schema");
const admin_promotion_schema_1 = require("../api/admin/admin.promotion.schema");
const admin_kyc_schema_1 = require("../api/admin/admin.kyc.schema");
const admin_controller_1 = require("../api/admin/admin.controller");
const admin_service_1 = require("../services/admin/admin.service");
const dashboardStatsController_1 = require("../controllers/dashboardStatsController");
const admin_controller_2 = require("../api/admin/admin.controller");
const admin_promotion_controller_1 = require("../api/admin/admin.promotion.controller");
const admin_kyc_controller_1 = require("../api/admin/admin.kyc.controller");
const admin_analytics_controller_1 = require("../api/admin/admin.analytics.controller");
const system_reset_controller_1 = require("../api/admin/system-reset.controller");
const payment_gateway_service_1 = require("../services/admin/payment-gateway.service");
const admin_game_import_schema_1 = require("../api/admin/admin.game-import.schema");
const admin_game_import_service_1 = require("../services/admin/admin.game-import.service");
const admin_game_management_controller_1 = require("../api/admin/admin.game-management.controller");
const admin_game_management_schema_1 = require("../api/admin/admin.game-management.schema");
const ggr_filter_service_1 = require("../services/provider/ggr-filter.service");
const admin_category_controller_1 = require("../api/admin/admin.category.controller");
const postgres_1 = __importDefault(require("../db/postgres"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const modules_controller_1 = require("../api/admin/modules/modules.controller");
const modules_schema_1 = require("../api/admin/modules/modules.schema");
const rtpAuto_1 = require("../rtpAuto");
const admin_schema_2 = require("../api/admin/admin.schema");
const admin_controller_3 = require("../api/admin/admin.controller");
const router = (0, express_1.Router)();
// Create a wrapper for the authorize middleware
const adminAuth = (req, res, next) => {
    (0, authorize_1.authorize)(["Admin"])(req, res, next);
};
// Make ONLY GET /modules public
router.get("/modules", (0, validate_1.validate)({ query: modules_schema_1.ModuleQuerySchema }), modules_controller_1.getAllModules);
// Now apply authentication and admin role for all other routes
router.use(authenticate_1.authenticate);
router.use(adminAuth);
// Test route
router.get("/test", (req, res) => {
    res.json({ message: "Admin routes working" });
});
// =====================================================
// DASHBOARD ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                     totalGames:
 *                       type: number
 *                     todayTransactions:
 *                       type: number
 *                     todayAmount:
 *                       type: number
 *                     pendingTransactions:
 *                       type: number
 *                     pendingAmount:
 *                       type: number
 *                     todayWagered:
 *                       type: number
 */
router.get("/dashboard/stats", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin", "Manager"]), dashboardStatsController_1.getDashboardStats);
/**
 * @swagger
 * /api/admin/dashboard/stats/realtime:
 *   get:
 *     summary: Get real-time lightweight statistics
 *     tags: [Admin Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time stats (active users, pending withdrawals, recent bets)
 */
router.get("/dashboard/stats/realtime", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin", "Manager"]), dashboardStatsController_1.getRealtimeStats);
// =====================================================
// GAME MANAGEMENT ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/games:
 *   get:
 *     summary: Get all games for admin
 *     tags: [Admin Games]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Games retrieved successfully
 */
router.get("/games", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_controller_1.getGamesForAdmin);
// Game Management Routes
/**
 * @openapi
 * /api/admin/games/status:
 *   get:
 *     summary: Get games with status filters
 *     description: Retrieve games with filtering options for status management
 *     tags:
 *       - Game Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by game category
 *         example: slots
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *         description: Filter by game provider
 *         example: NetEnt
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in game name or provider
 *         example: book
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Games retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Book of Dead
 *                       provider:
 *                         type: string
 *                         example: Play'n GO
 *                       category:
 *                         type: string
 *                         example: slots
 *                       subcategory:
 *                         type: string
 *                         example: adventure
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2024-01-15T10:30:00Z
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2024-01-15T10:30:00Z
 *                 message:
 *                   type: string
 *                   example: Games retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/games/status", (0, validate_1.validate)(admin_game_management_schema_1.GameStatusFiltersSchema), admin_game_management_controller_1.getGamesWithStatus);
/**
 * @openapi
 * /api/admin/games/status/id:
 *   put:
 *     summary: Update game status by ID
 *     description: Enable or disable a specific game by its ID
 *     tags:
 *       - Game Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - game_id
 *               - is_active
 *             properties:
 *               game_id:
 *                 type: integer
 *                 minimum: 1
 *                 description: The ID of the game to update
 *                 example: 1
 *               is_active:
 *                 type: boolean
 *                 description: Whether the game should be active or disabled
 *                 example: false
 *               reason:
 *                 type: string
 *                 description: Reason for the status change (optional)
 *                 example: Maintenance required
 *     responses:
 *       200:
 *         description: Game status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: Book of Dead
 *                     provider:
 *                       type: string
 *                       example: Play'n GO
 *                     category:
 *                       type: string
 *                       example: slots
 *                     is_active:
 *                       type: boolean
 *                       example: false
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-15T10:30:00Z
 *                 message:
 *                   type: string
 *                   example: Game disabled successfully
 *       400:
 *         description: Bad request - Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Game not found
 *       500:
 *         description: Internal server error
 */
router.put("/games/status/id", (0, validate_1.validate)(admin_game_management_schema_1.UpdateGameStatusByIdSchema), admin_game_management_controller_1.updateGameStatusById);
/**
 * @openapi
 * /api/admin/games/status/category:
 *   put:
 *     summary: Update game status by category
 *     description: Enable or disable all games in a specific category
 *     tags:
 *       - Game Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - is_active
 *             properties:
 *               category:
 *                 type: string
 *                 minLength: 1
 *                 description: The category of games to update
 *                 example: slots
 *               is_active:
 *                 type: boolean
 *                 description: Whether the games should be active or disabled
 *                 example: false
 *               reason:
 *                 type: string
 *                 description: Reason for the status change (optional)
 *                 example: Category maintenance
 *     responses:
 *       200:
 *         description: Games in category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_count:
 *                       type: integer
 *                       example: 25
 *                     games:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           provider:
 *                             type: string
 *                           category:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                 message:
 *                   type: string
 *                   example: 25 games in category 'slots' disabled successfully
 *       400:
 *         description: Bad request - Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put("/games/status/category", (0, validate_1.validate)(admin_game_management_schema_1.UpdateGameStatusByCategorySchema), admin_game_management_controller_1.updateGameStatusByCategory);
/**
 * @openapi
 * /api/admin/games/status/provider:
 *   put:
 *     summary: Update game status by provider
 *     description: Enable or disable all games from a specific provider
 *     tags:
 *       - Game Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - is_active
 *             properties:
 *               provider:
 *                 type: string
 *                 minLength: 1
 *                 description: The provider of games to update
 *                 example: NetEnt
 *               is_active:
 *                 type: boolean
 *                 description: Whether the games should be active or disabled
 *                 example: false
 *               reason:
 *                 type: string
 *                 description: Reason for the status change (optional)
 *                 example: Provider integration issues
 *     responses:
 *       200:
 *         description: Games from provider updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_count:
 *                       type: integer
 *                       example: 15
 *                     games:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           provider:
 *                             type: string
 *                           category:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                 message:
 *                   type: string
 *                   example: 15 games from provider 'NetEnt' disabled successfully
 *       400:
 *         description: Bad request - Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put("/games/status/provider", (0, validate_1.validate)(admin_game_management_schema_1.UpdateGameStatusByProviderSchema), admin_game_management_controller_1.updateGameStatusByProvider);
/**
 * @openapi
 * /api/admin/games/status/bulk:
 *   put:
 *     summary: Bulk update game status
 *     description: Enable or disable multiple games by their IDs
 *     tags:
 *       - Game Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - game_ids
 *               - is_active
 *             properties:
 *               game_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 1
 *                 minItems: 1
 *                 description: Array of game IDs to update
 *                 example: [1, 2, 3, 4, 5]
 *               is_active:
 *                 type: boolean
 *                 description: Whether the games should be active or disabled
 *                 example: false
 *               reason:
 *                 type: string
 *                 description: Reason for the status change (optional)
 *                 example: Bulk maintenance
 *     responses:
 *       200:
 *         description: Games updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_count:
 *                       type: integer
 *                       example: 5
 *                     games:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           provider:
 *                             type: string
 *                           category:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                 message:
 *                   type: string
 *                   example: 5 games disabled successfully
 *       400:
 *         description: Bad request - Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put("/games/status/bulk", (0, validate_1.validate)(admin_game_management_schema_1.BulkUpdateGameStatusSchema), admin_game_management_controller_1.bulkUpdateGameStatus);
/**
 * @openapi
 * /api/admin/games/status/stats:
 *   get:
 *     summary: Get game status statistics
 *     description: Retrieve comprehensive statistics about game status distribution
 *     tags:
 *       - Game Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Game status statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: object
 *                       properties:
 *                         total_games:
 *                           type: integer
 *                           example: 100
 *                         active_games:
 *                           type: integer
 *                           example: 85
 *                         disabled_games:
 *                           type: integer
 *                           example: 15
 *                         active_percentage:
 *                           type: number
 *                           format: float
 *                           example: 85.0
 *                     by_category:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             example: slots
 *                           total:
 *                             type: integer
 *                             example: 50
 *                           active:
 *                             type: integer
 *                             example: 45
 *                           disabled:
 *                             type: integer
 *                             example: 5
 *                     by_provider:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           provider:
 *                             type: string
 *                             example: NetEnt
 *                           total:
 *                             type: integer
 *                             example: 20
 *                           active:
 *                             type: integer
 *                             example: 18
 *                           disabled:
 *                             type: integer
 *                             example: 2
 *                 message:
 *                   type: string
 *                   example: Game status statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/games/status/stats", admin_game_management_controller_1.getGameStatusStats);
/**
 * @openapi
 * /api/admin/games/status/changes:
 *   get:
 *     summary: Get recent game status changes
 *     description: Retrieve recent audit log of game status changes
 *     tags:
 *       - Game Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of recent changes to return
 *     responses:
 *       200:
 *         description: Recent status changes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       game_id:
 *                         type: integer
 *                         example: 1
 *                       game_name:
 *                         type: string
 *                         example: Book of Dead
 *                       provider:
 *                         type: string
 *                         example: Play'n GO
 *                       category:
 *                         type: string
 *                         example: slots
 *                       action:
 *                         type: string
 *                         enum: [enabled, disabled]
 *                         example: disabled
 *                       reason:
 *                         type: string
 *                         example: Maintenance required
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: 2024-01-15T10:30:00Z
 *                       admin_username:
 *                         type: string
 *                         example: admin
 *                 message:
 *                   type: string
 *                   example: Recent status changes retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/games/status/changes", admin_game_management_controller_1.getRecentStatusChanges);
/**
 * @swagger
 * /api/admin/games:
 *   post:
 *     summary: Create a new game
 *     tags: [Admin Games]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - provider
 *               - category
 *               - game_code
 *             properties:
 *               name:
 *                 type: string
 *               provider:
 *                 type: string
 *               category:
 *                 type: string
 *               subcategory:
 *                 type: string
 *               image_url:
 *                 type: string
 *               game_code:
 *                 type: string
 *               rtp_percentage:
 *                 type: number
 *               volatility:
 *                 type: string
 *                 enum: [low, medium, high]
 *               min_bet:
 *                 type: number
 *               max_bet:
 *                 type: number
 *               max_win:
 *                 type: number
 *               is_featured:
 *                 type: boolean
 *               is_new:
 *                 type: boolean
 *               is_hot:
 *                 type: boolean
 *               is_active:
 *                 type: boolean
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of game features (e.g., Free Spins, Multiplier)
 *               rating:
 *                 type: number
 *                 description: Game rating (0-5, can be set by admin or calculated)
 *               popularity:
 *                 type: number
 *                 description: Popularity percentage (0-100, can be set by admin or calculated)
 *               description:
 *                 type: string
 *                 description: Game description (rich text)
 *     responses:
 *       201:
 *         description: Game created successfully
 */
router.post("/games", (0, validate_1.validate)({ body: admin_schema_1.CreateGameInput }), admin_controller_1.createGame);
/**
 * @swagger
 * /api/admin/games/{id}:
 *   put:
 *     summary: Update a game
 *     tags: [Admin Games]
 *     security:
 *       - BearerAuth: []
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
 *             $ref: '#/components/schemas/UpdateGameInput'
 *     responses:
 *       200:
 *         description: Game updated successfully
 */
router.put("/games/:id", (0, validate_1.validate)({ body: admin_schema_1.UpdateGameInput }), admin_controller_1.updateGame);
/**
 * @swagger
 * /api/admin/games/{id}:
 *   delete:
 *     summary: Delete a game
 *     tags: [Admin Games]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Game deleted successfully
 */
router.delete("/games/:id", admin_controller_1.deleteGame);
// =====================================================
// GAME CATEGORY MANAGEMENT ROUTES
// =====================================================
/**
 * @openapi
 * /api/admin/categories:
 *   post:
 *     summary: Create a new game category
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - display_name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: Unique category name (used in database)
 *                 example: "slots"
 *               display_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Display name for the category
 *                 example: "Slot Games"
 *               description:
 *                 type: string
 *                 description: Category description
 *                 example: "Various slot machine games"
 *               icon_url:
 *                 type: string
 *                 format: uri
 *                 description: URL to category icon
 *                 example: "https://example.com/slots-icon.png"
 *               color:
 *                 type: string
 *                 pattern: "^#[0-9A-F]{6}$"
 *                 description: Hex color code for category
 *                 example: "#FF6B6B"
 *               display_order:
 *                 type: integer
 *                 minimum: 0
 *                 description: Display order for sorting
 *                 example: 1
 *               is_active:
 *                 type: boolean
 *                 description: Whether the category is active
 *                 example: true
 *               parent_category_id:
 *                 type: integer
 *                 description: Parent category ID for subcategories
 *                 example: 1
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post("/categories", (0, validate_1.validate)({ body: admin_category_schema_1.CreateGameCategorySchema }), admin_category_controller_1.createCategory);
/**
 * @openapi
 * /api/admin/categories:
 *   get:
 *     summary: Get all game categories with filtering and pagination
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in category name or display name
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: parent_category_id
 *         schema:
 *           type: integer
 *         description: Filter by parent category ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/categories", (0, validate_1.validate)({ query: admin_category_schema_1.CategoryFiltersSchema }), admin_category_controller_1.getCategories);
/**
 * @openapi
 * /api/admin/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.get("/categories/:id", admin_category_controller_1.getCategoryById);
/**
 * @openapi
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGameCategorySchema'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.put("/categories/:id", (0, validate_1.validate)({ body: admin_category_schema_1.UpdateGameCategorySchema }), admin_category_controller_1.updateCategory);
/**
 * @openapi
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete category
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with games or child categories
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/categories/:id", admin_category_controller_1.deleteCategory);
/**
 * @openapi
 * /api/admin/categories/bulk:
 *   post:
 *     summary: Bulk operations on categories
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_ids
 *               - operation
 *             properties:
 *               category_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 minItems: 1
 *                 description: Array of category IDs
 *                 example: [1, 2, 3]
 *               operation:
 *                 type: string
 *                 enum: [activate, deactivate, delete]
 *                 description: Operation to perform
 *                 example: "activate"
 *               reason:
 *                 type: string
 *                 description: Reason for the operation
 *                 example: "Bulk activation"
 *     responses:
 *       200:
 *         description: Bulk operation completed
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post("/categories/bulk", (0, validate_1.validate)({ body: admin_category_schema_1.BulkCategoryOperationSchema }), admin_category_controller_1.bulkCategoryOperation);
/**
 * @openapi
 * /api/admin/categories/stats:
 *   get:
 *     summary: Get category statistics
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: include_inactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive categories
 *     responses:
 *       200:
 *         description: Category statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/categories/stats", (0, validate_1.validate)({ query: admin_category_schema_1.CategoryStatsFiltersSchema }), admin_category_controller_1.getCategoryStats);
/**
 * @openapi
 * /api/admin/categories/hierarchy:
 *   get:
 *     summary: Get category hierarchy
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category hierarchy retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/categories/hierarchy", admin_category_controller_1.getCategoryHierarchy);
/**
 * @openapi
 * /api/admin/categories/migrate:
 *   post:
 *     summary: Migrate existing game categories to new structure
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Migration completed successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/categories/migrate", admin_category_controller_1.migrateExistingCategories);
/**
 * @openapi
 * /api/admin/categories/{id}/games:
 *   get:
 *     summary: Get games in a specific category
 *     tags: [Admin Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Games in category retrieved successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.get("/categories/:id/games", admin_category_controller_1.getGamesInCategory);
// =====================================================
// USER ROLE MANAGEMENT ROUTES
// =====================================================
// DEPRECATED: Roles management moved to /src/routes/role.routes.ts
// Using dedicated roleController with user_count and proper structure
/*
router.get("/roles", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM roles ORDER BY id");
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});
*/
// DEPRECATED: POST /roles moved to role.routes.ts
/*
router.post("/roles", async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Name and description are required"
      });
    }

    const result = await pool.query(
      "INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING *",
      [name, description, permissions ? JSON.stringify(permissions) : null]
    );

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      res.status(409).json({
        success: false,
        message: "Role name already exists"
      });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});
*/
// DEPRECATED: PUT and DELETE /roles moved to role.routes.ts
/*
router.put("/roles/:id", async (req, res) => { ... });
router.delete("/roles/:id", async (req, res) => { ... });
*/
/**
 * @swagger
 * /api/admin/users/search:
 *   get:
 *     summary: Search users by username, email, or ID
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query (username, email, or user ID)
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get("/users/search", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin", "Manager", "Support"]), async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                success: false,
                error: "Search query is required"
            });
        }
        const searchQuery = query.trim();
        // Import pool at the top if not already imported
        const pool = require('../db/postgres').default;
        // Check if it's a numeric ID search
        const isNumericSearch = /^\d+$/.test(searchQuery);
        let sqlQuery = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.status_id,
        s.name as status,
        u.created_at,
        up.avatar_url,
        ub.balance,
        up.currency,
        u.kyc_status,
        vt.name as vip_tier,
        vt.level as vip_level
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      LEFT JOIN statuses s ON u.status_id = s.id
      LEFT JOIN user_vip_status uvs ON u.id = uvs.user_id
      LEFT JOIN vip_tiers vt ON uvs.current_tier_id = vt.id
      WHERE
    `;
        let params = [];
        if (isNumericSearch) {
            // Search by exact ID
            sqlQuery += ` u.id = $1`;
            params = [parseInt(searchQuery)];
        }
        else {
            // Search by username or email (case-insensitive, partial match)
            sqlQuery += ` (LOWER(u.username) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))`;
            params = [`%${searchQuery}%`];
        }
        sqlQuery += ` ORDER BY u.created_at DESC LIMIT 50`;
        const result = await pool.query(sqlQuery, params);
        return res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error("Error searching users:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to search users",
            details: error.message
        });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/roles:
 *   get:
 *     summary: Get user roles
 *     tags: [Admin User Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User roles retrieved successfully
 */
router.get("/users/:id/roles", async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }
        const result = await postgres_1.default.query(`SELECT r.id, r.name, r.description, r.permissions, ur.created_at as assigned_at
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1
       ORDER BY r.id`, [userId]);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/roles:
 *   post:
 *     summary: Assign role to user
 *     tags: [Admin User Roles]
 *     security:
 *       - BearerAuth: []
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
 *               - role_id
 *             properties:
 *               role_id:
 *                 type: integer
 *                 description: Role ID to assign
 *     responses:
 *       201:
 *         description: Role assigned successfully
 */
router.post("/users/:id/roles", async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role_id } = req.body;
        if (isNaN(userId) || !role_id) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID or role ID"
            });
        }
        // Check if user exists
        const userCheck = await postgres_1.default.query("SELECT id FROM users WHERE id = $1", [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        // Check if role exists and get role name
        const roleCheck = await postgres_1.default.query("SELECT id, name FROM roles WHERE id = $1", [role_id]);
        if (roleCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }
        const roleName = roleCheck.rows[0].name;
        // Check if user already has this exact role
        const existingCheck = await postgres_1.default.query("SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2", [userId, role_id]);
        if (existingCheck.rows.length > 0) {
            return res.status(200).json({
                success: true,
                message: "User already has this role",
                data: {
                    user_id: userId,
                    role_id: role_id,
                    role_name: roleName
                }
            });
        }
        // Delete all existing roles for this user
        await postgres_1.default.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
        // Insert the new role
        const result = await postgres_1.default.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) RETURNING *", [userId, role_id]);
        res.status(201).json({
            success: true,
            message: "Previous roles removed and new role assigned successfully",
            data: {
                ...result.rows[0],
                role_name: roleName
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/roles/{roleId}:
 *   delete:
 *     summary: Remove role from user
 *     tags: [Admin User Roles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role removed successfully
 */
router.delete("/users/:id/roles/:roleId", async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const roleId = parseInt(req.params.roleId);
        if (isNaN(userId) || isNaN(roleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID or role ID"
            });
        }
        const result = await postgres_1.default.query("DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *", [userId, roleId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User role assignment not found"
            });
        }
        res.json({
            success: true,
            message: "Role removed successfully",
            data: result.rows[0]
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/password:
 *   put:
 *     summary: Change user password (Admin)
 *     tags: [Admin User Management]
 *     security:
 *       - BearerAuth: []
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
 *               - new_password
 *             properties:
 *               new_password:
 *                 type: string
 *                 description: New password for the user
 *               reason:
 *                 type: string
 *                 description: Reason for password change
 *               force_password_change:
 *                 type: boolean
 *                 description: Force user to change password on next login
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.put("/users/:id/password", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { new_password, reason, force_password_change } = req.body;
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }
        if (!new_password || new_password.length < 4) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 4 characters"
            });
        }
        // Check if user exists
        const userCheck = await postgres_1.default.query("SELECT id, username FROM users WHERE id = $1", [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        // Hash the new password
        const hashedPassword = await bcrypt_1.default.hash(new_password, 10);
        // Update password
        await postgres_1.default.query("UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [hashedPassword, userId]);
        // Log the password change (optional - if you have an audit log table)
        // You can add audit logging here if needed
        res.status(200).json({
            success: true,
            message: "Password changed successfully",
            data: {
                user_id: userId,
                username: userCheck.rows[0].username,
                changed_by: req.user?.id || 'admin',
                reason: reason || 'Password changed by admin',
                force_password_change: force_password_change || false
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// =====================================================
// USER MANAGEMENT ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users for admin
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: verification_level
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       username:
 *                         type: string
 *                         example: johndoe
 *                       email:
 *                         type: string
 *                         example: johndoe@example.com
 *                       registration_date:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-01T12:00:00Z"
 *                       status_name:
 *                         type: string
 *                         example: Active
 *                       first_name:
 *                         type: string
 *                         example: John
 *                       last_name:
 *                         type: string
 *                         example: Doe
 *                       phone_number:
 *                         type: string
 *                         example: "+1234567890"
 *                       date_of_birth:
 *                         type: string
 *                         format: date
 *                         example: "1990-01-01"
 *                       nationality:
 *                         type: string
 *                         example: "US"
 *                       country:
 *                         type: string
 *                         example: "US"
 *                       city:
 *                         type: string
 *                         example: "New York"
 *                       address:
 *                         type: string
 *                         example: "123 Main St"
 *                       postal_code:
 *                         type: string
 *                         example: "10001"
 *                       gender:
 *                         type: string
 *                         example: "male"
 *                       timezone:
 *                         type: string
 *                         example: "America/New_York"
 *                       language:
 *                         type: string
 *                         example: "en"
 *                       currency:
 *                         type: string
 *                         example: "USD"
 *                       verification_level:
 *                         type: integer
 *                         example: 2
 *                       is_verified:
 *                         type: boolean
 *                         example: true
 *                       avatar_url:
 *                         type: string
 *                         example: "https://example.com/avatar.jpg"
 *                       role_name:
 *                         type: string
 *                         example: "Player"
 *                       role_description:
 *                         type: string
 *                         example: "Regular player account"
 *                       level_name:
 *                         type: string
 *                         example: "Silver"
 *                       current_points:
 *                         type: integer
 *                         example: 2500
 *                       total_points_earned:
 *                         type: integer
 *                         example: 5000
 *                       cashback_percentage:
 *                         type: number
 *                         example: 2.5
 *                       withdrawal_limit:
 *                         type: number
 *                         example: 10000
 *                       kyc_documents_count:
 *                         type: integer
 *                         example: 3
 *                       kyc_approved_count:
 *                         type: integer
 *                         example: 2
 *                       last_login:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-02-01T10:00:00Z"
 *                       last_session_activity:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-02-01T11:00:00Z"
 *                       balance:
 *                         type: number
 *                         format: float
 *                         example: 150.50
 *                       total_deposited:
 *                         type: number
 *                         format: float
 *                         example: 2000.00
 *                       total_withdrawn:
 *                         type: number
 *                         format: float
 *                         example: 500.00
 *                       total_bets:
 *                         type: integer
 *                         example: 50
 *                       total_wagered:
 *                         type: number
 *                         format: float
 *                         example: 1250.75
 *                       total_won:
 *                         type: number
 *                         format: float
 *                         example: 1350.25
 *             examples:
 *               user:
 *                 summary: Example user
 *                 value:
 *                   id: 1
 *                   username: johndoe
 *                   email: johndoe@example.com
 *                   registration_date: "2024-01-01T12:00:00Z"
 *                   status_name: Active
 *                   first_name: John
 *                   last_name: Doe
 *                   phone_number: "+1234567890"
 *                   date_of_birth: "1990-01-01"
 *                   nationality: US
 *                   country: US
 *                   city: New York
 *                   address: "123 Main St"
 *                   postal_code: "10001"
 *                   gender: male
 *                   timezone: America/New_York
 *                   language: en
 *                   currency: USD
 *                   verification_level: 2
 *                   is_verified: true
 *                   avatar_url: "https://example.com/avatar.jpg"
 *                   role_name: Player
 *                   role_description: Regular player account
 *                   level_name: Silver
 *                   current_points: 2500
 *                   total_points_earned: 5000
 *                   cashback_percentage: 2.5
 *                   withdrawal_limit: 10000
 *                   kyc_documents_count: 3
 *                   kyc_approved_count: 2
 *                   last_login: "2024-02-01T10:00:00Z"
 *                   last_session_activity: "2024-02-01T11:00:00Z"
 *                   balance: 150.50
 *                   total_deposited: 2000.00
 *                   total_withdrawn: 500.00
 *                   total_bets: 50
 *                   total_wagered: 1250.75
 *                   total_won: 1350.25
 */
router.get("/users", admin_controller_1.getUsersForAdmin);
/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - type
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 5
 *                 example: demo_af
 *               email:
 *                 type: string
 *                 format: email
 *                 example: demo_af@gmail.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: secret123
 *               type:
 *                 type: string
 *                 minLength: 3
 *                 description: Role type (e.g., Player, Admin, Support, Manager, etc.)
 *                 example: Manager
 *               first_name:
 *                 type: string
 *                 example: demo
 *               last_name:
 *                 type: string
 *                 example: af
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               country:
 *                 type: string
 *                 example: US
 *               timezone:
 *                 type: string
 *                 example: America/New_York
 *               is_active:
 *                 type: boolean
 *                 default: true
 *               send_welcome_email:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User created successfully by admin
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: integer
 *                       example: 123
 *                     username:
 *                       type: string
 *                       example: demo_af
 *                     email:
 *                       type: string
 *                       example: demo_af@gmail.com
 *                     type:
 *                       type: string
 *                       example: Manager
 *                     qr_code:
 *                       type: string
 *                       description: SVG QR code for 2FA setup
 *                     auth_secret:
 *                       type: string
 *                       description: Secret key for 2FA setup
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post("/users", (0, validate_1.validate)({ body: admin_schema_2.AdminCreateUserInput }), admin_controller_3.createUser);
/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   put:
 *     summary: Update user status
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Suspended, Banned]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.put("/users/:id/status", (0, validate_1.validate)({ body: admin_schema_1.UpdateUserStatusInput }), admin_controller_1.updateUserStatus);
/**
 * @swagger
 * /api/admin/users/{id}/balance:
 *   put:
 *     summary: Update user balance
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
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
 *               - amount
 *               - type
 *             properties:
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [deposit, withdrawal, adjustment]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User balance updated successfully
 */
router.put("/users/:id/balance", (0, validate_1.validate)({ body: admin_schema_1.UpdateUserBalanceInput }), admin_controller_1.updateUserBalance);
/**
 * @swagger
 * /api/admin/users/{id}/disable:
 *   post:
 *     summary: Disable user account
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for disabling the user
 *     responses:
 *       200:
 *         description: User disabled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/users/:id/disable", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const statusData = {
            status: "Suspended",
            reason: req.body.reason || "Account disabled by admin"
        };
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        res.status(200).json({
            success: true,
            data: user,
            message: "User disabled successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/enable:
 *   post:
 *     summary: Enable user account
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for enabling the user
 *     responses:
 *       200:
 *         description: User enabled successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/users/:id/enable", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const statusData = {
            status: "Active",
            reason: req.body.reason || "Account enabled by admin"
        };
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        res.status(200).json({
            success: true,
            data: user,
            message: "User enabled successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/activate:
 *   post:
 *     summary: Activate user account
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for activating the user
 *     responses:
 *       200:
 *         description: User activated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/users/:id/activate", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const statusData = {
            status: "Active",
            reason: req.body.reason || "Account activated by admin"
        };
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        res.status(200).json({
            success: true,
            data: user,
            message: "User activated successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/deactivate:
 *   post:
 *     summary: Deactivate user account
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for deactivating the user
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/users/:id/deactivate", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const statusData = {
            status: "Inactive",
            reason: req.body.reason || "Account deactivated by admin"
        };
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        res.status(200).json({
            success: true,
            data: user,
            message: "User deactivated successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/suspend:
 *   post:
 *     summary: Suspend user account
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for suspending the user
 *     responses:
 *       200:
 *         description: User suspended successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/users/:id/suspend", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const statusData = {
            status: "Suspended",
            reason: req.body.reason || "Account suspended by admin"
        };
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        res.status(200).json({
            success: true,
            data: user,
            message: "User suspended successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/ban:
 *   post:
 *     summary: Ban user account
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for banning the user
 *     responses:
 *       200:
 *         description: User banned successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/users/:id/ban", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const statusData = {
            status: "Banned",
            reason: req.body.reason || "Account banned by admin"
        };
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        res.status(200).json({
            success: true,
            data: user,
            message: "User banned successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/affiliates:
 *   get:
 *     summary: Get all affiliates
 *     tags: [Admin Affiliates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, Pending]
 *         description: Filter by affiliate status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by affiliate name or code
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Affiliates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "John's Affiliate"
 *                       code:
 *                         type: string
 *                         example: "JOHN123"
 *                       email:
 *                         type: string
 *                         example: "john@affiliate.com"
 *                       status:
 *                         type: string
 *                         example: "Active"
 *                       commission_rate:
 *                         type: number
 *                         example: 0.15
 *                       total_referrals:
 *                         type: integer
 *                         example: 25
 *                       total_earnings:
 *                         type: number
 *                         example: 1250.50
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-01T12:00:00Z"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total_pages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/affiliates", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        // For now, return empty array since affiliates table doesn't exist yet
        // This can be expanded when affiliate system is implemented
        res.status(200).json({
            success: true,
            data: [],
            pagination: {
                total: 0,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                total_pages: 0
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/topup:
 *   post:
 *     summary: Top up a user's main balance (creates a deposit transaction)
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000
 *               description:
 *                 type: string
 *                 example: Admin top-up
 *     responses:
 *       200:
 *         description: Top-up successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction_id:
 *                       type: integer
 *                     new_balance:
 *                       type: number
 *                       format: float
 *                       example: 120.50
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 */
router.post("/users/:id/topup", async (req, res) => {
    const userId = parseInt(req.params.id);
    const { amount, description } = req.body;
    if (!userId || !amount || isNaN(amount)) {
        return res.status(400).json({ success: false, message: "Invalid user ID or amount" });
    }
    try {
        const { MongoHybridService } = require("../services/mongo/mongo-hybrid.service");
        const mongoHybridService = new MongoHybridService();
        const result = await mongoHybridService.adminTopup(userId, amount, description || 'Admin top-up');
        res.json({
            success: true,
            data: {
                transaction_id: result.transaction_id,
                new_balance: result.new_balance
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// =====================================================
// PROVIDER MANAGEMENT ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/providers:
 *   post:
 *     summary: Add a new game supplier/provider
 *     tags: [Admin Providers]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_name
 *               - api_key
 *               - base_url
 *             properties:
 *               provider_name:
 *                 type: string
 *                 example: thinkcode_stg
 *               api_key:
 *                 type: string
 *                 example: thinkcode_stg
 *               api_secret:
 *                 type: string
 *                 example: 2xk3SrX09oQ71Z3F
 *               base_url:
 *                 type: string
 *                 example: https://staging-wallet.semper7.net/api/generic/games/list/all
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               metadata:
 *                 type: object
 *                 example: {"callback_url": "http://https://backend.jackpotx.net/api/innova/"}
 *     responses:
 *       201:
 *         description: Provider created successfully
 */
router.post("/providers", admin_controller_2.createProvider);
/**
 * @swagger
 * /api/admin/providers/{id}:
 *   put:
 *     summary: Update a game supplier/provider
 *     tags: [Admin Providers]
 *     security:
 *       - BearerAuth: []
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
 *             properties:
 *               provider_name:
 *                 type: string
 *               api_key:
 *                 type: string
 *               api_secret:
 *                 type: string
 *               base_url:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Provider updated successfully
 */
router.put("/providers/:id", admin_controller_2.updateProvider);
/**
 * @swagger
 * /api/admin/providers:
 *   get:
 *     summary: List all game suppliers/providers
 *     tags: [Admin Providers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Providers listed successfully
 */
router.get("/providers", admin_controller_2.getProviders);
/**
 * @swagger
 * /api/admin/providers/{id}/activate:
 *   patch:
 *     summary: Activate or deactivate a supplier/provider
 *     tags: [Admin Providers]
 *     security:
 *       - BearerAuth: []
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
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Provider activation status updated
 */
router.patch("/providers/:id/activate", admin_controller_2.activateProvider);
// =====================================================
// TRANSACTION MANAGEMENT ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/transactions:
 *   get:
 *     summary: Get all transactions for admin
 *     tags: [Admin Transactions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, bet, win, bonus]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 */
router.get("/transactions", admin_controller_2.getTransactions);
/**
 * @swagger
 * /api/admin/transactions/{id}/approve:
 *   put:
 *     summary: Approve or reject a transaction
 *     tags: [Admin Transactions]
 *     security:
 *       - BearerAuth: []
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [completed, failed, cancelled]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction status updated successfully
 */
router.put("/transactions/:id/approve", admin_controller_2.approveTransaction);
// =====================================================
// SETTINGS ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get system settings
 *     tags: [Admin Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 */
router.get("/settings", admin_controller_2.getSystemSettings);
/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Update system settings
 *     tags: [Admin Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               site_name:
 *                 type: string
 *               maintenance_mode:
 *                 type: boolean
 *               default_currency:
 *                 type: string
 *               min_deposit:
 *                 type: number
 *               max_deposit:
 *                 type: number
 *               auto_approval_limit:
 *                 type: number
 *               kyc_required:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put("/settings", admin_controller_2.updateSystemSettings);
// =====================================================
// ANALYTICS ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     tags: [Admin Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 */
router.get("/analytics/revenue", admin_controller_2.getRevenueAnalytics);
/**
 * @swagger
 * /api/admin/analytics/users:
 *   get:
 *     summary: Get user analytics
 *     tags: [Admin Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User analytics retrieved successfully
 */
router.get("/analytics/users", admin_controller_2.getUserAnalytics);
const gameImportService = new admin_game_import_service_1.AdminGameImportService();
/**
 * @openapi
 * /api/admin/game-provider:
 *   post:
 *     summary: Add or update a game provider configuration
 *     tags: [Admin Game Import]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddProviderConfigSchema'
 *     responses:
 *       200:
 *         description: Provider configuration added/updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/game-provider", authenticate_1.authenticate, adminAuth, (0, validate_1.validate)({ body: admin_game_import_schema_1.AddProviderConfigSchema }), async (req, res) => {
    const result = await gameImportService.addProviderConfig(req.body);
    res.json({ success: true, data: result });
});
/**
 * @openapi
 * /api/admin/import-games:
 *   post:
 *     summary: Import games by category from provider
 *     tags: [Admin Game Import]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ImportGamesByCategorySchema'
 *     responses:
 *       200:
 *         description: Games imported successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/import-games", authenticate_1.authenticate, adminAuth, (0, validate_1.validate)({ body: admin_game_import_schema_1.ImportGamesByCategorySchema }), async (req, res) => {
    const result = await gameImportService.importGamesByCategory(req.body);
    res.json(result);
});
/**
 * @openapi
 * /api/admin/import-game:
 *   post:
 *     summary: Import a single game by ID from provider
 *     tags: [Admin Game Import]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ImportGameByIdSchema'
 *     responses:
 *       200:
 *         description: Game imported successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/import-game", authenticate_1.authenticate, adminAuth, (0, validate_1.validate)({ body: admin_game_import_schema_1.ImportGameByIdSchema }), async (req, res) => {
    const result = await gameImportService.importGameById(req.body);
    res.json(result);
});
/**
 * @openapi
 * /api/admin/game-import/status:
 *   get:
 *     summary: Get game import statistics
 *     tags: [Admin Game Import]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Import statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/game-import/status", authenticate_1.authenticate, adminAuth, async (req, res) => {
    const stats = await gameImportService.getImportStatistics();
    res.json({ success: true, data: stats });
});
/**
 * @openapi
 * /api/admin/import-all-games:
 *   post:
 *     summary: Import all games from provider (all categories)
 *     tags: [Admin Game Import]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_name
 *             properties:
 *               provider_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: All games imported successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/import-all-games", authenticate_1.authenticate, adminAuth, async (req, res) => {
    try {
        const { provider_name, debug } = req.body;
        if (!provider_name) {
            return res.status(400).json({ success: false, message: "provider_name is required" });
        }
        const result = await new admin_game_import_service_1.AdminGameImportService().importAllGamesByProvider(provider_name, !!debug);
        res.json(result);
    }
    catch (error) {
        console.error('[RouteError]', typeof error, error && error.message, error);
        res.status(500).json({ success: false, message: error && error.message ? error.message : 'Route error' });
    }
});
// =====================================================
// PAYMENT GATEWAY MANAGEMENT ROUTES
// =====================================================
/**
 * @openapi
 * /api/admin/payment-gateways:
 *   post:
 *     summary: Create a new payment gateway
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Display name of the payment gateway
 *               code:
 *                 type: string
 *                 description: Unique code for the gateway
 *               type:
 *                 type: string
 *                 enum: [deposit, withdrawal, both]
 *                 description: Type of transactions supported
 *               description:
 *                 type: string
 *                 description: Description of the payment gateway
 *               logo_url:
 *                 type: string
 *                 format: uri
 *                 description: URL to the gateway logo
 *               website_url:
 *                 type: string
 *                 format: uri
 *                 description: Gateway website URL
 *               api_endpoint:
 *                 type: string
 *                 format: uri
 *                 description: API endpoint for the gateway
 *               api_key:
 *                 type: string
 *                 description: API key for authentication
 *               api_secret:
 *                 type: string
 *                 description: API secret for authentication
 *               webhook_url:
 *                 type: string
 *                 format: uri
 *                 description: Webhook URL for notifications
 *               webhook_secret:
 *                 type: string
 *                 description: Secret for webhook verification
 *               is_active:
 *                 type: boolean
 *                 description: Whether the gateway is active
 *               supported_currencies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Supported currencies
 *               supported_countries:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Supported countries
 *               min_amount:
 *                 type: number
 *                 description: Minimum transaction amount
 *               max_amount:
 *                 type: number
 *                 description: Maximum transaction amount
 *               processing_time:
 *                 type: string
 *                 description: Expected processing time
 *               fees_percentage:
 *                 type: number
 *                 description: Percentage fee
 *               fees_fixed:
 *                 type: number
 *                 description: Fixed fee amount
 *               auto_approval:
 *                 type: boolean
 *                 description: Whether transactions are auto-approved
 *               requires_kyc:
 *                 type: boolean
 *                 description: Whether KYC is required
 *               config:
 *                 type: object
 *                 description: Additional configuration
 *     responses:
 *       201:
 *         description: Payment gateway created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Gateway code already exists
 */
router.post("/payment-gateways", (0, validate_1.validate)({ body: admin_schema_1.CreatePaymentGatewayInput }), async (req, res) => {
    try {
        const gatewayData = req.validated?.body;
        const gateway = await (0, payment_gateway_service_1.createPaymentGatewayService)(gatewayData);
        res.status(201).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways:
 *   get:
 *     summary: Get all payment gateways with filtering
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, both]
 *         description: Filter by transaction type
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: supported_currency
 *         schema:
 *           type: string
 *         description: Filter by supported currency
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or code
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Payment gateways retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-gateways", (0, validate_1.validate)({ query: admin_schema_1.PaymentGatewayFiltersInput }), async (req, res) => {
    try {
        const filters = req.query;
        const gateways = await (0, payment_gateway_service_1.getPaymentGatewaysService)(filters);
        res.status(200).json({ success: true, data: gateways });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}:
 *   get:
 *     summary: Get payment gateway by ID
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *     responses:
 *       200:
 *         description: Payment gateway retrieved successfully
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-gateways/:id", async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gateway = await (0, payment_gateway_service_1.getPaymentGatewayByIdService)(gatewayId);
        if (!gateway) {
            res.status(404).json({ success: false, message: "Payment gateway not found" });
            return;
        }
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}:
 *   put:
 *     summary: Update payment gateway
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePaymentGatewayInput'
 *     responses:
 *       200:
 *         description: Payment gateway updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.put("/payment-gateways/:id", (0, validate_1.validate)({ body: admin_schema_1.UpdatePaymentGatewayInput }), async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gatewayData = req.validated?.body;
        const gateway = await (0, payment_gateway_service_1.updatePaymentGatewayService)(gatewayId, gatewayData);
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}:
 *   delete:
 *     summary: Delete payment gateway
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *     responses:
 *       200:
 *         description: Payment gateway deleted successfully
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/payment-gateways/:id", async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const gateway = await (0, payment_gateway_service_1.deletePaymentGatewayService)(gatewayId);
        if (!gateway) {
            res.status(404).json({ success: false, message: "Payment gateway not found" });
            return;
        }
        res.status(200).json({ success: true, data: gateway });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/active:
 *   get:
 *     summary: Get active payment gateways for specific type and currency
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, both]
 *         description: Transaction type
 *       - in: query
 *         name: currency
 *         required: true
 *         schema:
 *           type: string
 *         description: Currency code
 *     responses:
 *       200:
 *         description: Active payment gateways retrieved successfully
 *       400:
 *         description: Type and currency are required
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-gateways/active", async (req, res) => {
    try {
        const { type, currency } = req.query;
        if (!type || !currency) {
            res.status(400).json({ success: false, message: "Type and currency are required" });
            return;
        }
        const gateways = await (0, payment_gateway_service_1.getActivePaymentGatewaysService)(type, currency);
        res.status(200).json({ success: true, data: gateways });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}/test:
 *   post:
 *     summary: Test payment gateway connection
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *     responses:
 *       200:
 *         description: Connection test completed
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.post("/payment-gateways/:id/test", async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const result = await (0, payment_gateway_service_1.testPaymentGatewayConnectionService)(gatewayId);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @openapi
 * /api/admin/payment-gateways/{id}/stats:
 *   get:
 *     summary: Get payment gateway statistics
 *     tags:
 *       - Payment Gateways
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment gateway ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       404:
 *         description: Payment gateway not found
 *       401:
 *         description: Unauthorized
 */
router.get("/payment-gateways/:id/stats", async (req, res) => {
    try {
        const gatewayId = parseInt(req.params.id);
        if (isNaN(gatewayId)) {
            res.status(400).json({ success: false, message: "Invalid gateway ID" });
            return;
        }
        const { start_date, end_date } = req.query;
        const stats = await (0, payment_gateway_service_1.getPaymentGatewayStatsService)(gatewayId, start_date, end_date);
        res.status(200).json({ success: true, data: stats });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GGR Filter Settings
/**
 * @swagger
 * /api/admin/ggr-filter:
 *   get:
 *     summary: Get current GGR filter settings
 *     tags: [Admin GGR]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current GGR filter settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     filter_percent:
 *                       type: number
 *                     tolerance:
 *                       type: number
 */
router.get("/ggr-filter", async (req, res) => {
    try {
        const settings = await (0, ggr_filter_service_1.getSettings)();
        res.status(200).json({ success: true, data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/ggr-filter:
 *   put:
 *     summary: Update GGR filter settings
 *     tags: [Admin GGR]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filter_percent
 *               - tolerance
 *             properties:
 *               filter_percent:
 *                 type: number
 *                 example: 0.5
 *               tolerance:
 *                 type: number
 *                 example: 0.05
 *     responses:
 *       200:
 *         description: Updated GGR filter settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     filter_percent:
 *                       type: number
 *                     tolerance:
 *                       type: number
 */
router.put("/ggr-filter", async (req, res) => {
    try {
        const { filter_percent, tolerance } = req.body;
        if (typeof filter_percent !== "number" || typeof tolerance !== "number") {
            res.status(400).json({ success: false, message: "filter_percent and tolerance must be numbers" });
            return;
        }
        const settings = await (0, ggr_filter_service_1.updateSettings)(filter_percent, tolerance);
        res.status(200).json({ success: true, data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GGR Audit Logs
/**
 * @swagger
 * /api/admin/ggr-audit-logs:
 *   get:
 *     summary: Get GGR audit logs
 *     tags: [Admin GGR]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of GGR audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       real_ggr:
 *                         type: number
 *                       reported_ggr:
 *                         type: number
 *                       filter_percent:
 *                         type: number
 *                       tolerance:
 *                         type: number
 *                       report_data:
 *                         type: object
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 */
router.get("/ggr-audit-logs", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const logs = await (0, ggr_filter_service_1.getAuditLogs)(limit, offset);
        res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GGR Report Summary
/**
 * @swagger
 * /api/admin/ggr-report-summary:
 *   get:
 *     summary: Get GGR report summary
 *     tags: [Admin GGR]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date YYYY-MM-DD
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date YYYY-MM-DD
 *     responses:
 *       200:
 *         description: GGR report summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                     total_real_ggr:
 *                       type: number
 *                     total_reported_ggr:
 *                       type: number
 *                     avg_filter_percent:
 *                       type: number
 *                     avg_tolerance:
 *                       type: number
 */
router.get("/ggr-report-summary", async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const summary = await (0, ggr_filter_service_1.getGGRReportSummary)(startDate, endDate);
        res.status(200).json({ success: true, data: summary });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// =====================================================
// MODULES MANAGEMENT ROUTES
// =====================================================
/**
 * @openapi
 * /api/admin/modules:
 *   get:
 *     summary: Get all modules with filtering and pagination
 *     tags:
 *       - Admin Modules
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: integer
 *         description: Filter by parent module ID
 *       - in: query
 *         name: menuName
 *         schema:
 *           type: string
 *         description: Filter by menu name
 *       - in: query
 *         name: hierarchical
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Return menu/submenu structure (true) or flat list (false)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of modules to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of modules to skip
 *     responses:
 *       200:
 *         description: Modules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       menu:
 *                         type: object
 *                         description: Main menu item
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           title:
 *                             type: string
 *                             example: "Casino"
 *                           subtitle:
 *                             type: string
 *                             example: "Casino"
 *                           path:
 *                             type: string
 *                             example: ""
 *                           icons:
 *                             type: string
 *                             example: "<Shuffle />"
 *                           newtab:
 *                             type: boolean
 *                             example: false
 *                           menuName:
 *                             type: string
 *                             example: "sidebar"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                       submenu:
 *                         type: array
 *                         description: Submenu items (when hierarchical=true)
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 2
 *                             title:
 *                               type: string
 *                               example: "Top Picks"
 *                             subtitle:
 *                               type: string
 *                               example: "TopPicks"
 *                             path:
 *                               type: string
 *                               example: "/toppicks"
 *                             icons:
 *                               type: string
 *                               example: "<LayoutDashboard />"
 *                             newtab:
 *                               type: boolean
 *                               example: false
 *                             parentId:
 *                               type: integer
 *                               example: 1
 *                             menuName:
 *                               type: string
 *                               example: "sidebar"
 *                             created_at:
 *                               type: string
 *                               format: date-time
 *                             updated_at:
 *                               type: string
 *                               format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 4
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     hasMore:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/modules", (0, validate_1.validate)({ query: modules_schema_1.ModuleQuerySchema }), modules_controller_1.getAllModules);
/**
 * @openapi
 * /api/admin/modules/hierarchy:
 *   get:
 *     summary: Get modules in hierarchical structure (parent-child relationships)
 *     tags:
 *       - Admin Modules
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Module hierarchy retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Casino"
 *                       subtitle:
 *                         type: string
 *                         example: "Casino"
 *                       path:
 *                         type: string
 *                         example: ""
 *                       icons:
 *                         type: string
 *                         example: "<Shuffle />"
 *                       newtab:
 *                         type: boolean
 *                         example: false
 *                       parentId:
 *                         type: integer
 *                         nullable: true
 *                         example: null
 *                       menuName:
 *                         type: string
 *                         example: "sidebar"
 *                       children:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 2
 *                             title:
 *                               type: string
 *                               example: "Top Picks"
 *                             subtitle:
 *                               type: string
 *                               example: "TopPicks"
 *                             path:
 *                               type: string
 *                               example: "/toppicks"
 *                             icons:
 *                               type: string
 *                               example: "<LayoutDashboard />"
 *                             newtab:
 *                               type: boolean
 *                               example: false
 *                             parentId:
 *                               type: integer
 *                               example: 1
 *                             menuName:
 *                               type: string
 *                               example: "sidebar"
 *                             children:
 *                               type: array
 *                               items:
 *                                 type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/modules/hierarchy", modules_controller_1.getModuleHierarchy);
/**
 * @openapi
 * /api/admin/modules/{id}:
 *   get:
 *     summary: Get module by ID
 *     tags:
 *       - Admin Modules
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "Casino"
 *                     subtitle:
 *                       type: string
 *                       example: "Casino"
 *                     path:
 *                       type: string
 *                       example: ""
 *                     icons:
 *                       type: string
 *                       example: "<Shuffle />"
 *                     newtab:
 *                       type: boolean
 *                       example: false
 *                     parentId:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     menuName:
 *                       type: string
 *                       example: "sidebar"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
router.get("/modules/:id", modules_controller_1.getModuleById);
/**
 * @openapi
 * /api/admin/modules:
 *   post:
 *     summary: Create a new module
 *     tags:
 *       - Admin Modules
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - menuName
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Module title
 *                 example: "New Module"
 *               subtitle:
 *                 type: string
 *                 description: Module subtitle
 *                 example: "NewSubtitle"
 *               path:
 *                 type: string
 *                 description: Module path/route
 *                 example: "/new-module"
 *               icons:
 *                 type: string
 *                 description: Icon component or class
 *                 example: "<NewIcon />"
 *               newtab:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to open in new tab
 *                 example: false
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *                 description: Parent module ID for sub-modules
 *                 example: 1
 *               menuName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Menu name (e.g., sidebar, header)
 *                 example: "sidebar"
 *           examples:
 *             parent_module:
 *               summary: Create parent module
 *               value:
 *                 title: "Sports"
 *                 subtitle: "Sports"
 *                 path: ""
 *                 icons: "<Trophy />"
 *                 newtab: false
 *                 menuName: "sidebar"
 *             child_module:
 *               summary: Create child module
 *               value:
 *                 title: "Football"
 *                 subtitle: "Football"
 *                 path: "/football"
 *                 icons: "<Football />"
 *                 newtab: false
 *                 parentId: 1
 *                 menuName: "sidebar"
 *     responses:
 *       201:
 *         description: Module created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Module created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     title:
 *                       type: string
 *                       example: "New Module"
 *                     subtitle:
 *                       type: string
 *                       example: "NewSubtitle"
 *                     path:
 *                       type: string
 *                       example: "/new-module"
 *                     icons:
 *                       type: string
 *                       example: "<NewIcon />"
 *                     newtab:
 *                       type: boolean
 *                       example: false
 *                     parentId:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     menuName:
 *                       type: string
 *                       example: "sidebar"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Parent module not found"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/modules", (0, validate_1.validate)({ body: modules_schema_1.CreateModuleSchema }), modules_controller_1.createModule);
/**
 * @openapi
 * /api/admin/modules/{id}:
 *   put:
 *     summary: Update a module
 *     tags:
 *       - Admin Modules
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Module title
 *                 example: "Updated Module"
 *               subtitle:
 *                 type: string
 *                 description: Module subtitle
 *                 example: "UpdatedSubtitle"
 *               path:
 *                 type: string
 *                 description: Module path/route
 *                 example: "/updated-module"
 *               icons:
 *                 type: string
 *                 description: Icon component or class
 *                 example: "<UpdatedIcon />"
 *               newtab:
 *                 type: boolean
 *                 description: Whether to open in new tab
 *                 example: true
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *                 description: Parent module ID for sub-modules
 *                 example: 1
 *               menuName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Menu name (e.g., sidebar, header)
 *                 example: "sidebar"
 *           examples:
 *             update_title:
 *               summary: Update module title
 *               value:
 *                 title: "Updated Casino"
 *             update_path:
 *               summary: Update module path
 *               value:
 *                 path: "/updated-casino"
 *             update_parent:
 *               summary: Move module to different parent
 *               value:
 *                 parentId: 2
 *     responses:
 *       200:
 *         description: Module updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Module updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "Updated Module"
 *                     subtitle:
 *                       type: string
 *                       example: "UpdatedSubtitle"
 *                     path:
 *                       type: string
 *                       example: "/updated-module"
 *                     icons:
 *                       type: string
 *                       example: "<UpdatedIcon />"
 *                     newtab:
 *                       type: boolean
 *                       example: true
 *                     parentId:
 *                       type: integer
 *                       nullable: true
 *                       example: 1
 *                     menuName:
 *                       type: string
 *                       example: "sidebar"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Module cannot be its own parent"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
router.put("/modules/:id", (0, validate_1.validate)({ body: modules_schema_1.UpdateModuleSchema }), modules_controller_1.updateModule);
/**
 * @openapi
 * /api/admin/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     tags:
 *       - Admin Modules
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Module deleted successfully"
 *       400:
 *         description: Cannot delete module with children
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Cannot delete module with child modules. Please delete child modules first."
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Module not found
 *       500:
 *         description: Internal server error
 */
router.delete("/modules/:id", modules_controller_1.deleteModule);
// =====================================================
// USER ACTIVITY MANAGEMENT ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/activities:
 *   get:
 *     summary: Get all user activities for admin (across all users)
 *     tags: [Admin Activities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by specific user ID
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: Filter by username exact match
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email exact match
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by activity category
 *       - in: query
 *         name: ip_address
 *         schema:
 *           type: string
 *         description: Filter by IP address exact match
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter activities from this date YYYY-MM-DD
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter activities until this date YYYY-MM-DD
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in action, category, or description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of activities per page
 *     responses:
 *       200:
 *         description: Activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 1
 *                       username:
 *                         type: string
 *                         example: johndoe
 *                       email:
 *                         type: string
 *                         example: john@example.com
 *                       action:
 *                         type: string
 *                         example: login
 *                       category:
 *                         type: string
 *                         example: authentication
 *                       description:
 *                         type: string
 *                         example: User logged in successfully
 *                       ip_address:
 *                         type: string
 *                         example: 192.168.1.1
 *                       user_agent:
 *                         type: string
 *                         example: Mozilla/5.0...
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total_count:
 *                       type: integer
 *                       example: 403
 *                     total_pages:
 *                       type: integer
 *                       example: 9
 *                     current_page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     has_next:
 *                       type: boolean
 *                       example: true
 *                     has_prev:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/activities", async (req, res) => {
    try {
        const { admin_id, action, start_date, end_date, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        // Build WHERE clause
        const whereConditions = [];
        const queryParams = [];
        let paramCount = 1;
        if (admin_id) {
            whereConditions.push(`aa.admin_id = $${paramCount}`);
            queryParams.push(parseInt(admin_id));
            paramCount++;
        }
        if (action) {
            whereConditions.push(`aa.action = $${paramCount}`);
            queryParams.push(action);
            paramCount++;
        }
        if (start_date) {
            whereConditions.push(`aa.created_at >= $${paramCount}`);
            queryParams.push(`${start_date} 00:00:00`);
            paramCount++;
        }
        if (end_date) {
            whereConditions.push(`aa.created_at <= $${paramCount}`);
            queryParams.push(`${end_date} 23:59:59`);
            paramCount++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        // Get total count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM admin_activities aa
      JOIN users u ON aa.admin_id = u.id
      ${whereClause}
    `;
        const countResult = await postgres_1.default.query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].total);
        // Get activities with pagination
        const activitiesQuery = `
      SELECT 
        aa.id,
        aa.admin_id,
        u.username as admin_username,
        u.email as admin_email,
        aa.action,
        aa.details,
        aa.ip_address,
        aa.user_agent,
        aa.created_at
      FROM admin_activities aa
      JOIN users u ON aa.admin_id = u.id
      ${whereClause}
      ORDER BY aa.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
        queryParams.push(parseInt(limit), offset);
        const activitiesResult = await postgres_1.default.query(activitiesQuery, queryParams);
        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / parseInt(limit));
        const currentPage = parseInt(page);
        res.status(200).json({
            success: true,
            data: activitiesResult.rows,
            pagination: {
                total_count: totalCount,
                total_pages: totalPages,
                current_page: currentPage,
                limit: parseInt(limit),
                has_next: currentPage < totalPages,
                has_prev: currentPage > 1
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/activities/{id}:
 *   delete:
 *     summary: Delete an activity log entry
 *     tags: [Admin Activities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *       404:
 *         description: Activity not found
 */
router.delete("/activities/:id", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const activityId = parseInt(req.params.id);
        if (isNaN(activityId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid activity ID"
            });
        }
        // Check if activity exists
        const activityCheck = await postgres_1.default.query("SELECT id FROM admin_activities WHERE id = $1", [activityId]);
        if (activityCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Activity not found"
            });
        }
        // Delete the activity
        await postgres_1.default.query("DELETE FROM admin_activities WHERE id = $1", [activityId]);
        res.status(200).json({
            success: true,
            message: "Activity deleted successfully",
            data: { id: activityId }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// =====================================================
// RTP MANAGEMENT ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/rtp/settings:
 *   get:
 *     summary: Get RTP settings and analytics
 *     tags: [Admin RTP]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: RTP settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                       properties:
 *                         default_rtp:
 *                           type: number
 *                           example: 96.0
 *                         rtp_ranges:
 *                           type: object
 *                           description: RTP ranges by provider
 *                         rtp_categories:
 *                           type: object
 *                           description: RTP by category
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           type: object
 *                           properties:
 *                             average_rtp:
 *                               type: string
 *                               example: "96.25"
 *                             min_rtp:
 *                               type: string
 *                               example: "94.50"
 *                             max_rtp:
 *                               type: string
 *                               example: "97.80"
 *                             total_games:
 *                               type: integer
 *                               example: 150
 *                             high_rtp_games:
 *                               type: integer
 *                               example: 45
 *                             low_rtp_games:
 *                               type: integer
 *                               example: 12
 *                         by_category:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: string
 *                                 example: "slots"
 *                               avg_rtp:
 *                                 type: number
 *                                 example: 96.5
 *                               game_count:
 *                                 type: integer
 *                                 example: 50
 *                         by_provider:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               provider:
 *                                 type: string
 *                                 example: "NetEnt"
 *                               avg_rtp:
 *                                 type: number
 *                                 example: 96.8
 *                               game_count:
 *                                 type: integer
 *                                 example: 25
 *                         recent_changes:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "Starburst"
 *                               provider:
 *                                 type: string
 *                                 example: "NetEnt"
 *                               category:
 *                                 type: string
 *                                 example: "slots"
 *                               rtp_percentage:
 *                                 type: number
 *                                 example: 96.1
 *                               updated_at:
 *                                 type: string
 *                                 format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/rtp/settings", admin_controller_2.getRTPSettings);
/**
 * @swagger
 * /api/admin/rtp/settings:
 *   put:
 *     summary: Update RTP settings
 *     tags: [Admin RTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               default_rtp:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 96.0
 *                 description: Default RTP percentage for new games
 *               rtp_ranges:
 *                 type: object
 *                 description: RTP ranges by provider
 *                 example:
 *                   netent:
 *                     min: 94.0
 *                     max: 98.0
 *                   microgaming:
 *                     min: 93.0
 *                     max: 97.0
 *               rtp_categories:
 *                 type: object
 *                 description: Default RTP by category
 *                 example:
 *                   slots: 96.5
 *                   table_games: 97.0
 *                   live_casino: 96.8
 *     responses:
 *       200:
 *         description: RTP settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     default_rtp:
 *                       type: number
 *                       example: 96.0
 *                     rtp_ranges:
 *                       type: object
 *                     rtp_categories:
 *                       type: object
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put("/rtp/settings", (0, validate_1.validate)({ body: admin_schema_1.UpdateRTPSettingsInput }), admin_controller_2.updateRTPSettings);
/**
 * @swagger
 * /api/admin/rtp/analytics:
 *   get:
 *     summary: Get RTP analytics with filters
 *     tags: [Admin RTP]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: game_id
 *         schema:
 *           type: integer
 *         description: Filter by specific game ID
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *         description: Filter by provider
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: RTP analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         average_rtp:
 *                           type: string
 *                           example: "96.25"
 *                         min_rtp:
 *                           type: string
 *                           example: "94.50"
 *                         max_rtp:
 *                           type: string
 *                           example: "97.80"
 *                         total_games:
 *                           type: integer
 *                           example: 150
 *                         high_rtp_games:
 *                           type: integer
 *                           example: 45
 *                         low_rtp_games:
 *                           type: integer
 *                           example: 12
 *                     by_category:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             example: "slots"
 *                           avg_rtp:
 *                             type: number
 *                             example: 96.5
 *                           game_count:
 *                             type: integer
 *                             example: 50
 *                     by_provider:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           provider:
 *                             type: string
 *                             example: "NetEnt"
 *                           avg_rtp:
 *                             type: number
 *                             example: 96.8
 *                           game_count:
 *                             type: integer
 *                             example: 25
 *                     recent_changes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Starburst"
 *                           provider:
 *                             type: string
 *                             example: "NetEnt"
 *                           category:
 *                             type: string
 *                             example: "slots"
 *                           rtp_percentage:
 *                             type: number
 *                             example: 96.1
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/rtp/analytics", (0, validate_1.validate)({ query: admin_schema_1.RTPAnalyticsFiltersInput }), admin_controller_2.getRTPAnalytics);
/**
 * @swagger
 * /api/admin/rtp/bulk-update:
 *   post:
 *     summary: Bulk update RTP for multiple games
 *     tags: [Admin RTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rtp_percentage
 *             properties:
 *               game_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of game IDs to update (optional if using category/provider filters)
 *                 example: [1, 2, 3, 4, 5]
 *               rtp_percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 96.5
 *                 description: New RTP percentage to set
 *               category:
 *                 type: string
 *                 description: Update all games in this category (optional)
 *                 example: "slots"
 *               provider:
 *                 type: string
 *                 description: Update all games from this provider (optional)
 *                 example: "NetEnt"
 *     responses:
 *       200:
 *         description: RTP bulk update completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_count:
 *                       type: integer
 *                       example: 25
 *                     updated_games:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Starburst"
 *                           rtp_percentage:
 *                             type: number
 *                             example: 96.5
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                     rtp_percentage:
 *                       type: number
 *                       example: 96.5
 *                     filters:
 *                       type: object
 *                       properties:
 *                         game_ids:
 *                           type: array
 *                           items:
 *                             type: integer
 *                         category:
 *                           type: string
 *                         provider:
 *                           type: string
 *       400:
 *         description: Invalid input data or no games found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/rtp/bulk-update", (0, validate_1.validate)({ body: admin_schema_1.BulkUpdateRTPInput }), admin_controller_2.bulkUpdateRTP);
/**
 * @swagger
 * /api/admin/rtp/report:
 *   get:
 *     summary: Generate RTP report
 *     tags: [Admin RTP]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report (YYYY-MM-DD)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Report format (JSON or CSV)
 *     responses:
 *       200:
 *         description: RTP report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     report_date:
 *                       type: string
 *                       format: date-time
 *                     filters:
 *                       type: object
 *                       properties:
 *                         start_date:
 *                           type: string
 *                           format: date
 *                         end_date:
 *                           type: string
 *                           format: date
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total_games:
 *                           type: integer
 *                           example: 150
 *                         average_rtp:
 *                           type: number
 *                           example: 96.25
 *                         high_rtp_count:
 *                           type: integer
 *                           example: 45
 *                         medium_rtp_count:
 *                           type: integer
 *                           example: 85
 *                         low_rtp_count:
 *                           type: integer
 *                           example: 20
 *                     games:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Starburst"
 *                           provider:
 *                             type: string
 *                             example: "NetEnt"
 *                           category:
 *                             type: string
 *                             example: "slots"
 *                           rtp_percentage:
 *                             type: number
 *                             example: 96.1
 *                           volatility:
 *                             type: string
 *                             example: "medium"
 *                           min_bet:
 *                             type: number
 *                             example: 0.10
 *                           max_bet:
 *                             type: number
 *                             example: 100.00
 *                           is_active:
 *                             type: boolean
 *                             example: true
 *                           rtp_level:
 *                             type: string
 *                             enum: [High, Medium, Low]
 *                             example: "High"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/rtp/report", (0, validate_1.validate)({ query: admin_schema_1.RTPReportFiltersInput }), admin_controller_2.getRTPReport);
/**
 * @swagger
 * /api/admin/bets:
 *   get:
 *     summary: Get all users' bet histories (admin only)
 *     tags: [Admin Bets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of bets to return
 *     responses:
 *       200:
 *         description: Successfully returns all users' bet histories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bet_id:
 *                         type: integer
 *                       user_id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       game_id:
 *                         type: integer
 *                       game_name:
 *                         type: string
 *                       category:
 *                         type: string
 *                       bet_amount:
 *                         type: number
 *                       win_amount:
 *                         type: number
 *                       outcome:
 *                         type: string
 *                       placed_at:
 *                         type: string
 *                         format: date-time
 *                       result_at:
 *                         type: string
 *                         format: date-time
 *                       transaction_id:
 *                         type: string
 *                         description: Transaction ID for cancellation purposes
 *                       access_token:
 *                         type: string
 *                         description: User access token for provider callback cancellation
 *                       balance_before:
 *                         type: number
 *                         description: User balance before the bet was placed
 *                       balance_after:
 *                         type: number
 *                         description: User balance after the bet was placed
 *       401:
 *         description: Unauthorized
 */
router.get("/bets", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    const userId = req.query.user_id ? parseInt(req.query.user_id) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    try {
        const { MongoHybridService } = require("../services/mongo/mongo-hybrid.service");
        const mongoHybridService = new MongoHybridService();
        // Get bets from MongoDB
        const bets = await mongoHybridService.getBets(userId, limit);
        // Get user and game data from PostgreSQL
        const pool = require("../db/postgres").default;
        const enrichedBets = await Promise.all(bets.map(async (bet) => {
            // Get user data
            const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [bet.user_id]);
            const username = userResult.rows[0]?.username || 'Unknown';
            // Get game data
            const gameResult = await pool.query('SELECT name, category FROM games WHERE id = $1', [bet.game_id]);
            const gameName = gameResult.rows[0]?.name || 'Unknown Game';
            const category = gameResult.rows[0]?.category || 'slots';
            // Get transaction data
            const transaction = await mongoHybridService.getTransaction(bet.transaction_id);
            // Get access token
            const tokenResult = await pool.query('SELECT access_token FROM tokens WHERE user_id = $1 AND expired_at > NOW() ORDER BY created_at DESC LIMIT 1', [bet.user_id]);
            const accessToken = tokenResult.rows[0]?.access_token || '';
            return {
                bet_id: bet.id,
                user_id: bet.user_id,
                username: username,
                game_id: bet.game_id,
                game_name: gameName,
                category: category,
                bet_amount: bet.bet_amount,
                win_amount: bet.win_amount,
                outcome: bet.outcome,
                placed_at: bet.placed_at,
                result_at: bet.result_at,
                transaction_id: transaction?.external_reference || bet.transaction_id,
                access_token: accessToken,
                balance_before: transaction?.balance_before,
                balance_after: transaction?.balance_after
            };
        }));
        res.json({ success: true, data: enrichedBets });
    }
    catch (error) {
        console.error('Error fetching bets:', error);
        res.status(500).json({ success: false, message: 'Error fetching bets' });
    }
});
/**
 * @swagger
 * /api/admin/bets/{id}/cancel:
 *   post:
 *     summary: Cancel a bet by admin
 *     tags: [Admin Bets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bet ID to cancel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *               admin_note:
 *                 type: string
 *                 description: Admin note
 *               notify_user:
 *                 type: boolean
 *                 description: Whether to notify the user
 *               refund_method:
 *                 type: string
 *                 enum: [balance, credit]
 *                 description: Refund method
 *               force_cancel:
 *                 type: boolean
 *                 description: Force cancellation even if conditions are not met
 *     responses:
 *       200:
 *         description: Bet cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     bet_id:
 *                       type: integer
 *                     transaction_id:
 *                       type: string
 *                     original_type:
 *                       type: string
 *                     original_amount:
 *                       type: number
 *                     balance_adjustment:
 *                       type: number
 *                     new_balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     adjustment_transaction_id:
 *                       type: integer
 *                     cancelled_at:
 *                       type: string
 *                       format: date-time
 *                     cancelled_by:
 *                       type: object
 *                       properties:
 *                         admin_id:
 *                           type: integer
 *                         admin_username:
 *                           type: string
 *                         reason:
 *                           type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         user_id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         notified:
 *                           type: boolean
 *                     refund_details:
 *                       type: object
 *                       properties:
 *                         method:
 *                           type: string
 *                         processed:
 *                           type: boolean
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bet not found
 *       500:
 *         description: Internal server error
 */
router.post("/bets/:id/cancel", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const betId = parseInt(req.params.id);
        const { reason, admin_note, notify_user, refund_method, force_cancel } = req.body;
        const adminId = req.user?.userId;
        const adminUsername = req.user?.username || 'admin';
        if (!betId) {
            return res.status(400).json({ success: false, message: 'Bet ID is required' });
        }
        console.log(`[ADMIN_CANCEL_BET] Admin ${adminUsername} (${adminId}) cancelling bet ${betId}`);
        // Get bet details from MongoDB
        const { MongoService } = require("../services/mongo/mongo.service");
        await MongoService.initialize();
        const bet = await MongoService.getBetById(betId);
        if (!bet) {
            return res.status(404).json({ success: false, message: 'Bet not found' });
        }
        // Get transaction details
        const transaction = await MongoService.getTransactionById(bet.transaction_id);
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        // Get user details from PostgreSQL
        const pool = require("../db/postgres").default;
        const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [bet.user_id]);
        const username = userResult.rows[0]?.username || 'Unknown';
        // Cancel the transaction using the existing cancelGameService
        const { cancelGameService } = require("../services/game/game.service");
        const result = await cancelGameService(bet.user_id, transaction.external_reference || transaction.id.toString(), // Use external_reference if available
        bet.game_id, reason || 'Admin cancellation');
        // Check if this was an idempotent response (already cancelled)
        if (result.status === 'CANCELED') {
            const responseData = {
                bet_id: betId,
                transaction_id: transaction.external_reference,
                original_type: result.original_type,
                original_amount: result.original_amount,
                balance_adjustment: result.balance_adjustment || 0,
                new_balance: result.new_balance || 0,
                currency: transaction.currency || 'USD',
                adjustment_transaction_id: result.adjustment_transaction_id,
                cancelled_at: result.cancelled_at,
                cancelled_by: {
                    admin_id: adminId,
                    admin_username: adminUsername,
                    reason: reason || 'Admin cancellation'
                },
                user: {
                    user_id: bet.user_id,
                    username: username,
                    notified: notify_user || false
                },
                refund_details: {
                    method: refund_method || 'balance',
                    processed: true
                },
                status: 'CANCELED',
                message: result.message
            };
            res.json({
                success: true,
                message: 'Transaction already cancelled',
                data: responseData
            });
            return;
        }
        // Prepare response data for new cancellation
        const responseData = {
            bet_id: betId,
            transaction_id: transaction.external_reference,
            original_type: transaction.type,
            original_amount: transaction.amount,
            balance_adjustment: result.balance_adjustment || 0,
            new_balance: result.new_balance || 0,
            currency: transaction.currency || 'USD',
            adjustment_transaction_id: result.adjustment_transaction_id,
            cancelled_at: new Date().toISOString(),
            cancelled_by: {
                admin_id: adminId,
                admin_username: adminUsername,
                reason: reason || 'Admin cancellation'
            },
            user: {
                user_id: bet.user_id,
                username: username,
                notified: notify_user || false
            },
            refund_details: {
                method: refund_method || 'balance',
                processed: true
            }
        };
        res.json({
            success: true,
            message: 'Bet cancelled successfully',
            data: responseData
        });
    }
    catch (error) {
        console.error('Error cancelling bet:', error);
        res.status(500).json({ success: false, message: 'Error cancelling bet' });
    }
});
/**
 * @swagger
 * /api/admin/analytics/profit:
 *   get:
 *     summary: Get total profit (total bets - total wins)
 *     tags: [Admin Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Profit analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_bets:
 *                       type: number
 *                     total_wins:
 *                       type: number
 *                     profit:
 *                       type: number
 *       400:
 *         description: Invalid input
 */
router.get("/analytics/profit", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
        return res.status(400).json({ success: false, message: "Start date and end date are required" });
    }
    const pool = require("../db/postgres").default;
    const result = await pool.query(`SELECT SUM(bet_amount) as total_bets, SUM(win_amount) as total_wins FROM bets WHERE placed_at BETWEEN $1 AND $2`, [start_date, end_date]);
    const row = result.rows[0] || {};
    const total_bets = parseFloat(row.total_bets || 0);
    const total_wins = parseFloat(row.total_wins || 0);
    const profit = total_bets - total_wins;
    res.json({ success: true, data: { total_bets, total_wins, profit } });
});
/**
 * @openapi
 * /api/admin/rtp/target-profit:
 *   get:
 *     summary: Get current RTP target profit settings
 *     tags: [Admin RTP]
 *     responses:
 *       200:
 *         description: Current RTP target profit settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 target_profit_percent:
 *                   type: number
 *                 effective_rtp:
 *                   type: number
 *                 adjustment_mode:
 *                   type: string
 *                   example: manual
 */
router.get("/rtp/target-profit", rtpAuto_1.getRtpTargetProfit);
/**
 * @openapi
 * /api/admin/rtp/target-profit:
 *   post:
 *     summary: Set RTP target profit percentage (manual mode)
 *     tags: [Admin RTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               target_profit_percent:
 *                 type: number
 *                 example: 20
 *     responses:
 *       200:
 *         description: RTP target profit updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 target_profit_percent:
 *                   type: number
 *                 effective_rtp:
 *                   type: number
 *                 adjustment_mode:
 *                   type: string
 *                   example: manual
 */
router.post("/rtp/target-profit", rtpAuto_1.setRtpTargetProfit);
/**
 * @openapi
 * /api/admin/rtp/auto-adjustment:
 *   post:
 *     summary: Enable auto (advanced) RTP adjustment mode
 *     tags: [Admin RTP]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               target_profit_percent:
 *                 type: number
 *                 example: 20
 *                 description: Optional initial profit target percent
 *               effective_rtp:
 *                 type: number
 *                 example: 80
 *                 description: Optional initial effective RTP
 *     responses:
 *       200:
 *         description: Auto adjustment mode enabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 target_profit_percent:
 *                   type: number
 *                 effective_rtp:
 *                   type: number
 *                 adjustment_mode:
 *                   type: string
 *                   example: auto
 */
router.post("/rtp/auto-adjustment", rtpAuto_1.setRtpAutoAdjustment);
// =====================================================
// PROFIT CONTROL ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/profit/analytics:
 *   get:
 *     summary: Get profit analytics and tracking data
 *     tags: [Admin Profit Control]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: game_id
 *         schema:
 *           type: integer
 *         description: Filter by specific game ID
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *         description: Filter by provider
 *     responses:
 *       200:
 *         description: Profit analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalOriginalWins:
 *                           type: number
 *                           example: 10000.00
 *                         totalAdjustedWins:
 *                           type: number
 *                           example: 8000.00
 *                         totalProfitRetained:
 *                           type: number
 *                           example: 2000.00
 *                         avgEffectiveRtp:
 *                           type: number
 *                           example: 80.5
 *                         totalTransactions:
 *                           type: integer
 *                           example: 150
 *                     byGame:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           game_name:
 *                             type: string
 *                             example: "Starburst"
 *                           provider:
 *                             type: string
 *                             example: "NetEnt"
 *                           total_original_wins:
 *                             type: number
 *                             example: 5000.00
 *                           total_adjusted_wins:
 *                             type: number
 *                           total_profit_retained:
 *                             type: number
 *                             example: 1000.00
 *                           avg_effective_rtp:
 *                             type: number
 *                             example: 80.0
 *                           transaction_count:
 *                             type: integer
 *                             example: 50
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/profit/analytics", admin_controller_2.getProfitAnalytics);
/**
 * @swagger
 * /api/admin/profit/auto-adjustment:
 *   post:
 *     summary: Trigger automatic RTP adjustment based on profit performance
 *     tags: [Admin Profit Control]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Auto-adjustment triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     adjustment:
 *                       type: object
 *                       properties:
 *                         previousRtp:
 *                           type: number
 *                           example: 80.0
 *                         newRtp:
 *                           type: number
 *                           example: 78.0
 *                         adjustment:
 *                           type: number
 *                           example: 2.0
 *                         reason:
 *                           type: string
 *                           example: "Profit below target by 5.2% - reducing payouts"
 *                     performance:
 *                       type: object
 *                       properties:
 *                         actualProfitPercent:
 *                           type: number
 *                           example: 14.8
 *                         targetProfitPercent:
 *                           type: number
 *                           example: 20.0
 *                         profitGap:
 *                           type: number
 *                           example: -5.2
 *                         totalBets:
 *                           type: number
 *                           example: 10000.00
 *                         totalWins:
 *                           type: number
 *                           example: 8000.00
 *                         totalAdjustedWins:
 *                           type: number
 *                           example: 6400.00
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/profit/auto-adjustment", admin_controller_2.triggerAutoAdjustment);
/**
 * @swagger
 * /api/admin/profit/performance:
 *   get:
 *     summary: Get current profit performance metrics
 *     tags: [Admin Profit Control]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profit performance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     actualProfitPercent:
 *                       type: number
 *                       example: 18.5
 *                     targetProfitPercent:
 *                       type: number
 *                       example: 20.0
 *                     profitGap:
 *                       type: number
 *                       example: -1.5
 *                     totalBets:
 *                       type: number
 *                       example: 15000.00
 *                     totalWins:
 *                       type: number
 *                       example: 12000.00
 *                     totalAdjustedWins:
 *                       type: number
 *                       example: 9600.00
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/profit/performance", admin_controller_2.getProfitPerformance);
// =====================================================
// CRON MANAGEMENT ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/cron/status:
 *   get:
 *     summary: Get cron job status
 *     tags: [Admin Cron Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cron status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: boolean
 *                       example: true
 *                     jobCount:
 *                       type: number
 *                       example: 4
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Auto-adjustment"
 *                           interval:
 *                             type: string
 *                             example: "30 minutes"
 *                           description:
 *                             type: string
 *                             example: "RTP auto-adjustment based on profit performance"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/cron/status", admin_controller_2.getCronStatus);
/**
 * @swagger
 * /api/admin/cron/start:
 *   post:
 *     summary: Start background cron jobs
 *     tags: [Admin Cron Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cron jobs started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Background cron jobs started successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/cron/start", admin_controller_2.startCronJobs);
/**
 * @swagger
 * /api/admin/cron/stop:
 *   post:
 *     summary: Stop background cron jobs
 *     tags: [Admin Cron Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cron jobs stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Background cron jobs stopped successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/cron/stop", admin_controller_2.stopCronJobs);
/**
 * @swagger
 * /api/admin/cron/trigger-auto-adjustment:
 *   post:
 *     summary: Manually trigger auto-adjustment
 *     tags: [Admin Cron Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Auto-adjustment triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Manual auto-adjustment triggered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     previousRtp:
 *                       type: number
 *                       example: 80.0
 *                     newRtp:
 *                       type: number
 *                       example: 78.5
 *                     adjustment:
 *                       type: number
 *                       example: 1.5
 *                     reason:
 *                       type: string
 *                       example: "Profit below target by 5.2% - reducing payouts"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/cron/trigger-auto-adjustment", admin_controller_2.triggerManualAutoAdjustment);
/**
 * @swagger
 * /api/admin/cron/trigger-daily-summary:
 *   post:
 *     summary: Manually trigger daily summary
 *     tags: [Admin Cron Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Daily summary triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Manual daily summary triggered successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/cron/trigger-daily-summary", admin_controller_2.triggerManualDailySummary);
// ========================================
// PROMOTION MANAGEMENT ROUTES
// ========================================
/**
 * @swagger
 * /api/admin/promotions:
 *   get:
 *     summary: Get all promotions with filters
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name or description
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [welcome_bonus, deposit_bonus, free_spins, cashback, reload_bonus, tournament, loyalty_bonus, referral_bonus]
 *         description: Filter by promotion type
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: is_featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status
 *     responses:
 *       200:
 *         description: Promotions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Promotion'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/promotions", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_promotion_schema_1.PromotionFiltersSchema), admin_promotion_controller_1.getPromotions);
/**
 * @swagger
 * /api/admin/promotions:
 *   post:
 *     summary: Create a new promotion
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePromotion'
 *     responses:
 *       201:
 *         description: Promotion created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promotion created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       400:
 *         description: Bad request - Invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/promotions", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_promotion_schema_1.CreatePromotionSchema), admin_promotion_controller_1.createPromotion);
/**
 * @swagger
 * /api/admin/promotions/{id}:
 *   get:
 *     summary: Get promotion by ID
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     responses:
 *       200:
 *         description: Promotion retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promotion not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/promotions/:id", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), admin_promotion_controller_1.getPromotionById);
/**
 * @swagger
 * /api/admin/promotions/{id}:
 *   put:
 *     summary: Update promotion
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePromotion'
 *     responses:
 *       200:
 *         description: Promotion updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promotion updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promotion not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put("/promotions/:id", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_promotion_schema_1.UpdatePromotionSchema), admin_promotion_controller_1.updatePromotion);
/**
 * @swagger
 * /api/admin/promotions/{id}:
 *   delete:
 *     summary: Delete promotion
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     responses:
 *       200:
 *         description: Promotion deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promotion deleted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       400:
 *         description: Cannot delete promotion with existing claims
 *       404:
 *         description: Promotion not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete("/promotions/:id", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), admin_promotion_controller_1.deletePromotion);
/**
 * @swagger
 * /api/admin/promotions/{id}/toggle:
 *   patch:
 *     summary: Toggle promotion status (active/inactive)
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *     responses:
 *       200:
 *         description: Promotion status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Promotion activated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *       404:
 *         description: Promotion not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.patch("/promotions/:id/toggle", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_promotion_schema_1.TogglePromotionSchema), admin_promotion_controller_1.togglePromotion);
/**
 * @swagger
 * /api/admin/promotions/stats:
 *   get:
 *     summary: Get promotion statistics
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: promotion_id
 *         schema:
 *           type: integer
 *         description: Filter by specific promotion ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Group statistics by time period
 *     responses:
 *       200:
 *         description: Promotion statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                         example: "2024-01-15"
 *                       total_claims:
 *                         type: integer
 *                         example: 150
 *                       unique_users:
 *                         type: integer
 *                         example: 120
 *                       total_bonus_paid:
 *                         type: number
 *                         example: 5000.00
 *                       total_free_spins_awarded:
 *                         type: integer
 *                         example: 1000
 *                       avg_bonus_amount:
 *                         type: number
 *                         example: 33.33
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/promotions/stats", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_promotion_schema_1.PromotionStatsFiltersSchema), admin_promotion_controller_1.getPromotionStats);
/**
 * @swagger
 * /api/admin/promotions/stats/overview:
 *   get:
 *     summary: Get promotion overview statistics
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Promotion overview statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_promotions:
 *                       type: integer
 *                       example: 25
 *                     active_promotions:
 *                       type: integer
 *                       example: 20
 *                     featured_promotions:
 *                       type: integer
 *                       example: 5
 *                     current_promotions:
 *                       type: integer
 *                       example: 15
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/promotions/stats/overview", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), admin_promotion_controller_1.getPromotionOverviewStats);
/**
 * @swagger
 * /api/admin/promotions/{id}/claims:
 *   get:
 *     summary: Get claims for a specific promotion
 *     tags: [Admin Promotion Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Promotion claims retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 123
 *                       promotion_id:
 *                         type: integer
 *                         example: 1
 *                       bonus_amount:
 *                         type: number
 *                         example: 100.00
 *                       free_spins_awarded:
 *                         type: integer
 *                         example: 50
 *                       claimed_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                       username:
 *                         type: string
 *                         example: "john_doe"
 *                       email:
 *                         type: string
 *                         example: "john@example.com"
 *                       promotion_name:
 *                         type: string
 *                         example: "Welcome Bonus"
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Promotion not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/promotions/:id/claims", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), admin_promotion_controller_1.getPromotionClaims);
// ========================================
// KYC & COMPLIANCE MANAGEMENT ROUTES
// ========================================
/**
 * @swagger
 * /api/admin/kyc/pending:
 *   get:
 *     summary: Get pending KYC requests with filters
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for username, email, or name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, under_review, expired, cancelled]
 *         description: Filter by KYC status
 *       - in: query
 *         name: document_type
 *         schema:
 *           type: string
 *           enum: [passport, national_id, drivers_license, utility_bill, bank_statement, selfie, proof_of_address, proof_of_income, tax_document, other]
 *         description: Filter by document type
 *     responses:
 *       200:
 *         description: KYC requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 123
 *                       status:
 *                         type: string
 *                         example: "pending"
 *                       risk_score:
 *                         type: integer
 *                         example: 25
 *                       compliance_level:
 *                         type: string
 *                         example: "low"
 *                       username:
 *                         type: string
 *                         example: "john_doe"
 *                       email:
 *                         type: string
 *                         example: "john@example.com"
 *                       document_count:
 *                         type: integer
 *                         example: 3
 *                       approved_documents:
 *                         type: integer
 *                         example: 2
 *                       pending_documents:
 *                         type: integer
 *                         example: 1
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/kyc/pending", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_kyc_schema_1.KYCFiltersSchema), admin_kyc_controller_1.getPendingKYC);
/**
 * @swagger
 * /api/admin/kyc/{user_id}:
 *   get:
 *     summary: Get KYC verification details for a specific user
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: KYC verification details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     user_id:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     risk_score:
 *                       type: integer
 *                       example: 25
 *                     compliance_level:
 *                       type: string
 *                       example: "low"
 *                     username:
 *                       type: string
 *                       example: "john_doe"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     first_name:
 *                       type: string
 *                       example: "John"
 *                     last_name:
 *                       type: string
 *                       example: "Doe"
 *       404:
 *         description: KYC verification not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/kyc/:user_id", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), admin_kyc_controller_1.getKYCByUserId);
/**
 * @swagger
 * /api/admin/kyc/{user_id}/approve:
 *   put:
 *     summary: Approve KYC verification for a user
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "All documents verified successfully"
 *               admin_notes:
 *                 type: string
 *                 example: "User passed all verification checks"
 *               expiry_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-31T23:59:59Z"
 *               risk_score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 15
 *               compliance_level:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 example: "low"
 *     responses:
 *       200:
 *         description: KYC approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "KYC approved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: "approved"
 *                     verification_date:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       404:
 *         description: KYC verification not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put("/kyc/:user_id/approve", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_kyc_schema_1.KYCVerificationSchema), admin_kyc_controller_1.approveKYC);
/**
 * @swagger
 * /api/admin/kyc/{user_id}/reject:
 *   put:
 *     summary: Reject KYC verification for a user
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Documents are unclear or incomplete"
 *               admin_notes:
 *                 type: string
 *                 example: "User needs to resubmit with clearer documents"
 *     responses:
 *       200:
 *         description: KYC rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "KYC rejected successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: "rejected"
 *                     verification_date:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       404:
 *         description: KYC verification not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put("/kyc/:user_id/reject", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_kyc_schema_1.KYCVerificationSchema), admin_kyc_controller_1.rejectKYC);
/**
 * @swagger
 * /api/admin/kyc/documents:
 *   get:
 *     summary: Get KYC documents with filters
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: document_type
 *         schema:
 *           type: string
 *           enum: [passport, national_id, drivers_license, utility_bill, bank_statement, selfie, proof_of_address, proof_of_income, tax_document, other]
 *         description: Filter by document type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, under_review, expired, cancelled]
 *         description: Filter by document status
 *     responses:
 *       200:
 *         description: KYC documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 123
 *                       document_type:
 *                         type: string
 *                         example: "passport"
 *                       file_name:
 *                         type: string
 *                         example: "passport.jpg"
 *                       status:
 *                         type: string
 *                         example: "pending"
 *                       username:
 *                         type: string
 *                         example: "john_doe"
 *                       email:
 *                         type: string
 *                         example: "john@example.com"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/kyc/documents", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), admin_kyc_controller_1.getKYCDocuments);
/**
 * @swagger
 * /api/admin/kyc/documents/{document_id}/verify:
 *   put:
 *     summary: Verify a KYC document
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, under_review, expired, cancelled]
 *                 example: "approved"
 *               reason:
 *                 type: string
 *                 example: "Document is clear and valid"
 *               admin_notes:
 *                 type: string
 *                 example: "Passport verified successfully"
 *               verification_method:
 *                 type: string
 *                 enum: [manual, automated, third_party]
 *                 example: "manual"
 *               verified_by:
 *                 type: string
 *                 example: "admin_user"
 *     responses:
 *       200:
 *         description: Document verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Document approved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: "approved"
 *                     verification_date:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put("/kyc/documents/:document_id/verify", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_kyc_schema_1.KYCDocumentVerificationSchema), admin_kyc_controller_1.verifyKYCDocument);
/**
 * @swagger
 * /api/admin/kyc/{user_id}/risk-assessment:
 *   post:
 *     summary: Create a risk assessment for a user
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - risk_score
 *               - risk_level
 *             properties:
 *               risk_factors:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["high_transaction_volume", "multiple_accounts"]
 *               risk_score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 45
 *               risk_level:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 example: "medium"
 *               assessment_notes:
 *                 type: string
 *                 example: "User shows moderate risk due to high transaction volume"
 *               recommended_actions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["monitor_transactions", "request_additional_documents"]
 *     responses:
 *       201:
 *         description: Risk assessment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Risk assessment created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     user_id:
 *                       type: integer
 *                       example: 123
 *                     risk_score:
 *                       type: integer
 *                       example: 45
 *                     risk_level:
 *                       type: string
 *                       example: "medium"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post("/kyc/:user_id/risk-assessment", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_kyc_schema_1.KYCRiskAssessmentSchema), admin_kyc_controller_1.createRiskAssessment);
/**
 * @swagger
 * /api/admin/kyc/reports:
 *   get:
 *     summary: Get KYC compliance reports
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for the report
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for the report
 *       - in: query
 *         name: report_type
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, quarterly, annual]
 *           default: monthly
 *         description: Type of report
 *       - in: query
 *         name: include_details
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include detailed breakdown
 *     responses:
 *       200:
 *         description: KYC reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                             example: "2024-01"
 *                           total_requests:
 *                             type: integer
 *                             example: 150
 *                           pending_requests:
 *                             type: integer
 *                             example: 25
 *                           approved_requests:
 *                             type: integer
 *                             example: 100
 *                           rejected_requests:
 *                             type: integer
 *                             example: 15
 *                           avg_risk_score:
 *                             type: number
 *                             example: 28.5
 *                           avg_processing_days:
 *                             type: number
 *                             example: 2.3
 *       400:
 *         description: Start date and end date are required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/kyc/reports", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), (0, validate_1.validate)(admin_kyc_schema_1.KYCComplianceReportSchema), admin_kyc_controller_1.getKYCReports);
/**
 * @swagger
 * /api/admin/kyc/audit-logs:
 *   get:
 *     summary: Get KYC audit logs
 *     tags: [Admin KYC Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: KYC audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 123
 *                       action:
 *                         type: string
 *                         example: "approve"
 *                       entity_type:
 *                         type: string
 *                         example: "verification"
 *                       entity_id:
 *                         type: integer
 *                         example: 1
 *                       username:
 *                         type: string
 *                         example: "john_doe"
 *                       admin_username:
 *                         type: string
 *                         example: "admin_user"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/kyc/audit-logs", authenticate_1.authenticate, (0, authorize_1.authorize)(["admin"]), admin_kyc_controller_1.getKYCAuditLogs);
// =====================================================
// SYSTEM RESET ROUTES
// =====================================================
/**
 * @swagger
 * /api/admin/system/reset:
 *   post:
 *     summary: Reset user or entire system to fresh state
 *     description: Admin endpoint to reset specific user or entire system. Removes all financial data, transactions, bets, and resets user profiles to default values.
 *     tags: [Admin - System Reset]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reset_type
 *             properties:
 *               reset_type:
 *                 type: string
 *                 enum: [user, system]
 *                 description: Type of reset to perform
 *               user_id:
 *                 type: integer
 *                 description: User ID to reset (required when reset_type is 'user')
 *     responses:
 *       200:
 *         description: Reset completed successfully
 *       400:
 *         description: Bad request - invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin privileges required
 *       404:
 *         description: User not found (when resetting specific user)
 */
router.post("/system/reset", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), system_reset_controller_1.resetSystem);
/**
 * @swagger
 * /api/admin/system/reset/stats:
 *   get:
 *     summary: Get system reset statistics
 *     description: Get current system statistics and available reset options
 *     tags: [Admin - System Reset]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin privileges required
 */
router.get("/system/reset/stats", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), system_reset_controller_1.getResetStats);
/**
 * @swagger
 * /api/admin/users/bulk-status:
 *   post:
 *     summary: Bulk update user statuses
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_ids
 *               - status
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of user IDs to update
 *                 example: [1, 2, 3, 4, 5]
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Suspended, Banned]
 *                 description: Status to set for all users
 *                 example: "Suspended"
 *               reason:
 *                 type: string
 *                 description: Reason for the status change (optional)
 *                 example: "Bulk suspension due to policy violation"
 *     responses:
 *       200:
 *         description: Users updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_count:
 *                       type: integer
 *                       example: 5
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           email:
 *                             type: string
 *                           status:
 *                             type: string
 *                 message:
 *                   type: string
 *                   example: "5 users suspended successfully"
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/users/bulk-status", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const { user_ids, status, reason } = req.body;
        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "user_ids array is required and must not be empty"
            });
        }
        if (!status || !["Active", "Inactive", "Suspended", "Banned"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Valid status is required (Active, Inactive, Suspended, Banned)"
            });
        }
        const statusData = {
            status: status,
            reason: reason || `Bulk ${status.toLowerCase()} by admin`
        };
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        for (const userId of user_ids) {
            try {
                const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
                results.push({
                    id: userId,
                    username: user.username,
                    email: user.email,
                    status: status,
                    success: true
                });
                successCount++;
            }
            catch (error) {
                results.push({
                    id: userId,
                    success: false,
                    error: error.message
                });
                errorCount++;
            }
        }
        res.status(200).json({
            success: true,
            data: {
                updated_count: successCount,
                error_count: errorCount,
                users: results
            },
            message: `${successCount} users ${status.toLowerCase()} successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/blacklist:
 *   post:
 *     summary: Blacklist user account
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
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
 *                 description: Reason for blacklisting the user
 *                 example: "Policy violation"
 *               admin_note:
 *                 type: string
 *                 description: Internal admin note
 *                 example: "Multiple violations detected"
 *               notify_user:
 *                 type: boolean
 *                 description: Whether to notify the user
 *                 example: true
 *               duration:
 *                 type: string
 *                 enum: [temporary, permanent]
 *                 description: Duration of blacklist
 *                 example: "permanent"
 *     responses:
 *       200:
 *         description: User blacklisted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 50
 *                     username:
 *                       type: string
 *                       example: "player50"
 *                     email:
 *                       type: string
 *                       example: "player50@test.com"
 *                     status:
 *                       type: string
 *                       example: "Banned"
 *                     blacklisted_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     blacklist_reason:
 *                       type: string
 *                       example: "Policy violation"
 *                 message:
 *                   type: string
 *                   example: "User blacklisted successfully"
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/users/:id/blacklist", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const { reason, admin_note, notify_user, duration } = req.body;
        if (!reason) {
            return res.status(400).json({ success: false, message: "Reason is required" });
        }
        // Set status to Banned for blacklisted users
        const statusData = {
            status: "Banned",
            reason: reason
        };
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        // Here you could add additional blacklist logic like:
        // - Storing blacklist details in a separate table
        // - Sending notification to user if notify_user is true
        // - Logging admin note
        // - Setting expiration date if duration is temporary
        res.status(200).json({
            success: true,
            data: {
                ...user,
                blacklisted_at: new Date().toISOString(),
                blacklist_reason: reason,
                admin_note: admin_note || null,
                notify_user: notify_user || false,
                duration: duration || 'permanent'
            },
            message: "User blacklisted successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/{id}/unblacklist:
 *   post:
 *     summary: Remove user from blacklist
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for removing from blacklist
 *                 example: "Appeal approved"
 *               admin_note:
 *                 type: string
 *                 description: Internal admin note
 *                 example: "User provided sufficient evidence"
 *               notify_user:
 *                 type: boolean
 *                 description: Whether to notify the user
 *                 example: true
 *     responses:
 *       200:
 *         description: User removed from blacklist successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/users/:id/unblacklist", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const { reason, admin_note, notify_user } = req.body;
        // Set status back to Active
        const statusData = {
            status: "Active",
            reason: reason || "Removed from blacklist by admin"
        };
        const user = await (0, admin_service_1.updateUserStatusService)(userId, statusData);
        // Here you could add additional unblacklist logic like:
        // - Removing blacklist records
        // - Sending notification to user if notify_user is true
        // - Logging admin note
        res.status(200).json({
            success: true,
            data: {
                ...user,
                unblacklisted_at: new Date().toISOString(),
                unblacklist_reason: reason || "Removed from blacklist by admin",
                admin_note: admin_note || null,
                notify_user: notify_user || false
            },
            message: "User removed from blacklist successfully"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
/**
 * @swagger
 * /api/admin/users/blacklist:
 *   get:
 *     summary: Get blacklisted users
 *     tags: [Admin Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *     responses:
 *       200:
 *         description: Blacklisted users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 50
 *                       username:
 *                         type: string
 *                         example: "player50"
 *                       email:
 *                         type: string
 *                         example: "player50@test.com"
 *                       status:
 *                         type: string
 *                         example: "Banned"
 *                       blacklisted_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                       blacklist_reason:
 *                         type: string
 *                         example: "Policy violation"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 5
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total_pages:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/users/blacklist", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const offset = (page - 1) * limit;
        // Get blacklisted users (users with Banned status)
        let query = `
      SELECT u.id, u.username, u.email, u.created_at, u.updated_at,
             s.name as status_name
      FROM users u
      LEFT JOIN statuses s ON u.status_id = s.id
      WHERE s.name = 'Banned'
    `;
        const values = [];
        let paramCount = 1;
        if (search) {
            query += ` AND (u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }
        // Get total count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN statuses s ON u.status_id = s.id
      WHERE s.name = 'Banned'
      ${search ? `AND (u.username ILIKE $1 OR u.email ILIKE $1)` : ''}
    `;
        const countResult = await postgres_1.default.query(countQuery, search ? [`%${search}%`] : []);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        query += ` ORDER BY u.updated_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        values.push(limit, offset);
        const result = await postgres_1.default.query(query, values);
        res.status(200).json({
            success: true,
            data: result.rows.map(user => ({
                ...user,
                blacklisted_at: user.updated_at,
                blacklist_reason: "Banned by admin" // You could store this in a separate table
            })),
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// =====================================================
// ADVANCED ANALYTICS ROUTES
// =====================================================
// Player Behavior Analytics
router.get("/analytics/player-behavior/:user_id", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getPlayerBehavior);
router.post("/analytics/player-behavior/:user_id/calculate", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.calculateBehaviorScores);
router.get("/analytics/player-behavior/top-engaged", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getTopEngagedPlayers);
router.get("/analytics/player-behavior/heatmap", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getSessionHeatmap);
// RFM Segmentation
router.get("/analytics/rfm/segments", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getRFMSegments);
router.get("/analytics/rfm/segments/:segment/users", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getUsersBySegment);
router.post("/analytics/rfm/recalculate", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.recalculateRFM);
router.get("/analytics/rfm/health", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getRFMHealthScore);
// Churn Prediction
router.get("/analytics/churn/prediction/:user_id", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getChurnPrediction);
router.get("/analytics/churn/high-risk", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getHighRiskUsers);
router.get("/analytics/churn/statistics", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.getChurnStatistics);
router.post("/analytics/churn/run-workflow", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin"]), admin_analytics_controller_1.runChurnPredictionWorkflow);
// Session Tracking (for frontend - requires authentication but available to all authenticated users)
router.post("/analytics/session/start", authenticate_1.authenticate, admin_analytics_controller_1.startSession);
router.post("/analytics/session/end", authenticate_1.authenticate, admin_analytics_controller_1.endSession);
router.post("/analytics/event/track", authenticate_1.authenticate, admin_analytics_controller_1.trackEvent);
// ==================== VIP Management Routes ====================
/**
 * @swagger
 * /api/admin/vip/tiers:
 *   get:
 *     summary: Get all VIP tiers
 *     tags: [VIP Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of VIP tiers with player counts
 *       500:
 *         description: Server error
 */
router.get("/vip/tiers", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin", "Manager", "Support"]), async (req, res) => {
    try {
        const pool = require('../db/postgres').default;
        const result = await pool.query(`
      SELECT
        vt.id,
        vt.name,
        vt.level,
        vt.color,
        vt.icon,
        vt.min_points_required,
        vt.monthly_cashback_percentage,
        vt.deposit_bonus_percentage,
        vt.withdrawal_limit_multiplier,
        vt.support_priority,
        vt.exclusive_games_access,
        vt.personal_account_manager,
        vt.birthday_bonus_amount,
        vt.benefits,
        COUNT(uvs.user_id) as players_count
      FROM vip_tiers vt
      LEFT JOIN user_vip_status uvs ON vt.id = uvs.current_tier_id
      GROUP BY vt.id
      ORDER BY vt.level ASC
    `);
        return res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error("Error fetching VIP tiers:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch VIP tiers",
            details: error.message
        });
    }
});
/**
 * @swagger
 * /api/admin/vip/players:
 *   get:
 *     summary: Get VIP players
 *     tags: [VIP Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of players to return
 *     responses:
 *       200:
 *         description: List of VIP players
 *       500:
 *         description: Server error
 */
router.get("/vip/players", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin", "Manager", "Support"]), async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const pool = require('../db/postgres').default;
        const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        up.avatar_url,
        uvs.current_tier_id as tier_id,
        vt.name as tier_name,
        vt.level as tier_level,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'deposit' AND t.status = 'completed'), 0) as total_deposited,
        COALESCE(SUM(b.bet_amount), 0) as total_wagered,
        COALESCE(ub.balance, 0) as current_balance,
        COALESCE(uvs.current_points, 0) as vip_points,
        uvs.tier_achieved_at as joined_at,
        uvs.updated_at as upgraded_at
      FROM users u
      INNER JOIN user_vip_status uvs ON u.id = uvs.user_id
      INNER JOIN vip_tiers vt ON uvs.current_tier_id = vt.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      LEFT JOIN transactions t ON u.id = t.user_id
      LEFT JOIN bets b ON u.id = b.user_id
      GROUP BY u.id, u.username, u.email, up.avatar_url, uvs.current_tier_id, vt.name, vt.level, ub.balance, uvs.current_points, uvs.tier_achieved_at, uvs.updated_at
      ORDER BY total_wagered DESC
      LIMIT $1
    `, [parseInt(limit)]);
        return res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error("Error fetching VIP players:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch VIP players",
            details: error.message
        });
    }
});
/**
 * @swagger
 * /api/admin/vip/stats:
 *   get:
 *     summary: Get VIP statistics
 *     tags: [VIP Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: VIP statistics
 *       500:
 *         description: Server error
 */
router.get("/vip/stats", authenticate_1.authenticate, (0, authorize_1.authorize)(["Admin", "Manager", "Support"]), async (req, res) => {
    try {
        const pool = require('../db/postgres').default;
        const result = await pool.query(`
      SELECT
        COUNT(DISTINCT uvs.user_id) as total_vip_players,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'deposit' AND t.status = 'completed'), 0) as total_vip_revenue,
        COALESCE(SUM(b.bet_amount), 0) as total_vip_wagered,
        COALESCE(AVG(ub.balance), 0) as avg_vip_balance
      FROM user_vip_status uvs
      LEFT JOIN transactions t ON uvs.user_id = t.user_id
      LEFT JOIN bets b ON uvs.user_id = b.user_id
      LEFT JOIN user_balances ub ON uvs.user_id = ub.user_id
    `);
        return res.json({
            success: true,
            data: {
                total_vip_players: parseInt(result.rows[0].total_vip_players) || 0,
                total_vip_revenue: parseFloat(result.rows[0].total_vip_revenue) || 0,
                total_vip_wagered: parseFloat(result.rows[0].total_vip_wagered) || 0,
                avg_vip_balance: parseFloat(result.rows[0].avg_vip_balance) || 0,
            }
        });
    }
    catch (error) {
        console.error("Error fetching VIP stats:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch VIP stats",
            details: error.message
        });
    }
});
exports.default = router;
