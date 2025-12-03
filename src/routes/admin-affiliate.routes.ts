import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import {
  // Application Management
  getAllApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  getApplicationStatistics,

  // Affiliate Management
  getAllAffiliates,
  getAffiliateDetails,
  updateAffiliate,

  // Balance Management
  getAffiliateBalance,
  adjustAffiliateBalance,
  getAffiliateBalanceHistory,

  // Commission Management
  getAffiliateCommissions,
  approveCommission,
  cancelCommission,
  approveBulkCommissions,
  getAllCommissions,
  getCommissionStats,

  // Redemption Management
  getAllRedemptions,
  approveRedemption,
  rejectRedemption,
  getRedemptionSettings,
  updateRedemptionSettings,
  overrideRedemptionAmounts,

  // Payout Management
  getAllPayouts,
  getPayoutStats,
  requestPayout,
  processPayout,
  getAffiliatePayoutStats,

  // Settings
  getAffiliateSettings,
  updateAffiliateSettings,

  // Dashboard
  getAffiliateDashboard
} from "../api/admin/affiliate-admin.controller";

const router = Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(["Admin", "Manager"])); // Allow both Admin and Manager roles

// =====================================================
// DASHBOARD & STATISTICS
// =====================================================

/**
 * @swagger
 * /api/admin/affiliate-dashboard:
 *   get:
 *     summary: Get affiliate dashboard with statistics
 *     tags: [Admin - Affiliate]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get("/affiliate-dashboard", getAffiliateDashboard);

// =====================================================
// APPLICATION MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/affiliate-applications/statistics:
 *   get:
 *     summary: Get application statistics
 *     tags: [Admin - Affiliate Applications]
 *     security:
 *       - bearerAuth: []
 */
router.get("/affiliate-applications/statistics", getApplicationStatistics);

/**
 * @swagger
 * /api/admin/affiliate-applications:
 *   get:
 *     summary: Get all affiliate applications with filters
 *     tags: [Admin - Affiliate Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 */
router.get("/affiliate-applications", getAllApplications);

/**
 * @swagger
 * /api/admin/affiliate-applications/{id}:
 *   get:
 *     summary: Get application details by ID
 *     tags: [Admin - Affiliate Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/affiliate-applications/:id", getApplicationById);

/**
 * @swagger
 * /api/admin/affiliate-applications/{id}/approve:
 *   post:
 *     summary: Approve affiliate application
 *     tags: [Admin - Affiliate Applications]
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
 *             properties:
 *               commissionRate:
 *                 type: number
 *                 description: Commission rate (default: 5.0)
 *               teamId:
 *                 type: integer
 *                 description: Team ID (optional)
 *               managerId:
 *                 type: integer
 *                 description: Manager ID (optional)
 *               adminNotes:
 *                 type: string
 *                 description: Admin notes
 */
router.post("/affiliate-applications/:id/approve", authorize(["Admin"]), approveApplication);

/**
 * @swagger
 * /api/admin/affiliate-applications/{id}/reject:
 *   post:
 *     summary: Reject affiliate application
 *     tags: [Admin - Affiliate Applications]
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
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejection
 *               adminNotes:
 *                 type: string
 *                 description: Additional admin notes
 */
router.post("/affiliate-applications/:id/reject", authorize(["Admin"]), rejectApplication);

