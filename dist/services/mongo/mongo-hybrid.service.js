"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoHybridService = void 0;
const mongo_service_1 = require("./mongo.service");
const postgres_1 = __importDefault(require("../../db/postgres"));
/**
 * Hybrid service that provides MongoDB operations for bets, transactions, and category balances
 * while maintaining PostgreSQL compatibility for other operations
 */
class MongoHybridService {
    constructor() {
        // Initialize MongoDB connection if not already done
        this.initializeMongo();
    }
    async initializeMongo() {
        try {
            await mongo_service_1.MongoService.initialize();
        }
        catch (error) {
            console.error('Failed to initialize MongoDB:', error);
        }
    }
    async ensureMongoInitialized() {
        try {
            // Try to get a collection to see if MongoDB is initialized
            mongo_service_1.MongoService.getBetsCollection();
        }
        catch (error) {
            // If it fails, initialize MongoDB
            console.log('[MONGO_HYBRID] MongoDB not initialized, initializing now...');
            await this.initializeMongo();
            // Wait a bit for initialization to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Try again after initialization
            try {
                mongo_service_1.MongoService.getBetsCollection();
            }
            catch (retryError) {
                console.error('[MONGO_HYBRID] Failed to initialize MongoDB after retry:', retryError);
                // Try one more time with a longer delay
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    mongo_service_1.MongoService.getBetsCollection();
                }
                catch (finalError) {
                    console.error('[MONGO_HYBRID] Final attempt to initialize MongoDB failed:', finalError);
                    throw finalError;
                }
            }
        }
    }
    // =====================================================
    // TRANSACTION OPERATIONS (MongoDB)
    // =====================================================
    async insertTransaction(transactionData) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.insertTransaction(transactionData);
    }
    async getTransaction(id) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.getTransactionById(id);
    }
    async getTransactions(userId, limit = 50) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.getTransactions(userId, limit);
    }
    async updateTransaction(id, updateData) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.updateTransaction(id, updateData);
    }
    // =====================================================
    // BET OPERATIONS (MongoDB)
    // =====================================================
    async insertBet(betData) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.insertBet(betData);
    }
    async getBet(id) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.getBetById(id);
    }
    async getBetById(betId) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.getBetById(betId);
    }
    async getBets(userId, limit = 50) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.getBets(userId, limit);
    }
    async updateBet(id, updateData) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.updateBet(id, updateData);
    }
    // =====================================================
    // CATEGORY BALANCE OPERATIONS (MongoDB)
    // =====================================================
    async getCategoryBalance(userId, category) {
        await this.ensureMongoInitialized();
        const balance = await mongo_service_1.MongoService.getCategoryBalance(userId, category);
        return balance || 0;
    }
    async updateCategoryBalance(userId, category, amount) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.updateCategoryBalance(userId, category, amount);
    }
    async addCategoryBalance(userId, category, amount) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.addCategoryBalance(userId, category, amount);
    }
    async deductCategoryBalance(userId, category, amount) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.deductCategoryBalance(userId, category, amount);
    }
    async getUserCategoryBalances(userId) {
        await this.ensureMongoInitialized();
        return await mongo_service_1.MongoService.getUserCategoryBalances(userId);
    }
    // =====================================================
    // HYBRID OPERATIONS (PostgreSQL + MongoDB)
    // =====================================================
    /**
     * Place a bet using MongoDB for bet/transaction data and PostgreSQL for user balance
     */
    async placeBet(userId, gameId, betAmount, gameData) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get game data from PostgreSQL
            const gameResult = await client.query("SELECT name, category, provider FROM games WHERE id = $1 AND is_active = true", [gameId]);
            if (gameResult.rows.length === 0) {
                throw new Error("Game not found or inactive");
            }
            const game = gameResult.rows[0];
            const category = game.category?.toLowerCase().trim() || 'slots';
            // Get current category balance from MongoDB
            const currentBalance = await this.getCategoryBalance(userId, category);
            if (currentBalance < betAmount) {
                throw new Error("Insufficient balance");
            }
            // Deduct from category balance in MongoDB
            await this.deductCategoryBalance(userId, category, betAmount);
            // Create transaction in MongoDB
            const transactionData = {
                user_id: userId,
                type: 'bet',
                amount: -betAmount,
                balance_before: currentBalance,
                balance_after: currentBalance - betAmount,
                currency: 'USD',
                status: 'completed',
                description: `Bet on ${game.name}`,
                metadata: {
                    game_id: gameId,
                    category: category,
                    game_data: gameData
                }
            };
            const transaction = await this.insertTransaction(transactionData);
            // Create bet in MongoDB
            const betData = {
                user_id: userId,
                game_id: gameId,
                transaction_id: transaction.id,
                bet_amount: betAmount,
                win_amount: 0,
                multiplier: null,
                outcome: 'pending',
                game_data: gameData,
                placed_at: new Date(),
                result_at: null,
                session_id: gameData?.session_id || null
            };
            const bet = await this.insertBet(betData);
            await client.query('COMMIT');
            return {
                bet_id: bet.id,
                transaction_id: transaction.id,
                bet_amount: betAmount,
                new_balance: currentBalance - betAmount,
                balance_before: currentBalance,
                balance_after: currentBalance - betAmount
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
     * Process bet result using MongoDB for bet/transaction data
     */
    async processBetResult(betId, outcome, winAmount = 0, gameResult) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get bet from MongoDB
            const bet = await this.getBet(betId);
            if (!bet) {
                throw new Error("Bet not found");
            }
            // Get game data from PostgreSQL
            const gameResult = await client.query("SELECT name, category FROM games WHERE id = $1", [bet.game_id]);
            if (gameResult.rows.length === 0) {
                throw new Error("Game not found");
            }
            const game = gameResult.rows[0];
            const category = game.category?.toLowerCase().trim() || 'slots';
            // Update bet outcome in MongoDB
            await this.updateBet(betId, {
                outcome: outcome,
                win_amount: winAmount,
                result_at: new Date()
            });
            if (outcome === 'win' && winAmount > 0) {
                // Get current balance BEFORE adding the win
                const balanceBefore = await this.getCategoryBalance(bet.user_id, category);
                // Add win to category balance in MongoDB
                await this.addCategoryBalance(bet.user_id, category, winAmount);
                // Create win transaction in MongoDB
                const balanceAfter = await this.getCategoryBalance(bet.user_id, category);
                const winTransactionData = {
                    user_id: bet.user_id,
                    type: 'win',
                    amount: winAmount,
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    currency: 'USD',
                    status: 'completed',
                    description: `Bet win on ${game.name}`,
                    metadata: {
                        bet_id: betId,
                        game_id: bet.game_id,
                        category: category,
                        outcome: outcome,
                        game_result: gameResult
                    }
                };
                await this.insertTransaction(winTransactionData);
            }
            await client.query('COMMIT');
            return {
                bet_id: betId,
                outcome: outcome,
                win_amount: winAmount,
                processed_at: new Date()
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
     * Get user balance information from both PostgreSQL and MongoDB
     */
    async getUserBalance(userId) {
        const client = await postgres_1.default.connect();
        try {
            // Get main balance from PostgreSQL
            const mainBalanceResult = await client.query('SELECT balance, total_deposited, total_withdrawn FROM user_balances WHERE user_id = $1', [userId]);
            const mainBalance = mainBalanceResult.rows[0] || { balance: 0, total_deposited: 0, total_withdrawn: 0 };
            // Get category balances from MongoDB
            const categoryBalances = await this.getUserCategoryBalances(userId);
            return {
                user_id: userId,
                main_balance: mainBalance.balance,
                total_deposited: mainBalance.total_deposited,
                total_withdrawn: mainBalance.total_withdrawn,
                category_balances: categoryBalances
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Admin topup - creates deposit transaction in MongoDB and syncs PostgreSQL balance
     */
    async adminTopup(userId, amount, description = 'Admin top-up') {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Get current balance from PostgreSQL
            const currentBalanceResult = await client.query('SELECT balance, total_deposited FROM user_balances WHERE user_id = $1', [userId]);
            const currentBalance = parseFloat(currentBalanceResult.rows[0]?.balance || 0);
            const currentTotalDeposited = parseFloat(currentBalanceResult.rows[0]?.total_deposited || 0);
            const newBalance = currentBalance + amount;
            const newTotalDeposited = currentTotalDeposited + amount;
            // Create deposit transaction in MongoDB (main wallet transaction)
            await mongo_service_1.MongoService.initialize();
            const mongoTransactionResult = await mongo_service_1.MongoService.insertTransaction({
                user_id: userId,
                type: 'deposit',
                amount: amount,
                balance_before: currentBalance,
                balance_after: newBalance,
                currency: 'USD',
                status: 'completed',
                description: description,
                external_reference: `admin_topup_${Date.now()}`,
                metadata: { admin_topup: true }
            });
            // Create deposit transaction in PostgreSQL (main wallet transaction) for compatibility
            const transactionResult = await client.query(`INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, currency, status, description, metadata, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING id`, [
                userId,
                'deposit',
                amount,
                currentBalance,
                newBalance,
                'USD',
                'completed',
                description,
                JSON.stringify({ admin_topup: true, mongo_transaction_id: mongoTransactionResult.id })
            ]);
            const transactionId = transactionResult.rows[0].id;
            // Insert or update balance in PostgreSQL
            await client.query(`INSERT INTO user_balances (user_id, balance, total_deposited, updated_at) 
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           balance = $2, 
           total_deposited = $3, 
           updated_at = NOW()`, [userId, newBalance, newTotalDeposited]);
            await client.query('COMMIT');
            return {
                transaction_id: transactionId,
                mongo_transaction_id: mongoTransactionResult.id,
                new_balance: newBalance
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
     * Get MongoDB service for direct access
     */
    static getMongoService() {
        return mongo_service_1.MongoService;
    }
    /**
     * Query method for compatibility with existing code
     */
    async query(sql, params = []) {
        // This is a simplified query method for compatibility
        // In a real implementation, you might want to parse SQL and route to appropriate services
        console.warn('MongoHybridService.query() called - consider using specific methods instead');
        return { rows: [] };
    }
}
exports.MongoHybridService = MongoHybridService;
