"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoBalanceSyncService = void 0;
const mongo_service_1 = require("../mongo/mongo.service");
const postgres_1 = __importDefault(require("../../db/postgres"));
class MongoBalanceSyncService {
    /**
     * Sync category balance (equivalent to PostgreSQL sync_category_balance function)
     * Calculates balance from MongoDB transactions and handles transfers
     */
    static async syncCategoryBalance(userId, category) {
        console.log(`[MONGO_SYNC] Syncing category balance for user ${userId}, category: ${category}`);
        await mongo_service_1.MongoService.initialize();
        // Check if there are manual transfers for this category (exclude cancel adjustments)
        const hasManualTransfers = await this.hasManualTransfers(userId, category);
        let categoryBalance;
        if (hasManualTransfers) {
            // If there are manual transfers, preserve the transfer amount
            console.log(`[MONGO_SYNC] Manual transfers detected for category ${category}`);
            // Get the current stored balance to preserve transfer amounts
            const currentStoredBalance = await mongo_service_1.MongoService.getCategoryBalance(userId, category);
            // Calculate only the non-transfer transactions (include cancel adjustments)
            categoryBalance = await this.calculateNonTransferBalance(userId, category);
            // Calculate the transfer amount (difference between stored balance and non-transfer transactions)
            const transferAmount = currentStoredBalance - categoryBalance;
            // Final balance = transfer amount + non-transfer transactions
            categoryBalance = transferAmount + categoryBalance;
            console.log(`[MONGO_SYNC] Manual transfers detected. Transfer amount: ${transferAmount}, Non-transfer balance: ${categoryBalance - transferAmount}, Final balance: ${categoryBalance}`);
        }
        else {
            // No manual transfers - use the original logic
            console.log(`[MONGO_SYNC] No manual transfers for category ${category}`);
            categoryBalance = await this.calculateNonTransferBalance(userId, category);
            // Get total deposits and withdrawals from uncategorized transactions (PostgreSQL)
            const { totalDeposits, totalWithdrawals } = await this.getMainWalletTotals(userId);
            const availableDeposits = totalDeposits - totalWithdrawals;
            // Add a reasonable portion of deposits to category balance
            if (availableDeposits > 0) {
                const depositAllocation = availableDeposits * 0.3;
                categoryBalance += depositAllocation;
                console.log(`[MONGO_SYNC] Added ${depositAllocation} from available deposits to category balance`);
            }
        }
        // Update category balance in MongoDB
        await mongo_service_1.MongoService.updateCategoryBalance(userId, category, categoryBalance);
        console.log(`[MONGO_SYNC] Category balance synced: ${categoryBalance}`);
        return categoryBalance;
    }
    /**
     * Sync user balance (equivalent to PostgreSQL sync_user_balance function)
     * Calculates main wallet balance from PostgreSQL transactions
     */
    static async syncUserBalance(userId) {
        console.log(`[MONGO_SYNC] Syncing user balance for user ${userId}`);
        const client = await postgres_1.default.connect();
        try {
            // Get real-time balance from PostgreSQL
            const realTimeBalance = await this.calculateRealTimeBalance(userId);
            // Get bonus balance from stored record
            const bonusBalanceResult = await client.query('SELECT COALESCE(bonus_balance, 0) as bonus_balance FROM user_balances WHERE user_id = $1', [userId]);
            const bonusBalance = Number(bonusBalanceResult.rows[0]?.bonus_balance || 0);
            // Calculate totals from PostgreSQL transactions
            const totalsResult = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposited,
          COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawn,
          COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0) as total_won
        FROM transactions 
        WHERE user_id = $1 AND status = 'completed'
      `, [userId]);
            const totalDeposited = Number(totalsResult.rows[0]?.total_deposited || 0);
            const totalWithdrawn = Number(totalsResult.rows[0]?.total_withdrawn || 0);
            const totalWagered = Number(totalsResult.rows[0]?.total_wagered || 0);
            const totalWon = Number(totalsResult.rows[0]?.total_won || 0);
            // Get user currency
            const currencyResult = await client.query('SELECT COALESCE(currency, \'USD\') as currency FROM user_profiles WHERE user_id = $1', [userId]);
            const currency = currencyResult.rows[0]?.currency || 'USD';
            // Update stored balance in PostgreSQL
            await client.query(`
        INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
        VALUES ($1, $2, $3, 0, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET
          balance = EXCLUDED.balance,
          total_deposited = EXCLUDED.total_deposited,
          total_withdrawn = EXCLUDED.total_withdrawn,
          total_wagered = EXCLUDED.total_wagered,
          total_won = EXCLUDED.total_won,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, realTimeBalance, bonusBalance, totalDeposited, totalWithdrawn, totalWagered, totalWon]);
            const balanceInfo = {
                balance: realTimeBalance,
                bonus_balance: bonusBalance,
                total_deposited: totalDeposited,
                total_withdrawn: totalWithdrawn,
                total_wagered: totalWagered,
                total_won: totalWon,
                currency: currency
            };
            console.log(`[MONGO_SYNC] User balance synced:`, balanceInfo);
            return balanceInfo;
        }
        finally {
            client.release();
        }
    }
    /**
     * Check if there are manual transfers for this category
     */
    static async hasManualTransfers(userId, category) {
        const transactions = await mongo_service_1.MongoService.getTransactionsCollection().find({
            user_id: userId,
            status: 'completed',
            'metadata.category': category.toLowerCase().trim(),
            'metadata.transfer_type': { $exists: true, $ne: '' },
            'metadata.original_transaction': { $exists: false } // Exclude cancel adjustments
        }).toArray();
        return transactions.length > 0;
    }
    /**
     * Calculate balance from non-transfer transactions only
     */
    static async calculateNonTransferBalance(userId, category) {
        const transactions = await mongo_service_1.MongoService.getTransactionsCollection().find({
            user_id: userId,
            status: 'completed',
            'metadata.category': category.toLowerCase().trim(),
            $or: [
                { 'metadata.transfer_type': { $exists: false } },
                { 'metadata.transfer_type': '' },
                { 'metadata.original_transaction': { $exists: true } } // Include cancel adjustments
            ]
        }).toArray();
        let balance = 0;
        for (const transaction of transactions) {
            switch (transaction.type) {
                case 'win':
                case 'bonus':
                case 'cashback':
                case 'refund':
                case 'adjustment':
                    balance += transaction.amount;
                    break;
                case 'bet':
                    balance -= transaction.amount;
                    break;
            }
        }
        return balance;
    }
    /**
     * Get main wallet totals from PostgreSQL
     */
    static async getMainWalletTotals(userId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
          COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals
        FROM transactions
        WHERE user_id = $1 AND status = 'completed'
        AND (metadata IS NULL OR metadata->>'category' IS NULL)
      `, [userId]);
            return {
                totalDeposits: Number(result.rows[0]?.total_deposits || 0),
                totalWithdrawals: Number(result.rows[0]?.total_withdrawals || 0)
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Calculate real-time balance from PostgreSQL main wallet transactions
     */
    static async calculateRealTimeBalance(userId) {
        const client = await postgres_1.default.connect();
        try {
            const result = await client.query(`
        SELECT COALESCE(SUM(
          CASE 
            WHEN type IN ('deposit', 'win', 'bonus', 'cashback', 'refund', 'adjustment') THEN amount
            WHEN type IN ('withdrawal', 'bet') THEN -amount
            ELSE 0
          END
        ), 0) as net_balance
        FROM transactions 
        WHERE user_id = $1 AND status = 'completed' 
        AND (metadata->>'category' IS NULL OR metadata->>'category' = '')
      `, [userId]);
            const netBalance = Number(result.rows[0]?.net_balance || 0);
            // Calculate locked amount from pending bets (PostgreSQL)
            const lockedResult = await client.query(`
        SELECT COALESCE(SUM(bet_amount), 0) as locked_amount
        FROM bets 
        WHERE user_id = $1 AND outcome = 'pending'
      `, [userId]);
            const lockedAmount = Number(lockedResult.rows[0]?.locked_amount || 0);
            // Return available balance (net balance minus locked amount)
            return Math.max(0, netBalance - lockedAmount);
        }
        finally {
            client.release();
        }
    }
    /**
     * Sync all category balances for a user
     */
    static async syncAllCategoryBalances(userId) {
        console.log(`[MONGO_SYNC] Syncing all category balances for user ${userId}`);
        // Get all unique categories from MongoDB transactions
        const categories = await mongo_service_1.MongoService.getTransactionsCollection().distinct('metadata.category', {
            user_id: userId,
            'metadata.category': { $exists: true, $ne: '' }
        });
        const categoryBalances = {};
        for (const category of categories) {
            if (category) {
                const balance = await this.syncCategoryBalance(userId, category);
                categoryBalances[category] = balance;
            }
        }
        console.log(`[MONGO_SYNC] All category balances synced:`, categoryBalances);
        return categoryBalances;
    }
    /**
     * Full balance sync for a user (main wallet + all categories)
     */
    static async syncUserFullBalance(userId) {
        console.log(`[MONGO_SYNC] Full balance sync for user ${userId}`);
        // Sync main wallet balance
        const mainWallet = await this.syncUserBalance(userId);
        // Sync all category balances
        const categories = await this.syncAllCategoryBalances(userId);
        return {
            mainWallet,
            categories
        };
    }
}
exports.MongoBalanceSyncService = MongoBalanceSyncService;
