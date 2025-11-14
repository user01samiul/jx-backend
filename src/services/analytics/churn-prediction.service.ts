/**
 * Churn Prediction Service
 * Predicts player churn risk and recommends retention actions
 */

import pool from '../../db/postgres';

export interface ChurnPrediction {
  user_id: number;
  username: string;
  email: string;
  churn_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  recommended_actions: string[];
  days_since_last_activity: number;
  session_frequency_trend: string;
  bet_size_trend: string;
  loss_streak: number;
}

export interface ChurnFactors {
  days_inactive: number;
  session_decline: boolean;
  bet_size_decline: boolean;
  loss_streak: number;
  withdrawal_increase: boolean;
  support_tickets: number;
  bonus_claim_decline: boolean;
}

export class ChurnPredictionService {
  /**
   * Calculate churn score for a user
   */
  static async calculateChurnScore(userId: number): Promise<ChurnPrediction> {
    const factors = await this.getChurnFactors(userId);
    const score = this.computeChurnScore(factors);
    const riskLevel = this.determineRiskLevel(score);
    const riskFactors = this.identifyRiskFactors(factors);
    const actions = this.recommendActions(riskLevel, riskFactors);

    const prediction: ChurnPrediction = {
      user_id: userId,
      username: '',
      email: '',
      churn_score: score,
      risk_level: riskLevel,
      risk_factors: riskFactors,
      recommended_actions: actions,
      days_since_last_activity: factors.days_inactive,
      session_frequency_trend: factors.session_decline ? 'declining' : 'stable',
      bet_size_trend: factors.bet_size_decline ? 'declining' : 'stable',
      loss_streak: factors.loss_streak
    };

    // Get user details
    const userQuery = await pool.query(
      'SELECT username, email FROM users WHERE id = $1',
      [userId]
    );

    if (userQuery.rows.length > 0) {
      prediction.username = userQuery.rows[0].username;
      prediction.email = userQuery.rows[0].email;
    }

    return prediction;
  }

