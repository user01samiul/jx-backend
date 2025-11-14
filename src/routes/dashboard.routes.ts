/**
 * Dashboard Statistics Routes
 * Real-time casino statistics
 */

import { Router } from "express";
import * as dashboardController from "../controllers/dashboardStatsController";
import { authenticateToken } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize";
import { Roles } from "../constants/roles";

const router = Router();

// All dashboard routes require authentication and admin/manager role
router.use(authenticateToken);
router.use(authorize([Roles.ADMIN, Roles.MANAGER, Roles.ACCOUNTANT]));

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get comprehensive dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, all]
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Dashboard statistics including users, financial, gaming, revenue data
 *       500:
 *         description: Internal server error
 */
router.get("/stats", dashboardController.getDashboardStats);

/**
 * @swagger
 * /api/admin/dashboard/stats/realtime:
 *   get:
 *     summary: Get real-time lightweight statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time stats (active users, pending withdrawals, recent bets)
 *       500:
 *         description: Internal server error
 */
router.get("/stats/realtime", dashboardController.getRealtimeStats);

export default router;
