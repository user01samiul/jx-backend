import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import {
  getAffiliateProfile,
  createAffiliateProfile,
  getAffiliateApplicationStatus,
  getAffiliateStats,
  getAffiliateReferrals,
  getAffiliateCommissions,
  getAffiliateCommissionStats,
  getAffiliateTeam,
  generateAffiliateLink,
  getAffiliateDashboard,
  getAllAffiliateProfiles,
  updateAffiliateCommissionRate,
  getAffiliateCommissionSummary,
  requestRedemption,
  getRedemptionHistory
} from '../api/affiliate/affiliate.controller';
import {
  requestPayout,
  getAffiliatePayoutStats,
  getMarketingMaterials,
  getMarketingMaterialStats,
  createMarketingMaterial,
  updateMarketingMaterial,
  deleteMarketingMaterial
} from '../api/admin/affiliate-admin.controller';
import { z } from 'zod';

const router = Router();

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
router.get('/profile', authenticate, getAffiliateProfile);

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
router.post('/profile', authenticate, createAffiliateProfile);

/**
 * @openapi
 * /api/affiliate/application/status:
 *   get:
 *     summary: Get affiliate application status for current user
 *     tags:
 *       - Affiliate
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Application status retrieved successfully
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
 *                     status:
 *                       type: string
 *                       enum: [none, pending, approved, rejected]
 *                       example: pending
 *                     hasProfile:
 *                       type: boolean
 *                       example: false
 *                     application:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: integer
 *                         display_name:
 *                           type: string
 *                         status:
 *                           type: string
 *                         rejection_reason:
 *                           type: string
 *                           nullable: true
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/application/status', authenticate, getAffiliateApplicationStatus);

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
router.get('/dashboard', authenticate, getAffiliateDashboard);

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
router.get('/stats', authenticate, getAffiliateStats);

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
router.get('/referrals', authenticate, getAffiliateReferrals);

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
router.get('/team', authenticate, getAffiliateTeam);

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
router.get('/commissions', authenticate, getAffiliateCommissions);

/**
 * @openapi
 * /api/affiliate/commissions/stats:
 *   get:
 *     summary: Get affiliate commission statistics
 *     tags:
 *       - Affiliate
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
 *     responses:
 *       200:
 *         description: Commission statistics retrieved successfully
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
 *                     total_commissions:
 *                       type: string
 *                       example: "150"
 *                     total_amount:
 *                       type: string
 *                       example: "5000.00"
 *                     pending_count:
 *                       type: string
 *                       example: "25"
 *                     pending_amount:
 *                       type: string
 *                       example: "750.00"
 *                     paid_count:
 *                       type: string
 *                       example: "120"
 *                     paid_amount:
 *                       type: string
 *                       example: "4000.00"
 *                     rejected_count:
 *                       type: string
 *                       example: "5"
 *                     rejected_amount:
 *                       type: string
 *                       example: "250.00"
 *       401:
 *         description: Unauthorized
 */
router.get('/commissions/stats', authenticate, getAffiliateCommissionStats);

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
router.post('/links', authenticate, generateAffiliateLink);

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
router.get('/admin/profiles', authenticate, authorize(['Admin']), getAllAffiliateProfiles);

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
router.put('/admin/commission-rate', authenticate, authorize(['Admin']), updateAffiliateCommissionRate);

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
router.get('/admin/commission-summary', authenticate, authorize(['Admin']), getAffiliateCommissionSummary);

// =====================================================
// PAYOUT ROUTES
// =====================================================

/**
 * @openapi
 * /api/affiliate/payouts:
 *   post:
 *     summary: Request payout (Affiliate)
 *     tags:
 *       - Affiliate Payouts
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - payment_method
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payout amount
 *                 example: 250.00
 *               payment_method:
 *                 type: string
 *                 enum: [bank_transfer, paypal, crypto, check]
 *                 description: Payment method
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Payout request submitted successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an active affiliate
 */
