"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_reset_controller_1 = require("./system-reset.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/admin/system/reset:
 *   post:
 *     summary: Reset user or entire system to fresh state
 *     description: Admin endpoint to reset specific user or entire system. Removes all financial data, transactions, bets, and resets user profiles to default values.
 *     tags: [Admin - System Reset]
 *     security:
 *       - bearerAuth: []
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
 *             example:
 *               reset_type: "user"
 *               user_id: 31
 *     responses:
 *       200:
 *         description: Reset completed successfully
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
 *                   example: "User 31 reset successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reset_type:
 *                       type: string
 *                       example: "user"
 *                     target_user_id:
 *                       type: integer
 *                       example: 31
 *                     reset_details:
 *                       type: object
 *                       properties:
 *                         deleted_bets:
 *                           type: integer
 *                           example: 5
 *                         deleted_transactions:
 *                           type: integer
 *                           example: 10
 *                         deleted_user_activities:
 *                           type: integer
 *                           example: 3
 *                         deleted_payment_transactions:
 *                           type: integer
 *                           example: 2
 *                         deleted_category_balances:
 *                           type: integer
 *                           example: 1
 *                         deleted_main_balances:
 *                           type: integer
 *                           example: 1
 *                         reset_profiles:
 *                           type: integer
 *                           example: 1
 *                         reset_statuses:
 *                           type: integer
 *                           example: 1
 *                     performed_by:
 *                       type: integer
 *                       example: 1
 *                     performed_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-04T07:30:00.000Z"
 *       400:
 *         description: Bad request - invalid parameters
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
 *                   example: "reset_type must be 'user' or 'system'"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin privileges required
 *       404:
 *         description: User not found (when resetting specific user)
 */
router.post('/reset', auth_middleware_1.authenticateToken, system_reset_controller_1.resetSystem);
/**
 * @swagger
 * /api/admin/system/reset/stats:
 *   get:
 *     summary: Get system reset statistics
 *     description: Get current system statistics and available reset options
 *     tags: [Admin - System Reset]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
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
 *                     system_stats:
 *                       type: object
 *                       properties:
 *                         total_users:
 *                           type: integer
 *                           example: 15
 *                         total_main_balances:
 *                           type: integer
 *                           example: 0
 *                         total_category_balances:
 *                           type: integer
 *                           example: 0
 *                         total_transactions:
 *                           type: integer
 *                           example: 0
 *                         total_bets:
 *                           type: integer
 *                           example: 0
 *                         total_games:
 *                           type: integer
 *                           example: 0
 *                         total_user_profiles:
 *                           type: integer
 *                           example: 15
 *                         total_user_activities:
 *                           type: integer
 *                           example: 0
 *                         total_payment_gateways:
 *                           type: integer
 *                           example: 2
 *                         total_payment_transactions:
 *                           type: integer
 *                           example: 0
 *                     reset_available:
 *                       type: boolean
 *                       example: true
 *                     reset_types:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["user", "system"]
 *                     description:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: string
 *                           example: "Reset specific user to fresh state (keeps user account, removes all financial data)"
 *                         system:
 *                           type: string
 *                           example: "Reset entire system to fresh state (keeps all users, removes all financial data)"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin privileges required
 */
router.get('/reset/stats', auth_middleware_1.authenticateToken, system_reset_controller_1.getResetStats);
exports.default = router;
