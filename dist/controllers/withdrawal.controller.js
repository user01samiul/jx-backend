"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalController = void 0;
const withdrawal_service_1 = require("../services/withdrawal/withdrawal.service");
const postgres_1 = __importDefault(require("../db/postgres"));
/**
 * Withdrawal Controller
 * Handles all withdrawal-related API endpoints for users and admins
 */
class WithdrawalController {
    /**
     * User: Create a new withdrawal request
     * POST /api/withdrawals
     */
    static async createWithdrawal(req, res) {
        const client = await postgres_1.default.connect();
        try {
            const userId = req.user.userId;
            const { amount, payment_method, crypto_address, crypto_network, bank_details } = req.body;
            // Validate required fields
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid withdrawal amount'
                });
            }
            if (!payment_method) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment method is required'
                });
            }
            // Validate crypto details if crypto payment
            if (payment_method === 'crypto' && (!crypto_address || !crypto_network)) {
                return res.status(400).json({
                    success: false,
                    message: 'Crypto address and network are required for crypto withdrawals'
                });
            }
            // Get user IP
            const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
            const withdrawalRequest = {
                userId,
                amount,
                paymentMethod: payment_method,
                cryptoAddress: crypto_address,
                cryptoNetwork: crypto_network,
                bankDetails: bank_details,
                ipAddress
            };
            const result = await withdrawal_service_1.WithdrawalService.createWithdrawalRequest(withdrawalRequest);
            return res.status(201).json({
                success: true,
                message: result.autoApproved
                    ? 'Withdrawal request created and approved automatically'
                    : 'Withdrawal request created successfully',
                data: result
            });
        }
        catch (error) {
            console.error('Error creating withdrawal:', error);
            // Handle specific validation errors
            if (error.message?.includes('KYC verification')) {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                    error: 'KYC_REQUIRED'
                });
            }
            if (error.message?.includes('Insufficient balance')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'INSUFFICIENT_BALANCE'
                });
            }
            if (error.message?.includes('minimum deposit')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'MIN_DEPOSIT_REQUIRED'
                });
            }
            if (error.message?.includes('limit exceeded')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'LIMIT_EXCEEDED'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to create withdrawal request',
                error: error.message
            });
        }
        finally {
            client.release();
        }
    }
    /**
     * User: Get own withdrawal requests
     * GET /api/withdrawals
     */
    static async getMyWithdrawals(req, res) {
        try {
            const userId = req.user.userId;
            const { status, limit = 50, offset = 0 } = req.query;
            const filters = { userId };
            if (status) {
                filters.status = status;
            }
            const withdrawals = await withdrawal_service_1.WithdrawalService.getWithdrawals(filters, parseInt(limit), parseInt(offset));
            return res.status(200).json({
                success: true,
                data: withdrawals
            });
        }
        catch (error) {
            console.error('Error fetching withdrawals:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch withdrawal requests',
                error: error.message
            });
        }
    }
    /**
     * User: Get specific withdrawal details
     * GET /api/withdrawals/:id
     */
    static async getWithdrawalById(req, res) {
        try {
            const userId = req.user.userId;
            const withdrawalId = parseInt(req.params.id);
            if (isNaN(withdrawalId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid withdrawal ID'
                });
            }
            const withdrawals = await withdrawal_service_1.WithdrawalService.getWithdrawals({ id: withdrawalId, userId }, 1, 0);
            if (withdrawals.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Withdrawal request not found'
                });
            }
            return res.status(200).json({
                success: true,
                data: withdrawals[0]
            });
        }
        catch (error) {
            console.error('Error fetching withdrawal:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch withdrawal request',
                error: error.message
            });
        }
    }
    /**
     * User: Cancel pending withdrawal
     * DELETE /api/withdrawals/:id
     */
    static async cancelWithdrawal(req, res) {
        const client = await postgres_1.default.connect();
        try {
            const userId = req.user.userId;
            const withdrawalId = parseInt(req.params.id);
            if (isNaN(withdrawalId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid withdrawal ID'
                });
            }
            await client.query('BEGIN');
            // Check if withdrawal exists and belongs to user
            const checkResult = await client.query(`SELECT id, status, amount, user_id
         FROM withdrawal_requests
         WHERE id = $1 AND user_id = $2`, [withdrawalId, userId]);
            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Withdrawal request not found'
                });
            }
            const withdrawal = checkResult.rows[0];
            // Only pending withdrawals can be cancelled
            if (withdrawal.status !== 'pending') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Cannot cancel withdrawal with status: ${withdrawal.status}`
                });
            }
            // Refund the amount
            await client.query(`UPDATE user_balances
         SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`, [withdrawal.amount, userId]);
            // Update withdrawal status
            await client.query(`UPDATE withdrawal_requests
         SET status = 'cancelled',
             rejection_reason = 'Cancelled by user',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [withdrawalId]);
            // Log audit
            await client.query(`INSERT INTO withdrawal_audit_log
         (withdrawal_id, action, actor_id, actor_type, details)
         VALUES ($1, $2, $3, $4, $5)`, [
                withdrawalId,
                'cancelled',
                userId,
                'user',
                JSON.stringify({ reason: 'Cancelled by user', refunded_amount: withdrawal.amount })
            ]);
            await client.query('COMMIT');
            return res.status(200).json({
                success: true,
                message: 'Withdrawal cancelled successfully',
                data: {
                    withdrawalId,
                    refunded: withdrawal.amount
                }
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error cancelling withdrawal:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel withdrawal',
                error: error.message
            });
        }
        finally {
            client.release();
        }
    }
    /**
     * Admin: Get all withdrawal requests
     * GET /api/admin/withdrawals
     */
    static async getAllWithdrawals(req, res) {
        try {
            const { status, payment_method, user_id, from_date, to_date, limit = 100, offset = 0 } = req.query;
            const filters = {};
            if (status)
                filters.status = status;
            if (payment_method)
                filters.paymentMethod = payment_method;
            if (user_id)
                filters.userId = parseInt(user_id);
            if (from_date)
                filters.fromDate = new Date(from_date);
            if (to_date)
                filters.toDate = new Date(to_date);
            const withdrawals = await withdrawal_service_1.WithdrawalService.getWithdrawals(filters, parseInt(limit), parseInt(offset));
            return res.status(200).json({
                success: true,
                data: withdrawals,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: withdrawals.length
                }
            });
        }
        catch (error) {
            console.error('Error fetching all withdrawals:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch withdrawal requests',
                error: error.message
            });
        }
    }
    /**
     * Admin: Approve withdrawal
     * POST /api/admin/withdrawals/:id/approve
     */
    static async approveWithdrawal(req, res) {
        try {
            const adminId = req.user.userId;
            const withdrawalId = parseInt(req.params.id);
            const { admin_notes } = req.body;
            if (isNaN(withdrawalId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid withdrawal ID'
                });
            }
            const approval = {
                withdrawalId,
                adminId,
                adminNotes: admin_notes
            };
            await withdrawal_service_1.WithdrawalService.approveWithdrawal(approval);
            return res.status(200).json({
                success: true,
                message: 'Withdrawal approved and processed successfully'
            });
        }
        catch (error) {
            console.error('Error approving withdrawal:', error);
            if (error.message?.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message?.includes('already processed')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to approve withdrawal',
                error: error.message
            });
        }
    }
    /**
     * Admin: Reject withdrawal
     * POST /api/admin/withdrawals/:id/reject
     */
    static async rejectWithdrawal(req, res) {
        try {
            const adminId = req.user.userId;
            const withdrawalId = parseInt(req.params.id);
            const { reason, admin_notes } = req.body;
            if (isNaN(withdrawalId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid withdrawal ID'
                });
            }
            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection reason is required'
                });
            }
            const rejection = {
                withdrawalId,
                adminId,
                reason,
                adminNotes: admin_notes
            };
            await withdrawal_service_1.WithdrawalService.rejectWithdrawal(rejection);
            return res.status(200).json({
                success: true,
                message: 'Withdrawal rejected and amount refunded'
            });
        }
        catch (error) {
            console.error('Error rejecting withdrawal:', error);
            if (error.message?.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message?.includes('already processed')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to reject withdrawal',
                error: error.message
            });
        }
    }
    /**
     * Admin: Get withdrawal statistics
     * GET /api/admin/withdrawals/statistics
     */
    static async getStatistics(req, res) {
        try {
            const { period = '24h' } = req.query;
            const stats = await withdrawal_service_1.WithdrawalService.getStatistics(period);
            return res.status(200).json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            console.error('Error fetching withdrawal statistics:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch withdrawal statistics',
                error: error.message
            });
        }
    }
    /**
     * Admin: Get withdrawal settings
     * GET /api/admin/withdrawals/settings
     */
    static async getSettings(req, res) {
        try {
            const result = await postgres_1.default.query(`SELECT key, value, description, data_type
         FROM withdrawal_settings
         ORDER BY key`);
            const settings = {};
            for (const row of result.rows) {
                let value = row.value;
                // Parse value based on data_type
                if (row.data_type === 'boolean') {
                    value = value === 'true';
                }
                else if (row.data_type === 'integer') {
                    value = parseInt(value);
                }
                else if (row.data_type === 'decimal') {
                    value = parseFloat(value);
                }
                else if (row.data_type === 'json') {
                    value = JSON.parse(value);
                }
                settings[row.key] = {
                    value,
                    description: row.description,
                    type: row.data_type
                };
            }
            return res.status(200).json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            console.error('Error fetching withdrawal settings:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch withdrawal settings',
                error: error.message
            });
        }
    }
    /**
     * Admin: Update withdrawal settings
     * PUT /api/admin/withdrawals/settings
     */
    static async updateSettings(req, res) {
        const client = await postgres_1.default.connect();
        try {
            const updates = req.body;
            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid settings data'
                });
            }
            await client.query('BEGIN');
            const updatedSettings = {};
            for (const [key, value] of Object.entries(updates)) {
                // Get setting data type
                const typeResult = await client.query(`SELECT data_type FROM withdrawal_settings WHERE key = $1`, [key]);
                if (typeResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: `Invalid setting key: ${key}`
                    });
                }
                const dataType = typeResult.rows[0].data_type;
                let stringValue;
                // Convert value to string based on data type
                if (dataType === 'json') {
                    stringValue = JSON.stringify(value);
                }
                else if (dataType === 'boolean') {
                    stringValue = value ? 'true' : 'false';
                }
                else {
                    stringValue = String(value);
                }
                // Update setting
                await client.query(`UPDATE withdrawal_settings
           SET value = $1, updated_at = CURRENT_TIMESTAMP
           WHERE key = $2`, [stringValue, key]);
                updatedSettings[key] = value;
            }
            await client.query('COMMIT');
            return res.status(200).json({
                success: true,
                message: 'Withdrawal settings updated successfully',
                data: updatedSettings
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating withdrawal settings:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update withdrawal settings',
                error: error.message
            });
        }
        finally {
            client.release();
        }
    }
    /**
     * Admin: Get withdrawal audit log
     * GET /api/admin/withdrawals/:id/audit
     */
    static async getAuditLog(req, res) {
        try {
            const withdrawalId = parseInt(req.params.id);
            if (isNaN(withdrawalId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid withdrawal ID'
                });
            }
            const result = await postgres_1.default.query(`SELECT id, withdrawal_id, action, actor_id, actor_type, details, created_at
         FROM withdrawal_audit_log
         WHERE withdrawal_id = $1
         ORDER BY created_at DESC`, [withdrawalId]);
            return res.status(200).json({
                success: true,
                data: result.rows
            });
        }
        catch (error) {
            console.error('Error fetching audit log:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch audit log',
                error: error.message
            });
        }
    }
    /**
     * Admin: Get cron job status
     * GET /api/withdrawals/admin/cron/status
     */
    static async getCronStatus(req, res) {
        try {
            return res.status(200).json({
                success: true,
                data: {
                    isRunning: false,
                    isScheduled: true,
                    schedule: '0 22-23,0-6 * * * (Every hour between 22:00 and 06:00 UTC)',
                    currentTime: new Date().toISOString(),
                    currentHour: new Date().getUTCHours(),
                    message: 'Cron will be activated via PM2 cron or external scheduler'
                }
            });
        }
        catch (error) {
            console.error('Error fetching cron status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch cron status',
                error: error.message
            });
        }
    }
    /**
     * Admin: Manually trigger withdrawal processing
     * POST /api/withdrawals/admin/cron/trigger
     */
    static async triggerCronManually(req, res) {
        try {
            console.log('[WITHDRAWAL CRON] Manual trigger requested');
            // Process all approved withdrawals
            const result = await withdrawal_service_1.WithdrawalService.processPendingWithdrawals();
            return res.status(200).json({
                success: true,
                message: 'Withdrawal processing triggered manually',
                data: result
            });
        }
        catch (error) {
            console.error('Error triggering cron manually:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to trigger withdrawal processing',
                error: error.message
            });
        }
    }
}
exports.WithdrawalController = WithdrawalController;
