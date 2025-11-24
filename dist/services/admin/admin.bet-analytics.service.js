"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderPerformanceService = exports.getResultsDistributionService = exports.getGamePerformanceService = exports.getBetAnalyticsService = exports.getBetStatisticsService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
/**
 * Time range helper - converts time range string to SQL interval
 */
const getTimeRangeInterval = (timeRange) => {
    const intervals = {
        '24h': '1 day',
        '7d': '7 days',
        '30d': '30 days',
        '90d': '90 days',
        'all': '100 years' // Effectively no limit
    };
    return intervals[timeRange] || '7 days';
};
/**
 * GET /api/admin/bets/statistics
 * Get aggregated betting statistics for dashboard cards
 */
const getBetStatisticsService = async (timeRange = '7d') => {
    const interval = getTimeRangeInterval(timeRange);
    // Current period statistics
    const currentStatsResult = await postgres_1.default.query(`
    SELECT
      COUNT(*) as total_bets,
      COALESCE(SUM(bet_amount), 0) as total_wagered,
      COALESCE(SUM(CASE WHEN outcome = 'win' THEN win_amount ELSE 0 END), 0) as total_won,
      COALESCE(SUM(CASE WHEN outcome IN ('loss', 'lose') THEN bet_amount ELSE 0 END), 0) as total_lost,
      COALESCE(SUM(bet_amount) - SUM(CASE WHEN outcome = 'win' THEN win_amount ELSE 0 END), 0) as net_profit,
      COUNT(CASE WHEN outcome = 'pending' THEN 1 END) as active_bets
    FROM bets
    WHERE placed_at >= NOW() - INTERVAL '${interval}'
    `);
    const currentStats = currentStatsResult.rows[0];
    // Previous period statistics for growth calculation
    const previousStatsResult = await postgres_1.default.query(`
    SELECT
      COUNT(*) as total_bets,
      COALESCE(SUM(bet_amount), 0) as total_wagered,
      COUNT(DISTINCT user_id) as active_players
    FROM bets
    WHERE placed_at >= NOW() - INTERVAL '${interval}' * 2
      AND placed_at < NOW() - INTERVAL '${interval}'
    `);
    const previousStats = previousStatsResult.rows[0];
    // Calculate growth percentages
    const betGrowth = previousStats.total_bets > 0
        ? ((parseFloat(currentStats.total_bets) - parseFloat(previousStats.total_bets)) / parseFloat(previousStats.total_bets) * 100)
        : 0;
    const revenueGrowth = parseFloat(previousStats.total_wagered) > 0
        ? ((parseFloat(currentStats.total_wagered) - parseFloat(previousStats.total_wagered)) / parseFloat(previousStats.total_wagered) * 100)
        : 0;
    // Get current period active players
    const currentPlayersResult = await postgres_1.default.query(`
    SELECT COUNT(DISTINCT user_id) as active_players
    FROM bets
    WHERE placed_at >= NOW() - INTERVAL '${interval}'
    `);
    const currentActivePlayers = parseInt(currentPlayersResult.rows[0].active_players);
    const previousActivePlayers = parseInt(previousStats.active_players);
    const playerGrowth = previousActivePlayers > 0
        ? ((currentActivePlayers - previousActivePlayers) / previousActivePlayers * 100)
        : 0;
    return {
        totalBets: parseInt(currentStats.total_bets),
        totalWagered: parseFloat(currentStats.total_wagered),
        totalWon: parseFloat(currentStats.total_won),
        totalLost: parseFloat(currentStats.total_lost),
        netProfit: parseFloat(currentStats.net_profit),
        activeBets: parseInt(currentStats.active_bets),
        betGrowth: parseFloat(betGrowth.toFixed(2)),
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
        playerGrowth: parseFloat(playerGrowth.toFixed(2))
    };
};
exports.getBetStatisticsService = getBetStatisticsService;
/**
 * GET /api/admin/bets/analytics
 * Get daily time-series data for analytics charts
 */
const getBetAnalyticsService = async (timeRange = '7d', groupBy = 'day') => {
    const interval = getTimeRangeInterval(timeRange);
    // Determine date truncation based on groupBy
    let dateTrunc = 'day';
    if (groupBy === 'hour')
        dateTrunc = 'hour';
    else if (groupBy === 'week')
        dateTrunc = 'week';
    else if (groupBy === 'month')
        dateTrunc = 'month';
    const analyticsResult = await postgres_1.default.query(`
    SELECT
      DATE_TRUNC('${dateTrunc}', placed_at) as date,
      COUNT(*) as total_bets,
      COALESCE(SUM(bet_amount), 0) as total_wagered,
      COALESCE(SUM(CASE WHEN outcome = 'win' THEN win_amount ELSE 0 END), 0) as total_won,
      COALESCE(SUM(bet_amount) - SUM(CASE WHEN outcome = 'win' THEN win_amount ELSE 0 END), 0) as net_profit,
      COUNT(DISTINCT user_id) as active_players
    FROM bets
    WHERE placed_at >= NOW() - INTERVAL '${interval}'
    GROUP BY DATE_TRUNC('${dateTrunc}', placed_at)
    ORDER BY date ASC
    `);
    return analyticsResult.rows.map(row => ({
        date: row.date,
        totalBets: parseInt(row.total_bets),
        totalWagered: parseFloat(row.total_wagered),
        totalWon: parseFloat(row.total_won),
        netProfit: parseFloat(row.net_profit),
        activePlayers: parseInt(row.active_players)
    }));
};
exports.getBetAnalyticsService = getBetAnalyticsService;
/**
 * GET /api/admin/bets/game-performance
 * Get performance metrics grouped by game
 */