  /**
   * Get churn factors for a user
   */
  static async getChurnFactors(userId: number): Promise<ChurnFactors> {
    const query = `
      WITH last_activity AS (
        SELECT
          user_id,
          MAX(start_time) as last_session,
          EXTRACT(DAY FROM (NOW() - MAX(start_time)))::INTEGER as days_inactive
        FROM player_sessions
        WHERE user_id = $1
        GROUP BY user_id
      ),
      session_trend AS (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE start_time >= NOW() - INTERVAL '7 days') as last_week_sessions,
          COUNT(*) FILTER (WHERE start_time >= NOW() - INTERVAL '14 days' AND start_time < NOW() - INTERVAL '7 days') as prev_week_sessions,
          AVG(total_bets) FILTER (WHERE start_time >= NOW() - INTERVAL '7 days') as last_week_bets,
          AVG(total_bets) FILTER (WHERE start_time >= NOW() - INTERVAL '14 days' AND start_time < NOW() - INTERVAL '7 days') as prev_week_bets
        FROM player_sessions
        WHERE user_id = $1
        GROUP BY user_id
      ),
      recent_bets AS (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE event_data->>'result' = 'loss') as consecutive_losses
        FROM (
          SELECT
            user_id,
            event_data,
            ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
          FROM player_analytics_events
          WHERE user_id = $1
            AND event_type = 'bet_placed'
            AND created_at >= NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC
          LIMIT 10
        ) sub
        WHERE rn <= (
          SELECT MIN(rn)
          FROM (
            SELECT
              ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn,
              event_data->>'result' as result
            FROM player_analytics_events
            WHERE user_id = $1
              AND event_type = 'bet_placed'
              AND created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
            LIMIT 10
          ) losses
          WHERE result = 'win'
        )
        GROUP BY user_id
      ),
      withdrawal_trend AS (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_week_withdrawals,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as prev_week_withdrawals
        FROM transactions
        WHERE user_id = $1
          AND type = 'withdrawal'
          AND status = 'completed'
        GROUP BY user_id
      ),
      bonus_trend AS (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_week_bonuses,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as prev_week_bonuses
        FROM transactions
        WHERE user_id = $1
          AND type = 'bonus'
        GROUP BY user_id
      )
      SELECT
        COALESCE(la.days_inactive, 999) as days_inactive,
        CASE WHEN st.last_week_sessions < st.prev_week_sessions * 0.5 THEN TRUE ELSE FALSE END as session_decline,
        CASE WHEN st.last_week_bets < st.prev_week_bets * 0.7 THEN TRUE ELSE FALSE END as bet_size_decline,
        COALESCE(rb.consecutive_losses, 0) as loss_streak,
        CASE WHEN wt.last_week_withdrawals > wt.prev_week_withdrawals * 1.5 THEN TRUE ELSE FALSE END as withdrawal_increase,
        0 as support_tickets,
        CASE WHEN bt.last_week_bonuses < bt.prev_week_bonuses * 0.5 THEN TRUE ELSE FALSE END as bonus_claim_decline
      FROM last_activity la
      LEFT JOIN session_trend st ON la.user_id = st.user_id
      LEFT JOIN recent_bets rb ON la.user_id = rb.user_id
      LEFT JOIN withdrawal_trend wt ON la.user_id = wt.user_id
      LEFT JOIN bonus_trend bt ON la.user_id = bt.user_id
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0] || {
      days_inactive: 0,
      session_decline: false,
      bet_size_decline: false,
      loss_streak: 0,
      withdrawal_increase: false,
      support_tickets: 0,
      bonus_claim_decline: false
    };
  }

  /**
   * Compute churn score (0-100) based on factors
   */
  static computeChurnScore(factors: ChurnFactors): number {
    let score = 0;

    // Days inactive (0-35 points)
    if (factors.days_inactive > 30) score += 35;
    else if (factors.days_inactive > 14) score += 25;
    else if (factors.days_inactive > 7) score += 15;
    else if (factors.days_inactive > 3) score += 5;

    // Session decline (0-20 points)
    if (factors.session_decline) score += 20;

    // Bet size decline (0-15 points)
    if (factors.bet_size_decline) score += 15;

    // Loss streak (0-15 points)
    if (factors.loss_streak >= 5) score += 15;
    else if (factors.loss_streak >= 3) score += 10;
    else if (factors.loss_streak >= 2) score += 5;

    // Withdrawal increase (0-10 points)
    if (factors.withdrawal_increase) score += 10;

    // Bonus claim decline (0-5 points)
    if (factors.bonus_claim_decline) score += 5;

    return Math.min(100, score);
  }

  /**
   * Determine risk level based on score
   */
  static determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  /**
   * Identify specific risk factors
   */
  static identifyRiskFactors(factors: ChurnFactors): string[] {
    const risks: string[] = [];

    if (factors.days_inactive > 14) {
      risks.push(`${factors.days_inactive} days since last login`);
    }
    if (factors.session_decline) {
      risks.push('50% decline in session frequency');
    }
    if (factors.bet_size_decline) {
      risks.push('30% decline in bet sizes');
    }
    if (factors.loss_streak >= 3) {
      risks.push(`${factors.loss_streak} consecutive losses`);
    }
    if (factors.withdrawal_increase) {
      risks.push('Increased withdrawal frequency');
    }
    if (factors.bonus_claim_decline) {
      risks.push('Decreased bonus engagement');
    }

    return risks.length > 0 ? risks : ['No significant risk factors detected'];
  }

  /**
   * Recommend retention actions based on risk level and factors
   */
  static recommendActions(riskLevel: string, riskFactors: string[]): string[] {
    const actions: string[] = [];

    switch (riskLevel) {
      case 'critical':
        actions.push('URGENT: Personal contact from VIP manager');
        actions.push('Exclusive 100% deposit match bonus');
        actions.push('Complimentary VIP upgrade');
        actions.push('Free entry to high-value tournament');
        break;

      case 'high':
        actions.push('Send personalized win-back email');
        actions.push('Offer 50% cashback on next deposit');
        actions.push('Unlock exclusive game access');
        actions.push('Provide 50 free spins on favorite game');
        break;

      case 'medium':
        actions.push('Send "We miss you" notification');
        actions.push('Offer 25% reload bonus');
        actions.push('Highlight new game releases');
        actions.push('Provide 20 free spins');
        break;

      case 'low':
        actions.push('Regular engagement email');
        actions.push('Showcase upcoming tournaments');
        actions.push('Loyalty program reminder');
        break;
    }

    // Additional actions based on specific risk factors
    if (riskFactors.some(f => f.includes('consecutive losses'))) {
      actions.push('Offer loss recovery bonus');
    }
    if (riskFactors.some(f => f.includes('withdrawal'))) {
      actions.push('Investigate for potential issues');
    }

    return actions;
  }

  /**
   * Calculate churn predictions for all users
   */
  static async calculateAllPredictions(): Promise<ChurnPrediction[]> {
    // Get all active users
    const usersQuery = await pool.query(`
      SELECT id FROM users
      WHERE status_id = (SELECT id FROM statuses WHERE name = 'Active')
      ORDER BY id
    `);

    const predictions: ChurnPrediction[] = [];

    for (const user of usersQuery.rows) {
      try {
        const prediction = await this.calculateChurnScore(user.id);
        predictions.push(prediction);
      } catch (error) {
        console.error(`Error calculating churn for user ${user.id}:`, error);
      }
    }

    return predictions;
  }

  /**
   * Save churn predictions to database
   */
  static async savePredictions(predictions: ChurnPrediction[]): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Mark old predictions as processed
      await client.query(`
        UPDATE churn_predictions
        SET outcome = 'retained'
        WHERE outcome = 'pending'
          AND predicted_at < NOW() - INTERVAL '30 days'
      `);

      // Insert new predictions
      for (const pred of predictions) {
        await client.query(`
          INSERT INTO churn_predictions (
            user_id, churn_score, risk_level, risk_factors,
            recommended_actions, days_since_last_activity,
            session_frequency_trend, bet_size_trend, loss_streak,
            outcome, predicted_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
        `, [
          pred.user_id,
          pred.churn_score,
          pred.risk_level,
          JSON.stringify(pred.risk_factors),
          JSON.stringify(pred.recommended_actions),
          pred.days_since_last_activity,
          pred.session_frequency_trend,
          pred.bet_size_trend,
          pred.loss_streak
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get high-risk users
   */
  static async getHighRiskUsers(limit: number = 100) {
    const query = `
      SELECT
        cp.user_id,
        u.username,
        u.email,
        cp.churn_score,
        cp.risk_level,
        cp.risk_factors,
        cp.recommended_actions,
        cp.days_since_last_activity,
        plt.actual_ltv,
        pbs.engagement_score,
        ps.segment_value as rfm_segment
      FROM churn_predictions cp
      JOIN users u ON u.id = cp.user_id
      LEFT JOIN player_ltv plt ON plt.user_id = cp.user_id
      LEFT JOIN player_behavior_scores pbs ON pbs.user_id = cp.user_id
      LEFT JOIN player_segments ps ON ps.user_id = cp.user_id AND ps.segment_type = 'rfm'
      WHERE cp.outcome = 'pending'
        AND cp.risk_level IN ('high', 'critical')
      ORDER BY cp.churn_score DESC, plt.actual_ltv DESC NULLS LAST
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get churn statistics
   */
  static async getChurnStatistics() {
    const query = `
      SELECT
        risk_level,
        COUNT(*) as count,
        AVG(churn_score) as avg_score,
        COUNT(*) FILTER (WHERE action_taken IS NOT NULL) as actions_taken
      FROM churn_predictions
      WHERE outcome = 'pending'
      GROUP BY risk_level
      ORDER BY
        CASE risk_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Execute churn prediction workflow
   */
  static async runChurnPredictionWorkflow(): Promise<{
    total_analyzed: number;
    risk_distribution: any[];
    high_risk_count: number;
  }> {
    console.log('[CHURN] Starting churn prediction workflow...');

    const predictions = await this.calculateAllPredictions();
    console.log(`[CHURN] Calculated predictions for ${predictions.length} users`);

    await this.savePredictions(predictions);
    console.log('[CHURN] Saved predictions to database');

    const statistics = await this.getChurnStatistics();
    const highRiskCount = statistics
      .filter(s => s.risk_level === 'high' || s.risk_level === 'critical')
      .reduce((sum, s) => sum + Number(s.count), 0);

    console.log('[CHURN] Workflow complete');

    return {
      total_analyzed: predictions.length,
      risk_distribution: statistics,
      high_risk_count: highRiskCount
    };
  }
}
