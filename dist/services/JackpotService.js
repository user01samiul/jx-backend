"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_1 = __importDefault(require("../db/postgres"));
class JackpotService {
    wsConnections = new Map();
    /**
     * Create a new jackpot schedule
     */
    async createJackpotSchedule(schedule) {
        const result = await postgres_1.default.query(`INSERT INTO jackpot_schedules (name, type, vendor, wallet_group, currency_code, seed_amount, contribution_percentage, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`, [
            schedule.name,
            schedule.type,
            schedule.vendor || null,
            schedule.wallet_group || null,
            schedule.currency_code,
            schedule.seed_amount,
            schedule.contribution_percentage,
            schedule.status || 'PENDING',
        ]);
        return result.rows[0].id;
    }
    /**
     * Get all jackpot schedules with optional filters
     */
    async getJackpotSchedules(filters) {
        let query = 'SELECT * FROM jackpot_schedules WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (filters?.status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(filters.status);
        }
        if (filters?.type) {
            query += ` AND type = $${paramIndex++}`;
            params.push(filters.type);
        }
        if (filters?.vendor) {
            query += ` AND vendor = $${paramIndex++}`;
            params.push(filters.vendor);
        }
        if (filters?.wallet_group) {
            query += ` AND wallet_group = $${paramIndex++}`;
            params.push(filters.wallet_group);
        }
        query += ' ORDER BY created_at DESC';
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Start a jackpot instance
     */
    async startJackpotInstance(scheduleId) {
        // Get schedule details
        const scheduleResult = await postgres_1.default.query('SELECT * FROM jackpot_schedules WHERE id = $1', [scheduleId]);
        if (scheduleResult.rows.length === 0) {
            throw new Error('Jackpot schedule not found');
        }
        const schedule = scheduleResult.rows[0];
        // Create new instance
        const result = await postgres_1.default.query(`INSERT INTO jackpot_instances (schedule_id, current_size, seed_size, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING id`, [scheduleId, schedule.seed_amount, schedule.seed_amount]);
        const instanceId = result.rows[0].id;
        // Update schedule status to ACTIVE if PENDING
        if (schedule.status === 'PENDING') {
            await postgres_1.default.query('UPDATE jackpot_schedules SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['ACTIVE', scheduleId]);
        }
        // Trigger webhook NEW_INSTANCE
        await this.triggerWebhook('JACKPOT', 'NEW_INSTANCE', {
            id: instanceId,
            jackpot: scheduleId,
            name: schedule.name,
            size: schedule.seed_amount,
            seed: schedule.seed_amount,
            currency: schedule.currency_code,
            timestamp: new Date().toISOString(),
        });
        console.log(`Started jackpot instance ${instanceId} for schedule ${scheduleId}`);
        return instanceId;
    }
    /**
     * Add contribution to jackpot from a bet
     */
    async addContribution(contribution) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get schedule details
            const scheduleResult = await client.query('SELECT * FROM jackpot_schedules WHERE id = $1 AND status = $2', [contribution.schedule_id, 'ACTIVE']);
            if (scheduleResult.rows.length === 0) {
                throw new Error('Active jackpot schedule not found');
            }
            const schedule = scheduleResult.rows[0];
            // Calculate contribution amount
            const contributionAmount = (contribution.bet_amount * schedule.contribution_percentage) / 100;
            // Get active instance for this schedule
            let instanceResult = await client.query('SELECT * FROM jackpot_instances WHERE schedule_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1', [contribution.schedule_id, 'ACTIVE']);
            // If no active instance exists, create one
            if (instanceResult.rows.length === 0) {
                const newInstanceId = await this.startJackpotInstance(contribution.schedule_id);
                instanceResult = await client.query('SELECT * FROM jackpot_instances WHERE id = $1', [newInstanceId]);
            }
            const instance = instanceResult.rows[0];
            // Update instance size
            const previousSize = parseFloat(instance.current_size);
            const newSize = previousSize + contributionAmount;
            await client.query('UPDATE jackpot_instances SET current_size = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newSize, instance.id]);
            await client.query('COMMIT');
            // Check if size threshold reached for webhook
            const sizeIncrease = ((newSize - previousSize) / previousSize) * 100;
            if (sizeIncrease >= 10) {
                // Trigger UPDATE_SIZE webhook every 10% increase
                await this.triggerWebhook('JACKPOT', 'UPDATE_SIZE', {
                    id: instance.id,
                    jackpot: contribution.schedule_id,
                    name: schedule.name,
                    size: newSize,
                    seed: schedule.seed_amount,
                    currency: schedule.currency_code,
                    progress: ((newSize / schedule.seed_amount) * 100).toFixed(2),
                    timestamp: new Date().toISOString(),
                });
            }
            console.log(`Added contribution of ${contributionAmount} ${schedule.currency_code} to jackpot instance ${instance.id}`);
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
     * Trigger a jackpot win
     */
    async triggerJackpotWin(instanceId, winnerId, winnerWalletName) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get instance details
            const instanceResult = await client.query('SELECT ji.*, js.name, js.currency_code, js.seed_amount FROM jackpot_instances ji JOIN jackpot_schedules js ON ji.schedule_id = js.id WHERE ji.id = $1 AND ji.status = $2', [instanceId, 'ACTIVE']);
            if (instanceResult.rows.length === 0) {
                throw new Error('Active jackpot instance not found');
            }
            const instance = instanceResult.rows[0];
            const winAmount = parseFloat(instance.current_size);
            // Update instance as won
            await client.query('UPDATE jackpot_instances SET winner_user_id = $1, winner_wallet_name = $2, won_at = CURRENT_TIMESTAMP, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [winnerId, winnerWalletName, 'WON', instanceId]);
            // Credit winner's balance
            await client.query('UPDATE users SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [winAmount, winnerId]);
            // Create transaction record
            await client.query(`INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, metadata)
         SELECT $1, 'jackpot_win', $2, balance - $2, balance, $3, $4
         FROM users WHERE id = $1`, [
                winnerId,
                winAmount,
                `Jackpot Win: ${instance.name}`,
                JSON.stringify({
                    jackpot_instance_id: instanceId,
                    jackpot_name: instance.name,
                    jackpot_type: 'platform_jackpot',
                }),
            ]);
            // Create new instance automatically
            await this.startJackpotInstance(instance.schedule_id);
            await client.query('COMMIT');
            // Trigger INSTANCE_WIN webhook
            await this.triggerWebhook('JACKPOT', 'INSTANCE_WIN', {
                id: instanceId,
                jackpot: instance.schedule_id,
                name: instance.name,
                size: winAmount,
                seed: instance.seed_amount,
                currency: instance.currency_code,
                winner_entity: winnerId,
                timestamp: new Date().toISOString(),
                winner: winnerWalletName,
            });
            console.log(`Jackpot ${instanceId} won by user ${winnerId} for ${winAmount} ${instance.currency_code}`);
            return winAmount;
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
     * Get active jackpots for display (filtered by user's wallet group if applicable)
     */
    async getActiveJackpots(userId, walletGroup) {
        let query = `
      SELECT ji.*, js.name, js.type, js.vendor, js.wallet_group, js.currency_code, js.seed_amount
      FROM jackpot_instances ji
      JOIN jackpot_schedules js ON ji.schedule_id = js.id
      WHERE ji.status = 'ACTIVE' AND js.status = 'ACTIVE'
    `;
        const params = [];
        if (walletGroup) {
            query += ' AND (js.wallet_group IS NULL OR js.wallet_group = $1)';
            params.push(walletGroup);
        }
        query += ' ORDER BY ji.current_size DESC';
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Get jackpot history
     */
    async getJackpotHistory(filters) {
        let query = `
      SELECT ji.*, js.name, js.currency_code, u.username as winner_username
      FROM jackpot_instances ji
      JOIN jackpot_schedules js ON ji.schedule_id = js.id
      LEFT JOIN users u ON ji.winner_user_id = u.id
      WHERE ji.status = 'WON'
    `;
        const params = [];
        let paramIndex = 1;
        if (filters?.schedule_id) {
            query += ` AND ji.schedule_id = $${paramIndex++}`;
            params.push(filters.schedule_id);
        }
        query += ' ORDER BY ji.won_at DESC';
        if (filters?.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(filters.limit);
        }
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Trigger webhook notification
     */
    async triggerWebhook(serviceType, eventType, payload) {
        try {
            const webhooks = await postgres_1.default.query('SELECT webhook_url FROM integration_webhooks WHERE service_type = $1 AND event_type = $2 AND is_active = true', [serviceType, eventType]);
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
                }
                catch (error) {
                    console.error(`Webhook failed for ${webhook.webhook_url}:`, error.message);
                }
            }
        }
        catch (error) {
            console.error('Error triggering webhooks:', error.message);
        }
    }
    /**
     * Update jackpot schedule
     */
    async updateJackpotSchedule(scheduleId, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (updates.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (updates.type !== undefined) {
            fields.push(`type = $${paramIndex++}`);
            values.push(updates.type);
        }
        if (updates.vendor !== undefined) {
            fields.push(`vendor = $${paramIndex++}`);
            values.push(updates.vendor);
        }
        if (updates.wallet_group !== undefined) {
            fields.push(`wallet_group = $${paramIndex++}`);
            values.push(updates.wallet_group);
        }
        if (updates.currency_code !== undefined) {
            fields.push(`currency_code = $${paramIndex++}`);
            values.push(updates.currency_code);
        }
        if (updates.seed_amount !== undefined) {
            fields.push(`seed_amount = $${paramIndex++}`);
            values.push(updates.seed_amount);
        }
        if (updates.contribution_percentage !== undefined) {
            fields.push(`contribution_percentage = $${paramIndex++}`);
            values.push(updates.contribution_percentage);
        }
        if (updates.status !== undefined) {
            fields.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }
        if (fields.length === 0) {
            return;
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(scheduleId);
        const query = `UPDATE jackpot_schedules SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
        await postgres_1.default.query(query, values);
        console.log(`Updated jackpot schedule ${scheduleId}`);
    }
    /**
     * Delete jackpot schedule
     */
    async deleteJackpotSchedule(scheduleId) {
        await postgres_1.default.query('UPDATE jackpot_schedules SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['DELETED', scheduleId]);
        console.log(`Deleted jackpot schedule ${scheduleId}`);
    }
}
exports.default = new JackpotService();
