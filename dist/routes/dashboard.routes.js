"use strict";
/**
 * Dashboard Statistics Routes
 * Real-time casino statistics
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController = __importStar(require("../controllers/dashboardStatsController"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const authorize_1 = require("../middlewares/authorize");
const roles_1 = require("../constants/roles");
const router = (0, express_1.Router)();
// All dashboard routes require authentication and admin/manager role
router.use(auth_middleware_1.authenticateToken);
router.use((0, authorize_1.authorize)([roles_1.Roles.ADMIN, roles_1.Roles.MANAGER, roles_1.Roles.ACCOUNTANT]));
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
exports.default = router;
