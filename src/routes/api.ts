import { Router } from "express";
import {
  getUserBalance,
  getUserProfile,
  getUserFavoriteGames,
  getUserRecentActivity,
  getUserTransactionHistory,
  getUserBettingHistory,
  getUserActivitySummary,
  updateUserProfile,
  changeUserPassword,
  get2FAStatus,
  enable2FA,
  disable2FA,
  skip2FA,
  getUserCategoryBalances,
  transferUserCategoryBalance,
  getUserGameBets
} from "../api/user/user.controller";
import {
  getKYCStatus,
  getKYCDocuments,
  uploadKYCDocument,
  deleteKYCDocument,
  getKYCRequirements
} from "../api/user/kyc.controller";
import {
  getUserMessages,
  markMessageAsRead,
  getUnreadCount
} from "../api/user/messages.controller";
import { proxyGameContent } from "../services/game/game-proxy.service";
import { GetHome } from "../api/home/home.controller";
import { 
  getAvailableGames,
  getGameById,
  getGameCategories,
  getGameProviders,
  getFeaturedGames,
  getNewGames,
  getHotGames,
  getPopularGames,
  getGameStatistics,
  toggleGameFavorite,
  recordGamePlay,
  placeBet,
  processBetResult,
  getAvailableGamesLegacy,
  playGame,
  getGameDataSample,
  getBetResults,
  getGamesByCategory,
  cancelGame
} from "../api/game/game.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { validate as validateRequest } from "../middlewares/validate";
import { 
  PlaceBetSchema, 
  ProcessBetResultSchema, 
  RecordGamePlaySchema, 
  ToggleGameFavoriteSchema,
  GameFiltersSchema,
  PlayGameSchema,
  GameCategoryFiltersSchema,
  CancelGameSchema
} from "../api/game/game.schema";
import {
  UpdateProfileInput,
  Skip2FAInput,
  ChangePasswordInput
} from "../api/user/user.schema";
import {
  UploadKYCDocumentSchema,
  DeleteKYCDocumentSchema,
  GetKYCRequirementsSchema
} from "../api/user/kyc.schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import adminRoutes from "./admin.routes";
import templateRoutes from "./template.routes";
import settingsRoutes from "./settings.routes";
import promotionRoutes from "./promotion.routes";
import notificationRoutes from "./notification.routes";
import pool from "../db/postgres";
import { getPaymentGatewaysService } from "../services/admin/payment-gateway.service";
import { PaymentGatewayFiltersInput } from "../api/admin/admin.schema";
import { logUserActivity } from "../services/user/user-activity.service";
const router = Router();

// Create a wrapper for the authorize middleware
const adminAuth = (req: any, res: any, next: any) => {
  authorize(['Admin'])(req, res, next);
};

// Configure multer for KYC document uploads
const kycUploadDir = path.join(process.cwd(), 'uploads', 'kyc');
// Ensure KYC upload directory exists
if (!fs.existsSync(kycUploadDir)) {
  fs.mkdirSync(kycUploadDir, { recursive: true });
}

const kycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, kycUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `kyc-${uniqueSuffix}${ext}`);
  }
});

