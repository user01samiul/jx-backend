import pool from "../../db/postgres";
import { getAvailableGamesService } from "../game/game.service";

export interface HomeData {
  featured_games: any[];
  new_games: any[];
  hot_games: any[];
  popular_games: any[];
  user_stats?: {
    total_balance: number;
    total_bets: number;
    total_wins: number;
    favorite_games_count: number;
    level_name: string;
    level_progress: number;
    // Added fields:
    is_verified: boolean;
    current_points: number;
    total_points_earned: number;
    games_played: number;
    balance: number;
    bonus_balance: number;
  };
  recent_activity?: any[];
  promotions?: any[];
  announcements?: any[];
  quick_stats?: {
    total_games: number;
    total_categories: number;
    total_providers: number;
    active_players: number;
  };
}

export const getHomeDataService = async (userId?: number): Promise<HomeData> => {
  try {
    // Get featured games (limit 6)
    const featuredGames = await getAvailableGamesService({ is_featured: true, limit: 6 });
    
    // Get new games (limit 6)
    const newGames = await getAvailableGamesService({ is_new: true, limit: 6 });
    
    // Get hot games (limit 6)
    const hotGames = await getAvailableGamesService({ is_hot: true, limit: 6 });
    
    // Get popular games (limit 6)
    const popularGames = await getAvailableGamesService({ limit: 6 });

    const homeData: HomeData = {
      featured_games: featuredGames,
      new_games: newGames,
      hot_games: hotGames,
      popular_games: popularGames,
      quick_stats: await getQuickStats(),
    };

    // If user is authenticated, add personalized data
    if (userId) {
      homeData.user_stats = await getUserStats(userId);
      homeData.recent_activity = await getRecentActivity(userId);
    }

    // Add promotions and announcements
    homeData.promotions = await getActivePromotions();
    homeData.announcements = await getAnnouncements();

    return homeData;
  } catch (error) {
    console.error("Error fetching home data:", error);
    throw error;
  }
};

const getQuickStats = async () => {
  try {
    const gamesResult = await pool.query(
      "SELECT COUNT(*) as total_games FROM games WHERE is_active = true"
    );
    
    const categoriesResult = await pool.query(
      "SELECT COUNT(DISTINCT category) as total_categories FROM games WHERE is_active = true"
    );
    
    const providersResult = await pool.query(
      "SELECT COUNT(DISTINCT provider) as total_providers FROM games WHERE is_active = true"
    );
    
    const activePlayersResult = await pool.query(
      "SELECT COUNT(*) as active_players FROM users u JOIN statuses s ON u.status_id = s.id WHERE s.name = 'Active'"
    );

    return {
      total_games: gamesResult.rows[0]?.total_games || 0,
      total_categories: categoriesResult.rows[0]?.total_categories || 0,
      total_providers: providersResult.rows[0]?.total_providers || 0,
      active_players: activePlayersResult.rows[0]?.active_players || 0,
    };
  } catch (error) {
    console.error("Error fetching quick stats:", error);
    return {
      total_games: 0,
      total_categories: 0,
      total_providers: 0,
      active_players: 0,
    };
  }
};

const getUserStats = async (userId: number) => {
  try {
    // Fetch all required fields in a single query for efficiency
    const result = await pool.query(
      `SELECT 
        up.is_verified,
        ub.balance, ub.bonus_balance, ub.locked_balance,
        (SELECT COUNT(DISTINCT b.id) FROM bets b WHERE b.user_id = $1) as total_bets,
        (SELECT COUNT(DISTINCT b.game_id) FROM bets b WHERE b.user_id = $1) as games_played,
        (SELECT COUNT(*) FROM bets b WHERE b.user_id = $1 AND b.outcome = 'win') as total_wins,
        (SELECT COUNT(*) FROM user_game_preferences ugp WHERE ugp.user_id = $1 AND ugp.is_favorite = true) as favorite_games_count,
        ul.name as level_name,
        ulp.current_points,
        ulp.total_points_earned,
        ulp.min_points,
        ulp.max_points
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      LEFT JOIN user_level_progress ulp ON u.id = ulp.user_id
      LEFT JOIN user_levels ul ON ulp.level_id = ul.id
      WHERE u.id = $1
      LIMIT 1`,
      [userId]
    );
    const row = result.rows[0] || {};
    // Calculate level progress
    let level_progress = 0;
    if (row.current_points !== undefined && row.min_points !== undefined && row.max_points !== undefined && row.max_points > row.min_points) {
      level_progress = ((row.current_points - row.min_points) / (row.max_points - row.min_points)) * 100;
      level_progress = Math.min(100, Math.max(0, level_progress));
    }
    return {
      total_balance: row.balance || 0,
      total_bets: row.total_bets || 0,
      total_wins: row.total_wins || 0,
      favorite_games_count: row.favorite_games_count || 0,
      level_name: row.level_name || "Bronze",
      level_progress,
      // Added fields:
      is_verified: !!row.is_verified,
      current_points: row.current_points || 0,
      total_points_earned: row.total_points_earned || 0,
      games_played: row.games_played || 0,
      balance: row.balance || 0,
      bonus_balance: row.bonus_balance || 0,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return {
      total_balance: 0,
      total_bets: 0,
      total_wins: 0,
      favorite_games_count: 0,
      level_name: "Bronze",
      level_progress: 0,
      // Added fields:
      is_verified: false,
      current_points: 0,
      total_points_earned: 0,
      games_played: 0,
      balance: 0,
      bonus_balance: 0,
    };
  }
};

const getRecentActivity = async (userId: number) => {
  try {
    const activityResult = await pool.query(
      "SELECT action, category, description, created_at FROM user_activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
      [userId, 10]
    );

    return activityResult.rows.map(activity => ({
      ...activity,
      created_at: activity.created_at,
    }));
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
};

const getActivePromotions = async () => {
  try {
    const promotionsResult = await pool.query(
      "SELECT id, name, description, type, value, start_date, end_date, is_active FROM promotions WHERE is_active = true AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP) ORDER BY created_at DESC LIMIT 5"
    );

    return promotionsResult.rows.map(promo => ({
      ...promo,
      start_date: promo.start_date,
      end_date: promo.end_date,
    }));
  } catch (error) {
    console.error("Error fetching promotions:", error);
    return [];
  }
};

const getAnnouncements = async () => {
  try {
    const announcementsResult = await pool.query(
      "SELECT id, title, content, type, is_active, created_at FROM announcements WHERE is_active = true ORDER BY created_at DESC LIMIT 5"
    );

    return announcementsResult.rows.map(announcement => ({
      ...announcement,
      created_at: announcement.created_at,
    }));
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }
}; 