const getGamePerformanceService = async (timeRange = '7d', limit = 10) => {
    const interval = getTimeRangeInterval(timeRange);
    const performanceResult = await postgres_1.default.query(`
    SELECT
      g.name as game,
      g.provider,
      COUNT(*) as bets,
      COALESCE(SUM(b.bet_amount), 0) as wagered,
      COALESCE(SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END), 0) as won,
      COALESCE(SUM(b.bet_amount) - SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END), 0) as net_profit,
      COALESCE(AVG(b.bet_amount), 0) as avg_bet,
      CASE
        WHEN SUM(b.bet_amount) > 0 THEN
          (SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END) / SUM(b.bet_amount) * 100)
        ELSE 0
      END as win_rate
    FROM bets b
    LEFT JOIN games g ON b.game_id = g.id
    WHERE b.placed_at >= NOW() - INTERVAL '${interval}'
    GROUP BY g.id, g.name, g.provider
    ORDER BY net_profit DESC
    LIMIT $1
    `, [limit]);
    return performanceResult.rows.map(row => ({
        game: row.game || 'Unknown Game',
        provider: row.provider || 'Unknown Provider',
        bets: parseInt(row.bets),
        wagered: parseFloat(row.wagered),
        won: parseFloat(row.won),
        netProfit: parseFloat(row.net_profit),
        avgBet: parseFloat(parseFloat(row.avg_bet).toFixed(2)),
        winRate: parseFloat(parseFloat(row.win_rate).toFixed(2))
    }));
};
exports.getGamePerformanceService = getGamePerformanceService;
/**
 * GET /api/admin/bets/results-distribution
 * Get win/loss distribution for pie chart
 */
const getResultsDistributionService = async (timeRange = '7d') => {
    const interval = getTimeRangeInterval(timeRange);
    const distributionResult = await postgres_1.default.query(`
    WITH result_counts AS (
      SELECT
        CASE
          WHEN outcome = 'win' THEN 'Win'
          WHEN outcome IN ('loss', 'lose') THEN 'Loss'
          WHEN outcome = 'pending' THEN 'Pending'
          ELSE 'Other'
        END as result,
        COUNT(*) as count,
        COALESCE(SUM(bet_amount), 0) as amount
      FROM bets
      WHERE placed_at >= NOW() - INTERVAL '${interval}'
      GROUP BY result
    ),
    total AS (
      SELECT SUM(count) as total_count
      FROM result_counts
    )
    SELECT
      rc.result,
      rc.count,
      rc.amount,
      CASE
        WHEN t.total_count > 0 THEN (rc.count::float / t.total_count * 100)
        ELSE 0
      END as percentage
    FROM result_counts rc, total t
    ORDER BY rc.count DESC
    `);
    return distributionResult.rows.map(row => ({
        result: row.result,
        count: parseInt(row.count),
        amount: parseFloat(row.amount),
        percentage: parseFloat(parseFloat(row.percentage).toFixed(2))
    }));
};
exports.getResultsDistributionService = getResultsDistributionService;
/**
 * GET /api/admin/bets/provider-performance
 * Get performance metrics grouped by provider (bonus endpoint)
 */
const getProviderPerformanceService = async (timeRange = '7d', limit = 10) => {
    const interval = getTimeRangeInterval(timeRange);
    const performanceResult = await postgres_1.default.query(`
    SELECT
      g.provider,
      COUNT(*) as bets,
      COALESCE(SUM(b.bet_amount), 0) as wagered,
      COALESCE(SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END), 0) as won,
      COALESCE(SUM(b.bet_amount) - SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END), 0) as net_profit,
      COALESCE(AVG(b.bet_amount), 0) as avg_bet,
      COUNT(DISTINCT b.user_id) as unique_players,
      CASE
        WHEN SUM(b.bet_amount) > 0 THEN
          (SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END) / SUM(b.bet_amount) * 100)
        ELSE 0
      END as win_rate
    FROM bets b
    LEFT JOIN games g ON b.game_id = g.id
    WHERE b.placed_at >= NOW() - INTERVAL '${interval}'
    GROUP BY g.provider
    ORDER BY net_profit DESC
    LIMIT $1
    `, [limit]);
    return performanceResult.rows.map(row => ({
        provider: row.provider || 'Unknown Provider',
        bets: parseInt(row.bets),
        wagered: parseFloat(row.wagered),
        won: parseFloat(row.won),
        netProfit: parseFloat(row.net_profit),
        avgBet: parseFloat(parseFloat(row.avg_bet).toFixed(2)),
        uniquePlayers: parseInt(row.unique_players),
        winRate: parseFloat(parseFloat(row.win_rate).toFixed(2))
    }));
};
exports.getProviderPerformanceService = getProviderPerformanceService;