const kycUpload = multer({
  storage: kycStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, WEBP, PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

// Define all routes here (like PHP api.php)

/**
 * @openapi
 * /api/user/profile:
 *   get:
 *     summary: Get comprehensive user profile information
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns comprehensive user profile
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
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     email:
 *                       type: string
 *                       example: johndoe@example.com
 *                     first_name:
 *                       type: string
 *                       example: John
 *                     last_name:
 *                       type: string
 *                       example: Doe
 *                     nationality:
 *                       type: string
 *                       example: United States
 *                     phone_number:
 *                       type: string
 *                       example: +1234567890
 *                     balance:
 *                       type: number
 *                       format: float
 *                       example: 100.50
 *                     level_name:
 *                       type: string
 *                       example: Silver
 *                     verification_level:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Unauthorized
 */
router.get("/user/profile", authenticate, getUserProfile);

/**
 * @openapi
 * /api/user/favorite-games:
 *   get:
 *     summary: Get user's favorite and most played games
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns user's favorite games
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
 *                       name:
 *                         type: string
 *                       provider:
 *                         type: string
 *                       play_count:
 *                         type: integer
 *                       is_favorite:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get("/user/favorite-games", authenticate, getUserFavoriteGames);

/**
 * @openapi
 * /api/user/activity:
 *   get:
 *     summary: Get user's recent activity
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of activities to return
 *     responses:
 *       200:
 *         description: Successfully returns user's recent activity
 *       401:
 *         description: Unauthorized
 */
router.get("/user/activity", authenticate, getUserRecentActivity);

/**
 * @openapi
 * /api/user/transactions:
 *   get:
 *     summary: Get user's transaction history
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of transactions to return
 *     responses:
 *       200:
 *         description: Successfully returns user's transaction history
 *       401:
 *         description: Unauthorized
 */
router.get("/user/transactions", authenticate, getUserTransactionHistory);

/**
 * @openapi
 * /api/user/bets:
 *   get:
 *     summary: Get user's betting history
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of bets to return
 *     responses:
 *       200:
 *         description: Successfully returns user's betting history
 *       401:
 *         description: Unauthorized
 */
// Use PostgreSQL betting history instead of MongoDB
router.get("/user/bets", authenticate, getUserBettingHistory);

/**
 * @openapi
 * /api/user/balance:
 *   get:
 *     summary: Get user info and balance (legacy endpoint)
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns user info with balance
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
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     email:
 *                       type: string
 *                       example: johndoe@example.com
 *                     balance:
 *                       type: number
 *                       format: float
 *                       example: 100.50
 *       401:
 *         description: Unauthorized
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
 *                   example: Unauthorized
 */
router.get("/user/balance", authenticate, getUserBalance);

// =====================================================
// USER ACCOUNT MANAGEMENT ROUTES
// =====================================================

/**
 * @openapi
 * /api/user/profile/update:
 *   put:
 *     summary: Update user profile information
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 maxLength: 100
 *               last_name:
 *                 type: string
 *                 maxLength: 100
 *               phone_number:
 *                 type: string
 *                 maxLength: 20
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               nationality:
 *                 type: string
 *                 maxLength: 100
 *               country:
 *                 type: string
 *                 maxLength: 100
 *               city:
 *                 type: string
 *                 maxLength: 100
 *               address:
 *                 type: string
 *                 maxLength: 500
 *               postal_code:
 *                 type: string
 *                 maxLength: 20
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               timezone:
 *                 type: string
 *                 maxLength: 50
 *               language:
 *                 type: string
 *                 maxLength: 10
 *               currency:
 *                 type: string
 *                 maxLength: 3
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   description: Updated profile data
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.put("/user/profile/update", authenticate, validateRequest({ body: UpdateProfileInput }), updateUserProfile);

/**
 * @openapi
 * /api/user/password/change:
 *   put:
 *     summary: Change user password
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *               - confirm_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 description: Current password
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *                 description: New password minimum 8 characters
 *               confirm_password:
 *                 type: string
 *                 description: Confirm new password
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: Password changed successfully
 *       400:
 *         description: Invalid input or current password incorrect
 *       401:
 *         description: Unauthorized
 */
router.put("/user/password/change", authenticate, validateRequest({ body: ChangePasswordInput }), changeUserPassword);

/**
 * @openapi
 * /api/user/2fa/status:
 *   get:
 *     summary: Get 2FA status for a user
 *     description: |
 *       Returns the 2FA (Two-Factor Authentication) status for a user. If the request is unauthenticated, you must provide either a username or email as a query parameter. Only one is required.
 *     tags:
 *       - User
 *     parameters:
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: false
 *         description: Username of the user required if not authenticated
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: false
 *         description: Email of the user required if not authenticated
 *     responses:
 *       200:
 *         description: Successfully returns 2FA status
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
 *                     is_enabled:
 *                       type: boolean
 *                       description: Whether 2FA is currently enabled
 *                       example: true
 *                     has_secret:
 *                       type: boolean
 *                       description: Whether user has a 2FA secret
 *                       example: true
 *                     has_qr_code:
 *                       type: boolean
 *                       description: Whether user has a QR code
 *                       example: true
 *                     has_secret_setup:
 *                       type: boolean
 *                       description: Whether user has completed 2FA setup has secret but not enabled
 *                       example: true
 *                     can_skip:
 *                       type: boolean
 *                       description: Whether user can skip 2FA setup has secret but not enabled
 *                       example: true
 *       400:
 *         description: Missing username or email
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
 *                   example: Missing username or email
 *       404:
 *         description: User not found
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
 *                   example: User not found
 */
router.get("/user/2fa/status", get2FAStatus);

/**
 * @openapi
 * /api/user/2fa/enable:
 *   post:
 *     summary: Enable 2FA and return QR code
 *     description: Enables 2FA for the authenticated user and returns the QR code for setup
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
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
 *                     message:
 *                       type: string
 *                       example: 2FA enabled successfully
 *                     is_enabled:
 *                       type: boolean
 *                       example: true
 *                     qr_code:
 *                       type: string
 *                       description: SVG QR code for 2FA authentication
 *                       example: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\"...>"
 *                     auth_secret:
 *                       type: string
 *                       description: Secret key for QR code authentication
 *                       example: "STIIRABTLHHVDXW4"
 *       400:
 *         description: 2FA already enabled or no secret found
 *       401:
 *         description: Unauthorized
 */
router.post("/user/2fa/enable", authenticate, enable2FA);

/**
 * @openapi
 * /api/user/2fa/disable:
 *   post:
 *     summary: Disable 2FA
 *     description: Disables 2FA for the authenticated user
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
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
 *                     message:
 *                       type: string
 *                       example: 2FA disabled successfully
 *                     is_enabled:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: 2FA not currently enabled
 *       401:
 *         description: Unauthorized
 */
router.post("/user/2fa/disable", authenticate, disable2FA);

/**
 * @openapi
 * /api/user/2fa/skip:
 *   post:
 *     summary: Skip 2FA setup (for users who want to skip 2FA during registration)
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password for verification
 *     responses:
 *       200:
 *         description: 2FA setup skipped successfully
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
 *                     message:
 *                       type: string
 *                       example: 2FA setup skipped successfully
 *                     is_enabled:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Invalid password or 2FA already enabled
 *       401:
 *         description: Unauthorized
 */
router.post("/user/2fa/skip", authenticate, validateRequest({ body: Skip2FAInput }), skip2FA);

/**
 * @openapi
 * /api/home:
 *   get:
 *     summary: Get comprehensive home dashboard data
 *     tags:
 *       - Home
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns home dashboard data
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
 *                   example: Home data retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     featured_games:
 *                       type: array
 *                       description: Featured games for the homepage
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           provider:
 *                             type: string
 *                           thumbnail_url:
 *                             type: string
 *                           is_featured:
 *                             type: boolean
 *                     new_games:
 *                       type: array
 *                       description: Newly added games
 *                       items:
 *                         type: object
 *                     hot_games:
 *                       type: array
 *                       description: Currently trending games
 *                       items:
 *                         type: object
 *                     popular_games:
 *                       type: array
 *                       description: Most played games
 *                       items:
 *                         type: object
 *                     user_stats:
 *                       type: object
 *                       description: User statistics if authenticated
 *                       properties:
 *                         total_balance:
 *                           type: number
 *                           format: float
 *                         total_bets:
 *                           type: integer
 *                         total_wins:
 *                           type: number
 *                           format: float
 *                         favorite_games_count:
 *                           type: integer
 *                         level_name:
 *                           type: string
 *                         level_progress:
 *                           type: number
 *                           format: float
 *                     recent_activity:
 *                       type: array
 *                       description: User's recent activity if authenticated
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           game_name:
 *                             type: string
 *                           bet_amount:
 *                             type: number
 *                           outcome:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     promotions:
 *                       type: array
 *                       description: Active promotions
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           promo_type:
 *                             type: string
 *                           bonus_amount:
 *                             type: number
 *                           start_date:
 *                             type: string
 *                             format: date-time
 *                           end_date:
 *                             type: string
 *                             format: date-time
 *                     announcements:
 *                       type: array
 *                       description: System announcements
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           content:
 *                             type: string
 *                           announcement_type:
 *                             type: string
 *                           priority:
 *                             type: integer
 *                     quick_stats:
 *                       type: object
 *                       description: Platform statistics
 *                       properties:
 *                         total_games:
 *                           type: integer
 *                         total_categories:
 *                           type: integer
 *                         total_providers:
 *                           type: integer
 *                         active_players:
 *                           type: integer
 *       401:
 *         description: Unauthorized optional endpoint works without auth but with limited data
 */
router.get("/home", GetHome);

/**
 * @openapi
 * /api/games/categories:
 *   get:
 *     summary: Get all game categories
 *     tags:
 *       - Game
 *     responses:
 *       200:
 *         description: Successfully returns game categories
 */
router.get("/games/categories", getGameCategories);

/**
 * @openapi
 * /api/games/providers:
 *   get:
 *     summary: Get all game providers
 *     tags:
 *       - Game
 *     responses:
 *       200:
 *         description: Successfully returns game providers
 */
router.get("/games/providers", getGameProviders);

/**
 * @openapi
 * /api/games/featured:
 *   get:
 *     summary: Get featured games
 *     tags:
 *       - Game
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of featured games to return
 *     responses:
 *       200:
 *         description: Successfully returns featured games
 */
router.get("/games/featured", getFeaturedGames);

/**
 * @openapi
 * /api/games/new:
 *   get:
 *     summary: Get new games
 *     tags:
 *       - Game
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of new games to return
 *     responses:
 *       200:
 *         description: Successfully returns new games
 */
router.get("/games/new", getNewGames);

/**
 * @openapi
 * /api/games/hot:
 *   get:
 *     summary: Get hot games
 *     tags:
 *       - Game
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of hot games to return
 *     responses:
 *       200:
 *         description: Successfully returns hot games
 */
router.get("/games/hot", getHotGames);

/**
 * @openapi
 * /api/games/popular:
 *   get:
 *     summary: Get popular games
 *     tags:
 *       - Game
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of popular games to return
 *     responses:
 *       200:
 *         description: Successfully returns popular games
 */
router.get("/games/popular", getPopularGames);

/**
 * @openapi
 * /api/games/cate:
 *   get:
 *     summary: Get games by category with simplified data
 *     tags:
 *       - Game
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by game category (e.g., slots, tablegame, crashgame)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of games to return
 *     responses:
 *       200:
 *         description: Successfully returns games by category with simplified data
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
 *                         example: 39
 *                       name:
 *                         type: string
 *                         example: "Aztec Temple"
 *                       provider:
 *                         type: string
 *                         example: "iconix"
 *                       category:
 *                         type: string
 *                         example: "slots"
 *                       subcategory:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       image_url:
 *                         type: string
 *                         example: "https://media.oiuyoiuyjjjy.com/2/iconix/440x590/2.png"
 *                       thumbnail_url:
 *                         type: string
 *                         example: "https://media.oiuyoiuyjjjy.com/2/iconix/300x300/2.png"
 *                       game_code:
 *                         type: string
 *                         example: "2"
 *                       rtp_percentage:
 *                         type: number
 *                         nullable: true
 *                         example: null
 *                       volatility:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       min_bet:
 *                         type: string
 *                         example: "1.00"
 *                       max_bet:
 *                         type: string
 *                         example: "50.00"
 *                       max_win:
 *                         type: number
 *                         nullable: true
 *                         example: null
 *                       is_featured:
 *                         type: boolean
 *                         example: true
 *                       is_new:
 *                         type: boolean
 *                         example: false
 *                       is_hot:
 *                         type: boolean
 *                         example: true
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-07-07T15:33:45.021Z"
 *       400:
 *         description: Invalid filter parameters
 */
router.get("/games/cate", validateRequest({ query: GameCategoryFiltersSchema }), getGamesByCategory);

/**
 * @openapi
 * /api/games/{id}:
 *   get:
 *     summary: Get game by ID
 *     tags:
 *       - Game
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Game ID
 *     responses:
 *       200:
 *         description: Successfully returns game details
 *       404:
 *         description: Game not found
 */
router.get("/games/:id", getGameById);

/**
 * @openapi
 * /api/games:
 *   get:
 *     summary: Get all available games with filtering
 *     tags:
 *       - Game
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by game category
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *         description: Filter by game provider
 *       - in: query
 *         name: is_featured
 *         schema:
 *           type: boolean
 *         description: Filter featured games
 *       - in: query
 *         name: is_new
 *         schema:
 *           type: boolean
 *         description: Filter new games
 *       - in: query
 *         name: is_hot
 *         schema:
 *           type: boolean
 *         description: Filter hot games
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search games by name or provider
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of games to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of games to skip
 *     responses:
 *       200:
 *         description: Successfully returns filtered games
 *       400:
 *         description: Invalid filter parameters
 */
router.get("/games", validateRequest({ query: GameFiltersSchema }), getAvailableGames);

/**
 * @openapi
 * /api/games/{id}/statistics:
 *   get:
 *     summary: Get game statistics
 *     tags:
 *       - Game
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Game ID
 *     responses:
 *       200:
 *         description: Successfully returns game statistics
 *       404:
 *         description: Game not found
 */
router.get("/games/:id/statistics", getGameStatistics);

/**
 * @openapi
 * /api/games/favorite:
 *   post:
 *     summary: Toggle game favorite status
 *     tags:
 *       - Game
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
 *             properties:
 *               game_id:
 *                 type: integer
 *                 description: Game ID to toggle favorite
 *     responses:
 *       200:
 *         description: Successfully toggled favorite status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Game not found
 */
router.post("/games/favorite", authenticate, validateRequest({ body: ToggleGameFavoriteSchema }), toggleGameFavorite);

/**
 * @openapi
 * /api/games/play:
 *   post:
 *     summary: Get play URL and game info from provider
 *     tags:
 *       - Game
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
 *             properties:
 *               game_id:
 *                 type: integer
 *                 description: Game ID to play
 *     responses:
 *       200:
 *         description: Successfully returns play URL and game info
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
 *                     play_url:
 *                       type: string
 *                     game:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.post("/games/play", authenticate, validateRequest({ body: PlayGameSchema }), playGame);

/**
 * @openapi
 * /api/game/proxy/{sessionId}:
 *   get:
 *     summary: Proxy game content with masked IP
 *     tags:
 *       - Game
 *     description: Serves game iframe content through a proxy to mask the player's real IP address with a configurable IP (default Gibraltar)
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Proxy session ID generated when launching the game
 *     responses:
 *       200:
 *         description: Successfully proxied game content
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Session not found or expired
 *       500:
 *         description: Error loading game content
 */
// Game proxy routes - handle both initial HTML and all subsequent requests
// Using regex to match sessionId followed by optional path
router.all(/^\/game\/proxy\/([^\/]+)(.*)$/, proxyGameContent);

/**
 * @openapi
 * /api/games/bet:
 *   post:
 *     summary: Place a bet on a game
 *     tags:
 *       - Game
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
 *               - bet_amount
 *             properties:
 *               game_id:
 *                 type: integer
 *                 description: Game ID
 *               bet_amount:
 *                 type: number
 *                 description: Bet amount
 *               game_data:
 *                 type: object
 *                 description: Optional game-specific data. If omitted, the backend will auto-generate a valid sample for the specified game_id and bet_amount.
 *           examples:
 *             minimal:
 *               summary: Minimal bet (auto-generate game_data)
 *               value:
 *                 game_id: 53
 *                 bet_amount: 100
 *             full:
 *               summary: Full bet with explicit game_data
 *               value:
 *                 game_id: 53
 *                 bet_amount: 15
 *                 game_data:
 *                   bets:
 *                     - bet_type: straight
 *                       number: 17
 *                       chips: 5
 *                     - bet_type: red
 *                       chips: 10
 *                   session_id: roul-YYYYMMDD-001
 *     responses:
 *       200:
 *         description: Successfully placed bet
 *       400:
 *         description: Invalid bet amount or insufficient balance
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Game not found
 */
router.post("/games/bet", authenticate, validateRequest({ body: PlaceBetSchema }), placeBet);

/**
 * @openapi
 * /api/games/bet/result:
 *   post:
 *     summary: Process bet result (admin only)
 *     tags:
 *       - Game
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bet_id
 *               - outcome
 *             properties:
 *               bet_id:
 *                 type: integer
 *                 description: Bet ID
 *               outcome:
 *                 type: string
 *                 enum: [win, lose]
 *                 description: Bet outcome
 *               win_amount:
 *                 type: number
 *                 description: Win amount if outcome is win
 *               game_result:
 *                 type: object
 *                 description: Optional game result data
 *     responses:
 *       200:
 *         description: Successfully processed bet result
 *       400:
 *         description: Invalid bet data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Bet not found
 */
router.post("/games/bet/result", authenticate, adminAuth, validateRequest({ body: ProcessBetResultSchema }), processBetResult);

/**
 * @openapi
 * /api/games/bet/result:
 *   get:
 *     summary: Get bet results
 *     tags:
 *       - Game
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of results to return
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin only filter by user ID
 *     responses:
 *       200:
 *         description: Successfully returns bet results
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
 *       401:
 *         description: Unauthorized
 */
router.get("/games/bet/result", authenticate, getBetResults);

/**
 * @openapi
 * /api/games/cancel:
 *   post:
 *     summary: Cancel a game transaction (bet or win)
 *     tags:
 *       - Game
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transaction_id
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 description: Transaction ID to cancel
 *                 example: "2223977"
 *               game_id:
 *                 type: integer
 *                 description: Optional game ID for reference
 *                 example: 53
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional reason for cancellation
 *                 example: "User requested cancellation"
 *           examples:
 *             cancel_bet:
 *               summary: Cancel a bet transaction
 *               value:
 *                 transaction_id: "2223977"
 *                 game_id: 53
 *                 reason: "User requested bet cancellation"
 *             cancel_win:
 *               summary: Cancel a win transaction
 *               value:
 *                 transaction_id: "2223978"
 *                 game_id: 53
 *                 reason: "User requested win cancellation"
 *     responses:
 *       200:
 *         description: Transaction cancelled successfully
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
 *                   example: "Transaction cancelled successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction_id:
 *                       type: string
 *                       example: "2223977"
 *                     original_type:
 *                       type: string
 *                       example: "bet"
 *                     original_amount:
 *                       type: number
 *                       example: 0.15
 *                     balance_adjustment:
 *                       type: number
 *                       example: 0.15
 *                     new_balance:
 *                       type: number
 *                       example: 1499.34
 *                     currency:
 *                       type: string
 *                       example: "USD"
 *                     category:
 *                       type: string
 *                       nullable: true
 *                       example: "slot"
 *                     adjustment_transaction_id:
 *                       type: integer
 *                       example: 12345
 *       400:
 *         description: Invalid request data or transaction cannot be cancelled
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
 *                   example: "Transaction not found or already cancelled"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.post("/games/cancel", authenticate, validateRequest({ body: CancelGameSchema }), cancelGame);

// Legacy game endpoint for backward compatibility
/**
 * @openapi
 * /api/game/available:
 *   get:
 *     summary: Get Available Casino Games (legacy endpoint)
 *     tags:
 *       - Game
 *     responses:
 *       200:
 *         description: List of available casino games
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 games:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Blackjack
 */
router.get("/game/available", getAvailableGamesLegacy);

/**
 * @openapi
 * /api/user/activity-summary:
 *   get:
 *     summary: Get comprehensive user activity summary
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns comprehensive user activity summary
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
 *                     user_id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     total_actions:
 *                       type: integer
 *                       example: 150
 *                     active_days:
 *                       type: integer
 *                       example: 25
 *                     last_activity:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     unique_actions:
 *                       type: integer
 *                       example: 12
 *                     login_count:
 *                       type: integer
 *                       example: 45
 *                     gaming_actions:
 *                       type: integer
 *                       example: 80
 *                     financial_actions:
 *                       type: integer
 *                       example: 25
 *                     total_bets:
 *                       type: integer
 *                       example: 50
 *                     total_wagered:
 *                       type: number
 *                       format: float
 *                       example: 1250.75
 *                     total_won:
 *                       type: number
 *                       format: float
 *                       example: 1350.25
 *                     games_played:
 *                       type: integer
 *                       example: 15
 *                     total_transactions:
 *                       type: integer
 *                       example: 30
 *                     deposit_count:
 *                       type: integer
 *                       example: 20
 *                     withdrawal_count:
 *                       type: integer
 *                       example: 10
 *                     total_deposited:
 *                       type: number
 *                       format: float
 *                       example: 2000.00
 *                     total_withdrawn:
 *                       type: number
 *                       format: float
 *                       example: 500.00
 *                     total_sessions:
 *                       type: integer
 *                       example: 45
 *                     current_level:
 *                       type: string
 *                       example: "Silver"
 *                     current_points:
 *                       type: integer
 *                       example: 2500
 *                     balance:
 *                       type: number
 *                       format: float
 *                       example: 150.50
 *       401:
 *         description: Unauthorized
 */
router.get("/user/activity-summary", authenticate, getUserActivitySummary);

/**
 * @openapi
 * /api/games/{id}/game-data-sample:
 *   get:
 *     summary: Get a sample game_data object for the specified game
 *     tags:
 *       - Game
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Game ID
 *     responses:
 *       200:
 *         description: Returns a sample game_data object for the game
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       description: Roulette example
 *                       properties:
 *                         bets:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               bet_type:
 *                                 type: string
 *                                 example: straight
 *                               number:
 *                                 type: integer
 *                                 example: 17
 *                               chips:
 *                                 type: integer
 *                                 example: 5
 *                         session_id:
 *                           type: string
 *                           example: roul-YYYYMMDD-001
 *                     - type: object
 *                       description: Blackjack example
 *                       properties:
 *                         hand_id:
 *                           type: string
 *                           example: bj-YYYYMMDD-001
 *                         action:
 *                           type: string
 *                           example: hit
 *                         player_cards:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["10H", "7C"]
 *                         dealer_card:
 *                           type: string
 *                           example: 9S
 *                     - type: object
 *                       description: Slot example
 *                       properties:
 *                         lines:
 *                           type: integer
 *                           example: 20
 *                         bet_per_line:
 *                           type: integer
 *                           example: 1
 *                         spin_id:
 *                           type: string
 *                           example: slot-YYYYMMDD-001
 *       404:
 *         description: Game not found
 */
router.get("/games/:id/game-data-sample", getGameDataSample);

/**
 * @openapi
 * /api/user/game-bets:
 *   get:
 *     summary: Get per-game bet/win/loss stats for the authenticated user
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns per-game stats
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
 *                       game_id:
 *                         type: integer
 *                         example: 53
 *                       game_name:
 *                         type: string
 *                         example: "American Roulette"
 *                       total_bet:
 *                         type: number
 *                         example: 1000
 *                       total_win:
 *                         type: number
 *                         example: 500
 *                       total_loss:
 *                         type: number
 *                         example: 500
 *                       last_bet_at:
 *                         type: string
 *                         format: date-time
 *                       last_result_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/user/game-bets", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    
    const { MongoHybridService } = require("../services/mongo/mongo-hybrid.service");
    const mongoHybridService = new MongoHybridService();
    
    // Get category balances from MongoDB
    const categoryBalances = await mongoHybridService.getUserCategoryBalances(userId);
    
    // Get game data from PostgreSQL
    const pool = require("../db/postgres").default;
    const enrichedBalances = await Promise.all(categoryBalances.map(async (balance: any) => {
      // Get game stats for this category
      const gameStatsResult = await pool.query(
        'SELECT COUNT(*) as game_count FROM games WHERE category = $1 AND is_active = true',
        [balance.category]
      );
      
      return {
        category: balance.category,
        balance: balance.balance,
        game_count: parseInt(gameStatsResult.rows[0]?.game_count || 0)
      };
    }));
    
    res.json({ success: true, data: enrichedBalances });
  } catch (error) {
    console.error('Error fetching user game bets:', error);
    res.status(500).json({ success: false, message: 'Error fetching game bets' });
  }
});

// Add more routes:
  // router.post("/login", login)
  // router.get("/wallet/balance", checkWallet)

// =====================================================
// PAYMENT ROUTES (User-facing)
// =====================================================

/**
 * @openapi
 * /api/payment/gateways:
 *   get:
 *     summary: Get all payment gateways (user)
 *     tags:
 *       - Payment
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Available payment gateways retrieved successfully
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
 *                         description: Gateway ID
 *                         example: 1
 *                       name:
 *                         type: string
 *                         description: Gateway name
 *                         example: "Oxapay"
 *                       code:
 *                         type: string
 *                         description: Gateway code
 *                         example: "oxapay"
 *                       type:
 *                         type: string
 *                         enum: [deposit, withdrawal, both]
 *                         description: Supported transaction types
 *                         example: "both"
 *                       description:
 *                         type: string
 *                         description: Gateway description
 *                         example: "Crypto payment gateway supporting multiple digital assets"
 *                       logo_url:
 *                         type: string
 *                         format: uri
 *                         description: Gateway logo URL
 *                         example: "https://example.com/oxapay-logo.png"
 *                       website_url:
 *                         type: string
 *                         format: uri
 *                         description: Gateway website URL
 *                         example: "https://oxapay.com"
 *                       supported_currencies:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Supported currencies
 *                         example: ["USDT", "BTC", "ETH"]
 *                       supported_countries:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Supported countries
 *                         example: ["ALL"]
 *                       min_amount:
 *                         type: number
 *                         format: float
 *                         description: Minimum transaction amount
 *                         example: 5.00
 *                       max_amount:
 *                         type: number
 *                         format: float
 *                         description: Maximum transaction amount
 *                         example: 10000.00
 *                       processing_time:
 *                         type: string
 *                         description: Processing time
 *                         example: "instant"
 *                       fees_percentage:
 *                         type: number
 *                         format: float
 *                         description: Percentage fee
 *                         example: 1.00
 *                       fees_fixed:
 *                         type: number
 *                         format: float
 *                         description: Fixed fee
 *                         example: 0
 *                       auto_approval:
 *                         type: boolean
 *                         description: Whether transactions are auto-approved
 *                         example: true
 *                       requires_kyc:
 *                         type: boolean
 *                         description: Whether KYC is required
 *                         example: false
 *             examples:
 *               oxapay_gateway:
 *                 summary: Oxapay gateway example
 *                 value:
 *                   success: true
 *                   data:
 *                     - id: 1
 *                       name: "Oxapay"
 *                       code: "oxapay"
 *                       type: "both"
 *                       description: "Crypto payment gateway supporting multiple digital assets"
 *                       logo_url: "https://example.com/oxapay-logo.png"
 *                       website_url: "https://oxapay.com"
 *                       supported_currencies: ["USDT", "BTC", "ETH"]
 *                       supported_countries: ["ALL"]
 *                       min_amount: 5.00
 *                       max_amount: 10000.00
 *                       processing_time: "instant"
 *                       fees_percentage: 1.00
 *                       fees_fixed: 0
 *                       auto_approval: true
 *                       requires_kyc: false
 *       401:
 *         description: Unauthorized
 */
router.get("/payment/gateways", authenticate, validateRequest({ query: PaymentGatewayFiltersInput }), async (req, res) => {
  try {
    const filters = req.query as any;
    const gateways = await getPaymentGatewaysService(filters);
    res.status(200).json({ success: true, data: gateways });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/payment/create:
 *   post:
 *     summary: User deposit via selected payment gateway
 *     tags:
 *       - Payment Gateway
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gateway_code, amount, currency]
 *             properties:
 *               gateway_code:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deposit initiated
 */
router.post("/payment/create", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { gateway_id, amount, currency, type, description, return_url, cancel_url, metadata } = req.body;

    if (!gateway_id || amount === undefined || amount === null || !currency || !type) {
      res.status(400).json({ success: false, message: "Missing required fields: gateway_id, amount, currency, and type are required" });
      return;
    }

    // Get payment gateway
    const { getPaymentGatewayByIdService } = require("../services/admin/payment-gateway.service");
    const gateway = await getPaymentGatewayByIdService(gateway_id);
    
    if (!gateway || !gateway.is_active) {
      res.status(404).json({ success: false, message: "Payment gateway not found or inactive" });
      return;
    }

    // Validate amount
    if (gateway.min_amount && amount < gateway.min_amount) {
      res.status(400).json({ success: false, message: `Minimum amount is ${gateway.min_amount} ${currency}` });
      return;
    }

    if (gateway.max_amount && amount > gateway.max_amount) {
      res.status(400).json({ success: false, message: `Maximum amount is ${gateway.max_amount} ${currency}` });
      return;
    }

    // Validate currency support
    if (gateway.supported_currencies && !gateway.supported_currencies.includes(currency)) {
      res.status(400).json({ success: false, message: `Currency ${currency} not supported by this gateway` });
      return;
    }

    // Create payment using integration service
    const { PaymentIntegrationService } = require("../services/payment/payment-integration.service");
    const paymentService = PaymentIntegrationService.getInstance();
    
    const config = {
      api_key: gateway.api_key,
      api_secret: gateway.api_secret,
      api_endpoint: gateway.api_endpoint,
      merchant_id: gateway.merchant_id,
      payout_api_key: gateway.payout_api_key,
      webhook_url: gateway.webhook_url,
      webhook_secret: gateway.webhook_secret,
      config: gateway.config,
    };

    const orderId = `${gateway.code}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentRequest = {
      amount,
      currency,
      order_id: orderId,
      customer_email: (req as any).user?.email,
      customer_name: `${(req as any).user?.first_name || ''} ${(req as any).user?.last_name || ''}`.trim(),
      description: description || `${type} payment`,
      return_url: return_url || `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: cancel_url || `${process.env.FRONTEND_URL}/payment/cancel`,
      metadata: {
        user_id: userId,
        gateway_id: gateway_id,
        type: type,
        ...metadata // Include any additional metadata
      }
    };

    const paymentResponse = await paymentService.createPayment(gateway.code, config, paymentRequest);

    if (!paymentResponse.success) {
      res.status(400).json({ success: false, message: paymentResponse.message });
      return;
    }

    // Save transaction to database (you'll need to implement this)
    // const transaction = await createTransactionService({
    //   user_id: userId,
    //   gateway_id: gateway_id,
    //   amount: amount,
    //   currency: currency,
    //   type: type,
    //   status: paymentResponse.status,
    //   transaction_id: paymentResponse.transaction_id,
    //   payment_url: paymentResponse.payment_url,
    //   gateway_response: paymentResponse.gateway_response
    // });

    res.status(200).json({
      success: true,
      data: {
        transaction_id: paymentResponse.transaction_id,
        payment_url: paymentResponse.payment_url,
        status: paymentResponse.status,
        amount: amount,
        currency: currency,
        gateway_name: gateway.name,
        order_id: orderId
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/payment/withdraw:
 *   post:
 *     summary: User withdraw via selected payment gateway
 *     tags:
 *       - Payment Gateway
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gateway_code, amount, currency, address]
 *             properties:
 *               gateway_code:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               address:
 *                 type: string
 *               network:
 *                 type: string
 *               memo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal initiated
 */
router.post("/payment/withdraw", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { gateway_code, amount, currency, address, network, memo } = req.body;

    if (!gateway_code || !amount || !currency || !address) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    // Get payment gateway
    const { getPaymentGatewayByCodeService } = require("../services/admin/payment-gateway.service");
    const gateway = await getPaymentGatewayByCodeService(gateway_code);
    
    if (!gateway || !gateway.is_active) {
      res.status(404).json({ success: false, message: "Payment gateway not found or inactive" });
      return;
    }

    // Validate amount
    if (gateway.min_amount && amount < gateway.min_amount) {
      res.status(400).json({ success: false, message: `Minimum amount is ${gateway.min_amount} ${currency}` });
      return;
    }

    if (gateway.max_amount && amount > gateway.max_amount) {
      res.status(400).json({ success: false, message: `Maximum amount is ${gateway.max_amount} ${currency}` });
      return;
    }

    // Validate currency support
    if (gateway.supported_currencies && !gateway.supported_currencies.includes(currency)) {
      res.status(400).json({ success: false, message: `Currency ${currency} not supported by this gateway` });
      return;
    }

    // Create withdrawal using integration service
    const { PaymentIntegrationService } = require("../services/payment/payment-integration.service");
    const paymentService = PaymentIntegrationService.getInstance();
    
    const config = {
      api_key: gateway.api_key,
      api_secret: gateway.api_secret,
      api_endpoint: gateway.api_endpoint,
      merchant_id: gateway.merchant_id,
      payout_api_key: gateway.payout_api_key,
      webhook_url: gateway.webhook_url,
      webhook_secret: gateway.webhook_secret,
      config: gateway.config,
    };

    const orderId = `${gateway.code}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const withdrawalRequest = {
      amount,
      currency,
      order_id: orderId,
      customer_email: (req as any).user?.email,
      customer_name: `${(req as any).user?.first_name || ''} ${(req as any).user?.last_name || ''}`.trim(),
      description: `Withdrawal to ${address}`,
      return_url: `${process.env.FRONTEND_URL}/payment/success`, // Placeholder, adjust as needed
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`, // Placeholder, adjust as needed
      metadata: {
        user_id: userId,
        gateway_id: gateway.id,
        type: 'withdrawal',
        address: address,
        network: network,
        memo: memo,
        ...(network ? { network: network } : {}),
        ...(memo ? { memo: memo } : {})
      }
    };

    const withdrawalResponse = await paymentService.createWithdrawal(gateway.code, config, withdrawalRequest);

    if (!withdrawalResponse.success) {
      res.status(400).json({ success: false, message: withdrawalResponse.message });
      return;
    }

    // Create transaction record in database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check user balance before creating withdrawal
      const { BalanceService } = require("../services/user/balance.service");
      const currentBalance = await BalanceService.calculateRealTimeBalance(userId);
      
      if (currentBalance.balance < amount) {
        throw new Error(`Insufficient balance. Available: ${currentBalance.balance}, Required: ${amount}`);
      }

      // Create withdrawal transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, description, metadata, reference_id, external_reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          userId,
          'withdrawal',
          amount,
          currency,
          withdrawalResponse.status || 'pending',
          `Withdrawal via ${gateway.code} to ${address}`,
          JSON.stringify({
            gateway_code,
            gateway_id: gateway.id,
            address: address,
            network: network,
            memo: memo,
            gateway_response: withdrawalResponse.gateway_response,
            payment_url: withdrawalResponse.payment_url
          }),
          orderId,
          withdrawalResponse.transaction_id
        ]
      );

      // Deduct balance immediately for withdrawal
      const balanceResult = await BalanceService.processTransaction({
        user_id: userId,
        type: 'withdrawal',
        amount: amount,
        currency: currency,
        description: `Withdrawal of ${currency} ${amount} via ${gateway.code}`,
        external_reference: withdrawalResponse.transaction_id,
        metadata: {
          gateway_code,
          original_transaction_id: transactionResult.rows[0].id,
          address: address,
          network: network,
          memo: memo
        }
      }, client);

      // Log activity
      await logUserActivity({
        userId,
        action: "create_withdrawal",
        category: "financial",
        description: `Created ${currency} ${amount} withdrawal via ${gateway.code}`,
        metadata: { 
          transaction_id: transactionResult.rows[0].id, 
          gateway_code,
          address: address,
          balance_before: balanceResult.balance_before,
          balance_after: balanceResult.balance_after
        }
      });

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        data: {
          transaction_id: transactionResult.rows[0].id,
          gateway_transaction_id: withdrawalResponse.transaction_id,
          payment_url: withdrawalResponse.payment_url,
          status: withdrawalResponse.status || 'pending',
          amount: amount,
          currency: currency,
          gateway_name: gateway.name,
          order_id: orderId
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating withdrawal transaction:', error);
      res.status(500).json({ success: false, message: 'Failed to create withdrawal transaction' });
    } finally {
      client.release();
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/payment/status/{transaction_id}:
 *   get:
 *     summary: Check payment status
 *     tags:
 *       - Payment
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transaction_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.get("/payment/status/:transaction_id", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { transaction_id } = req.params;

    // Get transaction from database (you'll need to implement this)
    // const transaction = await getTransactionByUserIdAndTransactionId(userId, transaction_id);
    // if (!transaction) {
    //   res.status(404).json({ success: false, message: "Transaction not found" });
    //   return;
    // }

    // Get payment gateway
    // const gateway = await getPaymentGatewayByIdService(transaction.gateway_id);
    
    // Check status using integration service
    // const { PaymentIntegrationService } = require("../services/payment/payment-integration.service");
    // const paymentService = PaymentIntegrationService.getInstance();
    
    // const config = {
    //   api_key: gateway.api_key,
    //   api_secret: gateway.api_secret,
    //   api_endpoint: gateway.api_endpoint,
    //   webhook_url: gateway.webhook_url,
    //   webhook_secret: gateway.webhook_secret,
    //   config: gateway.config,
    // };

    // const statusResponse = await paymentService.checkPaymentStatus(gateway.code, config, transaction_id);

    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        transaction_id: transaction_id,
        status: "pending",
        message: "Status check not implemented yet"
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/payment/webhook/igpx:
 *   post:
 *     summary: IGPX Sportsbook webhook endpoint
 *     tags:
 *       - Payment
 *     description: |
 *       Handles transaction callbacks from IGPX Sportsbook provider.
 *       Supports bet, result, and rollback transactions.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 description: IGPX transaction ID
 *               action:
 *                 type: string
 *                 enum: [bet, result, rollback]
 *                 description: Transaction action type
 *               user_id:
 *                 type: string
 *                 description: User ID from start-session
 *               currency:
 *                 type: string
 *                 description: Currency code
 *               amount:
 *                 type: number
 *                 description: Transaction amount
 *               rollback_transaction_id:
 *                 type: string
 *                 description: Original transaction ID for rollbacks
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   nullable: true
 *                   description: Error message if any, null if successful
 *       400:
 *         description: Invalid webhook data
 *       401:
 *         description: Invalid security hash
 */

/**
 * @openapi
 * /api/payment/webhook/oxapay:
 *   post:
 *     summary: OxaPay webhook endpoint
 *     tags:
 *       - Payment
 *     description: |
 *       Handles payment callbacks from OxaPay cryptocurrency payment gateway.
 *       Processes deposit confirmations and updates user balances automatically.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - invoice_id
 *               - amount
 *               - currency
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [paid, confirmed, expired, cancelled, failed]
 *                 description: Payment status from OxaPay
 *               invoice_id:
 *                 type: string
 *                 description: OxaPay invoice ID
 *               order_id:
 *                 type: string
 *                 description: Original order ID (optional)
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Payment currency (e.g., USDT, BTC, ETH)
 *               network:
 *                 type: string
 *                 description: Blockchain network used (e.g., TRC20, ERC20)
 *               txid:
 *                 type: string
 *                 description: Blockchain transaction ID
 *               confirmations:
 *                 type: integer
 *                 description: Number of blockchain confirmations
 *     responses:
 *       200:
 *         description: Webhook processed successfully
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
 *                   example: "Webhook processed successfully"
 *       400:
 *         description: Invalid webhook data or gateway not found
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal server error
 */
router.post("/payment/webhook/igpx", async (req, res) => {
  try {
    const webhookData = req.body;
    const securityHash = req.headers['x-security-hash'] as string;

    // Get raw body for HMAC verification (IGPX requires raw body, not parsed JSON)
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Get IGPX gateway configuration
    const { getPaymentGatewayByCodeService } = require("../services/admin/payment-gateway.service");
    const gateway = await getPaymentGatewayByCodeService('igpx');

    if (!gateway || !gateway.is_active) {
      console.error('IGPX gateway not found or inactive');
      res.status(400).json({ error: "IGPX gateway not available" });
      return;
    }

    // Verify HMAC signature using raw body
    if (securityHash && gateway.webhook_secret) {
      const crypto = require('crypto');
      const expectedHash = crypto
        .createHmac('sha256', gateway.webhook_secret)
        .update(rawBody)
        .digest('hex');

      if (securityHash !== expectedHash) {
        console.error('IGPX webhook: Invalid security hash', {
          received: securityHash,
          expected: expectedHash,
          rawBody: rawBody
        });
        res.status(400).json({ error: "Invalid security hash" });
        return;
      }
    }

    // Process webhook using integration service
    const { PaymentIntegrationService } = require("../services/payment/payment-integration.service");
    const paymentService = PaymentIntegrationService.getInstance();

    const config = {
      api_key: gateway.api_key,
      api_secret: gateway.api_secret,
      api_endpoint: gateway.api_endpoint,
      merchant_id: gateway.merchant_id,
      payout_api_key: gateway.payout_api_key,
      webhook_url: gateway.webhook_url,
      webhook_secret: gateway.webhook_secret,
      config: gateway.config,
    };

    // Pass webhook data without signature (already verified above)
    const webhookResult = await paymentService.processWebhook('igpx', config, webhookData, undefined);

    if (!webhookResult.success) {
      console.error('IGPX webhook processing failed:', webhookResult.message);
      res.status(400).json({ error: webhookResult.message });
      return;
    }

    // Handle the transaction based on the webhook result
    const { BalanceService } = require("../services/user/balance.service");
    const userId = parseInt(webhookResult.user_id || '0');
    
    if (userId > 0) {
      if (webhookResult.type === 'withdrawal') {
        // Bet placed - deduct from balance
        await BalanceService.deductBalance(userId, webhookResult.amount || 0, 'IGPX Sportsbook Bet', {
          igpx_transaction_id: webhookResult.transaction_id,
          igpx_action: webhookResult.metadata?.igpx_action
        });
      } else if (webhookResult.type === 'deposit') {
        // Result/win - add to balance
        await BalanceService.addBalance(userId, webhookResult.amount || 0, 'IGPX Sportsbook Result', {
          igpx_transaction_id: webhookResult.transaction_id,
          igpx_action: webhookResult.metadata?.igpx_action
        });
      }
    }

    // Log the webhook
    console.log('IGPX webhook processed successfully:', {
      transaction_id: webhookResult.transaction_id,
      action: webhookResult.metadata?.igpx_action,
      user_id: userId,
      amount: webhookResult.amount,
      type: webhookResult.type
    });

    // Return success response as per IGPX API spec
    res.status(200).json({ error: null });
  } catch (error: any) {
    console.error('IGPX webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OxaPay webhook endpoint
router.post("/payment/webhook/oxapay", async (req, res) => {
  try {
    // Import the handleWebhook function from payment controller
    const { handleWebhook } = require("../api/payment/payment.controller");
    
    // Call the handleWebhook function with the request
    await handleWebhook(req, res, (error: any) => {
      if (error) {
        console.error('OxaPay webhook error:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });
  } catch (error: any) {
    console.error('OxaPay webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/payment/webhook/{gateway_code}:
 *   post:
 *     summary: Generic payment gateway webhook endpoint
 *     tags:
 *       - Payment
 *     description: |
 *       Generic webhook endpoint for all payment gateways.
 *       Supports dynamic gateway code routing for webhook processing.
 *     parameters:
 *       - in: path
 *         name: gateway_code
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment gateway code (e.g., stripe, paypal, oxapay, razorpay, crypto)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Webhook payload varies by gateway
 *     responses:
 *       200:
 *         description: Webhook processed successfully
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
 *                   example: "Webhook processed successfully"
 *       400:
 *         description: Invalid webhook data or gateway not found
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Internal server error
 */
// Generic webhook endpoint for all payment gateways
router.post("/payment/webhook/:gateway_code", async (req, res) => {
  try {
    // Import the handleWebhook function from payment controller
    const { handleWebhook } = require("../api/payment/payment.controller");
    
    // Call the handleWebhook function with the request
    await handleWebhook(req, res, (error: any) => {
      if (error) {
        console.error(`Webhook error for gateway ${req.params.gateway_code}:`, error);
        res.status(500).json({ success: false, message: error.message });
      }
    });
  } catch (error: any) {
    console.error(`Webhook error for gateway ${req.params.gateway_code}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Import provider callback routes
import providerCallbackRoutes from "./provider-callback.routes";

// Provider callback endpoints - mount with correct prefix
router.use("/provider-callback", providerCallbackRoutes);

/**
 * @openapi
 * /api/debug/provider-config:
 *   get:
 *     summary: Debug provider configuration (admin only)
 *     tags:
 *       - Debug
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Provider configuration debug info
 *       401:
 *         description: Unauthorized
 */
router.get("/debug/provider-config", authenticate, adminAuth, async (req, res) => {
  try {
    const config = {
      supplier_launch_host: process.env.SUPPLIER_LAUNCH_HOST || 'NOT SET',
      supplier_operator_id: process.env.SUPPLIER_OPERATOR_ID || 'NOT SET',
      supplier_secret_key: process.env.SUPPLIER_SECRET_KEY ? 'SET' : 'NOT SET',
      supplier_api_key: process.env.SUPPLIER_API_KEY ? 'SET' : 'NOT SET',
      operator_home_url: process.env.OPERATOR_HOME_URL || 'https://backend.jackpotx.net',
      callback_url: `${process.env.OPERATOR_HOME_URL || 'https://backend.jackpotx.net'}/innova`,
      changebalance_url: `${process.env.OPERATOR_HOME_URL || 'https://backend.jackpotx.net'}/innova/changebalance`
    };

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/debug/test-token/{userId}:
 *   get:
 *     summary: Test token generation for a user (admin only)
 *     tags:
 *       - Debug
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to test token generation
 *     responses:
 *       200:
 *         description: Test token generated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/debug/test-token/:userId", authenticate, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    // Check if user exists
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.email, up.currency, ub.balance 
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       LEFT JOIN user_balances ub ON u.id = ub.user_id 
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const user = userResult.rows[0];
    
    // Generate test token
    const crypto = require('crypto');
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const baseString = `${userId}_test_${timestamp}_${randomBytes}`;
    const token = crypto.createHash('sha1').update(baseString).digest('hex').substring(0, 32);

    // Insert test token
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 30);
    await pool.query(
      `INSERT INTO tokens (user_id, access_token, refresh_token, expired_at, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (access_token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         refresh_token = EXCLUDED.refresh_token,
         expired_at = EXCLUDED.expired_at,
         is_active = EXCLUDED.is_active
      `,
      [userId, token, 'test_refresh_token', tokenExpiry, true]
    );

    res.status(200).json({
      success: true,
      data: {
        user_id: userId,
        username: user.username,
        email: user.email,
        balance: user.balance || 0,
        currency: user.currency || 'USD',
        test_token: token,
        token_expiry: tokenExpiry.toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/debug/balance/{userId}:
 *   get:
 *     summary: Debug user balance (admin only)
 *     tags:
 *       - Debug
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to debug balance
 *     responses:
 *       200:
 *         description: Balance debug info retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/debug/balance/:userId", authenticate, adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const { BalanceService } = require("../services/user/balance.service");
    
    // Get balance breakdown
    const breakdown = await BalanceService.getBalanceBreakdown(userId);
    
    // Get stored balance for comparison
    const storedBalanceResult = await pool.query(
      "SELECT * FROM user_balances WHERE user_id = $1",
      [userId]
    );
    
    // Get transaction summary
    const transactionSummaryResult = await pool.query(
      `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        MIN(created_at) as first_transaction,
        MAX(created_at) as last_transaction
      FROM transactions 
      WHERE user_id = $1 
      GROUP BY type 
      ORDER BY type
      `,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: {
        user_id: userId,
        real_time_balance: breakdown.balance,
        stored_balance: storedBalanceResult.rows[0] || null,
        transaction_summary: transactionSummaryResult.rows,
        recent_transactions: breakdown.recent_transactions,
        pending_bets: breakdown.pending_bets
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/debug/reconcile-balances:
 *   post:
 *     summary: Reconcile all user balances (admin only)
 *     tags:
 *       - Debug
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Balance reconciliation completed
 *       401:
 *         description: Unauthorized
 */
router.post("/debug/reconcile-balances", authenticate, adminAuth, async (req, res) => {
  try {
    const { BalanceService } = require("../services/user/balance.service");
    
    const result = await BalanceService.reconcileAllBalances();
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @openapi
 * /api/user/category-balances:
 *   get:
 *     summary: Get all category balances for the authenticated user
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully returns all category balances
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
 *                       category:
 *                         type: string
 *                         example: "slots"
 *                       balance:
 *                         type: number
 *                         format: float
 *                         example: 100.00
 *       401:
 *         description: Unauthorized
 */
router.get("/user/category-balances", authenticate, getUserCategoryBalances);

/**
 * @openapi
 * /api/user/category-balance/transfer:
 *   post:
 *     summary: Transfer funds between main balance and a category balance
 *     tags:
 *       - User
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
 *               - amount
 *               - direction
 *             properties:
 *               category:
 *                 type: string
 *                 example: "slots"
 *               amount:
 *                 type: number
 *                 example: 50
 *               direction:
 *                 type: string
 *                 enum: [main_to_category, category_to_main]
 *                 example: "main_to_category"
 *     responses:
 *       200:
 *         description: Transfer successful
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
 *                     main_balance:
 *                       type: number
 *                       example: 150.00
 *                     category_balance:
 *                       type: number
 *                       example: 50.00
 *       400:
 *         description: Invalid request or insufficient funds
 *       401:
 *         description: Unauthorized
 */
router.post("/user/category-balance/transfer", authenticate, transferUserCategoryBalance);

// =====================================================
// USER KYC ROUTES
// =====================================================

/**
 * @openapi
 * /api/user/kyc/status:
 *   get:
 *     summary: Get current user's KYC verification status
 *     tags:
 *       - User KYC
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
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
 *                     verification:
 *                       type: object
 *                       description: Current KYC verification record
 *                       nullable: true
 *                     verification_level:
 *                       type: number
 *                       example: 1
 *                       description: Current verification level (0=unverified, 1=basic, 2=full)
 *                     is_verified:
 *                       type: boolean
 *                       example: true
 *                     documents_required:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["national_id", "selfie"]
 *                     documents_pending:
 *                       type: number
 *                       example: 2
 *                     documents_approved:
 *                       type: number
 *                       example: 1
 *                     documents_rejected:
 *                       type: number
 *                       example: 0
 *                     documents_under_review:
 *                       type: number
 *                       example: 0
 *       401:
 *         description: Unauthorized
 */
router.get("/user/kyc/status", authenticate, getKYCStatus);

/**
 * @openapi
 * /api/user/kyc/documents:
 *   get:
 *     summary: Get all KYC documents uploaded by current user
 *     tags:
 *       - User KYC
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
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
 *                         type: number
 *                         example: 1
 *                       document_type:
 *                         type: string
 *                         example: "national_id"
 *                       file_name:
 *                         type: string
 *                         example: "kyc-1234567890.jpg"
 *                       file_url:
 *                         type: string
 *                         example: "/uploads/kyc/kyc-1234567890.jpg"
 *                       file_size:
 *                         type: number
 *                         example: 1024000
 *                       mime_type:
 *                         type: string
 *                         example: "image/jpeg"
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected, under_review, expired, cancelled]
 *                         example: "pending"
 *                       reason:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       uploaded_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get("/user/kyc/documents", authenticate, getKYCDocuments);

/**
 * @openapi
 * /api/user/messages:
 *   get:
 *     summary: Get user messages with filtering and pagination
 *     tags:
 *       - User Messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by message type (kyc_notification, document_request, general)
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: Filter by read status (true/false)
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/user/messages", authenticate, getUserMessages);

/**
 * @openapi
 * /api/user/messages/{message_id}/read:
 *   put:
 *     summary: Mark a message as read
 *     tags:
 *       - User Messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: message_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         description: Message not found
 *       401:
 *         description: Unauthorized
 */
router.put("/user/messages/:message_id/read", authenticate, markMessageAsRead);

/**
 * @openapi
 * /api/user/messages/unread-count:
 *   get:
 *     summary: Get unread message count
 *     tags:
 *       - User Messages
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/user/messages/unread-count", authenticate, getUnreadCount);

/**
 * @openapi
 * /api/user/kyc/upload:
 *   post:
 *     summary: Upload a new KYC document
 *     tags:
 *       - User KYC
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *               - document_type
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: The document file (JPG, PNG, GIF, WEBP, PDF, DOC, DOCX - max 10MB)
 *               document_type:
 *                 type: string
 *                 enum: [passport, national_id, drivers_license, utility_bill, bank_statement, selfie, proof_of_address, proof_of_income, tax_document, other]
 *                 example: "national_id"
 *               description:
 *                 type: string
 *                 example: "Front side of national ID"
 *     responses:
 *       201:
 *         description: Document uploaded successfully
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
 *                   example: "Document uploaded successfully"
 *                 data:
 *                   type: object
 *                   description: The created document record
 *       400:
 *         description: Invalid input or file type
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/user/kyc/upload",
  authenticate,
  kycUpload.single('document'),
  validateRequest(UploadKYCDocumentSchema),
  uploadKYCDocument
);

// Alias route for POST /user/kyc/documents (same as /upload)
router.post(
  "/user/kyc/documents",
  authenticate,
  kycUpload.single('document'),
  validateRequest(UploadKYCDocumentSchema),
  uploadKYCDocument
);

/**
 * @openapi
 * /api/user/kyc/documents/{id}:
 *   delete:
 *     summary: Delete a KYC document (only if not approved)
 *     tags:
 *       - User KYC
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
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
 *                   example: "Document deleted successfully"
 *       400:
 *         description: Invalid document ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot delete approved documents
 *       404:
 *         description: Document not found
 */
router.delete(
  "/user/kyc/documents/:id",
  authenticate,
  validateRequest(DeleteKYCDocumentSchema),
  deleteKYCDocument
);

/**
 * @openapi
 * /api/user/kyc/requirements/{level}:
 *   get:
 *     summary: Get KYC requirements for a verification level
 *     tags:
 *       - User KYC
 *     parameters:
 *       - in: path
 *         name: level
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [0, 1, 2]
 *         description: Verification level (0=unverified, 1=basic, 2=full)
 *     responses:
 *       200:
 *         description: Requirements retrieved successfully
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
 *                     level:
 *                       type: number
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Basic Verification"
 *                     description:
 *                       type: string
 *                       example: "Basic identity verification with government-issued ID"
 *                     required_documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           label:
 *                             type: string
 *                           description:
 *                             type: string
 *                     withdrawal_limits:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: number
 *                         weekly:
 *                           type: number
 *                         monthly:
 *                           type: number
 *                     deposit_limits:
 *                       type: object
 *                       properties:
 *                         daily:
 *                           type: number
 *                         weekly:
 *                           type: number
 *                         monthly:
 *                           type: number
 *                     features:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid level
 */
// Support query parameter version: /user/kyc/requirements?level=0
router.get(
  "/user/kyc/requirements",
  (req: any, res: any, next: any) => {
    // Convert query parameter to path parameter format
    if (req.query.level !== undefined) {
      req.params.level = req.query.level;
    }
    next();
  },
  validateRequest(GetKYCRequirementsSchema),
  getKYCRequirements
);

// Support path parameter version: /user/kyc/requirements/0
router.get(
  "/user/kyc/requirements/:level",
  validateRequest(GetKYCRequirementsSchema),
  getKYCRequirements
);

router.use(settingsRoutes);
router.use("/admin", adminRoutes);
router.use("/template", templateRoutes);
router.use("/promotions", promotionRoutes);
router.use("/notifications", notificationRoutes);

// Golden Pot Lottery Routes
import {
  getActiveLottery,
  getAllLotteries,
  getCompPoints,
  getLotteryById,
  createLottery,
  updateLottery,
  deleteLottery
} from "../api/golden-pot/golden-pot.controller";
import { getAllBanners } from "../api/banners/banners.controller";

// Public lottery endpoints
router.get("/golden-pot/lottery/active", getActiveLottery);
router.get("/golden-pot/lottery/all", getAllLotteries); // Must come before /:id
router.get("/golden-pot/lottery/:id", getLotteryById);

// Authenticated user endpoints
router.get("/golden-pot/comp-points", authenticate, getCompPoints);

// Admin lottery endpoints
router.post("/golden-pot/lottery", authenticate, createLottery);
router.put("/golden-pot/lottery/:id", authenticate, updateLottery);
router.delete("/golden-pot/lottery/:id", authenticate, deleteLottery);

// Banners Routes  

router.get("/banners", getAllBanners);
export default router;
