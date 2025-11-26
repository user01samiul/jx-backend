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
     * Get transactions for a player
     */
    static async getPlayerTransactions(playerId, options = {}) {
        const client = await postgres_1.default.connect();
        try {
            const { limit = 50, offset = 0, type, startDate, endDate } = options;
            let whereConditions = ['player_id = $1'];
            let params = [playerId];
            let paramIndex = 2;
            if (type) {
                whereConditions.push(`transaction_type = $${paramIndex}`);
                params.push(type);
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
            const countResult = await client.query(`SELECT COUNT(*) as total FROM bonus_transactions WHERE ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].total);
            // Get transactions
            params.push(limit, offset);
            const result = await client.query(`SELECT * FROM bonus_transactions
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, params);
            return {
                transactions: result.rows.map(row => this.formatTransaction(row)),
                total
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get transaction statistics for a player
     */
    static async getPlayerStats(playerId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`SELECT
          COALESCE(SUM(CASE WHEN transaction_type = 'granted' THEN amount ELSE 0 END), 0) as total_granted,
          COALESCE(SUM(CASE WHEN transaction_type = 'wager_contributed' THEN wager_contribution ELSE 0 END), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN transaction_type = 'released' THEN amount ELSE 0 END), 0) as total_released,
          COALESCE(SUM(CASE WHEN transaction_type = 'forfeited' THEN amount ELSE 0 END), 0) as total_forfeited,
          COALESCE(SUM(CASE WHEN transaction_type = 'expired' THEN amount ELSE 0 END), 0) as total_expired
         FROM bonus_transactions
         WHERE player_id = $1`, [playerId]);
            const row = result.rows[0];
            return {
                total_granted: parseFloat(row.total_granted) || 0,
                total_wagered: parseFloat(row.total_wagered) || 0,
                total_released: parseFloat(row.total_released) || 0,
                total_forfeited: parseFloat(row.total_forfeited) || 0,
                total_expired: parseFloat(row.total_expired) || 0
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
}
exports.BonusTransactionService = BonusTransactionService;
