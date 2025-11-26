"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BonusTransactionService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
class BonusTransactionService {
    /**
     * Create a bonus transaction
     */
    static async createTransaction(data, client) {
        const shouldReleaseClient = !client;
        if (!client) {
            client = await postgres_1.default.connect();
        }
        try {
            // Get current bonus balance
            const walletResult = await client.query('SELECT playable_bonus_balance FROM bonus_wallets WHERE player_id = $1', [data.player_id]);
            const currentBalance = walletResult.rows[0]
                ? parseFloat(walletResult.rows[0].playable_bonus_balance)
                : 0;
            const balanceBefore = currentBalance;
            let balanceAfter = currentBalance;
            // Calculate balance after based on transaction type
            switch (data.transaction_type) {
                case 'granted':
                case 'activated':
                case 'bet_won':
                    balanceAfter = currentBalance + data.amount;
                    break;
                case 'bet_placed':
                case 'bet_lost':
                case 'released':
                case 'forfeited':
                case 'expired':
                case 'cancelled':
                    balanceAfter = currentBalance - data.amount;
                    break;
                case 'wager_contributed':
                    // No balance change, just tracking
                    balanceAfter = currentBalance;
                    break;
            }
            // Insert transaction
            const result = await client.query(`INSERT INTO bonus_transactions (
          bonus_instance_id, player_id, transaction_type, amount,
          balance_before, balance_after, game_id, bet_id,
          wager_contribution, description, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING *`, [
                data.bonus_instance_id,
                data.player_id,
                data.transaction_type,
                data.amount,
                balanceBefore,
                balanceAfter,
                data.game_id || null,
                data.bet_id || null,
                data.wager_contribution || null,
                data.description || null,
                data.metadata ? JSON.stringify(data.metadata) : null
            ]);
            return this.formatTransaction(result.rows[0]);
        }
        finally {
            if (shouldReleaseClient) {
                client.release();
            }
        }
    }
    /**
     * Get transactions for a bonus instance
     */
    static async getInstanceTransactions(bonusInstanceId, limit = 100) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`SELECT * FROM bonus_transactions
         WHERE bonus_instance_id = $1
         ORDER BY created_at DESC
         LIMIT $2`, [bonusInstanceId, limit]);
            return result.rows.map(row => this.formatTransaction(row));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get transactions for a player (includes both bonus_transactions and transfer transactions)
     */
    static async getPlayerTransactions(playerId, options = {}) {
        const client = await postgres_1.default.connect();
        try {
            const { limit = 50, offset = 0, type, startDate, endDate } = options;
            // Build combined query to get both bonus_transactions and transfer transactions
            let params = [playerId];
            let paramIndex = 2;
            let dateFilter = '';
            if (startDate) {
                dateFilter += ` AND bt.created_at >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            if (endDate) {
                dateFilter += ` AND bt.created_at <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            // Get total count (bonus_transactions + transfer transactions)
            const countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT id FROM bonus_transactions WHERE player_id = $1 ${dateFilter}
          UNION ALL
          SELECT id FROM transactions
          WHERE user_id = $1
          AND type = 'bonus'
          AND description LIKE '%transferred%'
          ${dateFilter.replace(/bt\./g, '')}
        ) as combined
      `;
            const countResult = await client.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total);
            // Get combined transactions with pagination
            params.push(limit, offset);
            const transactionsQuery = `
        SELECT * FROM (
          SELECT
            id,
            bonus_instance_id,
            player_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            game_id,
            bet_id,
            wager_contribution,
            description,
            metadata,
            created_at,
            'bonus_transaction' as source
          FROM bonus_transactions
          WHERE player_id = $1 ${dateFilter}

          UNION ALL

          SELECT
            id,
            NULL as bonus_instance_id,
            user_id as player_id,
            'transferred' as transaction_type,
            amount,
            0 as balance_before,
            0 as balance_after,
            NULL as game_id,
            NULL as bet_id,
            NULL as wager_contribution,
            description,
            metadata,
            created_at,
            'main_transaction' as source
          FROM transactions
          WHERE user_id = $1
          AND type = 'bonus'
          AND description LIKE '%transferred%'
          ${dateFilter.replace(/bt\./g, '')}
        ) as combined_transactions
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            const result = await client.query(transactionsQuery, params);
            return {
                transactions: result.rows.map(row => ({
                    id: row.id,
                    bonus_instance_id: row.bonus_instance_id,
                    player_id: row.player_id,
                    transaction_type: row.transaction_type,
                    amount: parseFloat(row.amount),
                    balance_before: row.balance_before ? parseFloat(row.balance_before) : 0,
                    balance_after: row.balance_after ? parseFloat(row.balance_after) : 0,
                    game_id: row.game_id,
                    bet_id: row.bet_id,
                    wager_contribution: row.wager_contribution ? parseFloat(row.wager_contribution) : null,
                    description: row.description,
                    metadata: row.metadata,
                    created_at: row.created_at,
                    source: row.source
                })),
                total
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get transaction statistics for a player (updated to match frontend expectations)
     */
    static async getPlayerStats(playerId) {
        const client = await postgres_1.default.connect();
        try {
            // Get bonus instance stats
            const statsResult = await client.query(`SELECT
          COUNT(*) as total_bonuses_received,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
          COUNT(CASE WHEN status IN ('active', 'wagering') THEN 1 END) as total_active
         FROM bonus_instances
         WHERE player_id = $1`, [playerId]);
            const row = statsResult.rows[0];
            const totalReceived = parseInt(row.total_bonuses_received) || 0;
            const totalCompleted = parseInt(row.total_completed) || 0;
            const totalActive = parseInt(row.total_active) || 0;
            // Calculate completion rate
            const completionRate = totalReceived > 0
                ? (totalCompleted / totalReceived) * 100
                : 0;
            return {
                total_bonuses_received: totalReceived,
                total_completed: totalCompleted,
                total_active: totalActive,
                completion_rate: parseFloat(completionRate.toFixed(2))
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Format transaction data
     */
    static formatTransaction(row) {
        return {
            id: row.id,
            bonus_instance_id: row.bonus_instance_id,
            player_id: row.player_id,
            transaction_type: row.transaction_type,
            amount: parseFloat(row.amount),
            balance_before: parseFloat(row.balance_before),
            balance_after: parseFloat(row.balance_after),
            game_id: row.game_id,
            bet_id: row.bet_id,
            wager_contribution: row.wager_contribution ? parseFloat(row.wager_contribution) : null,
            description: row.description,
            metadata: row.metadata,
            created_at: row.created_at
        };
    }
    /**
     * Create audit log entry
     */
    static async createAuditLog(data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query(`INSERT INTO bonus_audit_log (
          bonus_plan_id, bonus_instance_id, player_id, admin_user_id,
          action_type, action_description, old_value, new_value,
          ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`, [
                data.bonus_plan_id || null,
                data.bonus_instance_id || null,
                data.player_id || null,
                data.admin_user_id || null,
                data.action_type,
                data.action_description || null,
                data.old_value ? JSON.stringify(data.old_value) : null,
                data.new_value ? JSON.stringify(data.new_value) : null,
                data.ip_address || null,
                data.user_agent || null
            ]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Get audit logs (admin view)
     */
    static async getAuditLogs(options = {}) {
        const client = await postgres_1.default.connect();
        try {
            const { limit = 100, offset = 0, admin_user_id, player_id, action_type, bonus_plan_id, startDate, endDate } = options;
            let whereConditions = ['1=1'];
            let params = [];
            let paramIndex = 1;
            if (admin_user_id) {
                whereConditions.push(`admin_user_id = $${paramIndex}`);
                params.push(admin_user_id);
                paramIndex++;
            }
            if (player_id) {
                whereConditions.push(`player_id = $${paramIndex}`);
                params.push(player_id);
                paramIndex++;
            }
            if (action_type) {
                whereConditions.push(`action_type = $${paramIndex}`);
                params.push(action_type);
                paramIndex++;
            }
            if (bonus_plan_id) {
                whereConditions.push(`bonus_plan_id = $${paramIndex}`);
                params.push(bonus_plan_id);
                paramIndex++;
            }
            if (startDate) {
                whereConditions.push(`created_at >= $${paramIndex}`);
                params.push(startDate);
                paramIndex++;
            }
            if (endDate) {
                whereConditions.push(`created_at <= $${paramIndex}`);
                params.push(endDate);
                paramIndex++;
            }
            const whereClause = whereConditions.join(' AND ');
            // Get total count
            const countResult = await client.query(`SELECT COUNT(*) as total FROM bonus_audit_log WHERE ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total);
            // Get logs
            params.push(limit, offset);
            const result = await client.query(`SELECT * FROM bonus_audit_log
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, params);
            const logs = result.rows.map(row => ({
                id: row.id,
                bonus_plan_id: row.bonus_plan_id,
                bonus_instance_id: row.bonus_instance_id,
                player_id: row.player_id,
                admin_user_id: row.admin_user_id,
                action_type: row.action_type,
                action_description: row.action_description,
                old_value: row.old_value,
                new_value: row.new_value,
                ip_address: row.ip_address,
                user_agent: row.user_agent,
                created_at: row.created_at
            }));
            return {
                logs,
                total
            };
        }
        finally {
            client.release();
        }
    }
}
exports.BonusTransactionService = BonusTransactionService;
