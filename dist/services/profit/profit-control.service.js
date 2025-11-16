"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfitControlService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
// =====================================================
// PROFIT CONTROL SERVICE - HIDDEN RTP ADJUSTMENT
// =====================================================
class ProfitControlService {
    // Get current RTP settings for profit control
    static async getRtpSettings() {
        const result = await postgres_1.default.query("SELECT target_profit_percent, effective_rtp, adjustment_mode FROM rtp_settings ORDER BY id DESC LIMIT 1");
        if (result.rows.length === 0) {
            // Default settings if none exist
            return {
                target_profit_percent: 20.00,
                effective_rtp: 80.00,
                adjustment_mode: 'manual'
            };
        }
        return result.rows[0];
    }
    // Apply hidden profit control to win amounts
    static async applyHiddenProfitControl(originalAmount, transactionType, gameId, userId, providerRtp = 96) {
        // Validate input parameters
        if (!originalAmount || isNaN(originalAmount) || !isFinite(originalAmount)) {
            console.error('[PROFIT_CONTROL] Invalid originalAmount:', originalAmount);
            return {
                adjustedAmount: originalAmount,
                profitReduction: 0,
                effectiveRtp: 80
            };
        }
        if (!providerRtp || isNaN(providerRtp) || !isFinite(providerRtp) || providerRtp <= 0) {
            console.error('[PROFIT_CONTROL] Invalid providerRtp:', providerRtp);
            providerRtp = 96; // Default fallback
        }
        // Get current RTP settings
        const rtpSettings = await this.getRtpSettings();
        if (transactionType === 'win' && originalAmount > 0) {
            // Skip adjustment if effective RTP is 100% (disabled)
            let adjustedAmount = originalAmount;
            let profitReduction = 0;
            if (rtpSettings.effective_rtp < 100) {
                // Calculate adjusted win amount based on effective RTP
                adjustedAmount = this.calculateAdjustedWinAmount(originalAmount, rtpSettings.effective_rtp, providerRtp);
                profitReduction = originalAmount - adjustedAmount;
            }
            // Validate calculated values
            if (isNaN(adjustedAmount) || !isFinite(adjustedAmount) ||
                isNaN(profitReduction) || !isFinite(profitReduction)) {
                console.error('[PROFIT_CONTROL] Invalid calculated values:', {
                    originalAmount,
                    adjustedAmount,
                    profitReduction,
                    effectiveRtp: rtpSettings.effective_rtp,
                    providerRtp
                });
                return {
                    adjustedAmount: originalAmount,
                    profitReduction: 0,
                    effectiveRtp: rtpSettings.effective_rtp
                };
            }
            // Track profit metrics for analytics
            await this.trackProfitMetrics({
                originalAmount,
                adjustedAmount,
                profitReduction,
                gameId,
                userId,
                effectiveRtp: rtpSettings.effective_rtp,
                providerRtp,
                timestamp: new Date(),
                transactionType: 'win'
            });
            return {
                adjustedAmount,
                profitReduction,
                effectiveRtp: rtpSettings.effective_rtp
            };
        }
        // For bets, track for profit calculations but no adjustment
        if (transactionType === 'bet') {
            await this.trackProfitMetrics({
                originalAmount,
                adjustedAmount: originalAmount,
                profitReduction: 0,
                gameId,
                userId,
                effectiveRtp: rtpSettings.effective_rtp,
                providerRtp,
                timestamp: new Date(),
                transactionType: 'bet'
            });
        }
        return {
            adjustedAmount: originalAmount,
            profitReduction: 0,
            effectiveRtp: rtpSettings.effective_rtp
        };
    }
    // Calculate adjusted win amount based on effective RTP
    static calculateAdjustedWinAmount(originalWinAmount, effectiveRtp, providerRtp) {
        // Calculate adjustment factor: effective_rtp / provider_rtp
        // Example: effective_rtp=80, provider_rtp=96 → factor=0.833
        const adjustmentFactor = effectiveRtp / providerRtp;
        // Apply adjustment and round to 2 decimal places
        const adjustedAmount = Math.round(originalWinAmount * adjustmentFactor * 100) / 100;
        // Ensure minimum payout (at least 50% of original)
        return Math.max(adjustedAmount, originalWinAmount * 0.5);
    }
    // Validate and clamp amount values to prevent database overflow
    static validateAndClampAmount(amount) {
        if (amount === null || amount === undefined || isNaN(amount) || !isFinite(amount)) {
            console.warn('[PROFIT_CONTROL] Invalid amount detected, using 0:', amount);
            return 0;
        }
        // Clamp to database field limit: numeric(10,2) = 99,999,999.99
        const maxAmount = 99999999.99;
        if (amount > maxAmount) {
            console.warn('[PROFIT_CONTROL] Amount too large, clamping to max:', amount);
            return maxAmount;
        }
        if (amount < -maxAmount) {
            console.warn('[PROFIT_CONTROL] Amount too negative, clamping to min:', amount);
            return -maxAmount;
        }
        return amount;
    }
    // Validate and clamp RTP values
    static validateAndClampRtp(rtp) {
        if (!rtp || isNaN(rtp) || !isFinite(rtp)) {
            console.warn('[PROFIT_CONTROL] Invalid RTP detected, using 80:', rtp);
            return 80;
        }
        // Clamp to reasonable RTP range: 1-100
        if (rtp < 1) {
            console.warn('[PROFIT_CONTROL] RTP too low, clamping to 1:', rtp);
            return 1;
        }
        if (rtp > 100) {
            console.warn('[PROFIT_CONTROL] RTP too high, clamping to 100:', rtp);
            return 100;
        }
        return rtp;
    }
    // Track profit metrics for analytics and auto-adjustment
    static async trackProfitMetrics(metrics) {
        try {
            // Validate all numeric values before database insertion
            const validatedMetrics = {
                originalAmount: this.validateAndClampAmount(metrics.originalAmount),
                adjustedAmount: this.validateAndClampAmount(metrics.adjustedAmount),
                profitReduction: this.validateAndClampAmount(metrics.profitReduction),
                effectiveRtp: this.validateAndClampRtp(metrics.effectiveRtp),
                providerRtp: this.validateAndClampRtp(metrics.providerRtp)
            };
            console.log('[PROFIT_CONTROL] Validated metrics:', validatedMetrics);
            // Insert profit tracking record
            await postgres_1.default.query(`
        INSERT INTO profit_tracking (
          user_id, game_id, original_amount, adjusted_amount, 
          profit_reduction, effective_rtp, provider_rtp, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
                metrics.userId,
                metrics.gameId,
                validatedMetrics.originalAmount,
                validatedMetrics.adjustedAmount,
                validatedMetrics.profitReduction,
                validatedMetrics.effectiveRtp,
                validatedMetrics.providerRtp,
                metrics.timestamp
            ]);
            // Update daily profit summary with validated metrics
            await this.updateDailyProfitSummary(Object.assign(Object.assign({}, metrics), { originalAmount: validatedMetrics.originalAmount, adjustedAmount: validatedMetrics.adjustedAmount, profitReduction: validatedMetrics.profitReduction, effectiveRtp: validatedMetrics.effectiveRtp }));
        }
        catch (error) {
            console.error('[PROFIT_CONTROL] Error tracking profit metrics:', error);
        }
    }
    // Update daily profit summary for auto-adjustment
    static async updateDailyProfitSummary(metrics) {
        const today = new Date().toISOString().split('T')[0];
        try {
            if (metrics.transactionType === 'win') {
                // Update wins and profit retention
                await postgres_1.default.query(`
          INSERT INTO daily_profit_summary (
            date, total_wins, total_adjusted_wins,
            total_profit_retained, effective_rtp, target_profit,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (date) DO UPDATE SET
            total_wins = daily_profit_summary.total_wins + $2,
            total_adjusted_wins = daily_profit_summary.total_adjusted_wins + $3,
            total_profit_retained = daily_profit_summary.total_profit_retained + $4,
            effective_rtp = $5,
            updated_at = NOW()
        `, [
                    today,
                    metrics.originalAmount,
                    metrics.adjustedAmount,
                    metrics.profitReduction,
                    metrics.effectiveRtp,
                    20.00 // Default target profit
                ]);
            }
            else if (metrics.transactionType === 'bet') {
                // Update bet amounts
                await postgres_1.default.query(`
          INSERT INTO daily_profit_summary (
            date, total_bets, effective_rtp, target_profit,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (date) DO UPDATE SET
            total_bets = daily_profit_summary.total_bets + $2,
            effective_rtp = $3,
            updated_at = NOW()
        `, [
                    today,
                    metrics.originalAmount,
                    metrics.effectiveRtp,
                    20.00 // Default target profit
                ]);
            }
        }
        catch (error) {
            console.error('[PROFIT_CONTROL] Error updating daily profit summary:', error);
        }
    }
    // Calculate current profit performance for auto-adjustment
    static async calculateProfitPerformance() {
        const today = new Date().toISOString().split('T')[0];
        try {
            // Get today's profit summary
            const result = await postgres_1.default.query(`
        SELECT 
          COALESCE(total_bets, 0) as total_bets,
          COALESCE(total_wins, 0) as total_wins,
          COALESCE(total_adjusted_wins, 0) as total_adjusted_wins,
          COALESCE(total_profit_retained, 0) as total_profit_retained,
          COALESCE(target_profit, 20.00) as target_profit
        FROM daily_profit_summary 
        WHERE date = $1
      `, [today]);
            if (result.rows.length === 0) {
                return {
                    actualProfitPercent: 0,
                    targetProfitPercent: 20,
                    profitGap: -20,
                    totalBets: 0,
                    totalWins: 0,
                    totalAdjustedWins: 0
                };
            }
            const data = result.rows[0];
            const totalBets = parseFloat(data.total_bets) || 0;
            const totalWins = parseFloat(data.total_wins) || 0;
            const totalAdjustedWins = parseFloat(data.total_adjusted_wins) || 0;
            const totalProfitRetained = parseFloat(data.total_profit_retained) || 0;
            const targetProfit = parseFloat(data.target_profit) || 20;
            // Calculate actual profit percentage
            const actualProfitPercent = totalBets > 0 ? (totalProfitRetained / totalBets) * 100 : 0;
            const profitGap = actualProfitPercent - targetProfit;
            return {
                actualProfitPercent: Math.round(actualProfitPercent * 100) / 100,
                targetProfitPercent: targetProfit,
                profitGap: Math.round(profitGap * 100) / 100,
                totalBets,
                totalWins,
                totalAdjustedWins
            };
        }
        catch (error) {
            console.error('[PROFIT_CONTROL] Error calculating profit performance:', error);
            return {
                actualProfitPercent: 0,
                targetProfitPercent: 20,
                profitGap: -20,
                totalBets: 0,
                totalWins: 0,
                totalAdjustedWins: 0
            };
        }
    }
    // Auto-adjust effective RTP based on profit performance
    static async autoAdjustEffectiveRtp() {
        try {
            // Get current RTP settings
            const rtpSettings = await this.getRtpSettings();
            // Only auto-adjust if mode is 'auto'
            if (rtpSettings.adjustment_mode !== 'auto') {
                return {
                    previousRtp: rtpSettings.effective_rtp,
                    newRtp: rtpSettings.effective_rtp,
                    adjustment: 0,
                    reason: 'Manual mode - no auto-adjustment'
                };
            }
            // Calculate current profit performance
            const performance = await this.calculateProfitPerformance();
            let newRtp = rtpSettings.effective_rtp;
            let adjustment = 0;
            let reason = 'No adjustment needed';
            // Smart adjustment logic based on profit gap
            if (performance.profitGap < -5) {
                // Too much loss - reduce player payouts (increase our profit)
                adjustment = Math.min(2, Math.abs(performance.profitGap) * 0.3);
                newRtp = Math.max(rtpSettings.effective_rtp - adjustment, 50);
                reason = `Profit below target by ${performance.profitGap.toFixed(2)}% - reducing payouts`;
            }
            else if (performance.profitGap > 5) {
                // Too much profit - increase player payouts (reduce our profit)
                adjustment = Math.min(1, performance.profitGap * 0.2);
                newRtp = Math.min(rtpSettings.effective_rtp + adjustment, 95);
                reason = `Profit above target by ${performance.profitGap.toFixed(2)}% - increasing payouts`;
            }
            // Update effective RTP if adjustment needed
            if (adjustment > 0) {
                await postgres_1.default.query(`
          UPDATE rtp_settings 
          SET effective_rtp = $1, updated_at = NOW() 
          WHERE id = (SELECT id FROM rtp_settings ORDER BY id DESC LIMIT 1)
        `, [newRtp]);
                // Log the adjustment
                await postgres_1.default.query(`
          INSERT INTO rtp_adjustment_log (
            previous_rtp, new_rtp, adjustment, reason, 
            profit_gap, actual_profit, target_profit, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
                    rtpSettings.effective_rtp,
                    newRtp,
                    adjustment,
                    reason,
                    performance.profitGap,
                    performance.actualProfitPercent,
                    performance.targetProfitPercent
                ]);
            }
            return {
                previousRtp: rtpSettings.effective_rtp,
                newRtp,
                adjustment,
                reason
            };
        }
        catch (error) {
            console.error('[PROFIT_CONTROL] Error in auto-adjustment:', error);
            return {
                previousRtp: 80,
                newRtp: 80,
                adjustment: 0,
                reason: 'Error in auto-adjustment'
            };
        }
    }
    // Get profit analytics for admin dashboard
    static async getProfitAnalytics(filters = {}) {
        const { start_date, end_date, game_id, provider } = filters;
        let whereConditions = [];
        let values = [];
        let paramCount = 1;
        if (start_date && end_date) {
            whereConditions.push(`created_at BETWEEN $${paramCount} AND $${paramCount + 1}`);
            values.push(start_date, end_date);
            paramCount += 2;
        }
        if (game_id) {
            whereConditions.push(`game_id = $${paramCount}`);
            values.push(game_id);
            paramCount++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        try {
            // Get profit summary
            const summaryQuery = `
        SELECT 
          SUM(original_amount) as total_original_wins,
          SUM(adjusted_amount) as total_adjusted_wins,
          SUM(profit_reduction) as total_profit_retained,
          AVG(effective_rtp) as avg_effective_rtp,
          COUNT(*) as total_transactions
        FROM profit_tracking 
        ${whereClause}
      `;
            const summaryResult = await postgres_1.default.query(summaryQuery, values);
            const summary = summaryResult.rows[0];
            // Get profit by game
            const gameQuery = `
        SELECT 
          g.name as game_name,
          g.provider,
          SUM(pt.original_amount) as total_original_wins,
          SUM(pt.adjusted_amount) as total_adjusted_wins,
          SUM(pt.profit_reduction) as total_profit_retained,
          AVG(pt.effective_rtp) as avg_effective_rtp,
          COUNT(*) as transaction_count
        FROM profit_tracking pt
        JOIN games g ON pt.game_id = g.id
        ${whereClause}
        GROUP BY g.id, g.name, g.provider
        ORDER BY total_profit_retained DESC
        LIMIT 20
      `;
            const gameResult = await postgres_1.default.query(gameQuery, values);
            return {
                summary: {
                    totalOriginalWins: parseFloat(summary.total_original_wins || 0),
                    totalAdjustedWins: parseFloat(summary.total_adjusted_wins || 0),
                    totalProfitRetained: parseFloat(summary.total_profit_retained || 0),
                    avgEffectiveRtp: parseFloat(summary.avg_effective_rtp || 0),
                    totalTransactions: parseInt(summary.total_transactions || 0)
                },
                byGame: gameResult.rows
            };
        }
        catch (error) {
            console.error('[PROFIT_CONTROL] Error getting profit analytics:', error);
            return {
                summary: {
                    totalOriginalWins: 0,
                    totalAdjustedWins: 0,
                    totalProfitRetained: 0,
                    avgEffectiveRtp: 0,
                    totalTransactions: 0
                },
                byGame: []
            };
        }
    }
}
exports.ProfitControlService = ProfitControlService;
