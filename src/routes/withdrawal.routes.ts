import express from 'express';
import { WithdrawalController } from '../controllers/withdrawal.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = express.Router();

/**
 * User Withdrawal Routes
 * All routes require authentication
 */

// Create new withdrawal request
router.post(
  '/',
  authMiddleware,
  WithdrawalController.createWithdrawal
);

// Get user's own withdrawal requests
router.get(
  '/',
  authMiddleware,
  WithdrawalController.getMyWithdrawals
);

// Get specific withdrawal details
router.get(
  '/:id',
  authMiddleware,
  WithdrawalController.getWithdrawalById
);

// Cancel pending withdrawal
router.delete(
  '/:id',
  authMiddleware,
  WithdrawalController.cancelWithdrawal
);

/**
 * Admin Withdrawal Routes
 * All routes require authentication + admin role
 */

// Get all withdrawal requests (admin view)
router.get(
  '/admin/all',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.getAllWithdrawals
);

// Get withdrawal statistics
router.get(
  '/admin/statistics',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.getStatistics
);

// Get payment method statistics
router.get(
  '/admin/stats/payment-methods',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.getPaymentMethodStats
);

// Get dashboard data (cards + recent payouts)
router.get(
  '/admin/dashboard',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.getDashboard
);

// Get withdrawal settings
router.get(
  '/admin/settings',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.getSettings
);

// Update withdrawal settings
router.put(
  '/admin/settings',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.updateSettings
);

// Get withdrawal audit log
router.get(
  '/admin/:id/audit',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.getAuditLog
);

// Get cron job status
router.get(
  '/admin/cron/status',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.getCronStatus
);

// Manually trigger cron job
router.post(
  '/admin/cron/trigger',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.triggerCronManually
);

// Approve withdrawal
router.post(
  '/admin/:id/approve',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.approveWithdrawal
);

// Reject withdrawal
router.post(
  '/admin/:id/reject',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.rejectWithdrawal
);

// Process approved withdrawal (sends to Oxapay)
router.post(
  '/admin/:id/process',
  authMiddleware,
  adminMiddleware,
  WithdrawalController.processWithdrawal
);

export default router;
