"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("../db/postgres"));
class PersonalJackpotsService {
    /**
     * Get all jackpot configurations
     */
    async getAllConfigs(status) {
        let query = 'SELECT * FROM personal_jackpot_configs';
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
     * Get jackpot config by ID
     */
    async getConfigById(configId) {
        const result = await postgres_1.default.query('SELECT * FROM personal_jackpot_configs WHERE id = $1', [configId]);
        return result.rows[0];
    }
    /**
     * Create personal jackpot configuration (Admin)
     */
    async createConfig(config) {
        const result = await postgres_1.default.query(`INSERT INTO personal_jackpot_configs (
        name, description, seed_amount, increment_percentage, max_amount,
        trigger_type, trigger_config, game_ids, status, vip_tier_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`, [
            config.name,
            config.description,
            config.seed_amount,
            config.increment_percentage,
            config.max_amount || null,
            config.trigger_type,
            JSON.stringify(config.trigger_config),
            config.game_ids ? JSON.stringify(config.game_ids) : null,
            config.status,
            config.vip_tier_required || null
        ]);
        return result.rows[0];
    }
    /**
     * Update jackpot configuration (Admin)
     */
    async updateConfig(configId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                if (key === 'trigger_config' && typeof value === 'object') {
                    values.push(JSON.stringify(value));
                }
                else if (key === 'game_ids' && Array.isArray(value)) {
                    values.push(JSON.stringify(value));
                }
                else {
                    values.push(value);
                }
                paramIndex++;
            }
        });
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(configId);
        const result = await postgres_1.default.query(`UPDATE personal_jackpot_configs SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0];
    }
    /**
     * Initialize personal jackpot for player
     */
    async initializePlayerJackpot(userId, configId) {
        const config = await this.getConfigById(configId);
        if (!config) {
            throw new Error('Jackpot configuration not found');
        }
        if (config.status !== 'ACTIVE') {
            throw new Error('Jackpot configuration is not active');
        }
        // Check if player already has an active jackpot for this config
        const existing = await postgres_1.default.query(`SELECT id FROM player_personal_jackpots
       WHERE user_id = $1 AND config_id = $2 AND status = 'ACTIVE'`, [userId, configId]);
        if (existing.rows.length > 0) {
            return existing.rows[0];
        }
        const result = await postgres_1.default.query(`INSERT INTO player_personal_jackpots (
        user_id, config_id, current_amount, seed_amount, total_contributed, spins_count, status
      ) VALUES ($1, $2, $3, $4, 0, 0, 'ACTIVE')
      RETURNING *`, [userId, configId, config.seed_amount, config.seed_amount]);
        return result.rows[0];
    }
    /**
     * Get player's active personal jackpots
     */
    async getPlayerJackpots(userId, status) {
        let query = `
      SELECT ppj.*, pjc.name, pjc.description, pjc.max_amount, pjc.trigger_type
      FROM player_personal_jackpots ppj
      JOIN personal_jackpot_configs pjc ON ppj.config_id = pjc.id
      WHERE ppj.user_id = $1
    `;
        const params = [userId];
        if (status) {
            query += ' AND ppj.status = $2';
            params.push(status);
        }
        query += ' ORDER BY ppj.created_at DESC';
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Contribute to personal jackpot (called after each bet)
     */
    async contributeToJackpot(userId, configId, betAmount, gameId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get or create player's jackpot
            let jackpot = await client.query(`SELECT ppj.*, pjc.increment_percentage, pjc.max_amount, pjc.game_ids
         FROM player_personal_jackpots ppj
         JOIN personal_jackpot_configs pjc ON ppj.config_id = pjc.id
         WHERE ppj.user_id = $1 AND ppj.config_id = $2 AND ppj.status = 'ACTIVE'
         FOR UPDATE`, [userId, configId]);
            if (jackpot.rows.length === 0) {
                // Auto-initialize if doesn't exist
                await this.initializePlayerJackpot(userId, configId);
                jackpot = await client.query(`SELECT ppj.*, pjc.increment_percentage, pjc.max_amount, pjc.game_ids
           FROM player_personal_jackpots ppj
           JOIN personal_jackpot_configs pjc ON ppj.config_id = pjc.id
           WHERE ppj.user_id = $1 AND ppj.config_id = $2 AND ppj.status = 'ACTIVE'
           FOR UPDATE`, [userId, configId]);
            }
            const currentJackpot = jackpot.rows[0];
            // Check if game is eligible (if game_ids is specified)
            if (currentJackpot.game_ids && gameId) {
                const eligibleGames = JSON.parse(currentJackpot.game_ids);
                if (!eligibleGames.includes(gameId)) {
                    await client.query('ROLLBACK');
                    return { success: false, reason: 'Game not eligible for this jackpot' };
                }
            }
            // Calculate contribution
            const contribution = betAmount * (currentJackpot.increment_percentage / 100);
            let newAmount = currentJackpot.current_amount + contribution;
            // Check max amount cap
            if (currentJackpot.max_amount && newAmount > currentJackpot.max_amount) {
                newAmount = currentJackpot.max_amount;
            }
            // Update jackpot
            await client.query(`UPDATE player_personal_jackpots
         SET current_amount = $1, total_contributed = total_contributed + $2,
             spins_count = spins_count + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`, [newAmount, contribution, currentJackpot.id]);
            await client.query('COMMIT');
            return {
                success: true,
                jackpotId: currentJackpot.id,
                contribution,
                newAmount,
                spinsCount: currentJackpot.spins_count + 1
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
     * Check if jackpot should be triggered
     */
    async checkTrigger(userId, jackpotId) {
        const jackpot = await postgres_1.default.query(`SELECT ppj.*, pjc.trigger_type, pjc.trigger_config
       FROM player_personal_jackpots ppj
       JOIN personal_jackpot_configs pjc ON ppj.config_id = pjc.id
       WHERE ppj.id = $1 AND ppj.user_id = $2`, [jackpotId, userId]);
        if (jackpot.rows.length === 0) {
            return { triggered: false, reason: 'Jackpot not found' };
        }
        const jp = jackpot.rows[0];
        const triggerConfig = JSON.parse(jp.trigger_config);
        switch (jp.trigger_type) {
            case 'RANDOM':
                // Random chance on each spin
                const randomChance = triggerConfig.probability || 0.01; // Default 1%
                const random = Math.random();
                if (random <= randomChance) {
                    return { triggered: true, reason: 'Random trigger' };
                }
                break;
            case 'SPIN_COUNT':
                // Trigger after X spins
                const targetSpins = triggerConfig.target_spins || 100;
                if (jp.spins_count >= targetSpins) {
                    return { triggered: true, reason: `Reached ${targetSpins} spins` };
                }
                break;
            case 'WAGER_AMOUNT':
                // Trigger after wagering X amount
                const targetWager = triggerConfig.target_wager || 1000;
                if (jp.total_contributed >= targetWager) {
                    return { triggered: true, reason: `Wagered ${targetWager}` };
                }
                break;
            case 'TIME_BASED':
                // Trigger at specific time
                const createdAt = new Date(jp.created_at);
                const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
                const targetHours = triggerConfig.hours || 24;
                if (hoursElapsed >= targetHours) {
                    return { triggered: true, reason: `${targetHours} hours elapsed` };
                }
                break;
        }
        return { triggered: false };
    }
    /**
     * Trigger jackpot win
     */
    async triggerJackpotWin(userId, jackpotId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get jackpot
            const jackpotResult = await client.query(`SELECT ppj.*, pjc.name
         FROM player_personal_jackpots ppj
         JOIN personal_jackpot_configs pjc ON ppj.config_id = pjc.id
         WHERE ppj.id = $1 AND ppj.user_id = $2 AND ppj.status = 'ACTIVE'
         FOR UPDATE`, [jackpotId, userId]);
            if (jackpotResult.rows.length === 0) {
                throw new Error('Active jackpot not found');
            }
            const jackpot = jackpotResult.rows[0];
            // Mark jackpot as won
            await client.query(`UPDATE player_personal_jackpots
         SET status = 'WON', ended_at = CURRENT_TIMESTAMP
         WHERE id = $1`, [jackpotId]);
            // Record win
            await client.query(`INSERT INTO personal_jackpot_wins (jackpot_id, user_id, win_amount)
         VALUES ($1, $2, $3)`, [jackpotId, userId, jackpot.current_amount]);
            // Credit player's balance
            await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [jackpot.current_amount, userId]);
            await client.query('COMMIT');
            return {
                success: true,
                winAmount: jackpot.current_amount,
                jackpotName: jackpot.name
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
     * Get player's jackpot win history
     */
    async getPlayerWins(userId, limit = 50) {
        const result = await postgres_1.default.query(`SELECT pjw.*, ppj.config_id, pjc.name as jackpot_name
       FROM personal_jackpot_wins pjw
       JOIN player_personal_jackpots ppj ON pjw.jackpot_id = ppj.id
       JOIN personal_jackpot_configs pjc ON ppj.config_id = pjc.id
       WHERE pjw.user_id = $1
       ORDER BY pjw.won_at DESC
       LIMIT $2`, [userId, limit]);
        return result.rows;
    }
    /**
     * Get jackpot statistics (Admin)
     */
    async getJackpotStatistics(configId) {
        const stats = await postgres_1.default.query(`SELECT
        COUNT(*) as total_instances,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_instances,
        COUNT(CASE WHEN status = 'WON' THEN 1 END) as won_instances,
        SUM(current_amount) as total_current_value,
        AVG(current_amount) as avg_current_value,
        COUNT(DISTINCT user_id) as unique_players
       FROM player_personal_jackpots
       WHERE config_id = $1`, [configId]);
        const winStats = await postgres_1.default.query(`SELECT
        COUNT(*) as total_wins,
        SUM(win_amount) as total_paid_out,
        AVG(win_amount) as avg_win_amount,
        MAX(win_amount) as max_win_amount
       FROM personal_jackpot_wins pjw
       JOIN player_personal_jackpots ppj ON pjw.jackpot_id = ppj.id
       WHERE ppj.config_id = $1`, [configId]);
        return {
            instances: stats.rows[0],
            wins: winStats.rows[0]
        };
    }
    /**
     * Auto-initialize jackpots for eligible players (cron job)
     */
    async autoInitializeJackpots() {
        // Get all active configs with auto-assign enabled
        const configs = await postgres_1.default.query(`SELECT * FROM personal_jackpot_configs WHERE status = 'ACTIVE'`);
        for (const config of configs.rows) {
            // Get eligible users (active users who don't have this jackpot yet)
            const eligibleUsers = await postgres_1.default.query(`SELECT u.id FROM users u
         WHERE u.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM player_personal_jackpots ppj
           WHERE ppj.user_id = u.id
           AND ppj.config_id = $1
           AND ppj.status = 'ACTIVE'
         )
         LIMIT 100`, [config.id]);
            // Initialize jackpots for eligible users
            for (const user of eligibleUsers.rows) {
                try {
                    await this.initializePlayerJackpot(user.id, config.id);
                }
                catch (error) {
                    console.error(`Failed to initialize jackpot ${config.id} for user ${user.id}:`, error);
                }
            }
        }
    }
}
exports.default = new PersonalJackpotsService();
