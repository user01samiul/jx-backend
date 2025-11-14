/**
 * Player Behavior Analytics Service
 * Tracks and analyzes player behavior for retention optimization
 */

import pool from '../../db/postgres';
import { v4 as uuidv4 } from 'uuid';

export interface PlayerEvent {
  user_id: number;
  event_type: string;
  event_data?: any;
  session_id: string;
  device_type?: string;
  ip_address?: string;
  country_code?: string;
}

export interface PlayerSession {
  user_id: number;
  session_id: string;
  device_type?: string;
  ip_address?: string;
  country_code?: string;
}

export interface BehaviorScore {
  engagement_score: number;
  risk_appetite_score: number;
  loyalty_score: number;
  value_score: number;
  avg_session_duration: number;
  sessions_per_week: number;
  favorite_game_category?: string;
  betting_pattern: string;
}

export class PlayerBehaviorService {
  /**
   * Track a player event
   */
  static async trackEvent(event: PlayerEvent): Promise<void> {
    const query = `
      INSERT INTO player_analytics_events (
        user_id, event_type, event_data, session_id,
        device_type, ip_address, country_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await pool.query(query, [
      event.user_id,
      event.event_type,
      JSON.stringify(event.event_data || {}),
      event.session_id,
      event.device_type,
      event.ip_address,
      event.country_code
    ]);
  }

  /**
   * Start a new player session
   */
  static async startSession(session: PlayerSession): Promise<string> {
    const sessionId = session.session_id || uuidv4();

    const query = `
      INSERT INTO player_sessions (
        id, user_id, device_type, ip_address, country_code, is_active
      ) VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id
    `;

    const result = await pool.query(query, [
      sessionId,
      session.user_id,
      session.device_type,
      session.ip_address,
      session.country_code
    ]);

    // Track login event
    await this.trackEvent({
      user_id: session.user_id,
      event_type: 'login',
      session_id: sessionId,
      device_type: session.device_type,
      ip_address: session.ip_address,
      country_code: session.country_code
    });

    return result.rows[0].id;
  }

  /**
   * End a player session
   */
  static async endSession(sessionId: string, metrics?: {
    total_bets?: number;
    total_wins?: number;
    games_played?: number[];
  }): Promise<void> {
    const query = `
      UPDATE player_sessions
      SET
        end_time = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER,
        total_bets = COALESCE($2, 0),
        total_wins = COALESCE($3, 0),
        net_result = COALESCE($3, 0) - COALESCE($2, 0),
        games_played = COALESCE($4, '[]'::jsonb),
        is_active = false
      WHERE id = $1
      RETURNING user_id
    `;

    const result = await pool.query(query, [
      sessionId,
      metrics?.total_bets || 0,
      metrics?.total_wins || 0,
      JSON.stringify(metrics?.games_played || [])
    ]);

    if (result.rows.length > 0) {
      // Track logout event
      await this.trackEvent({
        user_id: result.rows[0].user_id,
        event_type: 'logout',
        session_id: sessionId,
        event_data: metrics
      });
    }
  }

  /**
   * Get player behavior overview
   */
  static async getPlayerBehavior(userId: number, days: number = 30) {
    const query = `
      WITH session_stats AS (
        SELECT
          COUNT(*) as total_sessions,
          AVG(duration_seconds) as avg_duration,
          SUM(total_bets) as total_bets,
          SUM(total_wins) as total_wins,
          MAX(start_time) as last_session
        FROM player_sessions
        WHERE user_id = $1
          AND start_time >= NOW() - INTERVAL '${days} days'
      ),
      game_stats AS (
        SELECT
          jsonb_array_elements_text(games_played)::integer as game_id
        FROM player_sessions
        WHERE user_id = $1
          AND start_time >= NOW() - INTERVAL '${days} days'
          AND games_played != '[]'::jsonb
      ),
      favorite_games AS (
        SELECT
          g.id,
          g.name,
          g.category,
          COUNT(*) as play_count
        FROM game_stats gs
        JOIN games g ON g.id = gs.game_id
        GROUP BY g.id, g.name, g.category
        ORDER BY play_count DESC
        LIMIT 5
      ),
      betting_pattern AS (
        SELECT
          CASE
            WHEN STDDEV((event_data->>'bet_amount')::numeric) / AVG((event_data->>'bet_amount')::numeric) < 0.3 THEN 'conservative'
            WHEN STDDEV((event_data->>'bet_amount')::numeric) / AVG((event_data->>'bet_amount')::numeric) BETWEEN 0.3 AND 0.7 THEN 'moderate'
            ELSE 'aggressive'
          END as pattern
        FROM player_analytics_events
        WHERE user_id = $1
          AND event_type = 'bet_placed'
          AND event_data->>'bet_amount' IS NOT NULL
          AND created_at >= NOW() - INTERVAL '${days} days'
      )
      SELECT
        ss.*,
        COALESCE(jsonb_agg(
          jsonb_build_object(
            'game_id', fg.id,
            'name', fg.name,
            'category', fg.category,
            'play_count', fg.play_count
          )
        ) FILTER (WHERE fg.id IS NOT NULL), '[]'::jsonb) as favorite_games,
        COALESCE(bp.pattern, 'unknown') as betting_pattern
      FROM session_stats ss
      LEFT JOIN favorite_games fg ON true
      LEFT JOIN betting_pattern bp ON true
      GROUP BY ss.total_sessions, ss.avg_duration, ss.total_bets, ss.total_wins, ss.last_session, bp.pattern
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Calculate behavior scores for a player
   */
  static async calculateBehaviorScores(userId: number): Promise<BehaviorScore> {
    const behavior = await this.getPlayerBehavior(userId, 30);

    if (!behavior) {
      return {
        engagement_score: 0,
        risk_appetite_score: 0,
        loyalty_score: 0,
        value_score: 0,
        avg_session_duration: 0,
        sessions_per_week: 0,
        betting_pattern: 'unknown'
      };
    }

    // Engagement Score (0-10) - based on session frequency and duration
    const sessionsPerWeek = (behavior.total_sessions / 30) * 7;
    const avgDurationMinutes = behavior.avg_duration / 60;
    const engagementScore = Math.min(10, (sessionsPerWeek * 2) + (avgDurationMinutes / 10));

    // Risk Appetite Score (0-10) - based on betting pattern
    const riskMap: any = {
      'conservative': 3,
      'moderate': 6,
      'aggressive': 9,
      'unknown': 5
    };
    const riskAppetiteScore = riskMap[behavior.betting_pattern] || 5;

    // Loyalty Score (0-10) - based on consistency
    const loyaltyScore = Math.min(10, sessionsPerWeek * 1.5);

    // Value Score (0-10) - based on total bets
    const valueScore = Math.min(10, (behavior.total_bets / 1000) * 2);

    const scores: BehaviorScore = {
      engagement_score: Number(engagementScore.toFixed(2)),
      risk_appetite_score: riskAppetiteScore,
      loyalty_score: Number(loyaltyScore.toFixed(2)),
      value_score: Number(valueScore.toFixed(2)),
      avg_session_duration: Number(behavior.avg_duration) || 0,
      sessions_per_week: Number(sessionsPerWeek.toFixed(2)),
      favorite_game_category: behavior.favorite_games?.[0]?.category,
      betting_pattern: behavior.betting_pattern
    };

    // Save to database
    await this.saveBehaviorScores(userId, scores);

    return scores;
  }

  /**
   * Save behavior scores to database
   */
  static async saveBehaviorScores(userId: number, scores: BehaviorScore): Promise<void> {
    const query = `
      INSERT INTO player_behavior_scores (
        user_id, engagement_score, risk_appetite_score, loyalty_score, value_score,
        avg_session_duration, sessions_per_week, favorite_game_category, betting_pattern
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id)
      DO UPDATE SET
        engagement_score = EXCLUDED.engagement_score,
        risk_appetite_score = EXCLUDED.risk_appetite_score,
        loyalty_score = EXCLUDED.loyalty_score,
        value_score = EXCLUDED.value_score,
        avg_session_duration = EXCLUDED.avg_session_duration,
        sessions_per_week = EXCLUDED.sessions_per_week,
        favorite_game_category = EXCLUDED.favorite_game_category,
        betting_pattern = EXCLUDED.betting_pattern,
        last_calculated = NOW()
    `;

    await pool.query(query, [
      userId,
      scores.engagement_score,
      scores.risk_appetite_score,
      scores.loyalty_score,
      scores.value_score,
      scores.avg_session_duration,
      scores.sessions_per_week,
      scores.favorite_game_category,
      scores.betting_pattern
    ]);
  }

  /**
   * Get top players by engagement
   */
  static async getTopPlayersByEngagement(limit: number = 100) {
    const query = `
      SELECT
        u.id,
        u.username,
        u.email,
        pbs.engagement_score,
        pbs.loyalty_score,
        pbs.value_score,
        pbs.sessions_per_week,
        pbs.betting_pattern
      FROM player_behavior_scores pbs
      JOIN users u ON u.id = pbs.user_id
      WHERE u.status_id = (SELECT id FROM statuses WHERE name = 'Active')
      ORDER BY pbs.engagement_score DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get session heatmap data
   */
  static async getSessionHeatmap(days: number = 30) {
    const query = `
      SELECT
        EXTRACT(DOW FROM start_time) as day_of_week, -- 0=Sunday, 6=Saturday
        EXTRACT(HOUR FROM start_time) as hour_of_day,
        COUNT(*) as session_count,
        AVG(duration_seconds) as avg_duration
      FROM player_sessions
      WHERE start_time >= NOW() - INTERVAL '${days} days'
      GROUP BY day_of_week, hour_of_day
      ORDER BY day_of_week, hour_of_day
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Detect loss chasing behavior
   */
  static async detectLossChasing(userId: number): Promise<boolean> {
    const query = `
      WITH recent_bets AS (
        SELECT
          (event_data->>'bet_amount')::numeric as bet_amount,
          (event_data->>'result')::text as result,
          created_at
        FROM player_analytics_events
        WHERE user_id = $1
          AND event_type = 'bet_placed'
          AND created_at >= NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC
        LIMIT 10
      ),
      loss_streak AS (
        SELECT
          COUNT(*) FILTER (WHERE result = 'loss') as losses,
          AVG(bet_amount) FILTER (WHERE result = 'loss') as avg_loss_bet,
          LAST_VALUE(bet_amount) OVER (ORDER BY created_at) as last_bet
        FROM recent_bets
      )
      SELECT
        losses >= 3 AND last_bet > avg_loss_bet * 1.5 as is_chasing
      FROM loss_streak
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0]?.is_chasing || false;
  }
}
