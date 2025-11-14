/**
 * Dashboard Statistics Controller
 * Real-time casino statistics from PostgreSQL
 */

import { Request, Response } from "express";
import pool from "../db/postgres";

/**
 * Get comprehensive dashboard statistics
 * GET /api/admin/dashboard/stats
 */
export async function getDashboardStats(req: Request, res: Response) {
  const { period = '24h' } = req.query; // 24h, 7d, 30d, all
  console.log('[DASHBOARD_STATS] Function called with period:', period);

  try {
    console.log('[DASHBOARD_STATS] Getting database client...');
    const client = await pool.connect();
    console.log('[DASHBOARD_STATS] Database client connected');


    try {
      let timeCondition = '';
      let transactionsTimeCondition = '';
      let betsTimeCondition = '';

      switch (period) {
        case '24h':
          timeCondition = "AND created_at >= NOW() - INTERVAL '24 hours'";
          transactionsTimeCondition = "AND transactions.created_at >= NOW() - INTERVAL '24 hours'";
          betsTimeCondition = "AND b.created_at >= NOW() - INTERVAL '24 hours'";
          break;
        case '7d':
          timeCondition = "AND created_at >= NOW() - INTERVAL '7 days'";
          transactionsTimeCondition = "AND transactions.created_at >= NOW() - INTERVAL '7 days'";
          betsTimeCondition = "AND b.created_at >= NOW() - INTERVAL '7 days'";
          break;
        case '30d':
          timeCondition = "AND created_at >= NOW() - INTERVAL '30 days'";
          transactionsTimeCondition = "AND transactions.created_at >= NOW() - INTERVAL '30 days'";
          betsTimeCondition = "AND b.created_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          timeCondition = '';
          transactionsTimeCondition = '';
          betsTimeCondition = '';
      }

      // Run queries in parallel for performance
      console.log('[DASHBOARD] Starting parallel queries...');
      const [
        userStats,
        financialStats,
        gamingStats,
        transactionStats,
        recentActivity,
        topPlayers,
        topGames,
        vipStats,
      ] = await Promise.all([
        // User Statistics
        client.query(`
          SELECT
            COUNT(*) as total_users,
            COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '24 hours') as new_users_24h,
            COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
            COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
            COUNT(DISTINCT up.user_id) FILTER (
              WHERE up.last_activity_at >= NOW() - INTERVAL '5 minutes'
            ) as active_now,
            COUNT(DISTINCT up.user_id) FILTER (
              WHERE up.last_activity_at >= NOW() - INTERVAL '24 hours'
            ) as active_24h
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id
        `),

        // Financial Statistics
        client.query(`
          SELECT
            -- Deposits
            COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'completed') as total_deposits_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as total_deposits,
            COALESCE(AVG(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as avg_deposit,

            -- Withdrawals
            COUNT(*) FILTER (WHERE type = 'withdrawal' AND status = 'completed') as total_withdrawals_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0) as total_withdrawals,
            COALESCE(AVG(amount) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0) as avg_withdrawal,

            -- Pending
            COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'pending') as pending_deposits,
            COUNT(*) FILTER (WHERE type = 'withdrawal' AND status = 'pending') as pending_withdrawals,
            COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal' AND status = 'pending'), 0) as pending_withdrawal_amount
          FROM transactions
          WHERE 1=1 ${transactionsTimeCondition}
        `),

        // Gaming Statistics
        client.query(`
          SELECT
            COUNT(*) as total_bets,
            COUNT(DISTINCT user_id) as unique_players,
            COALESCE(SUM(bet_amount), 0) as total_wagered,
            COALESCE(SUM(win_amount), 0) as total_won,
            COALESCE(SUM(bet_amount - win_amount), 0) as total_ggr,
            COALESCE(AVG(bet_amount), 0) as avg_bet_size,
            COALESCE(MAX(win_amount), 0) as biggest_win,
            COUNT(DISTINCT game_id) as games_played
          FROM bets
          WHERE 1=1 ${timeCondition}
        `),

        // Transaction Trend (last 7 days)
        client.query(`
          SELECT
            DATE(transactions.created_at) as date,
            COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'completed') as deposits_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as deposits_amount,
            COUNT(*) FILTER (WHERE type = 'withdrawal' AND status = 'completed') as withdrawals_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0) as withdrawals_amount
          FROM transactions
          WHERE transactions.created_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE(transactions.created_at)
          ORDER BY date DESC
        `),

        // Recent Activity (last 10 transactions)
        client.query(`
          SELECT
            t.id,
            t.type,
            t.amount,
            t.currency,
            t.status,
            t.created_at,
            u.username,
            up.avatar_url
          FROM transactions t
          JOIN users u ON t.user_id = u.id
          LEFT JOIN user_profiles up ON u.id = up.user_id
          WHERE t.status = 'completed'
          ORDER BY t.created_at DESC
          LIMIT 10
        `),

        // Top Players by GGR
        client.query(`
          SELECT
            u.id,
            u.username,
            up.avatar_url,
            COALESCE(SUM(b.bet_amount - b.win_amount), 0) as ggr,
            COALESCE(SUM(b.bet_amount), 0) as total_wagered,
            COUNT(b.id) as bet_count
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id
          LEFT JOIN bets b ON u.id = b.user_id
          WHERE 1=1 ${betsTimeCondition}
          GROUP BY u.id, u.username, up.avatar_url
          HAVING COUNT(b.id) > 0
          ORDER BY ggr DESC
          LIMIT 10
        `),

        // Top Games by Revenue
        client.query(`
          SELECT
            g.id,
            g.name,
            g.provider,
            g.image_url,
            COUNT(b.id) as play_count,
            COUNT(DISTINCT b.user_id) as unique_players,
            COALESCE(SUM(b.bet_amount), 0) as total_wagered,
            COALESCE(SUM(b.bet_amount - b.win_amount), 0) as ggr
          FROM games g
          JOIN bets b ON g.id = b.game_id
          WHERE 1=1 ${betsTimeCondition}
          GROUP BY g.id, g.name, g.provider, g.image_url
          ORDER BY ggr DESC
          LIMIT 10
        `),

        // VIP Statistics
        client.query(`
          SELECT
            COUNT(*) as total_vip_players,
            vt.name as tier_name,
            vt.level as tier_level,
            COUNT(uvs.user_id) as players_count
          FROM user_vip_status uvs
          JOIN vip_tiers vt ON uvs.current_tier_id = vt.id
          GROUP BY vt.id, vt.name, vt.level
          ORDER BY vt.level DESC
        `),
      ]);

      const users = userStats.rows[0];
      const financial = financialStats.rows[0];
      const gaming = gamingStats.rows[0];

      // Calculate derived metrics
      const netDeposits = parseFloat(financial.total_deposits) - parseFloat(financial.total_withdrawals);
      const depositToWithdrawalRatio = financial.total_withdrawals > 0
        ? (parseFloat(financial.total_deposits) / parseFloat(financial.total_withdrawals)).toFixed(2)
        : 'N/A';

      // GGR (Gross Gaming Revenue) = Total Wagered - Total Won
      const ggr = parseFloat(gaming.total_ggr);

      // Bonus cost (simplified - you might want to calculate from bonus_wagering_history)
      const bonusCost = 0; // TODO: Calculate from bonus tables

      // NGR (Net Gaming Revenue) = GGR - Bonus Cost
      const ngr = ggr - bonusCost;

      // RTP (Return to Player) = (Total Won / Total Wagered) * 100
      const rtp = gaming.total_wagered > 0
        ? ((parseFloat(gaming.total_won) / parseFloat(gaming.total_wagered)) * 100).toFixed(2)
        : 0;

      // House Edge = 100 - RTP
      const houseEdge = (100 - parseFloat(rtp.toString())).toFixed(2);

      // Revenue from gaming + deposits - withdrawals
      const totalRevenue = ggr + netDeposits;

      const dashboardStats = {
        overview: {
          total_users: parseInt(users.total_users),
          active_now: parseInt(users.active_now),
          active_24h: parseInt(users.active_24h),
          new_users_24h: parseInt(users.new_users_24h),
          new_users_7d: parseInt(users.new_users_7d),
          new_users_30d: parseInt(users.new_users_30d),
        },

        financial: {
          total_deposits: parseFloat(financial.total_deposits),
          total_deposits_count: parseInt(financial.total_deposits_count),
          avg_deposit: parseFloat(financial.avg_deposit),

          total_withdrawals: parseFloat(financial.total_withdrawals),
          total_withdrawals_count: parseInt(financial.total_withdrawals_count),
          avg_withdrawal: parseFloat(financial.avg_withdrawal),

          net_deposits: netDeposits,
          deposit_to_withdrawal_ratio: depositToWithdrawalRatio,

          pending_deposits: parseInt(financial.pending_deposits),
          pending_withdrawals: parseInt(financial.pending_withdrawals),
          pending_withdrawal_amount: parseFloat(financial.pending_withdrawal_amount),
        },

        gaming: {
          total_bets: parseInt(gaming.total_bets),
          unique_players: parseInt(gaming.unique_players),
          total_wagered: parseFloat(gaming.total_wagered),
          total_won: parseFloat(gaming.total_won),
          avg_bet_size: parseFloat(gaming.avg_bet_size),
          biggest_win: parseFloat(gaming.biggest_win),
          games_played: parseInt(gaming.games_played),

          // Key Metrics
          ggr,
          ngr,
          bonus_cost: bonusCost,
          rtp: parseFloat(rtp.toString()),
          house_edge: parseFloat(houseEdge),
        },

        revenue: {
          total_revenue: totalRevenue,
          ggr,
          ngr,
          net_deposits: netDeposits,
        },

        trends: {
          transactions: transactionStats.rows,
        },

        activity: {
          recent_transactions: recentActivity.rows,
        },

        leaderboards: {
          top_players: topPlayers.rows,
          top_games: topGames.rows,
        },

        vip: {
          total_vip_players: vipStats.rows.length > 0
            ? vipStats.rows.reduce((sum, tier) => sum + parseInt(tier.players_count), 0)
            : 0,
          tiers: vipStats.rows,
        },

        metadata: {
          period,
          generated_at: new Date().toISOString(),
        },
      };

      res.json({ success: true, data: dashboardStats });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error message:", error?.message);
    res.status(500).json({ success: false, error: "Internal server error", details: error?.message });
  }
}

/**
 * Get real-time statistics (lightweight)
 * GET /api/admin/dashboard/stats/realtime
 */
export async function getRealtimeStats(req: Request, res: Response) {
  try {
    const [activeUsers, pendingWithdrawals, recentBets] = await Promise.all([
      // Active users in last 5 minutes
      pool.query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_profiles
        WHERE last_activity_at >= NOW() - INTERVAL '5 minutes'
      `),

      // Pending withdrawals
      pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
        FROM transactions
        WHERE type = 'withdrawal' AND status = 'pending'
      `),

      // Recent bets (last minute)
      pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(bet_amount), 0) as total_amount
        FROM bets
        WHERE created_at >= NOW() - INTERVAL '1 minute'
      `),
    ]);

    res.json({
      success: true,
      data: {
        active_users: parseInt(activeUsers.rows[0].count),
        pending_withdrawals: {
          count: parseInt(pendingWithdrawals.rows[0].count),
          amount: parseFloat(pendingWithdrawals.rows[0].total_amount),
        },
        recent_bets: {
          count: parseInt(recentBets.rows[0].count),
          amount: parseFloat(recentBets.rows[0].total_amount),
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching realtime stats:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