// =====================================================
// AFFILIATE MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/affiliates:
 *   get:
 *     summary: Get all affiliates with filters and pagination
 *     tags: [Admin - Affiliates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 */
router.get("/affiliates", getAllAffiliates);

/**
 * @swagger
 * /api/admin/affiliates/{id}:
 *   get:
 *     summary: Get affiliate details
 *     tags: [Admin - Affiliates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/affiliates/:id", getAffiliateDetails);

/**
 * @swagger
 * /api/admin/affiliates/{id}:
 *   put:
 *     summary: Update affiliate details
 *     tags: [Admin - Affiliates]
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
 *               displayName:
 *                 type: string
 *               commissionRate:
 *                 type: number
 *               minimumPayout:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               websiteUrl:
 *                 type: string
 *               socialMediaLinks:
 *                 type: object
 *               paymentMethods:
 *                 type: object
 */
router.put("/affiliates/:id", authorize(["Admin"]), updateAffiliate);

// =====================================================
// BALANCE MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/affiliates/{id}/balance:
 *   get:
 *     summary: Get affiliate balance summary
 *     tags: [Admin - Affiliate Balance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/affiliates/:id/balance", getAffiliateBalance);

/**
 * @swagger
 * /api/admin/affiliates/{id}/balance/adjust:
 *   post:
 *     summary: Adjust affiliate balance (add or deduct)
 *     tags: [Admin - Affiliate Balance]
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
 *               - amount
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to adjust (positive to add, negative to deduct)
 *               description:
 *                 type: string
 *                 description: Reason for adjustment
 */
router.post("/affiliates/:id/balance/adjust", authorize(["Admin"]), adjustAffiliateBalance);

/**
 * @swagger
 * /api/admin/affiliates/{id}/balance-history:
 *   get:
 *     summary: Get affiliate balance transaction history
 *     tags: [Admin - Affiliate Balance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 */
router.get("/affiliates/:id/balance-history", getAffiliateBalanceHistory);

// =====================================================
// COMMISSION MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/affiliates/{id}/commissions:
 *   get:
 *     summary: Get affiliate commissions
 *     tags: [Admin - Commissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, paid, cancelled]
 */
router.get("/affiliates/:id/commissions", getAffiliateCommissions);

/**
 * @swagger
 * /api/admin/commissions:
 *   get:
 *     summary: Get all commissions (global list)
 *     tags: [Admin - Commissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, approved, paid, cancelled]
 *       - in: query
 *         name: commission_type
 *         schema:
 *           type: string
 *           enum: [all, deposit, bet, loss, ngr]
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: affiliate_id
 *         schema:
 *           type: integer
 */
router.get("/commissions", getAllCommissions);

/**
 * @swagger
 * /api/admin/commissions/stats:
 *   get:
 *     summary: Get commission statistics
 *     tags: [Admin - Commissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: affiliate_id
 *         schema:
 *           type: integer
 */
router.get("/commissions/stats", getCommissionStats);

/**
 * @swagger
 * /api/admin/commissions/{commissionId}/approve:
 *   post:
 *     summary: Approve a commission
 *     tags: [Admin - Commissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commissionId
 *         required: true
 *         schema:
 *           type: integer
 */
router.post("/commissions/:commissionId/approve", authorize(["Admin"]), approveCommission);

/**
 * @swagger
 * /api/admin/commissions/{commissionId}/cancel:
 *   post:
 *     summary: Cancel a commission
 *     tags: [Admin - Commissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commissionId
 *         required: true
 *         schema:
 *           type: integer
 */
router.post("/commissions/:commissionId/cancel", authorize(["Admin"]), cancelCommission);

/**
 * @swagger
 * /api/admin/commissions/approve-bulk:
 *   post:
 *     summary: Approve multiple commissions at once
 *     tags: [Admin - Commissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commissionIds
 *             properties:
 *               commissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of commission IDs to approve
 */
router.post("/commissions/approve-bulk", authorize(["Admin"]), approveBulkCommissions);

// =====================================================
// REDEMPTION MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/affiliate-redemptions:
 *   get:
 *     summary: Get all redemptions with filters
 *     tags: [Admin - Redemptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [locked, unlocked, cancelled]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 */
router.get("/affiliate-redemptions", getAllRedemptions);

/**
 * @swagger
 * /api/admin/affiliate-redemptions/{id}/approve:
 *   post:
 *     summary: Approve redemption request (Admin)
 *     tags: [Admin - Redemptions]
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
 *               admin_notes:
 *                 type: string
 */
router.post("/affiliate-redemptions/:id/approve", authorize(["Admin"]), approveRedemption);

/**
 * @swagger
 * /api/admin/affiliate-redemptions/{id}/reject:
 *   post:
 *     summary: Reject redemption request (Admin)
 *     tags: [Admin - Redemptions]
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
 *               admin_notes:
 *                 type: string
 */
router.post("/affiliate-redemptions/:id/reject", authorize(["Admin"]), rejectRedemption);

/**
 * @swagger
 * /api/admin/affiliate-redemptions/settings:
 *   get:
 *     summary: Get redemption settings (Admin)
 *     tags: [Admin - Redemptions]
 *     security:
 *       - bearerAuth: []
 */
router.get("/affiliate-redemptions/settings", authorize(["Admin"]), getRedemptionSettings);

/**
 * @swagger
 * /api/admin/affiliate-redemptions/settings:
 *   put:
 *     summary: Update redemption settings globally (Admin)
 *     tags: [Admin - Redemptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               instant_percentage:
 *                 type: number
 *                 description: Percentage released instantly (0-100)
 *               lock_days:
 *                 type: number
 *                 description: Days to lock remaining amount
 *               minimum_redemption:
 *                 type: number
 *                 description: Minimum redemption amount
 */
router.put("/affiliate-redemptions/settings", authorize(["Admin"]), updateRedemptionSettings);

/**
 * @swagger
 * /api/admin/affiliate-redemptions/{id}/override-amounts:
 *   put:
 *     summary: Override instant/locked amounts for specific redemption (Admin)
 *     tags: [Admin - Redemptions]
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
 *             properties:
 *               instant_amount:
 *                 type: number
 *               locked_amount:
 *                 type: number
 *               lock_days:
 *                 type: number
 */
router.put("/affiliate-redemptions/:id/override-amounts", authorize(["Admin"]), overrideRedemptionAmounts);

// =====================================================
// PAYOUT MANAGEMENT
// =====================================================

/**
 * @swagger
 * /api/admin/affiliate-payouts:
 *   get:
 *     summary: Get all affiliate payouts (Admin)
 *     tags: [Admin - Payouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, processing, completed, failed, cancelled]
 *       - in: query
 *         name: payment_method
 *         schema:
 *           type: string
 *           enum: [all, bank_transfer, paypal, crypto, check]
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 */
router.get("/affiliate-payouts", getAllPayouts);

/**
 * @swagger
 * /api/admin/affiliate-payouts/stats:
 *   get:
 *     summary: Get payout statistics (Admin)
 *     tags: [Admin - Payouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 */
router.get("/affiliate-payouts/stats", getPayoutStats);

/**
 * @swagger
 * /api/admin/affiliate-payouts/{id}/process:
 *   put:
 *     summary: Process payout (Admin)
 *     tags: [Admin - Payouts]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, failed, cancelled]
 *               payment_reference:
 *                 type: string
 *               notes:
 *                 type: string
 */
router.put("/affiliate-payouts/:id/process", authorize(["Admin"]), processPayout);

// =====================================================
// SETTINGS
// =====================================================

/**
 * @swagger
 * /api/admin/affiliate-settings:
 *   get:
 *     summary: Get all affiliate settings
 *     tags: [Admin - Settings]
 *     security:
 *       - bearerAuth: []
 */
router.get("/affiliate-settings", getAffiliateSettings);

/**
 * @swagger
 * /api/admin/affiliate-settings:
 *   put:
 *     summary: Update affiliate settings
 *     tags: [Admin - Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settingKey
 *               - settingValue
 *             properties:
 *               settingKey:
 *                 type: string
 *                 enum: [commission_rates, redemption_settings, application_settings, commission_approval_settings, mlm_settings]
 *               settingValue:
 *                 type: object
 *                 description: Setting value as JSON object
 */
router.put("/affiliate-settings", authorize(["Admin"]), updateAffiliateSettings);

export default router;
