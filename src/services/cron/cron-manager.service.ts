import { profitCronJobs } from '../profit/profit-cron.service';

// =====================================================
// CRON MANAGER SERVICE - BACKGROUND TASK SCHEDULER
// =====================================================

export class CronManagerService {
  private static cronIntervals: NodeJS.Timeout[] = [];
  private static isRunning: boolean = false;
  private static processId: number = process.pid;
  
  /**
   * Start all background cron jobs
   */
  static startAllCronJobs() {
    // Check if cron jobs are disabled via environment variable
    if (process.env.DISABLE_CRON_JOBS === 'true') {
      console.log('[CRON_MANAGER] Cron jobs disabled via DISABLE_CRON_JOBS environment variable');
      return;
    }
    
    // Prevent multiple instances
    if (this.isRunning) {
      console.log(`[CRON_MANAGER] Cron jobs already running (PID: ${this.processId}), skipping...`);
      return;
    }
    
    console.log(`[CRON_MANAGER] Starting background cron jobs (PID: ${this.processId})...`);
    
    // Clear any existing intervals
    this.stopAllCronJobs();
    
    this.isRunning = true;
    
    // Auto-adjustment every 30 minutes
    const autoAdjustInterval = setInterval(() => {
      console.log('[CRON_MANAGER] Running auto-adjustment cron...');
      profitCronJobs.autoAdjustRtp().catch(error => {
        console.error('[CRON_MANAGER] Error in auto-adjustment cron:', error);
      });
    }, 30 * 60 * 1000); // 30 minutes
    
    this.cronIntervals.push(autoAdjustInterval);
    
    // Daily summary at midnight (every 24 hours)
    const dailySummaryInterval = setInterval(() => {
      console.log('[CRON_MANAGER] Running daily summary cron...');
      profitCronJobs.dailySummary().catch(error => {
        console.error('[CRON_MANAGER] Error in daily summary cron:', error);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    this.cronIntervals.push(dailySummaryInterval);
    
    // Weekly analytics every 7 days
    const weeklyAnalyticsInterval = setInterval(() => {
      console.log('[CRON_MANAGER] Running weekly analytics cron...');
      profitCronJobs.weeklyAnalytics().catch(error => {
        console.error('[CRON_MANAGER] Error in weekly analytics cron:', error);
      });
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
    
    this.cronIntervals.push(weeklyAnalyticsInterval);
    
    // Monthly cleanup - run daily but only execute on first day of month
    const monthlyCleanupInterval = setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1) { // Only run on first day of month
        console.log('[CRON_MANAGER] Running monthly cleanup cron (first day of month)...');
        profitCronJobs.monthlyCleanup().catch(error => {
          console.error('[CRON_MANAGER] Error in monthly cleanup cron:', error);
        });
      }
    }, 24 * 60 * 60 * 1000); // Check daily
    
    console.log('[CRON_MANAGER] Monthly cleanup interval set to daily check (runs on 1st of month)');
    
    this.cronIntervals.push(monthlyCleanupInterval);
    
    console.log('[CRON_MANAGER] Background cron jobs started successfully');
    console.log('[CRON_MANAGER] - Auto-adjustment: Every 30 minutes');
    console.log('[CRON_MANAGER] - Daily summary: Every 24 hours');
    console.log('[CRON_MANAGER] - Weekly analytics: Every 7 days');
    console.log('[CRON_MANAGER] - Monthly cleanup: Every 30 days');
    
    // Run initial auto-adjustment check after 1 minute
    setTimeout(() => {
      console.log('[CRON_MANAGER] Running initial auto-adjustment check...');
      profitCronJobs.autoAdjustRtp().catch(error => {
        console.error('[CRON_MANAGER] Error in initial auto-adjustment:', error);
      });
    }, 60 * 1000); // 1 minute
  }
  
  /**
   * Stop all background cron jobs
   */
  static stopAllCronJobs() {
    console.log(`[CRON_MANAGER] Stopping all background cron jobs (PID: ${this.processId})...`);
    console.log(`[CRON_MANAGER] Clearing ${this.cronIntervals.length} intervals...`);
    
    this.cronIntervals.forEach((interval, index) => {
      console.log(`[CRON_MANAGER] Clearing interval ${index + 1}...`);
      clearInterval(interval);
    });
    
    this.cronIntervals = [];
    this.isRunning = false;
    console.log(`[CRON_MANAGER] All background cron jobs stopped (PID: ${this.processId})`);
  }
  
  /**
   * Get status of cron jobs
   */
  static getCronStatus() {
    return {
      active: this.isRunning && this.cronIntervals.length > 0,
      jobCount: this.cronIntervals.length,
      isRunning: this.isRunning,
      disabled: process.env.DISABLE_CRON_JOBS === 'true',
      jobs: [
        {
          name: 'Auto-adjustment',
          interval: '30 minutes',
          description: 'RTP auto-adjustment based on profit performance'
        },
        {
          name: 'Daily summary',
          interval: '24 hours',
          description: 'Daily profit summary and reporting'
        },
        {
          name: 'Weekly analytics',
          interval: '7 days',
          description: 'Weekly profit analytics and reporting'
        },
        {
          name: 'Monthly cleanup',
          interval: 'Daily check (runs on 1st of month)',
          description: 'Monthly data cleanup and optimization'
        }
      ]
    };
  }
  
  /**
   * Manually trigger auto-adjustment
   */
  static async triggerAutoAdjustment() {
    console.log('[CRON_MANAGER] Manually triggering auto-adjustment...');
    try {
      const result = await profitCronJobs.autoAdjustRtp();
      console.log('[CRON_MANAGER] Manual auto-adjustment completed');
      return result;
    } catch (error) {
      console.error('[CRON_MANAGER] Error in manual auto-adjustment:', error);
      throw error;
    }
  }
  
  /**
   * Manually trigger daily summary
   */
  static async triggerDailySummary() {
    console.log('[CRON_MANAGER] Manually triggering daily summary...');
    try {
      const result = await profitCronJobs.dailySummary();
      console.log('[CRON_MANAGER] Manual daily summary completed');
      return result;
    } catch (error) {
      console.error('[CRON_MANAGER] Error in manual daily summary:', error);
      throw error;
    }
  }
} 