"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const withdrawal_controller_1 = require("../controllers/withdrawal.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = express_1.default.Router();
/**
 * User Withdrawal Routes
 * All routes require authentication
 */
// Create new withdrawal request
router.post('/', auth_middleware_1.authMiddleware, withdrawal_controller_1.WithdrawalController.createWithdrawal);
// Get user's own withdrawal requests
router.get('/', auth_middleware_1.authMiddleware, withdrawal_controller_1.WithdrawalController.getMyWithdrawals);
// Get specific withdrawal details
router.get('/:id', auth_middleware_1.authMiddleware, withdrawal_controller_1.WithdrawalController.getWithdrawalById);
// Cancel pending withdrawal
router.delete('/:id', auth_middleware_1.authMiddleware, withdrawal_controller_1.WithdrawalController.cancelWithdrawal);
/**
 * Admin Withdrawal Routes
 * All routes require authentication + admin role
 */
// Get all withdrawal requests (admin view)
router.get('/admin/all', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.getAllWithdrawals);
// Get withdrawal statistics
router.get('/admin/statistics', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.getStatistics);
// Get dashboard data (cards + recent payouts)
router.get('/admin/dashboard', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.getDashboard);
// Get withdrawal settings
router.get('/admin/settings', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.getSettings);
// Update withdrawal settings
router.put('/admin/settings', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.updateSettings);
// Get withdrawal audit log
router.get('/admin/:id/audit', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.getAuditLog);
// Get cron job status
router.get('/admin/cron/status', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.getCronStatus);
// Manually trigger cron job
router.post('/admin/cron/trigger', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.triggerCronManually);
// Approve withdrawal
router.post('/admin/:id/approve', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.approveWithdrawal);
// Reject withdrawal
router.post('/admin/:id/reject', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.rejectWithdrawal);
// Process approved withdrawal (sends to Oxapay)
router.post('/admin/:id/process', auth_middleware_1.authMiddleware, admin_middleware_1.adminMiddleware, withdrawal_controller_1.WithdrawalController.processWithdrawal);
exports.default = router;
