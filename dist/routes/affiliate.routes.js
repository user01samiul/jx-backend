"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const authorize_1 = require("../middlewares/authorize");
const affiliate_controller_1 = require("../api/affiliate/affiliate.controller");
const router = (0, express_1.Router)();
// =====================================================
// AFFILIATE PROFILE ROUTES
// =====================================================
/**
 * @openapi
 * /api/affiliate/profile:
 *   get:
 *     summary: Get affiliate profile for current user
 *     tags:
 *       - Affiliate
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Affiliate profile retrieved successfully
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
 *                     referral_code:
 *                       type: string
 *                       example: "AFF123456"
 *                     display_name:
 *                       type: string
 *                       example: "John Doe"
 *                     commission_rate:
 *                       type: number
 *                       example: 5.0
 *                     total_referrals:
 *                       type: integer
 *                       example: 25
 *                     total_commission_earned:
 *                       type: number
 *                       example: 1250.50
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Affiliate profile not found
 */
router.get('/profile', authenticate_1.authenticate, affiliate_controller_1.getAffiliateProfile);
/**
 * @openapi
 * /api/affiliate/profile:
 *   post:
 *     summary: Create affiliate profile for current user
 *     tags:
 *       - Affiliate
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - display_name
 *             properties:
 *               display_name:
 *                 type: string
 *                 description: Display name for affiliate profile
 *                 example: "John Doe"
 *               bio:
 *                 type: string
 *                 description: Bio description
 *                 example: "Professional affiliate marketer"
 *               website_url:
 *                 type: string
 *                 description: Website URL
 *                 example: "https://example.com"
 *               social_media:
 *                 type: object
 *                 description: Social media links
 *                 example: {"facebook": "https://facebook.com/johndoe", "twitter": "https://twitter.com/johndoe"}
 *     responses:
 *       201:
 *         description: Affiliate profile created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/profile', authenticate_1.authenticate, affiliate_controller_1.createAffiliateProfile);
// =====================================================
// AFFILIATE DASHBOARD ROUTES
// =====================================================
/**
 * @openapi
 * /api/affiliate/dashboard:
 *   get:
 *     summary: Get affiliate dashboard data
 *     tags:
 *       - Affiliate
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                     total_referrals:
 *                       type: integer
 *                       example: 25
 *                     total_commission_earned:
 *                       type: number
 *                       example: 1250.50
 *                     monthly_commission:
 *                       type: number
 *                       example: 250.00
 *                     pending_commission:
 *                       type: number
 *                       example: 75.25
 *                     conversion_rate:
 *                       type: number
 *                       example: 15.5
 *                     recent_referrals:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', authenticate_1.authenticate, affiliate_controller_1.getAffiliateDashboard);
/**
 * @openapi
 * /api/affiliate/stats:
 *   get:
 *     summary: Get affiliate statistics
 *     tags:
 *       - Affiliate
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate_1.authenticate, affiliate_controller_1.getAffiliateStats);
// =====================================================
// AFFILIATE REFERRALS ROUTES
// =====================================================
/**
 * @openapi
 * /api/affiliate/referrals:
 *   get:
 *     summary: Get affiliate referrals
 *     tags:
 *       - Affiliate
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
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: MLM level filter
 *     responses:
 *       200:
 *         description: Referrals retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/referrals', authenticate_1.authenticate, affiliate_controller_1.getAffiliateReferrals);
/**
 * @openapi
 * /api/affiliate/team:
 *   get:
 *     summary: Get affiliate team structure
 *     tags:
 *       - Affiliate
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           default: 1
 *         description: MLM level to retrieve
 *     responses:
 *       200:
 *         description: Team structure retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/team', authenticate_1.authenticate, affiliate_controller_1.getAffiliateTeam);
// =====================================================
// AFFILIATE COMMISSIONS ROUTES
// =====================================================
/**
 * @openapi
 * /api/affiliate/commissions:
 *   get:
 *     summary: Get affiliate commissions
 *     tags:
 *       - Affiliate
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
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, paid, rejected]
 *         description: Commission status filter
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: Commissions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/commissions', authenticate_1.authenticate, affiliate_controller_1.getAffiliateCommissions);
// =====================================================
// AFFILIATE LINKS ROUTES
// =====================================================
/**
 * @openapi
 * /api/affiliate/links:
 *   post:
 *     summary: Generate affiliate link
 *     tags:
 *       - Affiliate
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_name
 *               - target_url
 *             properties:
 *               campaign_name:
 *                 type: string
 *                 description: Name of the campaign
 *                 example: "Summer Promotion"
 *               target_url:
 *                 type: string
 *                 description: Target URL for the campaign
 *                 example: "https://jackpotx.net/games"
 *     responses:
 *       200:
 *         description: Affiliate link generated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/links', authenticate_1.authenticate, affiliate_controller_1.generateAffiliateLink);
// =====================================================
// ADMIN AFFILIATE MANAGEMENT ROUTES
// =====================================================
/**
 * @openapi
 * /api/admin/affiliate/profiles:
 *   get:
 *     summary: Get all affiliate profiles (Admin only)
 *     tags:
 *       - Admin Affiliate
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
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Status filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Affiliate profiles retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/admin/profiles', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin']), affiliate_controller_1.getAllAffiliateProfiles);
/**
 * @openapi
 * /api/admin/affiliate/commission-rate:
 *   put:
 *     summary: Update affiliate commission rate (Admin only)
 *     tags:
 *       - Admin Affiliate
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - affiliate_id
 *               - commission_rate
 *             properties:
 *               affiliate_id:
 *                 type: integer
 *                 description: Affiliate user ID
 *                 example: 123
 *               commission_rate:
 *                 type: number
 *                 description: New commission rate percentage
 *                 example: 7.5
 *     responses:
 *       200:
 *         description: Commission rate updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put('/admin/commission-rate', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin']), affiliate_controller_1.updateAffiliateCommissionRate);
/**
 * @openapi
 * /api/admin/affiliate/commission-summary:
 *   get:
 *     summary: Get affiliate commission summary (Admin only)
 *     tags:
 *       - Admin Affiliate
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: affiliate_id
 *         schema:
 *           type: integer
 *         description: Specific affiliate ID filter
 *     responses:
 *       200:
 *         description: Commission summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/admin/commission-summary', authenticate_1.authenticate, (0, authorize_1.authorize)(['Admin']), affiliate_controller_1.getAffiliateCommissionSummary);
exports.default = router;
