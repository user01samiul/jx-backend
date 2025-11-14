import { ProfitControlService } from "./profit-control.service";

// =====================================================
// PROFIT CONTROL CRON SERVICE
// =====================================================

export class ProfitCronService {
  
  // Auto-adjust RTP every 30 minutes based on profit performance
  static async autoAdjustRtpCron() {
    try {
      console.log('[PROFIT_CRON] Starting auto-adjustment check...');
      
      // Trigger auto-adjustment
      const adjustment = await ProfitControlService.autoAdjustEffectiveRtp();
      
      if (adjustment.adjustment > 0) {
        console.log(`[PROFIT_CRON] RTP adjusted: ${adjustment.previousRtp}% → ${adjustment.newRtp}% (${adjustment.adjustment}%)`);
        console.log(`[PROFIT_CRON] Reason: ${adjustment.reason}`);
      } else {
        console.log('[PROFIT_CRON] No adjustment needed');
      }
      
      // Get current performance for monitoring
      const performance = await ProfitControlService.calculateProfitPerformance();
      console.log(`[PROFIT_CRON] Current performance: ${performance.actualProfitPercent}% (target: ${performance.targetProfitPercent}%, gap: ${performance.profitGap}%)`);
      
    } catch (error) {
      console.error('[PROFIT_CRON] Error in auto-adjustment cron:', error);
    }
  }
  
  // Daily profit summary and cleanup
  static async dailyProfitSummaryCron() {
    try {
      console.log('[PROFIT_CRON] Running daily profit summary...');
      
      // Get yesterday's performance
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const performance = await ProfitControlService.calculateProfitPerformance();
      
      console.log(`[PROFIT_CRON] Daily summary for ${yesterdayStr}:`);
      console.log(`[PROFIT_CRON] - Total bets: $${performance.totalBets}`);
      console.log(`[PROFIT_CRON] - Total wins: $${performance.totalWins}`);
      console.log(`[PROFIT_CRON] - Total adjusted wins: $${performance.totalAdjustedWins}`);
      console.log(`[PROFIT_CRON] - Actual profit: ${performance.actualProfitPercent}%`);
      console.log(`[PROFIT_CRON] - Target profit: ${performance.targetProfitPercent}%`);
      console.log(`[PROFIT_CRON] - Profit gap: ${performance.profitGap}%`);
      
    } catch (error) {
      console.error('[PROFIT_CRON] Error in daily summary cron:', error);
    }
  }
  
  // Weekly profit analytics and reporting
  static async weeklyProfitAnalyticsCron() {
    try {
      console.log('[PROFIT_CRON] Running weekly profit analytics...');
      
      // Get last 7 days analytics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const analytics = await ProfitControlService.getProfitAnalytics({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      
      console.log('[PROFIT_CRON] Weekly analytics summary:');
      console.log(`[PROFIT_CRON] - Total original wins: $${analytics.summary.totalOriginalWins}`);
      console.log(`[PROFIT_CRON] - Total adjusted wins: $${analytics.summary.totalAdjustedWins}`);
      console.log(`[PROFIT_CRON] - Total profit retained: $${analytics.summary.totalProfitRetained}`);
      console.log(`[PROFIT_CRON] - Average effective RTP: ${analytics.summary.avgEffectiveRtp}%`);
      console.log(`[PROFIT_CRON] - Total transactions: ${analytics.summary.totalTransactions}`);
      
      // Log top performing games
      if (analytics.byGame.length > 0) {
        console.log('[PROFIT_CRON] Top 5 profit-generating games:');
        analytics.byGame.slice(0, 5).forEach((game: any, index: number) => {
          console.log(`[PROFIT_CRON] ${index + 1}. ${game.game_name} (${game.provider}): $${game.total_profit_retained}`);
        });
      }
      
    } catch (error) {
      console.error('[PROFIT_CRON] Error in weekly analytics cron:', error);
    }
  }
  
  // Monthly cleanup and optimization
  static async monthlyCleanupCron() {
    try {
      // Archive old profit tracking data (older than 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      // This would typically move old data to archive tables
      // For now, just log the cleanup (reduced logging)
      console.log(`[PROFIT_CRON] Monthly cleanup: Would archive data older than ${threeMonthsAgo.toISOString().split('T')[0]}`);
      
    } catch (error) {
      console.error('[PROFIT_CRON] Error in monthly cleanup cron:', error);
    }
  }
}

// Export cron functions for external scheduling
export const profitCronJobs = {
  autoAdjustRtp: ProfitCronService.autoAdjustRtpCron,
  dailySummary: ProfitCronService.dailyProfitSummaryCron,
  weeklyAnalytics: ProfitCronService.weeklyProfitAnalyticsCron,
  monthlyCleanup: ProfitCronService.monthlyCleanupCron
}; 