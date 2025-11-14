import * as cron from 'node-cron';
import { WithdrawalService } from './withdrawal.service';
import pool from '../../db/postgres';

/**
 * Automated Withdrawal Processing Cron Job
 *
 * Runs every hour between 22:00 (10 PM) and 06:00 (6 AM)
 * Automatically processes approved withdrawals during off-peak hours
 */
export class WithdrawalProcessorCron {
  private static isRunning = false;
  private static cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job
   */
  static start(): void {
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
  static stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[WITHDRAWAL CRON] Stopped');
    }
  }

  /**
   * Check if current time is within processing window and run immediately
   */
  private static async checkAndRunImmediate(): Promise<void> {
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
  private static async processWithdrawals(): Promise<void> {
    if (this.isRunning) {
      console.log('[WITHDRAWAL CRON] Already processing, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('[WITHDRAWAL CRON] Starting withdrawal processing at', new Date().toISOString());

      // Check if automated processing is enabled
      const settingsResult = await pool.query(
        `SELECT value FROM withdrawal_settings WHERE key = 'auto_process_enabled'`
      );

      if (settingsResult.rows.length === 0 || settingsResult.rows[0].value !== 'true') {
        console.log('[WITHDRAWAL CRON] Automated processing is disabled in settings');
        this.isRunning = false;
        return;
      }

      // Process all pending withdrawals
      const result = await WithdrawalService.processPendingWithdrawals();

      console.log('[WITHDRAWAL CRON] Processing completed:', {
        processed: result.processed,
        failed: result.failed,
        skipped: result.skipped,
        totalAmount: result.totalAmount,
        timestamp: new Date().toISOString()
      });

      // Log to database
      await this.logCronExecution(result);

    } catch (error: any) {
      console.error('[WITHDRAWAL CRON] Error during processing:', error);

      // Log error to database
      await this.logCronError(error);

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Log successful cron execution
   */
  private static async logCronExecution(result: any): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO withdrawal_audit_log
         (withdrawal_id, action, actor_id, actor_type, details)
         VALUES (NULL, $1, NULL, $2, $3)`,
        [
          'cron_batch_processed',
          'system',
          JSON.stringify({
            processed: result.processed,
            failed: result.failed,
            skipped: result.skipped,
            totalAmount: result.totalAmount,
            timestamp: new Date().toISOString()
          })
        ]
      );
    } catch (error) {
      console.error('[WITHDRAWAL CRON] Failed to log execution:', error);
    }
  }

  /**
   * Log cron execution error
   */
  private static async logCronError(error: any): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO withdrawal_audit_log
         (withdrawal_id, action, actor_id, actor_type, details)
         VALUES (NULL, $1, NULL, $2, $3)`,
        [
          'cron_error',
          'system',
          JSON.stringify({
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          })
        ]
      );
    } catch (logError) {
      console.error('[WITHDRAWAL CRON] Failed to log error:', logError);
    }
  }

  /**
   * Manual trigger for testing (bypasses schedule)
   */
  static async manualTrigger(): Promise<any> {
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
  static getStatus(): any {
    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
      schedule: '0 22-23,0-6 * * * (Every hour between 22:00 and 06:00 UTC)',
      currentTime: new Date().toISOString(),
      currentHour: new Date().getUTCHours()
    };
  }
}

/**
 * Initialize cron job on module load
 */
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_WITHDRAWAL_CRON === 'true') {
  WithdrawalProcessorCron.start();
  console.log('[WITHDRAWAL CRON] Initialized in', process.env.NODE_ENV, 'mode');
}

export default WithdrawalProcessorCron;
