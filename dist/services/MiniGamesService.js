"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("../db/postgres"));
class MiniGamesService {
    /**
     * Get all mini game types
     */
    async getAllGameTypes(status) {
        let query = 'SELECT * FROM mini_game_types';
        const params = [];
        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }
        query += ' ORDER BY created_at DESC';
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Get mini game type by ID
     */
    async getGameTypeById(gameId) {
        const result = await postgres_1.default.query('SELECT * FROM mini_game_types WHERE id = $1', [gameId]);
        return result.rows[0];
    }
    /**
     * Create mini game type (Admin)
     */
    async createGameType(game) {
        const result = await postgres_1.default.query(`INSERT INTO mini_game_types (
        name, description, game_type, config, status, play_cost_type, play_cost_amount,
        cooldown_minutes, max_plays_per_day
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`, [
            game.name,
            game.description,
            game.game_type,
            JSON.stringify(game.config),
            game.status,
            game.play_cost_type || 'FREE',
            game.play_cost_amount || 0,
            game.cooldown_minutes || 0,
            game.max_plays_per_day || null
        ]);
        return result.rows[0];
    }
    /**
     * Update mini game type (Admin)
     */
    async updateGameType(gameId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(key === 'config' && typeof value === 'object' ? JSON.stringify(value) : value);
                paramIndex++;
            }
        });
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(gameId);
        const result = await postgres_1.default.query(`UPDATE mini_game_types SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    /**
     * Get prizes for a mini game
     */
    async getGamePrizes(gameId, status) {
        let query = 'SELECT * FROM mini_game_prizes WHERE game_id = $1';
        const params = [gameId];
        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }
        query += ' ORDER BY probability DESC';
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Create prize for mini game (Admin)
     */
    async createPrize(prize) {
        const result = await postgres_1.default.query(`INSERT INTO mini_game_prizes (
        game_id, name, prize_type, prize_amount, probability, display_config, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            prize.game_id,
            prize.name,
            prize.prize_type,
            prize.prize_amount || null,
            prize.probability,
            prize.display_config ? JSON.stringify(prize.display_config) : null,
            prize.status
        ]);
        return result.rows[0];
    }
    /**
     * Update prize (Admin)
     */
    async updatePrize(prizeId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(key === 'display_config' && typeof value === 'object' ? JSON.stringify(value) : value);
                paramIndex++;
            }
        });
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(prizeId);
        const result = await postgres_1.default.query(`UPDATE mini_game_prizes SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    /**
     * Check if player can play (cooldown & daily limit)
     */
    async canPlayerPlay(userId, gameId) {
        const game = await this.getGameTypeById(gameId);
        if (!game) {
            return { canPlay: false, reason: 'Game not found' };
        }
        if (game.status !== 'ACTIVE') {
            return { canPlay: false, reason: 'Game is not active' };
        }
        // Check cooldown
        if (game.cooldown_minutes > 0) {
            const lastPlay = await postgres_1.default.query(`SELECT MAX(played_at) as last_played FROM player_mini_game_plays
         WHERE user_id = $1 AND game_id = $2`, [userId, gameId]);
            if (lastPlay.rows[0].last_played) {
                const lastPlayTime = new Date(lastPlay.rows[0].last_played);
                const cooldownEnd = new Date(lastPlayTime.getTime() + game.cooldown_minutes * 60 * 1000);
                if (new Date() < cooldownEnd) {
                    return {
                        canPlay: false,
                        reason: 'Cooldown active',
                        nextAvailableAt: cooldownEnd
                    };
                }
            }
        }
        // Check daily limit
        if (game.max_plays_per_day) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const playsToday = await postgres_1.default.query(`SELECT COUNT(*) as count FROM player_mini_game_plays
         WHERE user_id = $1 AND game_id = $2 AND played_at >= $3`, [userId, gameId, today]);
            if (parseInt(playsToday.rows[0].count) >= game.max_plays_per_day) {
                return {
                    canPlay: false,
                    reason: 'Daily play limit reached',
                    nextAvailableAt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                };
            }
        }
        return { canPlay: true };
    }
    /**
     * Select random prize based on probability
     */
    async selectPrize(gameId) {
        const prizes = await this.getGamePrizes(gameId, 'ACTIVE');
        if (prizes.length === 0) {
            throw new Error('No active prizes configured for this game');
        }
        // Normalize probabilities to sum to 100
        const totalProbability = prizes.reduce((sum, p) => sum + parseFloat(p.probability), 0);
        if (totalProbability === 0) {
            throw new Error('Invalid prize configuration: total probability is 0');
        }
        // Generate random number
        const random = Math.random() * totalProbability;
        // Select prize based on probability
        let cumulativeProbability = 0;
        for (const prize of prizes) {
            cumulativeProbability += parseFloat(prize.probability);
            if (random <= cumulativeProbability) {
                return prize;
            }
        }
        // Fallback to last prize (should never happen)
        return prizes[prizes.length - 1];
    }
    /**
     * Play mini game
     */
    async playGame(userId, gameId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if player can play
            const canPlayResult = await this.canPlayerPlay(userId, gameId);
            if (!canPlayResult.canPlay) {
                throw new Error(canPlayResult.reason || 'Cannot play game');
            }
            // Get game details
            const game = await this.getGameTypeById(gameId);
            // Check and deduct play cost
            if (game.play_cost_type === 'LOYALTY_POINTS' && game.play_cost_amount > 0) {
                const playerLoyalty = await client.query('SELECT points FROM player_loyalty WHERE user_id = $1 FOR UPDATE', [userId]);
                if (playerLoyalty.rows.length === 0 || playerLoyalty.rows[0].points < game.play_cost_amount) {
                    throw new Error('Insufficient loyalty points');
                }
                await client.query('UPDATE player_loyalty SET points = points - $1 WHERE user_id = $2', [game.play_cost_amount, userId]);
            }
            else if (game.play_cost_type === 'CASH' && game.play_cost_amount > 0) {
                const userBalance = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
                if (userBalance.rows.length === 0 || parseFloat(userBalance.rows[0].balance) < game.play_cost_amount) {
                    throw new Error('Insufficient balance');
                }
                await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [game.play_cost_amount, userId]);
            }
            // Select random prize
            const selectedPrize = await this.selectPrize(gameId);
            // Record play
            const playResult = await client.query(`INSERT INTO player_mini_game_plays (user_id, game_id, prize_id, prize_awarded)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [userId, gameId, selectedPrize.id, selectedPrize.prize_type !== 'NOTHING']);
            // Award prize
            if (selectedPrize.prize_type !== 'NOTHING') {
                switch (selectedPrize.prize_type) {
                    case 'CASH':
                        await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [selectedPrize.prize_amount, userId]);
                        break;
                    case 'BONUS':
                        await client.query('UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2', [selectedPrize.prize_amount, userId]);
                        break;
                    case 'LOYALTY_POINTS':
                        await client.query(`UPDATE player_loyalty SET points = points + $1, lifetime_points = lifetime_points + $1
               WHERE user_id = $2`, [selectedPrize.prize_amount, userId]);
                        // Record loyalty transaction
                        await client.query(`INSERT INTO loyalty_point_transactions (user_id, points, transaction_type, reason, reference_id)
               VALUES ($1, $2, 'EARNED', 'Mini game prize', $3)`, [userId, selectedPrize.prize_amount, `minigame_${playResult.rows[0].id}`]);
                        break;
                    case 'FREE_SPINS':
                        // Free spins would be handled by campaigns system
                        console.log(`Awarded ${selectedPrize.prize_amount} free spins to user ${userId}`);
                        break;
                }
            }
            // Update cooldown if game has cooldown
            if (game.cooldown_minutes > 0) {
                const cooldownEnd = new Date(Date.now() + game.cooldown_minutes * 60 * 1000);
                await client.query(`INSERT INTO player_mini_game_spins (user_id, game_id, next_available_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, game_id)
           DO UPDATE SET next_available_at = $3, last_spin_at = CURRENT_TIMESTAMP`, [userId, gameId, cooldownEnd]);
            }
            await client.query('COMMIT');
            return {
                success: true,
                play: playResult.rows[0],
                prize: {
                    id: selectedPrize.id,
                    name: selectedPrize.name,
                    prize_type: selectedPrize.prize_type,
                    prize_amount: selectedPrize.prize_amount
                }
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get player's play history
     */
    async getPlayerPlays(userId, gameId, limit = 50) {
        let query = `
      SELECT pmgp.*, mgt.name as game_name, mgp.name as prize_name,
             mgp.prize_type, mgp.prize_amount
      FROM player_mini_game_plays pmgp
      JOIN mini_game_types mgt ON pmgp.game_id = mgt.id
      JOIN mini_game_prizes mgp ON pmgp.prize_id = mgp.id
      WHERE pmgp.user_id = $1
    `;
        const params = [userId];
        if (gameId) {
            query += ' AND pmgp.game_id = $2';
            params.push(gameId);
        }
        query += ' ORDER BY pmgp.played_at DESC LIMIT $' + (gameId ? 3 : 2);
        params.push(limit);
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Get player's current cooldowns
     */
    async getPlayerCooldowns(userId) {
        const result = await postgres_1.default.query(`SELECT pmgs.*, mgt.name as game_name, mgt.cooldown_minutes
       FROM player_mini_game_spins pmgs
       JOIN mini_game_types mgt ON pmgs.game_id = mgt.id
       WHERE pmgs.user_id = $1 AND pmgs.next_available_at > CURRENT_TIMESTAMP`, [userId]);
        return result.rows;
    }
    /**
     * Get mini game statistics (Admin)
     */
    async getGameStatistics(gameId) {
        const stats = await postgres_1.default.query(`SELECT
        COUNT(*) as total_plays,
        COUNT(CASE WHEN prize_awarded = true THEN 1 END) as winning_plays,
        COUNT(DISTINCT user_id) as unique_players
       FROM player_mini_game_plays
       WHERE game_id = $1`, [gameId]);
        const prizeStats = await postgres_1.default.query(`SELECT mgp.name, mgp.prize_type, mgp.prize_amount, COUNT(*) as times_won
       FROM player_mini_game_plays pmgp
       JOIN mini_game_prizes mgp ON pmgp.prize_id = mgp.id
       WHERE pmgp.game_id = $1 AND pmgp.prize_awarded = true
       GROUP BY mgp.id, mgp.name, mgp.prize_type, mgp.prize_amount
       ORDER BY times_won DESC`, [gameId]);
        return {
            overall: stats.rows[0],
            prizeDistribution: prizeStats.rows
        };
    }
}
exports.default = new MiniGamesService();
