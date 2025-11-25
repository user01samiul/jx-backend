"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeAnalyticsService = exports.getPlayerAnalyticsService = exports.getProviderPerformanceService = exports.getResultsDistributionService = exports.getGamePerformanceService = exports.getBetAnalyticsService = exports.getBetStatisticsService = void 0;
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
 * Enhanced version with additional metrics
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
      COUNT(DISTINCT user_id) as active_players,
      ROUND((COUNT(CASE WHEN outcome = 'win' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2) as win_rate,
      ROUND(AVG(bet_amount), 2) as avg_bet,
      ROUND(AVG(CASE WHEN outcome = 'win' THEN win_amount END), 2) as avg_win,
      ROUND(AVG(CASE WHEN outcome IN ('lose', 'loss') THEN bet_amount END), 2) as avg_loss
    FROM bets
    WHERE placed_at >= NOW() - INTERVAL '${interval}'
      AND outcome IN ('win', 'lose', 'loss')
    GROUP BY DATE_TRUNC('${dateTrunc}', placed_at)
    ORDER BY date ASC
    `);
    const dataRows = analyticsResult.rows.map(row => {
        const totalWagered = parseFloat(row.total_wagered);
        const netProfit = parseFloat(row.net_profit);
        const roi = totalWagered > 0 ? parseFloat(((netProfit / totalWagered) * 100).toFixed(2)) : 0;
        return {
            date: row.date,
            totalBets: parseInt(row.total_bets),
            totalWagered: totalWagered,
            totalWon: parseFloat(row.total_won),
            netProfit: netProfit,
            activePlayers: parseInt(row.active_players),
            winRate: parseFloat(row.win_rate) || 0,
            avgBet: parseFloat(row.avg_bet) || 0,
            avgWin: parseFloat(row.avg_win) || 0,
            avgLoss: parseFloat(row.avg_loss) || 0,
            roi: roi
        };
    });
    // Calculate summary
    const summary = {
        totalBets: dataRows.reduce((sum, row) => sum + row.totalBets, 0),
        totalWagered: dataRows.reduce((sum, row) => sum + row.totalWagered, 0),
        totalWon: dataRows.reduce((sum, row) => sum + row.totalWon, 0),
        netProfit: dataRows.reduce((sum, row) => sum + row.netProfit, 0),
        avgWinRate: dataRows.length > 0
            ? parseFloat((dataRows.reduce((sum, row) => sum + row.winRate, 0) / dataRows.length).toFixed(2))
            : 0,
        avgActivePlayers: dataRows.length > 0
            ? Math.round(dataRows.reduce((sum, row) => sum + row.activePlayers, 0) / dataRows.length)
            : 0
    };
    return {
        data: dataRows,
        summary: summary
    };
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
/**
 * GET /api/admin/bets/player-analytics
 * Get player-by-player betting analytics
 */
const getPlayerAnalyticsService = async (timeRange = '7d', limit = 10, sortBy = 'totalWagered', minBets = 10) => {
    const interval = getTimeRangeInterval(timeRange);
    const playerAnalyticsResult = await postgres_1.default.query(`
    WITH player_stats AS (
      SELECT
        u.id as player_id,
        u.username,
        COUNT(*) as total_bets,
        SUM(b.bet_amount) as total_wagered,
        SUM(CASE WHEN b.outcome = 'win' THEN b.win_amount ELSE 0 END) as total_won,
        ROUND((COUNT(CASE WHEN b.outcome = 'win' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2) as win_rate,
        ROUND(AVG(b.bet_amount), 2) as avg_bet,
        MAX(b.placed_at) as last_active,
        COUNT(DISTINCT b.session_id) as session_count
      FROM bets b
      JOIN users u ON b.user_id = u.id
      WHERE b.placed_at >= NOW() - INTERVAL '${interval}'
        AND b.outcome IN ('win', 'lose', 'loss')
      GROUP BY u.id, u.username
      HAVING COUNT(*) >= $1
    ),
    favorite_games AS (
      SELECT DISTINCT ON (b.user_id)
        b.user_id,
        g.name as favorite_game,
        g.id as favorite_game_id
      FROM bets b
      JOIN games g ON b.game_id = g.id
      WHERE b.placed_at >= NOW() - INTERVAL '${interval}'
      GROUP BY b.user_id, g.name, g.id
      ORDER BY b.user_id, COUNT(*) DESC
    )
    SELECT
      ps.player_id as "playerId",
      ps.username,
      ps.total_bets as "totalBets",
      ps.total_wagered as "totalWagered",
      ps.total_won as "totalWon",
      ps.total_won - ps.total_wagered as "netProfit",
      ps.win_rate as "winRate",
      ps.avg_bet as "avgBet",
      ps.last_active as "lastActive",
      ps.session_count as "sessionCount",
      COALESCE(fg.favorite_game, 'N/A') as "favoriteGame",
      COALESCE(fg.favorite_game_id, 0) as "favoriteGameId"
    FROM player_stats ps
    LEFT JOIN favorite_games fg ON ps.player_id = fg.user_id
    ORDER BY
      CASE
        WHEN $2 = 'totalBets' THEN ps.total_bets
        WHEN $2 = 'totalWagered' THEN ps.total_wagered
        WHEN $2 = 'netProfit' THEN ps.total_won - ps.total_wagered
        WHEN $2 = 'winRate' THEN ps.win_rate
        ELSE ps.total_wagered
      END DESC
    LIMIT $3
    `, [minBets, sortBy, limit]);
    return playerAnalyticsResult.rows.map(row => ({
        playerId: parseInt(row.playerId),
        username: row.username,
        totalBets: parseInt(row.totalBets),
        totalWagered: parseFloat(row.totalWagered),
        totalWon: parseFloat(row.totalWon),
        netProfit: parseFloat(row.netProfit),
        winRate: parseFloat(row.winRate) || 0,
        avgBet: parseFloat(row.avgBet) || 0,
        lastActive: row.lastActive,
        favoriteGame: row.favoriteGame,
        favoriteGameId: parseInt(row.favoriteGameId),
        sessionCount: parseInt(row.sessionCount)
    }));
};
exports.getPlayerAnalyticsService = getPlayerAnalyticsService;
/**
 * GET /api/admin/bets/time-analytics
 * Get hourly betting pattern analytics
 */
const getTimeAnalyticsService = async (timeRange = '7d', timezone = 'UTC') => {
    const interval = getTimeRangeInterval(timeRange);
    const timeAnalyticsResult = await postgres_1.default.query(`
    WITH hourly_stats AS (
      SELECT
        EXTRACT(HOUR FROM placed_at AT TIME ZONE $1) as hour,
        DATE(placed_at AT TIME ZONE $1) as date,
        COUNT(*) as bets,
        SUM(bet_amount) as wagered,
        COUNT(DISTINCT user_id) as players,
        COUNT(CASE WHEN outcome = 'win' THEN 1 END) as wins
      FROM bets
      WHERE placed_at >= NOW() - INTERVAL '${interval}'
        AND outcome IN ('win', 'lose', 'loss')
      GROUP BY EXTRACT(HOUR FROM placed_at AT TIME ZONE $1), DATE(placed_at AT TIME ZONE $1)
    )
    SELECT
      hour,
      SUM(bets) as total_bets,
      SUM(wagered) as total_wagered,
      ROUND(AVG(players), 0) as active_players,
      ROUND((SUM(wins) * 100.0 / NULLIF(SUM(bets), 0)), 2) as win_rate
    FROM hourly_stats
    GROUP BY hour
    ORDER BY hour
    `, [timezone]);
    const hourlyData = timeAnalyticsResult.rows.map(row => ({
        hour: parseInt(row.hour),
        totalBets: parseInt(row.total_bets),
        totalWagered: parseFloat(row.total_wagered),
        activePlayers: parseInt(row.active_players),
        winRate: parseFloat(row.win_rate) || 0
    }));
    // Calculate peak hours
    const peakHours = {
        mostBets: hourlyData.reduce((prev, current) => current.totalBets > prev.totalBets ? current : prev, { hour: 0, totalBets: 0 }),
        mostWagered: hourlyData.reduce((prev, current) => current.totalWagered > prev.totalWagered ? current : prev, { hour: 0, totalWagered: 0 }),
        mostPlayers: hourlyData.reduce((prev, current) => current.activePlayers > prev.activePlayers ? current : prev, { hour: 0, activePlayers: 0 })
    };
    return {
        data: hourlyData,
        peakHours: {
            mostBets: {
                hour: peakHours.mostBets.hour,
                count: peakHours.mostBets.totalBets
            },
            mostWagered: {
                hour: peakHours.mostWagered.hour,
                amount: peakHours.mostWagered.totalWagered
            },
            mostPlayers: {
                hour: peakHours.mostPlayers.hour,
                count: peakHours.mostPlayers.activePlayers
            }
        }
    };
};
exports.getTimeAnalyticsService = getTimeAnalyticsService;
