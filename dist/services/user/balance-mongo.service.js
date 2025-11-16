"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceMongoService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
const currency_utils_1 = require("../../utils/currency.utils");
const mongo_hybrid_service_1 = require("../mongo/mongo-hybrid.service");
class BalanceMongoService {
    /**
     * Initialize MongoDB service
     */
    static async initialize() {
        await mongo_hybrid_service_1.MongoHybridService.initialize();
    }
    /**
     * Calculate real-time balance from transactions (using MongoDB)
     */
    static async calculateRealTimeBalance(userId) {
        var _a, _b;
        console.log('[DEBUG][BALANCE CALC][ENTERED] userId:', userId);
        const client = await postgres_1.default.connect();
        try {
            // Get user currency (still using PostgreSQL for user profiles)
            const currencyResult = await client.query("SELECT currency FROM user_profiles WHERE user_id = $1", [userId]);
            const currency = ((_a = currencyResult.rows[0]) === null || _a === void 0 ? void 0 : _a.currency) || 'USD';
            console.log('[DEBUG][BALANCE CALC][CURRENCY]', currency);
            // Calculate balance from main wallet transactions only (exclude category transactions) - using MongoDB
            const transactions = await mongo_hybrid_service_1.MongoHybridService.getMongoService().getTransactionsCollection().find({
                user_id: userId,
                status: 'completed',
                $or: [
                    { metadata: { $exists: false } },
                    { 'metadata.category': { $exists: false } },
                    { 'metadata.category': null },
                    { 'metadata.category': '' }
                ]
            }).toArray();
            console.log('[DEBUG][BALANCE CALC][MAIN WALLET TRANSACTIONS]', transactions);
            // Calculate totals
            let total_deposited = 0;
            let total_withdrawn = 0;
            let total_bets = 0;
            let total_wins = 0;
            let total_bonus = 0;
            let total_cashback = 0;
            let total_refunds = 0;
            let total_adjustments = 0;
            for (const tx of transactions) {
                switch (tx.type) {
                    case 'deposit':
                        total_deposited += Number(tx.amount);
                        break;
                    case 'withdrawal':
                        total_withdrawn += Number(tx.amount);
                        break;
                    case 'bet':
                        total_bets += Number(tx.amount);
                        break;
                    case 'win':
                        total_wins += Number(tx.amount);
                        break;
                    case 'bonus':
                        total_bonus += Number(tx.amount);
                        break;
                    case 'cashback':
                        total_cashback += Number(tx.amount);
                        break;
                    case 'refund':
                        total_refunds += Number(tx.amount);
                        break;
                    case 'adjustment':
                        total_adjustments += Number(tx.amount);
                        break;
                }
            }
            console.log('[DEBUG][BALANCE CALC][BALANCE RESULT]', {
                total_deposited,
                total_withdrawn,
                total_bets,
                total_wins,
                total_bonus,
                total_cashback,
                total_refunds,
                total_adjustments
            });
            // Calculate net balance
            const netBalance = total_deposited +
                total_wins +
                total_bonus +
                total_cashback +
                total_refunds +
                total_adjustments -
                total_withdrawn -
                total_bets;
            // Get locked balance (bets that are still pending) - using MongoDB
            const pendingBets = await mongo_hybrid_service_1.MongoHybridService.getMongoService().getBetsCollection().find({
                user_id: userId,
                outcome: 'pending'
            }).toArray();
            const lockedBalance = pendingBets.reduce((sum, bet) => sum + Number(bet.bet_amount), 0);
            // Get bonus balance (still using PostgreSQL for user_balances)
            const bonusResult = await client.query("SELECT bonus_balance FROM user_balances WHERE user_id = $1", [userId]);
            const bonusBalance = Number(((_b = bonusResult.rows[0]) === null || _b === void 0 ? void 0 : _b.bonus_balance) || 0);
            return {
                balance: Math.max(0, netBalance - lockedBalance), // Available balance
                bonus_balance: bonusBalance,
                locked_balance: lockedBalance,
                total_deposited,
                total_withdrawn,
                total_wagered: total_bets,
                total_won: total_wins,
                currency
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Update stored balance to match real-time calculation
     */
    static async syncStoredBalance(userId, clientParam) {
        console.log('[DEBUG] START syncStoredBalance', { userId });
        const client = clientParam || await postgres_1.default.connect();
        let startedTransaction = false;
        try {
            if (!clientParam) {
                await client.query('BEGIN');
                startedTransaction = true;
                console.log('[DEBUG] Began DB transaction in syncStoredBalance');
            }
            console.log('[DEBUG] Calling calculateRealTimeBalance from syncStoredBalance');
            const realTimeBalance = await this.calculateRealTimeBalance(userId);
            console.log('[DEBUG] Got realTimeBalance in syncStoredBalance', realTimeBalance);
            // Update stored balance (still using PostgreSQL for user_balances)
            console.log('[DEBUG] Inserting/updating user_balances');
            await client.query(`
        INSERT INTO user_balances (user_id, balance, bonus_balance, locked_balance, total_deposited, total_withdrawn, total_wagered, total_won, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE SET
          balance = EXCLUDED.balance,
          bonus_balance = EXCLUDED.bonus_balance,
          locked_balance = EXCLUDED.locked_balance,
          total_deposited = EXCLUDED.total_deposited,
          total_withdrawn = EXCLUDED.total_withdrawn,
          total_wagered = EXCLUDED.total_wagered,
          total_won = EXCLUDED.total_won,
          updated_at = CURRENT_TIMESTAMP
        `, [
                userId,
                realTimeBalance.balance,
                realTimeBalance.bonus_balance,
                realTimeBalance.locked_balance,
                realTimeBalance.total_deposited,
                realTimeBalance.total_withdrawn,
                realTimeBalance.total_wagered,
                realTimeBalance.total_won
            ]);
            console.log('[DEBUG] user_balances upserted in syncStoredBalance');
            if (startedTransaction) {
                await client.query('COMMIT');
                console.log('[DEBUG] DB transaction committed in syncStoredBalance');
            }
            return realTimeBalance;
        }
        catch (error) {
            if (startedTransaction) {
                await client.query('ROLLBACK');
                console.log('[DEBUG] Error in syncStoredBalance, transaction rolled back', error);
            }
            throw error;
        }
        finally {
            if (!clientParam) {
                client.release();
                console.log('[DEBUG] DB client released in syncStoredBalance');
            }
        }
    }
    /**
     * Process a transaction and update balance atomically (using MongoDB for transactions)
     */
    static async processTransaction(transactionData, clientParam) {
        var _a;
        console.log('[DEBUG] START processTransaction', transactionData);
        const client = clientParam || await postgres_1.default.connect();
        let startedTransaction = false;
        try {
            if (!clientParam) {
                await client.query('BEGIN');
                startedTransaction = true;
                console.log('[DEBUG] Began DB transaction in processTransaction');
            }
            console.log('[TRANSACTION LOG]', {
                user_id: transactionData.user_id,
                type: transactionData.type,
                amount: transactionData.amount,
                category: ((_a = transactionData.metadata) === null || _a === void 0 ? void 0 : _a.category) || null
            });
            // Check if this is a category bet (category wallet)
            const isCategoryBet = transactionData.metadata && transactionData.metadata.category;
            let balanceBefore = null;
            let balanceAfter = null;
            if (!isCategoryBet) {
                // Get current balance
                console.log('[DEBUG] Calculating real-time balance');
                const currentBalance = await this.calculateRealTimeBalance(transactionData.user_id);
                console.log('[DEBUG] Real-time balance result', currentBalance);
                balanceBefore = currentBalance.balance;
                // Validate transaction
                if (transactionData.type === 'bet' || transactionData.type === 'withdrawal') {
                    if (balanceBefore < transactionData.amount) {
                        console.log('[DEBUG] Insufficient balance', { balanceBefore, required: transactionData.amount });
                        throw new apiError_1.ApiError(`Insufficient balance. Available: ${balanceBefore}, Required: ${transactionData.amount}`, 400);
                    }
                }
                // Use proper decimal arithmetic to avoid floating-point precision issues
                balanceAfter =
                    transactionData.type === 'bet' || transactionData.type === 'withdrawal'
                        ? currency_utils_1.CurrencyUtils.subtract(balanceBefore, transactionData.amount)
                        : currency_utils_1.CurrencyUtils.add(balanceBefore, transactionData.amount);
            }
            // For category bets, skip main wallet check/deduction, just log the transaction
            // Create transaction record using MongoDB
            console.log('[DEBUG] Inserting transaction record to MongoDB');
            const transactionResult = await mongo_hybrid_service_1.MongoHybridService.insertTransaction({
                user_id: transactionData.user_id,
                type: transactionData.type,
                amount: transactionData.amount,
                balance_before: balanceBefore || undefined,
                balance_after: balanceAfter || undefined,
                currency: transactionData.currency,
                status: 'completed',
                description: transactionData.description || `${transactionData.type} transaction`,
                external_reference: transactionData.external_reference,
                metadata: transactionData.metadata,
                created_by: 1
            });
            console.log('[DEBUG] Transaction insert result', transactionResult);
            const transactionId = transactionResult.id;
            // Only sync stored balance for main wallet transactions
            let newBalance = { balance: 0 };
            if (!isCategoryBet) {
                // Update stored balance
                console.log('[DEBUG] Syncing stored balance');
                newBalance = await this.syncStoredBalance(transactionData.user_id, client);
                console.log('[DEBUG] syncStoredBalance result', newBalance);
            }
            if (startedTransaction) {
                await client.query('COMMIT');
                console.log('[DEBUG] DB transaction committed in processTransaction');
            }
            return {
                transaction_id: transactionId,
                new_balance: newBalance.balance || 0,
                balance_before: balanceBefore,
                balance_after: balanceAfter
            };
        }
        catch (error) {
            if (startedTransaction) {
                await client.query('ROLLBACK');
                console.log('[DEBUG] Error in processTransaction, transaction rolled back', error);
            }
            throw error;
        }
        finally {
            if (!clientParam) {
                client.release();
                console.log('[DEBUG] DB client released in processTransaction');
            }
        }
    }
    /**
     * Add balance to user account (for deposits, wins, bonuses, etc.)
     */
    static async addBalance(userId, amount, description, metadata) {
        const result = await this.processTransaction({
            user_id: userId,
            type: 'deposit',
            amount: amount,
            currency: 'USD',
            description: description,
            metadata: metadata
        });
        return {
            transaction_id: result.transaction_id,
            new_balance: result.new_balance,
            balance_before: result.balance_before || 0,
            balance_after: result.balance_after || 0
        };
    }
    /**
     * Deduct balance from user account (for bets, withdrawals, etc.)
     */
    static async deductBalance(userId, amount, description, metadata) {
        const result = await this.processTransaction({
            user_id: userId,
            type: 'bet',
            amount: amount,
            currency: 'USD',
            description: description,
            metadata: metadata
        });
        return {
            transaction_id: result.transaction_id,
            new_balance: result.new_balance,
            balance_before: result.balance_before || 0,
            balance_after: result.balance_after || 0
        };
    }
    /**
     * Get user balance (real-time calculation)
     */
    static async getUserBalance(userId) {
        return await this.calculateRealTimeBalance(userId);
    }
    /**
     * Close MongoDB connection
     */
    static async close() {
        await mongo_hybrid_service_1.MongoHybridService.close();
    }
}
exports.BalanceMongoService = BalanceMongoService;