router.post('/payouts', authenticate, requestPayout);

/**
 * @openapi
 * /api/affiliate/payouts/stats:
 *   get:
 *     summary: Get affiliate payout statistics
 *     tags:
 *       - Affiliate Payouts
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
 *     responses:
 *       200:
 *         description: Payout statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/payouts/stats', authenticate, getAffiliatePayoutStats);

// =====================================================
// REDEMPTION ROUTES
// =====================================================

/**
 * @openapi
 * /api/affiliate/redemptions:
 *   post:
 *     summary: Request affiliate balance redemption
 *     tags:
 *       - Affiliate Redemptions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to redeem
 *                 example: 100.00
 *               notes:
 *                 type: string
 *                 description: Optional notes for the redemption request
 *     responses:
 *       200:
 *         description: Redemption request submitted successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/redemptions', authenticate, requestRedemption);

/**
 * @openapi
 * /api/affiliate/redemptions:
 *   get:
 *     summary: Get affiliate redemption history
 *     tags:
 *       - Affiliate Redemptions
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Redemption history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/redemptions', authenticate, getRedemptionHistory);

// =====================================================
// MARKETING MATERIALS ROUTES
// =====================================================

/**
 * @openapi
 * /api/affiliate/marketing-materials:
 *   get:
 *     summary: Get marketing materials
 *     tags:
 *       - Affiliate Marketing
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
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, banner, text_link, email_template, landing_page, social_media]
 *         description: Material type filter
 *     responses:
 *       200:
 *         description: Marketing materials retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/marketing-materials', authenticate, getMarketingMaterials);

/**
 * @openapi
 * /api/affiliate/marketing-materials/stats:
 *   get:
 *     summary: Get marketing material statistics
 *     tags:
 *       - Affiliate Marketing
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/marketing-materials/stats', authenticate, getMarketingMaterialStats);

/**
 * @openapi
 * /api/affiliate/admin/marketing-materials:
 *   post:
 *     summary: Create marketing material (Admin only)
 *     tags:
 *       - Admin Affiliate Marketing
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
 *               - type
 *               - content
 *               - target_url
 *             properties:
 *               name:
 *                 type: string
 *                 description: Material name
 *               description:
 *                 type: string
 *                 description: Material description
 *               type:
 *                 type: string
 *                 enum: [banner, text_link, email_template, landing_page, social_media]
 *                 description: Material type
 *               content:
 *                 type: string
 *                 description: Material content (HTML or text)
 *               target_url:
 *                 type: string
 *                 description: Target URL
 *               image_url:
 *                 type: string
 *                 description: Image URL (optional)
 *               is_active:
 *                 type: boolean
 *                 description: Active status
 *     responses:
 *       200:
 *         description: Material created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/admin/marketing-materials', authenticate, authorize(['Admin']), createMarketingMaterial);

/**
 * @openapi
 * /api/affiliate/admin/marketing-materials/{id}:
 *   put:
 *     summary: Update marketing material (Admin only)
 *     tags:
 *       - Admin Affiliate Marketing
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Material ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [banner, text_link, email_template, landing_page, social_media]
 *               content:
 *                 type: string
 *               target_url:
 *                 type: string
 *               image_url:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Material updated successfully
 *       404:
 *         description: Material not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put('/admin/marketing-materials/:id', authenticate, authorize(['Admin']), updateMarketingMaterial);

/**
 * @openapi
 * /api/affiliate/admin/marketing-materials/{id}:
 *   delete:
 *     summary: Delete marketing material (Admin only)
 *     tags:
 *       - Admin Affiliate Marketing
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Material ID
 *     responses:
 *       200:
 *         description: Material deleted successfully
 *       404:
 *         description: Material not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete('/admin/marketing-materials/:id', authenticate, authorize(['Admin']), deleteMarketingMaterial);

export default router; 