"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalProcessorCron = void 0;
const cron = __importStar(require("node-cron"));
const withdrawal_service_1 = require("./withdrawal.service");
const postgres_1 = __importDefault(require("../../db/postgres"));
/**
 * Automated Withdrawal Processing Cron Job
 *
 * Runs every hour between 22:00 (10 PM) and 06:00 (6 AM)
 * Automatically processes approved withdrawals during off-peak hours
 */
class WithdrawalProcessorCron {
    static isRunning = false;
    static cronJob = null;
    /**
     * Start the cron job
     */
    static start() {
        if (this.cronJob) {
            console.log('[WITHDRAWAL CRON] Already running');
            return;
        }
        // Run every hour between 22:00 and 06:00
        // Cron expression: '0 22-23,0-6 * * *' means:
        // - Minute: 0 (at the start of the hour)
        // - Hour: 22-23 (10 PM - 11 PM) and 0-6 (12 AM - 6 AM)
        // - Day of month: * (every day)
        // - Month: * (every month)
        // - Day of week: * (every day of week)
        this.cronJob = cron.schedule('0 22-23,0-6 * * *', async () => {
            await this.processWithdrawals();
        }, {
            timezone: 'UTC'
        });
        console.log('[WITHDRAWAL CRON] Started - will run every hour between 22:00 and 06:00 UTC');
        // Also run immediately on startup if within the time window
        this.checkAndRunImmediate();
    }
    /**
     * Stop the cron job
     */
    static stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log('[WITHDRAWAL CRON] Stopped');
        }
    }
    /**
     * Check if current time is within processing window and run immediately
     */
    static async checkAndRunImmediate() {
        const now = new Date();
        const hour = now.getUTCHours();
        // Check if current hour is between 22:00 and 06:00
        if (hour >= 22 || hour <= 6) {
            console.log('[WITHDRAWAL CRON] Within processing window, running immediately...');
            await this.processWithdrawals();
        }
    }
    /**
     * Process pending withdrawals
     */
    static async processWithdrawals() {
        if (this.isRunning) {
            console.log('[WITHDRAWAL CRON] Already processing, skipping...');
            return;
        }
        this.isRunning = true;
        try {
            console.log('[WITHDRAWAL CRON] Starting withdrawal processing at', new Date().toISOString());
            // Check if automated processing is enabled
            const settingsResult = await postgres_1.default.query(`SELECT value FROM withdrawal_settings WHERE key = 'auto_process_enabled'`);
            if (settingsResult.rows.length === 0 || settingsResult.rows[0].value !== 'true') {
                console.log('[WITHDRAWAL CRON] Automated processing is disabled in settings');
                this.isRunning = false;
                return;
            }
            // Process all pending withdrawals
            const result = await withdrawal_service_1.WithdrawalService.processPendingWithdrawals();
            console.log('[WITHDRAWAL CRON] Processing completed:', {
                processed: result.processed,
                failed: result.failed,
                skipped: result.skipped,
                totalAmount: result.totalAmount,
                timestamp: new Date().toISOString()
            });
            // Log to database
            await this.logCronExecution(result);
        }
        catch (error) {
            console.error('[WITHDRAWAL CRON] Error during processing:', error);
            // Log error to database
            await this.logCronError(error);
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Log successful cron execution
     */
    static async logCronExecution(result) {
        try {
            await postgres_1.default.query(`INSERT INTO withdrawal_audit_log
         (withdrawal_id, action, actor_id, actor_type, details)
         VALUES (NULL, $1, NULL, $2, $3)`, [
                'cron_batch_processed',
                'system',
                JSON.stringify({
                    processed: result.processed,
                    failed: result.failed,
                    skipped: result.skipped,
                    totalAmount: result.totalAmount,
                    timestamp: new Date().toISOString()
                })
            ]);
        }
        catch (error) {
            console.error('[WITHDRAWAL CRON] Failed to log execution:', error);
        }
    }
    /**
     * Log cron execution error
     */
    static async logCronError(error) {
        try {
            await postgres_1.default.query(`INSERT INTO withdrawal_audit_log
         (withdrawal_id, action, actor_id, actor_type, details)
         VALUES (NULL, $1, NULL, $2, $3)`, [
                'cron_error',
                'system',
                JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                })
            ]);
        }
        catch (logError) {
            console.error('[WITHDRAWAL CRON] Failed to log error:', logError);
        }
    }
    /**
     * Manual trigger for testing (bypasses schedule)
     */
    static async manualTrigger() {
        console.log('[WITHDRAWAL CRON] Manual trigger requested');
        await this.processWithdrawals();
        return {
            success: true,
            message: 'Manual processing triggered',
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Get cron status
     */
    static getStatus() {
        return {
            isRunning: this.isRunning,
            isScheduled: this.cronJob !== null,
            schedule: '0 22-23,0-6 * * * (Every hour between 22:00 and 06:00 UTC)',
            currentTime: new Date().toISOString(),
            currentHour: new Date().getUTCHours()
        };
    }
}
exports.WithdrawalProcessorCron = WithdrawalProcessorCron;
/**
 * Initialize cron job on module load
 */
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_WITHDRAWAL_CRON === 'true') {
    WithdrawalProcessorCron.start();
    console.log('[WITHDRAWAL CRON] Initialized in', process.env.NODE_ENV, 'mode');
}
exports.default = WithdrawalProcessorCron;
