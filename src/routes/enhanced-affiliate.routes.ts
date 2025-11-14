import { Router } from "express";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import {
  createEnhancedAffiliateProfile,
  getEnhancedAffiliateDashboard,
  getMLMStructure,
  calculateBetRevenueCommission,
  calculateMLMCommissions,
  getAdminAffiliateDashboard,
  adminGetAllAffiliates,
  adminUpdateAffiliate,
  adminGetAffiliateDetails,
  getManagerDashboard,
  managerGetTeamAffiliates,
  trackReferral,
  recordReferralConversion
} from "../api/affiliate/enhanced-affiliate.controller";

const router = Router();

// =====================================================
// ENHANCED AFFILIATE ROUTES (Requires Affiliate role)
// =====================================================

// Apply authentication and affiliate role for affiliate routes
router.use(authenticate);
router.use(authorize(["Affiliate"]));

/**
 * @swagger
 * /api/enhanced-affiliate/profile:
 *   post:
 *     summary: Create enhanced affiliate profile with MLM structure
 *     tags: [Enhanced Affiliate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileData:
 *                 type: object
 *                 properties:
 *                   display_name:
 *                     type: string
 *                   website_url:
 *                     type: string
 *                   social_media_links:
 *                     type: object
 *                   commission_rate:
 *                     type: number
 *                   minimum_payout:
 *                     type: number
 *                   payment_methods:
 *                     type: array
 *                     items:
 *                       type: string
 *               uplineReferralCode:
 *                 type: string
 *                 description: Referral code of upline affiliate (optional)
 */
router.post("/profile", createEnhancedAffiliateProfile);

/**
 * @swagger
 * /api/enhanced-affiliate/dashboard:
 *   get:
 *     summary: Get enhanced affiliate dashboard with MLM data
 *     tags: [Enhanced Affiliate]
 *     security:
 *       - bearerAuth: []
 */
router.get("/dashboard", getEnhancedAffiliateDashboard);

/**
 * @swagger
 * /api/enhanced-affiliate/mlm-structure:
 *   get:
 *     summary: Get MLM structure for affiliate
 *     tags: [Enhanced Affiliate]
 *     security:
 *       - bearerAuth: []
 */
router.get("/mlm-structure", getMLMStructure);

/**
 * @swagger
 * /api/enhanced-affiliate/calculate-bet-revenue:
 *   post:
 *     summary: Calculate commission based on user betting activity
 *     tags: [Enhanced Affiliate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referredUserId:
 *                 type: integer
 *               periodStart:
 *                 type: string
 *                 format: date-time
 *               periodEnd:
 *                 type: string
 *                 format: date-time
 */
router.post("/calculate-bet-revenue", calculateBetRevenueCommission);

/**
 * @swagger
 * /api/enhanced-affiliate/calculate-mlm-commissions:
 *   post:
 *     summary: Calculate MLM commissions for multiple levels
 *     tags: [Enhanced Affiliate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referredUserId:
 *                 type: integer
 *               transactionId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               commissionType:
 *                 type: string
 */
router.post("/calculate-mlm-commissions", calculateMLMCommissions);

// =====================================================
// ADMIN AFFILIATE MANAGEMENT ROUTES (Requires Admin role)
// =====================================================

/**
 * @swagger
 * /api/enhanced-affiliate/admin/dashboard:
 *   get:
 *     summary: Get admin affiliate management dashboard
 *     tags: [Admin Affiliate Management]
 *     security:
 *       - bearerAuth: []
 */
router.get("/admin/dashboard", authorize(["Admin"]), getAdminAffiliateDashboard);

/**
 * @swagger
 * /api/enhanced-affiliate/admin/affiliates:
 *   get:
 *     summary: Get all affiliates with filtering and pagination
 *     tags: [Admin Affiliate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: team_id
 *         schema:
 *           type: integer
 *         description: Filter by team ID
 *       - in: query
 *         name: manager_id
 *         schema:
 *           type: integer
 *         description: Filter by manager ID
 */
router.get("/admin/affiliates", authorize(["Admin"]), adminGetAllAffiliates);

/**
 * @swagger
 * /api/enhanced-affiliate/admin/affiliates/{affiliateId}:
 *   put:
 *     summary: Update affiliate details
 *     tags: [Admin Affiliate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: affiliateId
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
 *               display_name:
 *                 type: string
 *               commission_rate:
 *                 type: number
 *               minimum_payout:
 *                 type: number
 *               is_active:
 *                 type: boolean
 *               manager_id:
 *                 type: integer
 *               team_id:
 *                 type: integer
 */
router.put("/admin/affiliates/:affiliateId", authorize(["Admin"]), adminUpdateAffiliate);

/**
 * @swagger
 * /api/enhanced-affiliate/admin/affiliates/{affiliateId}:
 *   get:
 *     summary: Get detailed affiliate information
 *     tags: [Admin Affiliate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: affiliateId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/admin/affiliates/:affiliateId", authorize(["Admin"]), adminGetAffiliateDetails);

// =====================================================
// MANAGER ROUTES (Requires Affiliates Manager role)
// =====================================================

/**
 * @swagger
 * /api/enhanced-affiliate/manager/dashboard:
 *   get:
 *     summary: Get manager dashboard for affiliate managers
 *     tags: [Manager Affiliate Management]
 *     security:
 *       - bearerAuth: []
 */
router.get("/manager/dashboard", authorize(["Affiliates Manager"]), getManagerDashboard);

/**
 * @swagger
 * /api/enhanced-affiliate/manager/teams/{teamId}/affiliates:
 *   get:
 *     summary: Get team affiliates managed by the manager
 *     tags: [Manager Affiliate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 */
router.get("/manager/teams/:teamId/affiliates", authorize(["Affiliates Manager"]), managerGetTeamAffiliates);

// =====================================================
// REFERRAL TRACKING ROUTES (Public - no authentication required)
// =====================================================

/**
 * @swagger
 * /api/enhanced-affiliate/track-referral:
 *   post:
 *     summary: Track referral click
 *     tags: [Referral Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referralCode:
 *                 type: string
 *                 required: true
 *               visitorIp:
 *                 type: string
 *               userAgent:
 *                 type: string
 *               landingPage:
 *                 type: string
 *               sessionId:
 *                 type: string
 */
router.post("/track-referral", trackReferral);

/**
 * @swagger
 * /api/enhanced-affiliate/record-conversion:
 *   post:
 *     summary: Record referral conversion
 *     tags: [Referral Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referralCode:
 *                 type: string
 *                 required: true
 *               conversionType:
 *                 type: string
 *                 enum: [registration, deposit, first_deposit]
 *               convertedUserId:
 *                 type: integer
 *               conversionAmount:
 *                 type: number
 */
router.post("/record-conversion", recordReferralConversion);

export default router; 