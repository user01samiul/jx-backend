import pool from '../db/postgres';

interface TournamentSchedule {
  id?: number;
  name: string;
  description?: string;
  currency_code: string;
  prize_pool: number;
  min_bet: number;
  start_time: Date;
  end_time: Date;
  status?: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'FINISHED';
}

interface TournamentPrizeStructure {
  position: number;
  prize_amount: number;
}

class TournamentService {
  /**
   * Create a new tournament schedule
   */
  async createTournament(tournament: TournamentSchedule, gameIds: number[]): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert tournament schedule
      const result = await client.query(
        `INSERT INTO tournament_schedules (name, description, currency_code, prize_pool, min_bet, start_time, end_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          tournament.name,
          tournament.description || '',
          tournament.currency_code,
          tournament.prize_pool,
          tournament.min_bet,
          tournament.start_time,
          tournament.end_time,
          tournament.status || 'PENDING',
        ]
      );

      const tournamentId = result.rows[0].id;

      // Add eligible games
      for (const gameId of gameIds) {
        await client.query(
          `INSERT INTO tournament_games (tournament_id, game_id) VALUES ($1, $2)`,
          [tournamentId, gameId]
        );
      }

      await client.query('COMMIT');
      console.log(`Created tournament ${tournamentId}`);
      return tournamentId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all tournaments with optional filters
   */
  async getTournaments(filters?: {
    status?: string;
    currency?: string;
    limit?: number;
  }): Promise<any[]> {
    let query = 'SELECT * FROM tournament_schedules WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.currency) {
      query += ` AND currency_code = $${paramIndex++}`;
      params.push(filters.currency);
    }

    query += ' ORDER BY start_time DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Start a tournament instance
   */
  async startTournamentInstance(scheduleId: number): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if tournament schedule exists
      const scheduleResult = await client.query(
        'SELECT * FROM tournament_schedules WHERE id = $1',
        [scheduleId]
      );

      if (scheduleResult.rows.length === 0) {
        throw new Error('Tournament schedule not found');
      }

      const schedule = scheduleResult.rows[0];

      // Create tournament instance
      const result = await client.query(
        `INSERT INTO tournament_instances (schedule_id, status, started_at)
         VALUES ($1, 'ACTIVE', CURRENT_TIMESTAMP)
         RETURNING id`,
        [scheduleId]
      );

      const instanceId = result.rows[0].id;

      // Update schedule status to ACTIVE
      await client.query(
        'UPDATE tournament_schedules SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['ACTIVE', scheduleId]
      );

      await client.query('COMMIT');

      // Trigger webhook
      await this.triggerWebhook('TOURNAMENT', 'NEW_INSTANCE', {
        id: instanceId,
        tournament: scheduleId,
        name: schedule.name,
        currency: schedule.currency_code,
        status: 'ACTIVE',
        start: schedule.start_time,
        end: schedule.end_time,
        timestamp: new Date().toISOString(),
      });

      console.log(`Started tournament instance ${instanceId} for schedule ${scheduleId}`);
      return instanceId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add player points to tournament
   */
  async addPlayerPoints(instanceId: number, userId: number, points: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if tournament instance is active
      const instanceResult = await client.query(
        'SELECT * FROM tournament_instances WHERE id = $1 AND status = $2',
        [instanceId, 'ACTIVE']
      );

      if (instanceResult.rows.length === 0) {
        throw new Error('Active tournament instance not found');
      }

      // Insert or update player points
      await client.query(
        `INSERT INTO tournament_players (instance_id, user_id, points)
         VALUES ($1, $2, $3)
         ON CONFLICT (instance_id, user_id)
         DO UPDATE SET points = tournament_players.points + $3, updated_at = CURRENT_TIMESTAMP`,
        [instanceId, userId, points]
      );

      // Update leaderboard positions
      await this.updateLeaderboard(instanceId);

      await client.query('COMMIT');

      // Trigger PLAYER_UPDATE event
      const playerResult = await pool.query(
        'SELECT * FROM tournament_players WHERE instance_id = $1 AND user_id = $2',
        [instanceId, userId]
      );

      console.log(`Added ${points} points to user ${userId} in tournament ${instanceId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update leaderboard positions
   */
  private async updateLeaderboard(instanceId: number): Promise<void> {
    await pool.query(
      `UPDATE tournament_players tp
       SET position = subquery.position
       FROM (
         SELECT user_id, ROW_NUMBER() OVER (ORDER BY points DESC) as position
         FROM tournament_players
         WHERE instance_id = $1
       ) subquery
       WHERE tp.instance_id = $1 AND tp.user_id = subquery.user_id`,
      [instanceId]
    );
  }

  /**
   * Get leaderboard for a tournament instance
   */
  async getLeaderboard(instanceId: number, limit: number = 100): Promise<any> {
    // Get tournament instance details
    const tournamentResult = await pool.query(
      `SELECT ti.*, ts.name, ts.description, ts.currency_code, ts.prize_pool, ts.min_bet, ts.start_time, ts.end_time, ts.status
       FROM tournament_instances ti
       JOIN tournament_schedules ts ON ti.schedule_id = ts.id
       WHERE ti.id = $1`,
      [instanceId]
    );

    if (tournamentResult.rows.length === 0) {
      throw new Error('Tournament not found');
    }

    const tournament = tournamentResult.rows[0];

    // Get leaderboard players
    const playersResult = await pool.query(
      `SELECT tp.*, u.username, u.email
       FROM tournament_players tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.instance_id = $1
       ORDER BY tp.position ASC
       LIMIT $2`,
      [instanceId, limit]
    );

    return {
      tournament: tournament,
      leaderboard: playersResult.rows
    };
  }

  /**
   * Get player position in tournament
   */
  async getPlayerPosition(instanceId: number, userId: number): Promise<any> {
    const result = await pool.query(
      `SELECT tp.*, u.username
       FROM tournament_players tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.instance_id = $1 AND tp.user_id = $2`,
      [instanceId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Finish tournament and distribute prizes
   */
  async finishTournament(instanceId: number, prizeStructure: TournamentPrizeStructure[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get tournament details
      const instanceResult = await client.query(
        `SELECT ti.*, ts.name, ts.currency_code, ts.prize_pool
         FROM tournament_instances ti
         JOIN tournament_schedules ts ON ti.schedule_id = ts.id
         WHERE ti.id = $1`,
        [instanceId]
      );

      if (instanceResult.rows.length === 0) {
        throw new Error('Tournament instance not found');
      }

      const instance = instanceResult.rows[0];

      // Get top players
      const leaderboard = await this.getLeaderboard(instanceId, prizeStructure.length);

      // Distribute prizes
      for (const prize of prizeStructure) {
        const player = leaderboard.find(p => p.position === prize.position);
        if (player) {
          // Update player's prize
          await client.query(
            'UPDATE tournament_players SET prize_won = $1 WHERE instance_id = $2 AND user_id = $3',
            [prize.prize_amount, instanceId, player.user_id]
          );

          // Credit player's balance
          await client.query(
            'UPDATE users SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [prize.prize_amount, player.user_id]
          );

          // Create transaction
          await client.query(
            `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, metadata)
             SELECT $1, 'tournament_prize', $2, balance - $2, balance, $3, $4
             FROM users WHERE id = $1`,
            [
              player.user_id,
              prize.prize_amount,
              `Tournament Prize: ${instance.name} - Position ${prize.position}`,
              JSON.stringify({
                tournament_instance_id: instanceId,
                tournament_name: instance.name,
                position: prize.position,
              }),
            ]
          );

          console.log(`Awarded ${prize.prize_amount} ${instance.currency_code} to user ${player.user_id} (position ${prize.position})`);
        }
      }

      // Update instance status
      await client.query(
        'UPDATE tournament_instances SET status = $1, ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['FINISHED', instanceId]
      );

      // Update schedule status
      await client.query(
        'UPDATE tournament_schedules SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['FINISHED', instance.schedule_id]
      );

      await client.query('COMMIT');

      // Trigger UPDATE_STATUS webhook
      await this.triggerWebhook('TOURNAMENT', 'UPDATE_STATUS', {
        id: instanceId,
        tournament: instance.schedule_id,
        name: instance.name,
        currency: instance.currency_code,
        status: 'FINISHED',
        previousStatus: 'ACTIVE',
        start: instance.start_time,
        end: instance.end_time,
        timestamp: new Date().toISOString(),
      });

      console.log(`Finished tournament ${instanceId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get active tournaments for display
   */
  async getActiveTournaments(userId?: number): Promise<any[]> {
    let query = `
      SELECT ti.*, ts.name, ts.description, ts.currency_code, ts.prize_pool, ts.min_bet, ts.start_time, ts.end_time
      FROM tournament_instances ti
      JOIN tournament_schedules ts ON ti.schedule_id = ts.id
      WHERE ti.status = 'ACTIVE'
      ORDER BY ts.start_time ASC
    `;

    const result = await pool.query(query);

    // If userId provided, add player's current position
    if (userId && result.rows.length > 0) {
      for (const tournament of result.rows) {
        const playerPos = await this.getPlayerPosition(tournament.id, userId);
        tournament.player_position = playerPos;
      }
    }

    return result.rows;
  }

  /**
   * Get eligible games for tournament
   */
  async getTournamentGames(tournamentId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT g.*
       FROM games g
       JOIN tournament_games tg ON g.id = tg.game_id
       WHERE tg.tournament_id = $1 AND g.is_active = true
       ORDER BY g.name`,
      [tournamentId]
    );

    return result.rows;
  }

  /**
   * Check if bet is eligible for tournament points
   */
  async processBetForTournament(
    userId: number,
    gameId: number,
    betAmount: number,
    winAmount: number
  ): Promise<void> {
    // Find active tournaments that include this game
    const result = await pool.query(
      `SELECT DISTINCT ti.id, ts.min_bet, ts.currency_code
       FROM tournament_instances ti
       JOIN tournament_schedules ts ON ti.schedule_id = ts.id
       JOIN tournament_games tg ON tg.tournament_id = ts.id
       WHERE ti.status = 'ACTIVE'
         AND tg.game_id = $1
         AND ts.start_time <= CURRENT_TIMESTAMP
         AND ts.end_time >= CURRENT_TIMESTAMP`,
      [gameId]
    );

    for (const tournament of result.rows) {
      // Check if bet meets minimum requirement
      if (betAmount >= tournament.min_bet) {
        // Calculate points (can be customized based on bet amount, win multiplier, etc.)
        const points = winAmount > 0 ? (winAmount / betAmount) * 100 : betAmount;

        await this.addPlayerPoints(tournament.id, userId, points);
      }
    }
  }

  /**
   * Trigger webhook notification
   */
  private async triggerWebhook(serviceType: string, eventType: string, payload: any): Promise<void> {
    try {
      const webhooks = await pool.query(
        'SELECT webhook_url FROM integration_webhooks WHERE service_type = $1 AND event_type = $2 AND is_active = true',
        [serviceType, eventType]
      );

      for (const webhook of webhooks.rows) {
        try {
          const axios = require('axios');
          await axios.post(webhook.webhook_url, {
            service: serviceType,
            event: eventType,
            data: payload,
            timestamp: new Date().toISOString(),
          });

          console.log(`Webhook triggered: ${serviceType}.${eventType} to ${webhook.webhook_url}`);
        } catch (error: any) {
          console.error(`Webhook failed for ${webhook.webhook_url}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error('Error triggering webhooks:', error.message);
    }
  }

  /**
   * Update tournament schedule
   */
  async updateTournament(tournamentId: number, updates: Partial<TournamentSchedule>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.currency_code !== undefined) {
      fields.push(`currency_code = $${paramIndex++}`);
      values.push(updates.currency_code);
    }

    if (updates.prize_pool !== undefined) {
      fields.push(`prize_pool = $${paramIndex++}`);
      values.push(updates.prize_pool);
    }

    if (updates.min_bet !== undefined) {
      fields.push(`min_bet = $${paramIndex++}`);
      values.push(updates.min_bet);
    }

    if (updates.start_time !== undefined) {
      fields.push(`start_time = $${paramIndex++}`);
      values.push(updates.start_time);
    }

    if (updates.end_time !== undefined) {
      fields.push(`end_time = $${paramIndex++}`);
      values.push(updates.end_time);
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) {
      return;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(tournamentId);

    const query = `UPDATE tournament_schedules SET ${fields.join(', ')} WHERE id = $${paramIndex}`;

    await pool.query(query, values);
    console.log(`Updated tournament ${tournamentId}`);
  }

  /**
   * Delete tournament
   */
  async deleteTournament(tournamentId: number): Promise<void> {
    await pool.query(
      'DELETE FROM tournament_schedules WHERE id = $1',
      [tournamentId]
    );

    console.log(`Deleted tournament ${tournamentId}`);
  }
}

export default new TournamentService();
