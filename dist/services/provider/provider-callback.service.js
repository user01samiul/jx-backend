"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderCallbackService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const crypto = __importStar(require("crypto"));
const apiError_1 = require("../../utils/apiError");
const balance_service_1 = require("../user/balance.service");
const callback_filter_service_1 = require("./callback-filter.service");
const profit_control_service_1 = require("../profit/profit-control.service");
const currency_utils_1 = require("../../utils/currency.utils");
const env_1 = require("../../configs/env");
// Removed BalanceConsistencyService import - now using simple stored balances
console.log('[CRITICAL] Provider callback service loaded - VERSION 2.0');
class ProviderCallbackService {
    static SECRET_KEY = env_1.env.SUPPLIER_SECRET_KEY;
    static OPERATOR_ID = env_1.env.SUPPLIER_OPERATOR_ID;
    // Add retry configuration for rate limiting
    static RETRY_CONFIG = {
        maxRetries: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 10000, // 10 seconds
    };
    // Exponential backoff retry function
    static async retryWithBackoff(operation, retryCount = 0) {
        try {
            return await operation();
        }
        catch (error) {
            if (error?.response?.status === 429 && retryCount < this.RETRY_CONFIG.maxRetries) {
                const delay = Math.min(this.RETRY_CONFIG.baseDelay * Math.pow(2, retryCount), this.RETRY_CONFIG.maxDelay);
                console.log(`[RETRY] HTTP 429 detected, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.RETRY_CONFIG.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryWithBackoff(operation, retryCount + 1);
            }
            throw error;
        }
    }
    // Currency formatting utility (using CurrencyUtils)
    static formatCurrency(amount, currency = 'USD') {
        return currency_utils_1.CurrencyUtils.formatForDisplay(amount, currency);
    }
    // Parse amount with proper decimal handling (using CurrencyUtils)
    static parseAmount(amount) {
        return currency_utils_1.CurrencyUtils.parse(amount);
    }
    // Get the correct balance for provider responses (ALWAYS use this method!)
    // UNIFIED WALLET: Returns main balance from PostgreSQL user_balances table
    static async getCurrentBalanceForResponse(user_id, category) {
        console.log(`[BALANCE_FIX][UNIFIED_WALLET] Getting current balance for user ${user_id}, category: ${category}`);
        try {
            // Get main balance from PostgreSQL user_balances table
            const mainBalanceResult = await postgres_1.default.query('SELECT balance FROM user_balances WHERE user_id = $1', [user_id]);
            const currentBalance = mainBalanceResult.rows.length ? currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0].balance) : 0;
            console.log(`[BALANCE_FIX][UNIFIED_WALLET] Current main balance from PostgreSQL: ${this.formatCurrency(currentBalance)} (category: ${category})`);
            return currentBalance;
        }
        catch (error) {
            console.error(`[BALANCE_FIX][UNIFIED_WALLET] Error getting main balance from PostgreSQL:`, error);
            // Fallback to 0 if PostgreSQL fails
            return 0;
        }
    }
    // Enhanced duplicate detection for bet transactions
    static async detectDuplicateBet(user_id, bet_amount, game_id, session_id) {
        console.log(`[DUPLICATE_DETECTION] Checking for duplicate bet: user=${user_id}, amount=${bet_amount}, game=${game_id}, session=${session_id}`);
        // TEMPORARILY DISABLED for provider testing - allows 10 bets in one round
        // Check for recent identical bets (within 3 seconds)
        const recentBets = await postgres_1.default.query(`SELECT id, amount, created_at, external_reference 
       FROM transactions 
       WHERE user_id = $1 
       AND type = 'bet' 
       AND amount = $2 
       AND metadata->>'game_id' = $3
       AND created_at >= NOW() - INTERVAL '3 seconds'
       ORDER BY created_at DESC`, [user_id, bet_amount, game_id.toString()]);
        if (recentBets.rows.length > 1) {
            console.log(`[DUPLICATE_DETECTION] Found ${recentBets.rows.length} recent bets with same amount:`);
            recentBets.rows.forEach((bet, index) => {
                console.log(`  ${index + 1}. ID: ${bet.id}, Amount: ${bet.amount}, Created: ${bet.created_at}, Ref: ${bet.external_reference}`);
            });
            // TEMPORARILY DISABLED: return true;
            console.log(`[DUPLICATE_DETECTION] TEMPORARILY ALLOWING duplicate bet for provider testing`);
        }
        // TEMPORARILY DISABLED for provider testing - allows rapid transactions
        // Check for rapid successive transactions (within 1 second)
        const rapidTransactions = await postgres_1.default.query(`SELECT COUNT(*) as count 
       FROM transactions 
       WHERE user_id = $1 
       AND created_at >= NOW() - INTERVAL '1 second'`, [user_id]);
        if (parseInt(rapidTransactions.rows[0].count) > 2) {
            console.log(`[DUPLICATE_DETECTION] Rapid transaction pattern detected: ${rapidTransactions.rows[0].count} transactions in 1 second`);
            // TEMPORARILY DISABLED: return true;
            console.log(`[DUPLICATE_DETECTION] TEMPORARILY ALLOWING rapid transactions for provider testing`);
        }
        return false;
    }
    // Balance audit logging for debugging
    static async logBalanceAudit(user_id, category, transaction_type, amount, balance_before, balance_after) {
        try {
            console.log(`[BALANCE_AUDIT] ${transaction_type.toUpperCase()} - User: ${user_id}, Category: ${category}, Amount: ${this.formatCurrency(amount)}, Balance: ${this.formatCurrency(balance_before)} -> ${this.formatCurrency(balance_after)}`);
        }
        catch (error) {
            console.error(`[BALANCE_AUDIT] Error logging balance audit:`, error.message);
        }
    }
    // Utility: Lookup user by token (access_token)
    static async getUserByToken(token) {
        console.log('[DEBUG][TOKEN_TRACE] Looking up token:', token);
        const sql = `
      SELECT u.id as user_id, u.username, u.status_id, s.name as status_name, up.first_name, up.last_name, up.country, up.nationality, up.language, up.currency, up.city, up.address, up.postal_code, up.gender, up.avatar_url, up.timezone, up.is_verified, up.verification_level, up.last_login_at, up.last_activity_at, ub.balance, ub.bonus_balance, ub.locked_balance, ub.total_deposited, ub.total_withdrawn, ub.total_wagered, ub.total_won, t.game_id as token_game_id, t.category as token_category, t.expired_at, t.is_active
      FROM tokens t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN statuses s ON u.status_id = s.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      WHERE t.access_token = $1
      LIMIT 1
    `;
        const result = await postgres_1.default.query(sql, [token]);
        console.log('[DEBUG][TOKEN_TRACE] DB query result for token:', token, JSON.stringify(result.rows));
        if (result.rows.length === 0) {
            console.log('[DEBUG][TOKEN_TRACE] Token NOT FOUND in DB:', token);
            return null;
        }
        const row = result.rows[0];
        if (!row.is_active) {
            console.log('[DEBUG][TOKEN_TRACE] Token found but NOT ACTIVE:', row);
            return null;
        }
        if (row.expired_at && new Date(row.expired_at) < new Date()) {
            console.log('[DEBUG][TOKEN_TRACE] Token found but EXPIRED:', row);
            return null;
        }
        console.log('[DEBUG][TOKEN_TRACE] Found token row:', row);
        return row;
    }
    // Utility: Get country_code and country_name from country string
    static getCountryInfo(country) {
        // You may want to use a real mapping here
        if (!country)
            return { country_code: '', country_name: '' };
        if (country.toLowerCase().includes('united states'))
            return { country_code: 'US', country_name: 'United States' };
        if (country.toLowerCase().includes('canada'))
            return { country_code: 'CA', country_name: 'Canada' };
        // Add more as needed
        return { country_code: country.slice(0, 2).toUpperCase(), country_name: country };
    }
    // Utility: Get user balance (real-time)
    static async getUserBalance(user_id) {
        const balanceInfo = await balance_service_1.BalanceService.getUserBalance(user_id);
        return { balance: balanceInfo.balance, currency: balanceInfo.currency };
    }
    // Utility: Get game info
    static async getGameById(game_id) {
        console.log(`[DEBUG] getGameById: Querying game ${game_id}`);
        const result = await postgres_1.default.query("SELECT * FROM games WHERE id = $1", [game_id]);
        console.log(`[DEBUG] getGameById: Found ${result.rows.length} rows for game ${game_id}`);
        if (result.rows.length === 0) {
            console.log(`[DEBUG] getGameById: Game ${game_id} not found`);
            return null;
        }
        const game = result.rows[0];
        console.log(`[DEBUG] getGameById: Game ${game_id} found - is_active: ${game.is_active}, name: ${game.name}`);
        // Check if game is disabled
        if (!game.is_active) {
            console.log(`[GAME_STATUS] Game ${game_id} is disabled`);
            throw new Error('OP_35: Game is disabled');
        }
        console.log(`[DEBUG] getGameById: Game ${game_id} is active, returning game`);
        return game;
    }
    // Utility: Insert bet
    static async insertBet({ user_id, game_id, bet_amount, session_id, transaction_id }) {
        try {
            // Initialize MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // Insert bet in MongoDB
            const betId = await MongoService.insertBet({
                user_id,
                game_id,
                bet_amount,
                session_id,
                transaction_id,
                outcome: 'pending',
                created_by: user_id
            });
            return betId;
        }
        catch (error) {
            console.error(`[ERROR] Failed to insert bet in MongoDB:`, error);
            throw error;
        }
    }
    // Utility: Update bet with win (accumulate win amounts)
    static async updateBetWin({ bet_id, win_amount }) {
        try {
            // Initialize MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // Update bet in MongoDB
            await MongoService.getBetsCollection().updateOne({ id: bet_id }, {
                $inc: { win_amount: win_amount },
                $set: {
                    outcome: 'win',
                    result_at: new Date(),
                    updated_at: new Date()
                }
            });
        }
        catch (error) {
            console.error(`[ERROR] Failed to update bet win in MongoDB:`, error);
            throw error;
        }
    }
    // Utility: Update bet with loss
    static async updateBetLose({ bet_id }) {
        try {
            // Initialize MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // Update bet in MongoDB
            await MongoService.getBetsCollection().updateOne({ id: bet_id }, {
                $set: {
                    win_amount: 0,
                    outcome: 'lose',
                    result_at: new Date(),
                    updated_at: new Date()
                }
            });
        }
        catch (error) {
            console.error(`[ERROR] Failed to update bet lose in MongoDB:`, error);
            throw error;
        }
    }
    // Utility: Insert transaction
    static async insertTransaction({ user_id, type, amount, balance_before, balance_after, currency, external_reference, description, metadata }) {
        try {
            // Validate transaction type against allowed types
            const allowedTypes = ['deposit', 'withdrawal', 'bet', 'win', 'bonus', 'cashback', 'refund', 'adjustment'];
            if (!allowedTypes.includes(type)) {
                console.error(`[TRANSACTION] Invalid transaction type: ${type}. Allowed types: ${allowedTypes.join(', ')}`);
                throw new Error(`Invalid transaction type: ${type}`);
            }
            // Ensure amount is properly formatted
            const parsedAmount = this.parseAmount(amount);
            if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
                console.error(`[TRANSACTION] Invalid amount: ${amount}`);
                throw new Error(`Invalid amount: ${amount}`);
            }
            // Initialize MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // Insert transaction in MongoDB
            const transactionId = await MongoService.insertTransaction({
                user_id,
                type,
                amount: parsedAmount,
                balance_before,
                balance_after,
                currency,
                external_reference,
                description,
                metadata
            });
            return transactionId;
        }
        catch (error) {
            console.error(`[TRANSACTION] Error inserting transaction:`, {
                user_id,
                type,
                amount,
                error: error.message
            });
            throw error;
        }
    }
    // Utility: Update user balance (sync with real-time calculation)
    // DISABLED: Database trigger handles balance sync automatically
    static async updateUserBalance(user_id, new_balance) {
        // Database trigger sync_balance_on_transaction handles balance updates automatically
        // No need to manually sync here to avoid double updates
        console.log(`[BALANCE_SYNC] Skipping manual balance sync for user ${user_id} - database trigger handles this`);
    }
    // Utility: Error response (returns wrapped format with request + response as required by provider validation)
    static createErrorResponseWrapped(request, errorCode, errorMessage) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return {
            request: {
                command: request.command,
                data: request.data,
                request_timestamp: request.request_timestamp,
                hash: request.hash
            },
            response: {
                status: 'ERROR',
                response_timestamp: timestamp,
                hash: this.generateResponseHash('ERROR', timestamp),
                data: {
                    error_code: errorCode,
                    error_message: errorMessage
                }
            }
        };
    }
    // Utility: Response hash
    static generateResponseHash(status, timestamp) {
        if (!this.SECRET_KEY) {
            throw new apiError_1.ApiError("Secret key not configured", 500);
        }
        return crypto.createHash('sha1')
            .update(status + timestamp + this.SECRET_KEY)
            .digest('hex');
    }
    // --- AUTHENTICATE ---
    static async handleAuthenticate(request) {
        console.log('[DEBUG][TOKEN_TRACE] handleAuthenticate request:', JSON.stringify(request));
        const { token, game_id } = request.data;
        if (!token) {
            console.log('[DEBUG][TOKEN_TRACE] handleAuthenticate response: missing token');
            return this.createErrorResponseWrapped(request, 'OP_21', 'Invalid token');
        }
        const user = await this.getUserByToken(token);
        if (!user) {
            console.log('[DEBUG][TOKEN_TRACE] handleAuthenticate response: session expired or token not found for token:', token);
            return this.createErrorResponseWrapped(request, 'OP_21', 'User not found or token expired');
        }
        console.log('[DEBUG][TOKEN_TRACE] handleAuthenticate user found:', user);
        const { country_code, country_name } = this.getCountryInfo(user.country);
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        let categoryBalance = null;
        let category = null;
        let resolvedGameId = game_id || user.token_game_id;
        let resolvedCategory = null;
        if (resolvedGameId) {
            // Get category for this game
            let game = await this.getGameById(resolvedGameId);
            // If game doesn't exist, create it automatically
            if (!game) {
                console.log(`[DEBUG] AUTHENTICATE: Game ${resolvedGameId} not found, creating automatically`);
                try {
                    let category = user.token_category || 'slots'; // default category
                    // Create the game automatically
                    const insertResult = await postgres_1.default.query(`INSERT INTO games (id, name, category, provider, vendor, is_active) 
             VALUES ($1, $2, $3, $4, $5, true) 
             ON CONFLICT (id) DO UPDATE SET 
               name = EXCLUDED.name, 
               category = EXCLUDED.category, 
               provider = EXCLUDED.provider, 
               vendor = EXCLUDED.vendor, 
               is_active = EXCLUDED.is_active
             RETURNING *`, [resolvedGameId, `Provider Game ${resolvedGameId}`, category, 'iconix', 'iconix']);
                    if (insertResult.rows.length > 0) {
                        game = insertResult.rows[0];
                        console.log(`[DEBUG] AUTHENTICATE: Created game ${resolvedGameId} with category ${category}`);
                    }
                }
                catch (error) {
                    console.error(`[ERROR] Failed to create game ${resolvedGameId}:`, error);
                }
            }
            if (game && game.category) {
                resolvedCategory = game.category;
            }
        }
        if (!resolvedCategory && user.token_category) {
            resolvedCategory = user.token_category;
        }
        // UNIFIED WALLET: Always use main balance from user_balances table
        // Category tracking is preserved in games.category and transactions.metadata for RTP/GGR analytics
        const mainBalanceResult = await postgres_1.default.query('SELECT balance FROM user_balances WHERE user_id = $1', [user.user_id]);
        categoryBalance = mainBalanceResult.rows.length ? currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0].balance) : 0;
        console.log(`[AUTHENTICATE][UNIFIED_WALLET] User ${user.user_id} main balance: ${this.formatCurrency(categoryBalance)} (category: ${resolvedCategory || 'N/A'})`);
        // Return wrapped response format (request + response) as required by provider validation
        return {
            request: {
                command: request.command,
                data: request.data,
                request_timestamp: request.request_timestamp,
                hash: request.hash
            },
            response: {
                status: 'OK',
                response_timestamp: timestamp,
                hash: this.generateResponseHash('OK', timestamp),
                data: {
                    user_id: user.user_id,
                    username: user.username,
                    user_name: user.username,
                    balance: parseFloat(categoryBalance.toFixed(2)),
                    currency: user.currency,
                    currency_code: user.currency,
                    country: user.country,
                    country_code,
                    country_name,
                    user_country: country_code,
                    language: user.language
                }
            }
        };
    }
    // --- BALANCE ---
    static async handleBalance(request) {
        const { token, game_id } = request.data;
        if (!token) {
            return this.createErrorResponseWrapped(request, 'OP_21', 'Invalid token');
        }
        const user = await this.getUserByToken(token);
        if (!user) {
            return this.createErrorResponseWrapped(request, 'OP_21', 'User not found or token expired');
        }
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        let categoryBalance = null;
        let resolvedGameId = game_id || user.token_game_id;
        let resolvedCategory = null;
        let finalBalance = 0;
        if (resolvedGameId) {
            // Get category for this game (BALANCE should work regardless of game status)
            let game = null;
            try {
                // Initialize MongoDB
                const { MongoService } = require("../mongo/mongo.service");
                await MongoService.initialize();
                // Get game info from MongoDB
                const gameDoc = await MongoService.getGamesCollection().findOne({ id: resolvedGameId });
                if (gameDoc) {
                    game = gameDoc;
                }
            }
            catch (error) {
                console.error(`[ERROR] Failed to get game ${resolvedGameId}:`, error);
            }
            // If game doesn't exist, create it automatically
            if (!game) {
                console.log(`[DEBUG] BALANCE: Game ${resolvedGameId} not found, creating automatically`);
                try {
                    let category = user.token_category || 'slots'; // default category
                    // Create the game automatically in MongoDB
                    const { MongoService } = require("../mongo/mongo.service");
                    await MongoService.initialize();
                    await MongoService.getGamesCollection().updateOne({ id: resolvedGameId }, {
                        $set: {
                            id: resolvedGameId,
                            name: `Provider Game ${resolvedGameId}`,
                            category: category,
                            provider: 'iconix',
                            vendor: 'iconix',
                            is_active: true,
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    }, { upsert: true });
                    game = {
                        id: resolvedGameId,
                        name: `Provider Game ${resolvedGameId}`,
                        category: category,
                        provider: 'iconix',
                        vendor: 'iconix',
                        is_active: true
                    };
                    console.log(`[DEBUG] BALANCE: Created game ${resolvedGameId} with category ${category}`);
                }
                catch (error) {
                    console.error(`[ERROR] Failed to create game ${resolvedGameId}:`, error);
                }
            }
            if (game && game.category) {
                resolvedCategory = game.category;
            }
        }
        if (!resolvedCategory && user.token_category) {
            resolvedCategory = user.token_category;
        }
        // UNIFIED WALLET: Always use main balance from PostgreSQL user_balances table
        // Category tracking is preserved in games.category and transactions.metadata for RTP/GGR analytics
        try {
            const mainBalanceResult = await postgres_1.default.query('SELECT balance FROM user_balances WHERE user_id = $1', [user.user_id]);
            finalBalance = mainBalanceResult.rows.length ? currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0].balance) : 0;
            console.log(`[BALANCE][UNIFIED_WALLET] User ${user.user_id} main balance: ${this.formatCurrency(finalBalance)} (category: ${resolvedCategory || 'N/A'})`);
        }
        catch (error) {
            console.error(`[ERROR] Failed to get main balance from PostgreSQL:`, error);
            finalBalance = 0;
        }
        return {
            request: {
                command: request.command,
                data: request.data,
                request_timestamp: request.request_timestamp,
                hash: request.hash
            },
            response: {
                status: 'OK',
                response_timestamp: timestamp,
                hash: this.generateResponseHash('OK', timestamp),
                data: {
                    balance: parseFloat(finalBalance.toFixed(2)),
                    currency_code: user.currency
                }
            }
        };
    }
    // --- CHANGEBALANCE (bet/win) ---
    static async handleChangeBalance(request) {
        console.log('CHANGEBALANCE request received:', JSON.stringify(request, null, 2));
        console.log('[CRITICAL DEBUG] handleChangeBalance method called - VERSION 2.0');
        try {
            // Handle both old and new provider formats
            const { token, user_id, amount, transaction_id, game_id, session_id, currency_code, transaction_type, // New field for provider format
            round_id, // New field for provider format
            round_finished, // New field for provider format
            context // Context object with game details, history_id, campaigns, etc.
             } = request.data;
            // Determine transaction type and amount based on provider format
            let transactionType = 'unknown';
            let parsedAmount = 0;
            if (transaction_type) {
                // New provider format: uses transaction_type field
                transactionType = transaction_type.toUpperCase();
                parsedAmount = this.parseAmount(amount);
                // Special handling for WIN transactions with 0 amount (losses in crash games)
                if (transactionType === 'WIN' && parsedAmount === 0) {
                    transactionType = 'LOSS';
                    console.log(`[DEBUG] CHANGEBALANCE: WIN transaction with 0 amount detected, treating as LOSS`);
                }
                else if (transactionType === 'BET') {
                    parsedAmount = -Math.abs(parsedAmount); // Make negative for bets
                }
                else if (transactionType === 'WIN') {
                    parsedAmount = Math.abs(parsedAmount); // Make positive for wins
                }
            }
            else {
                // Old provider format: uses amount sign
                parsedAmount = this.parseAmount(amount);
                if (parsedAmount < 0) {
                    transactionType = 'BET';
                }
                else if (parsedAmount > 0) {
                    transactionType = 'WIN';
                }
                else {
                    transactionType = 'ZERO';
                }
            }
            console.log(`[DEBUG] CHANGEBALANCE: Provider format - transaction_type: ${transaction_type}, amount: ${amount}, parsed: ${parsedAmount}, type: ${transactionType}`);
            // Log all received parameters for debugging
            console.log('CHANGEBALANCE parameters:', {
                token: token ? 'present' : 'missing',
                user_id: user_id ? 'present' : 'missing',
                amount: amount !== undefined ? `present (${this.formatCurrency(Math.abs(parsedAmount))})` : 'missing',
                transaction_type: transaction_type || 'not provided',
                transaction_id: transaction_id ? 'present' : 'missing',
                game_id: game_id ? 'present' : 'missing',
                session_id: session_id ? 'present' : 'missing',
                currency_code: currency_code ? 'present' : 'missing',
                round_id: round_id ? 'present' : 'missing',
                round_finished: round_finished !== undefined ? round_finished : 'not provided'
            });
            // Check for required parameters - token is not required for WIN transactions (including LOSS which is WIN with 0 amount)
            const missingParams = [];
            if (!user_id)
                missingParams.push('user_id');
            if (amount === undefined || amount === null)
                missingParams.push('amount');
            if (!transaction_id)
                missingParams.push('transaction_id');
            // game_id is optional - some providers don't send it
            // Only require token for non-WIN transactions (WIN and LOSS transactions don't require token)
            // Allow BET transactions without token so they can be properly rejected with OP_33 for disabled users
            if (!token && transactionType !== 'WIN' && transactionType !== 'LOSS' && transactionType !== 'BET') {
                missingParams.push('token');
            }
            if (missingParams.length > 0) {
                console.error('CHANGEBALANCE missing required parameters:', missingParams);
                return this.createErrorResponseWrapped(request, 'OP_21', `Missing required parameters: ${missingParams.join(', ')}`);
            }
            // Get user - for WIN/LOSS transactions without token, use user_id directly
            let user = null;
            if (token) {
                user = await this.getUserByToken(token);
                if (!user) {
                    console.error('CHANGEBALANCE user not found for token:', token);
                    return this.createErrorResponseWrapped(request, 'OP_21', 'User not found or token expired');
                }
            }
            else if ((transactionType === 'WIN' || transactionType === 'LOSS' || transactionType === 'BET') && user_id) {
                // For WIN/LOSS/BET transactions without token, get user directly by user_id
                const userResult = await postgres_1.default.query('SELECT u.id as user_id, u.username, u.status_id, s.name as status_name, up.currency FROM users u LEFT JOIN statuses s ON u.status_id = s.id LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = $1 LIMIT 1', [user_id]);
                if (userResult.rows.length > 0) {
                    user = userResult.rows[0];
                    // Set default currency if not found
                    if (!user.currency) {
                        user.currency = 'USD';
                    }
                    console.log(`[DEBUG] CHANGEBALANCE: ${transactionType} transaction - user found by user_id: ${user.user_id}, currency: ${user.currency}`);
                }
                else {
                    console.error('CHANGEBALANCE user not found for user_id:', user_id);
                    return this.createErrorResponseWrapped(request, 'OP_21', 'User not found');
                }
            }
            else {
                console.error('CHANGEBALANCE: No valid user identification provided');
                return this.createErrorResponseWrapped(request, 'OP_21', 'No valid user identification provided');
            }
            // --- USER STATUS VALIDATION: Check if user is disabled for BET/WIN transactions ---
            // For WIN/LOSS transactions without token, we need to get user status separately
            if (!user.status_name && user_id) {
                const userStatusResult = await postgres_1.default.query('SELECT u.status_id, s.name as status_name FROM users u LEFT JOIN statuses s ON u.status_id = s.id WHERE u.id = $1 LIMIT 1', [user_id]);
                if (userStatusResult.rows.length > 0) {
                    user.status_name = userStatusResult.rows[0].status_name;
                }
            }
            // Check if user is disabled for BET/WIN transactions
            // Allow WIN transactions for disabled users when no token is provided (using only user_id)
            if (user.status_name && user.status_name !== 'Active') {
                if (transactionType === 'WIN' && !token && user_id) {
                    // Allow WIN transactions for disabled users when using only user_id (no token)
                    console.log(`[USER_STATUS] User ${user.user_id} (${user.username}) is ${user.status_name}, but allowing WIN transaction without token`);
                }
                else {
                    // Reject BET transactions and WIN transactions with token for disabled users
                    console.log(`[USER_STATUS] User ${user.user_id} (${user.username}) is ${user.status_name}, rejecting ${transactionType} transaction`);
                    return this.createErrorResponseWrapped(request, 'OP_33', 'player blocked');
                }
            }
            // --- CAMPAIGN DETECTION: Check if this is a free spins campaign transaction ---
            if (context && context.campaign_code) {
                console.log(`[CAMPAIGN] Campaign transaction detected:`, {
                    campaign_code: context.campaign_code,
                    reason: context.reason,
                    campaign_details: context.campaign_details,
                    transaction_type: transactionType,
                    amount: parsedAmount
                });
                // Check campaign type and route to appropriate handler
                if (context.reason === 'PROMO-FREESPIN') {
                    // KYC Campaign
                    if (context.campaign_code === 'KYC_VERIFICATION_100_SPINS') {
                        const { updateCampaignUsage } = require('../campaign/kyc-freespins.service');
                        try {
                            // Extract campaign details
                            const remainingSpins = context.campaign_details?.remaining_spins || 0;
                            const totalSpins = context.campaign_details?.total_spins || 100;
                            const spinsUsed = totalSpins - remainingSpins;
                            // Calculate amounts based on transaction type
                            const betAmount = transactionType === 'BET' ? Math.abs(parsedAmount) : 0;
                            const winAmount = transactionType === 'WIN' ? Math.abs(parsedAmount) : 0;
                            console.log(`[CAMPAIGN] Updating KYC campaign usage:`, {
                                user_id: user.user_id,
                                spins_used: spinsUsed,
                                spins_remaining: remainingSpins,
                                bet_amount: betAmount,
                                win_amount: winAmount
                            });
                            // Update campaign usage
                            await updateCampaignUsage(user.user_id, context.campaign_code, {
                                spins_used: spinsUsed,
                                spins_remaining: remainingSpins,
                                bet_amount: betAmount,
                                win_amount: winAmount
                            });
                            console.log(`[CAMPAIGN] KYC campaign usage updated successfully`);
                        }
                        catch (error) {
                            console.error('[CAMPAIGN] Error updating KYC campaign usage:', error);
                            // Don't fail the transaction, just log the error
                        }
                    }
                    // Challenges/Loyalty Campaigns (campaign_code format: CHALLENGE_* or LOYALTY_*)
                    else if (context.campaign_code.startsWith('CHALLENGE_') || context.campaign_code.startsWith('LOYALTY_')) {
                        try {
                            // Extract campaign details
                            const remainingSpins = context.campaign_details?.remaining_spins || 0;
                            const totalSpins = context.campaign_details?.total_spins || 0;
                            const spinsUsed = totalSpins - remainingSpins;
                            // Calculate amounts based on transaction type
                            const betAmount = transactionType === 'BET' ? Math.abs(parsedAmount) : 0;
                            const winAmount = transactionType === 'WIN' ? Math.abs(parsedAmount) : 0;
                            console.log(`[CAMPAIGN] Updating Challenges/Loyalty campaign usage:`, {
                                campaign_code: context.campaign_code,
                                user_id: user.user_id,
                                spins_used: spinsUsed,
                                spins_remaining: remainingSpins,
                                bet_amount: betAmount,
                                win_amount: winAmount
                            });
                            // Update campaign in database
                            const pool = require('../../db/postgres').default;
                            const updateResult = await pool.query(`UPDATE user_free_spins_campaigns
                 SET freespins_used = $1,
                     freespins_remaining = $2,
                     total_bet_used = total_bet_used + $3,
                     total_win_amount = total_win_amount + $4,
                     status = CASE
                       WHEN $2 = 0 THEN 'completed'
                       WHEN status = 'pending' THEN 'active'
                       ELSE status
                     END,
                     activated_at = CASE
                       WHEN activated_at IS NULL THEN CURRENT_TIMESTAMP
                       ELSE activated_at
                     END,
                     completed_at = CASE
                       WHEN $2 = 0 AND completed_at IS NULL THEN CURRENT_TIMESTAMP
                       ELSE completed_at
                     END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE campaign_code = $5 AND user_id = $6
                 RETURNING *`, [spinsUsed, remainingSpins, betAmount, winAmount, context.campaign_code, user.user_id]);
                            if (updateResult.rowCount > 0) {
                                console.log(`[CAMPAIGN] Challenges/Loyalty campaign updated successfully:`, {
                                    campaign_code: context.campaign_code,
                                    status: updateResult.rows[0].status,
                                    spins_remaining: remainingSpins
                                });
                            }
                            else {
                                console.warn(`[CAMPAIGN] Campaign not found in database: ${context.campaign_code}`);
                            }
                        }
                        catch (error) {
                            console.error('[CAMPAIGN] Error updating Challenges/Loyalty campaign usage:', error);
                            // Don't fail the transaction, just log the error
                        }
                    }
                }
            }
            // --- CALLBACK FILTER: Verifică dacă ar trebui să raportăm acest callback către Innova ---
            console.log(`[FILTER] Checking if callback should be reported - round: ${round_id}, type: ${transactionType}, amount: ${Math.abs(parsedAmount)}`);
            const filterDecision = await (0, callback_filter_service_1.shouldReportCallback)(round_id || transaction_id, // folosește round_id sau transaction_id ca unique key
            transactionType, Math.abs(parsedAmount), user.user_id);
            console.log(`[FILTER] Decision:`, filterDecision);
            // Dacă filtrul a decis să ascundem acest callback
            if (!filterDecision.should_report && filterDecision.filter_applied) {
                console.log(`[FILTER] ⛔ Callback HIDDEN from provider - Reason: ${filterDecision.reason}`);
                // IMPORTANT: Procesăm tranzacția NORMAL în baza noastră de date
                // dar returnăm ERROR către Innova pentru a ascunde activitatea
                // 1. Procesăm tranzacția în baza noastră (jucătorul vede modificarea balanței)
                if (transactionType === 'BET') {
                    // Deduct balance for BET (chiar dacă Innova nu vede)
                    const betAmount = Math.abs(parsedAmount);
                    await postgres_1.default.query('UPDATE user_balances SET balance = balance - $1 WHERE user_id = $2', [betAmount, user.user_id]);
                    // Record transaction în baza noastră
                    const { MongoService } = require("../mongo/mongo.service");
                    await MongoService.initialize();
                    await MongoService.getTransactionsCollection().insertOne({
                        user_id: user.user_id,
                        type: 'bet',
                        amount: -betAmount,
                        external_reference: transaction_id,
                        status: 'completed',
                        metadata: {
                            game_id: game_id || 0,
                            round_id: round_id,
                            provider: 'iconix',
                            filtered: true, // MARKED as filtered
                            filter_reason: filterDecision.reason
                        },
                        created_at: new Date()
                    });
                    console.log(`[FILTER] BET processed internally but HIDDEN from provider (amount: ${this.formatCurrency(betAmount)})`);
                }
                else if (transactionType === 'WIN') {
                    // Add balance for WIN (chiar dacă Innova nu vede)
                    const winAmount = Math.abs(parsedAmount);
                    await postgres_1.default.query('UPDATE user_balances SET balance = balance + $1 WHERE user_id = $2', [winAmount, user.user_id]);
                    // Record transaction în baza noastră
                    const { MongoService } = require("../mongo/mongo.service");
                    await MongoService.initialize();
                    await MongoService.getTransactionsCollection().insertOne({
                        user_id: user.user_id,
                        type: 'win',
                        amount: winAmount,
                        external_reference: transaction_id,
                        status: 'completed',
                        metadata: {
                            game_id: game_id || 0,
                            round_id: round_id,
                            provider: 'iconix',
                            filtered: true, // MARKED as filtered
                            filter_reason: filterDecision.reason
                        },
                        created_at: new Date()
                    });
                    console.log(`[FILTER] WIN processed internally but HIDDEN from provider (amount: ${this.formatCurrency(winAmount)})`);
                }
                // 2. Returnăm SUCCESS către jocul jucătorului (pentru că am procesat deja tranzacția)
                // DAR nu trimitem confirmare validă către Innova (pentru a ascunde round-ul)
                const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                // Get current balance for response (jucătorul trebuie să vadă balanța corectă)
                const currentBalance = await this.getCurrentBalanceForResponse(user.user_id, 'slots');
                return {
                    request: {
                        command: request.command,
                        data: request.data,
                        request_timestamp: request.request_timestamp,
                        hash: request.hash
                    },
                    response: {
                        status: 'OK',
                        response_timestamp: timestamp,
                        hash: this.generateResponseHash('OK', timestamp),
                        data: {
                            balance: parseFloat(currentBalance.toFixed(2)),
                            currency_code: user.currency || 'USD',
                            transaction_id: transaction_id
                        }
                    }
                };
            }
            // Dacă ajungem aici, continuăm cu procesarea normală
            console.log(`[FILTER] ✅ Callback REPORTED to provider normally`);
            // --- GAME VALIDATION: Check if game is disabled FIRST (before any other processing) ---
            console.log(`[DEBUG] CHANGEBALANCE: Starting game validation - game_id: ${game_id}, transactionType: ${transactionType}`);
            let gameToValidate = game_id;
            // For WIN transactions without game_id, try to get game_id from original transaction
            if (!gameToValidate && transactionType === 'WIN' && transaction_id) {
                try {
                    const originalTransactionResult = await postgres_1.default.query('SELECT metadata FROM transactions WHERE external_reference = $1 AND user_id = $2 LIMIT 1', [transaction_id, user.user_id]);
                    if (originalTransactionResult.rows.length > 0) {
                        const metadata = originalTransactionResult.rows[0].metadata;
                        if (metadata && typeof metadata === 'object' && metadata.game_id) {
                            gameToValidate = metadata.game_id;
                            console.log(`[DEBUG] CHANGEBALANCE: WIN transaction - extracted game_id ${gameToValidate} from original transaction metadata`);
                        }
                    }
                }
                catch (error) {
                    console.log(`[DEBUG] CHANGEBALANCE: Could not extract game_id from original transaction: ${error.message}`);
                }
            }
            if (gameToValidate) {
                console.log(`[DEBUG] CHANGEBALANCE: Validating game ${gameToValidate}`);
                try {
                    const game = await this.getGameById(gameToValidate);
                    if (!game) {
                        console.log(`[DEBUG] CHANGEBALANCE: Game ${gameToValidate} not found, creating automatically`);
                        try {
                            // Try to get category from token first (if token exists)
                            let category = 'slots'; // default category
                            if (token) {
                                const tokenResult = await postgres_1.default.query('SELECT category FROM tokens WHERE access_token = $1 LIMIT 1', [token]);
                                if (tokenResult.rows.length > 0 && tokenResult.rows[0].category) {
                                    category = tokenResult.rows[0].category;
                                }
                            }
                            // Create the game automatically
                            const insertResult = await postgres_1.default.query(`INSERT INTO games (id, name, category, provider, vendor, is_active) 
                 VALUES ($1, $2, $3, $4, $5, true) 
                 ON CONFLICT (id) DO UPDATE SET 
                   name = EXCLUDED.name, 
                   category = EXCLUDED.category, 
                   provider = EXCLUDED.provider, 
                   vendor = EXCLUDED.vendor, 
                   is_active = EXCLUDED.is_active
                 RETURNING *`, [gameToValidate, `Provider Game ${gameToValidate}`, category, 'iconix', 'iconix']);
                            if (insertResult.rows.length > 0) {
                                console.log(`[DEBUG] CHANGEBALANCE: Created game ${gameToValidate} with category ${category}`);
                            }
                        }
                        catch (error) {
                            console.error(`[ERROR] Failed to create game ${gameToValidate}:`, error);
                            // Don't fail the request, just log the error
                        }
                    }
                }
                catch (error) {
                    if (error.message === 'OP_35: Game is disabled') {
                        console.log(`[GAME_STATUS] BET/WIN transaction rejected for disabled game ${gameToValidate}`);
                        return this.createErrorResponseWrapped(request, 'OP_35', 'Game is disabled');
                    }
                    throw error;
                }
            }
            // --- Get category balance for response (needed for both idempotency and normal processing) ---
            let resolvedCategory = null;
            let game = null;
            if (gameToValidate) {
                // Get game info for category resolution (game validation already done above)
                const gameResult = await postgres_1.default.query("SELECT * FROM games WHERE id = $1", [gameToValidate]);
                if (gameResult.rows.length > 0) {
                    game = gameResult.rows[0];
                }
            }
            // If no game_id provided or game creation failed, use token category or default
            if (!game || !game.category) {
                console.log(`[DEBUG] CHANGEBALANCE: No game_id provided or game not found, resolving category`);
                if (token) {
                    // Try to get category from token
                    const tokenResult = await postgres_1.default.query('SELECT category FROM tokens WHERE access_token = $1 LIMIT 1', [token]);
                    if (tokenResult.rows.length > 0 && tokenResult.rows[0].category) {
                        resolvedCategory = tokenResult.rows[0].category;
                        console.log(`[DEBUG] CHANGEBALANCE: Using category from token: ${resolvedCategory}`);
                    }
                    else {
                        resolvedCategory = 'slots'; // fallback category
                        console.log(`[DEBUG] CHANGEBALANCE: Using fallback category: ${resolvedCategory}`);
                    }
                }
                else if (transactionType === 'WIN') {
                    // For WIN transactions without token, use default category
                    resolvedCategory = 'slots'; // default category for WIN transactions
                    console.log(`[DEBUG] CHANGEBALANCE: WIN transaction without token, using default category: ${resolvedCategory}`);
                }
                else {
                    resolvedCategory = 'slots'; // fallback category
                    console.log(`[DEBUG] CHANGEBALANCE: Using fallback category: ${resolvedCategory}`);
                }
            }
            else if (game && game.category) {
                resolvedCategory = game.category;
            }
            if (!resolvedCategory) {
                console.error(`[ERROR] CHANGEBALANCE: No category found for game ${game_id}`);
                return this.createErrorResponseWrapped(request, 'OP_21', 'Game category not found');
            }
            // UNIFIED WALLET: Category is used only for RTP tracking metadata
            const category = resolvedCategory.toLowerCase().trim();
            console.log(`[DEBUG] CHANGEBALANCE: Game category for RTP tracking: ${category}`);
            // --- ENHANCED IDEMPOTENCY CHECK: Check for duplicate transactions ---
            console.log(`[IDEMPOTENCY] Checking for duplicate transactions for user ${user.user_id}`);
            // Check for exact transaction match
            let existingTransaction = null;
            try {
                const { MongoService } = require("../mongo/mongo.service");
                await MongoService.initialize();
                existingTransaction = await MongoService.getTransactionsCollection().findOne({ external_reference: transaction_id, user_id: user.user_id });
            }
            catch (error) {
                console.error(`[ERROR] Failed to check for existing transaction in MongoDB:`, error);
                existingTransaction = null;
            }
            // Check for recent duplicate transactions (within 5 seconds) - both bet and win
            try {
                const { MongoService } = require("../mongo/mongo.service");
                await MongoService.initialize();
                const fiveSecondsAgo = new Date(Date.now() - 5000);
                const recentDuplicateCheck = await MongoService.getTransactionsCollection().find({
                    user_id: user.user_id,
                    type: { $in: ['bet', 'win'] },
                    amount: Math.abs(parsedAmount),
                    'metadata.game_id': gameToValidate ? gameToValidate.toString() : '0',
                    created_at: { $gte: fiveSecondsAgo }
                }).sort({ created_at: -1 }).limit(5).toArray();
                console.log(`[IDEMPOTENCY] Found ${recentDuplicateCheck.length} recent transactions with same amount`);
                // If we have multiple recent transactions with same amount, check for duplicates
                if (recentDuplicateCheck.length > 1) {
                    console.log(`[DUPLICATE_DETECTION] Potential duplicate transactions detected:`);
                    recentDuplicateCheck.forEach((tx, index) => {
                        console.log(`  ${index + 1}. ID: ${tx.id}, Type: ${tx.type}, Amount: ${tx.amount}, Created: ${tx.created_at}, Ref: ${tx.external_reference}`);
                    });
                    // If this is a bet or win and we have recent duplicates, return the latest balance
                    if (transactionType === 'BET' || transactionType === 'WIN' || parsedAmount < 0) {
                        console.log(`[DUPLICATE_DETECTION] Duplicate ${transactionType} detected, checking game status before returning balance`);
                        // CRITICAL FIX: Check if game is disabled even for duplicate bets
                        // This ensures that retries of old transactions on now-disabled games return OP_35
                        if (gameToValidate) {
                            try {
                                const game = await this.getGameById(gameToValidate);
                                if (!game) {
                                    console.log(`[DEBUG] DUPLICATE_DETECTION: Game ${gameToValidate} not found during retry`);
                                }
                            }
                            catch (error) {
                                if (error.message === 'OP_35: Game is disabled') {
                                    console.log(`[GAME_STATUS] Retry of duplicate bet rejected for disabled game ${gameToValidate}`);
                                    return this.createErrorResponseWrapped(request, 'OP_35', 'Game is disabled');
                                }
                                throw error;
                            }
                        }
                        const currentBalance = await this.getCurrentBalanceForResponse(user.user_id, category);
                        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                        return {
                            request: {
                                command: request.command,
                                data: request.data,
                                request_timestamp: request.request_timestamp,
                                hash: request.hash
                            },
                            response: {
                                status: 'OK',
                                response_timestamp: timestamp,
                                hash: this.generateResponseHash('OK', timestamp),
                                data: {
                                    transaction_id: transaction_id,
                                    status: 'OK',
                                    balance: currentBalance,
                                    currency_code: user.currency
                                }
                            }
                        };
                    }
                }
            }
            catch (error) {
                console.error(`[ERROR] Failed to check for duplicate transactions in MongoDB:`, error);
                // Continue with processing if duplicate check fails
            }
            if (existingTransaction) {
                console.log(`[IDEMPOTENCY] Transaction ${transaction_id} already exists:`, {
                    transaction_id: existingTransaction.id,
                    type: existingTransaction.type,
                    amount: existingTransaction.amount,
                    status: existingTransaction.status
                });
                // CRITICAL FIX: Check if game is disabled even for existing transactions
                // This ensures that retries of old transactions on now-disabled games return OP_35
                if (gameToValidate) {
                    try {
                        const game = await this.getGameById(gameToValidate);
                        if (!game) {
                            console.log(`[DEBUG] IDEMPOTENCY: Game ${gameToValidate} not found during retry`);
                        }
                    }
                    catch (error) {
                        if (error.message === 'OP_35: Game is disabled') {
                            console.log(`[GAME_STATUS] Retry of transaction ${transaction_id} rejected for disabled game ${gameToValidate}`);
                            return this.createErrorResponseWrapped(request, 'OP_35', 'Game is disabled');
                        }
                        throw error;
                    }
                }
                // Get the correct current balance for idempotency response (ALWAYS use this method!)
                const currentBalance = await this.getCurrentBalanceForResponse(user.user_id, category);
                console.log(`[IDEMPOTENCY] Returning current balance for duplicate transaction: ${this.formatCurrency(currentBalance)}`);
                // Return success response for idempotency - same transaction processed multiple times
                const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                return {
                    request: {
                        command: request.command,
                        data: request.data,
                        request_timestamp: request.request_timestamp,
                        hash: request.hash
                    },
                    response: {
                        status: 'OK',
                        response_timestamp: timestamp,
                        hash: this.generateResponseHash('OK', timestamp),
                        data: {
                            transaction_id: transaction_id,
                            status: 'OK',
                            balance: currentBalance,
                            currency_code: user.currency
                        }
                    }
                };
            }
            console.log(`[IDEMPOTENCY] Transaction ${transaction_id} is new, proceeding with processing`);
            // --- Enhanced balance validation and processing ---
            console.log(`[DEBUG] CHANGEBALANCE: Game ${game_id} (${game ? game.name : 'N/A'}) has category: ${category}`);
            // Initialize balance variables at function scope
            let currentCategoryBalance = 0;
            let newCategoryBalance = 0;
            if (transactionType === 'BET' || parsedAmount < 0) {
                // Bet: validate and process with unified wallet
                const betAmount = Math.abs(parsedAmount);
                console.log(`[DEBUG] CHANGEBALANCE: Processing bet of ${this.formatCurrency(betAmount)}`);
                // UNIFIED WALLET: Get balance from PostgreSQL user_balances table
                try {
                    const balanceResult = await postgres_1.default.query('SELECT balance FROM user_balances WHERE user_id = $1', [user.user_id]);
                    if (balanceResult.rows.length === 0) {
                        console.error(`[ERROR] CHANGEBALANCE: User balance not found for user_id: ${user.user_id}`);
                        return this.createErrorResponseWrapped(request, 'OP_21', 'User balance not found');
                    }
                    currentCategoryBalance = parseFloat(balanceResult.rows[0].balance);
                    console.log(`[DEBUG] CHANGEBALANCE: Current unified wallet balance: ${this.formatCurrency(currentCategoryBalance)}`);
                    if (currentCategoryBalance < betAmount) {
                        console.error(`[ERROR] CHANGEBALANCE: Insufficient balance. Available: ${this.formatCurrency(currentCategoryBalance)}, Required: ${this.formatCurrency(betAmount)}`);
                        return this.createErrorResponseWrapped(request, 'OP_31', `Insufficient balance. Available: ${this.formatCurrency(currentCategoryBalance)}, Required: ${this.formatCurrency(betAmount)}`);
                    }
                }
                catch (error) {
                    console.error(`[ERROR] CHANGEBALANCE: Failed to get balance from PostgreSQL:`, error);
                    return this.createErrorResponseWrapped(request, 'OP_21', 'Failed to retrieve balance');
                }
                console.log(`[DEBUG] CHANGEBALANCE: Balance validation passed. Available: ${this.formatCurrency(currentCategoryBalance)}, Required: ${this.formatCurrency(betAmount)}`);
                // Calculate new balance for transaction
                newCategoryBalance = currentCategoryBalance - betAmount;
            }
            else if (transactionType === 'WIN' || parsedAmount > 0) {
                // Win: add to unified wallet balance
                console.log(`[DEBUG] CHANGEBALANCE: Processing win of ${this.formatCurrency(parsedAmount)}`);
                // UNIFIED WALLET: Get balance from PostgreSQL user_balances table
                try {
                    const balanceResult = await postgres_1.default.query('SELECT balance FROM user_balances WHERE user_id = $1', [user.user_id]);
                    if (balanceResult.rows.length === 0) {
                        console.error(`[ERROR] CHANGEBALANCE: User balance not found for user_id: ${user.user_id}`);
                        currentCategoryBalance = 0;
                    }
                    else {
                        currentCategoryBalance = parseFloat(balanceResult.rows[0].balance);
                    }
                    console.log(`[DEBUG] CHANGEBALANCE: Current unified wallet balance for win: ${this.formatCurrency(currentCategoryBalance)}`);
                }
                catch (error) {
                    console.error(`[ERROR] CHANGEBALANCE: Failed to get balance from PostgreSQL for win:`, error);
                    currentCategoryBalance = 0;
                }
                // Calculate new balance for win
                newCategoryBalance = currentCategoryBalance + parsedAmount;
            }
            else {
                // Zero amount or unknown type
                console.log(`[DEBUG] CHANGEBALANCE: Processing zero amount or unknown type: ${transactionType}`);
            }
            // --- Continue with transaction logging and bet record as before ---
            let betId = null;
            let type = '';
            let description = '';
            let transactionResult = null;
            try {
                if (transactionType === 'BET' || parsedAmount < 0) {
                    type = 'bet';
                    description = 'Provider bet';
                    // Track bet for profit calculations
                    const betAmount = Math.abs(parsedAmount);
                    const providerRtp = game ? game.rtp_percentage : 96;
                    console.log(`[PROFIT_CONTROL] Processing bet: ${this.formatCurrency(betAmount)}, Provider RTP: ${providerRtp}%`);
                    // ENHANCED DUPLICATE DETECTION FOR BETS
                    const isDuplicate = await this.detectDuplicateBet(user.user_id, betAmount, game_id, session_id);
                    if (isDuplicate) {
                        console.log(`[DUPLICATE_DETECTION] Duplicate bet detected, skipping processing and returning current balance`);
                        const currentBalance = await this.getCurrentBalanceForResponse(user.user_id, category);
                        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                        return {
                            request: {
                                command: request.command,
                                data: request.data,
                                request_timestamp: request.request_timestamp,
                                hash: request.hash
                            },
                            response: {
                                status: 'OK',
                                response_timestamp: timestamp,
                                hash: this.generateResponseHash('OK', timestamp),
                                data: {
                                    transaction_id: transaction_id,
                                    status: 'OK',
                                    balance: currentBalance,
                                    currency_code: user.currency
                                }
                            }
                        };
                    }
                    // Track bet amount for profit calculations (no adjustment for bets)
                    await profit_control_service_1.ProfitControlService.applyHiddenProfitControl(betAmount, 'bet', game_id, user.user_id, providerRtp);
                    // Process bet transaction with unified wallet balance update
                    console.log(`[UNIFIED_WALLET] Processing bet with unified wallet balance: ${this.formatCurrency(betAmount)}`);
                    // Insert bet transaction with category metadata (for RTP tracking)
                    const transactionResult = await this.insertTransaction({
                        user_id: user.user_id,
                        type: 'bet',
                        amount: betAmount,
                        balance_before: currentCategoryBalance,
                        balance_after: newCategoryBalance,
                        currency: user.currency,
                        external_reference: transaction_id,
                        description: description,
                        metadata: {
                            game_id,
                            session_id,
                            provider_transaction_id: transaction_id,
                            category,
                            round_id,
                            round_finished,
                            transaction_type: transactionType
                        }
                    });
                    // UNIFIED WALLET: Update main balance in PostgreSQL
                    try {
                        const updateResult = await postgres_1.default.query('UPDATE user_balances SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING balance', [betAmount, user.user_id]);
                        if (updateResult.rows.length > 0) {
                            const actualBalanceAfter = parseFloat(updateResult.rows[0].balance);
                            console.log(`[UNIFIED_WALLET] Balance updated: ${this.formatCurrency(currentCategoryBalance)} - ${this.formatCurrency(betAmount)} = ${this.formatCurrency(actualBalanceAfter)}`);
                        }
                    }
                    catch (error) {
                        console.error(`[ERROR] Failed to update balance in PostgreSQL:`, error);
                        throw error;
                    }
                    betId = await this.insertBet({
                        user_id: user.user_id,
                        game_id,
                        bet_amount: betAmount,
                        session_id,
                        transaction_id: transactionResult
                    });
                    // INSERT transaction into PostgreSQL transactions table FIRST (for foreign key)
                    let pgTransactionId = null;
                    try {
                        const pgTransactionResult = await postgres_1.default.query(`INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, currency, external_reference, description, metadata, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               RETURNING id`, [
                            user.user_id,
                            'bet',
                            -betAmount, // Negative for bet
                            currentCategoryBalance,
                            newCategoryBalance,
                            user.currency,
                            transaction_id,
                            description,
                            JSON.stringify({ game_id, session_id, provider_transaction_id: transaction_id, category, round_id, round_finished, transaction_type: transactionType }),
                            'completed'
                        ]);
                        pgTransactionId = pgTransactionResult.rows[0].id;
                        console.log(`[BET_TRACKING] Inserted transaction into PostgreSQL: transaction_id=${pgTransactionId}`);
                    }
                    catch (error) {
                        console.error(`[ERROR] Failed to insert transaction into PostgreSQL transactions table:`, error);
                    }
                    // INSERT bet into PostgreSQL bets table for CRM tracking (ONLY if transaction was inserted)
                    if (pgTransactionId) {
                        try {
                            const betInsertResult = await postgres_1.default.query(`INSERT INTO bets (user_id, game_id, transaction_id, bet_amount, win_amount, multiplier, outcome, session_id, round_id, game_data)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`, [user.user_id, game_id, pgTransactionId, betAmount, 0, 0, 'pending', session_id, round_id, JSON.stringify(context || {})]);
                            console.log(`[BET_TRACKING] Inserted bet into PostgreSQL: bet_id=${betInsertResult.rows[0].id}, user_id=${user.user_id}, game_id=${game_id}, bet_amount=${this.formatCurrency(betAmount)}, round_id=${round_id}, context=${context ? 'YES' : 'NO'}`);
                        }
                        catch (error) {
                            console.error(`[ERROR] Failed to insert bet into PostgreSQL bets table:`, error);
                        }
                    }
                    const bet_id = betId;
                    console.log('CHANGEBALANCE bet processed:', {
                        bet_id,
                        transaction_id: transactionResult,
                        balance_before: this.formatCurrency(currentCategoryBalance),
                        balance_after: this.formatCurrency(newCategoryBalance),
                        bet_amount: this.formatCurrency(betAmount)
                    });
                    // Log balance update for audit
                    console.log(`[BALANCE_AUDIT] Bet processed - Category: ${category}, Balance: ${currentCategoryBalance} -> ${newCategoryBalance}`);
                }
                else if (transactionType === 'WIN' || parsedAmount > 0) {
                    type = 'win';
                    description = 'Provider win';
                    // Apply hidden profit control to win amount
                    const originalWinAmount = parsedAmount;
                    const providerRtp = game ? game.rtp_percentage : 96;
                    console.log(`[PROFIT_CONTROL] Processing win: ${this.formatCurrency(originalWinAmount)}, Provider RTP: ${providerRtp}%`);
                    const profitControl = await profit_control_service_1.ProfitControlService.applyHiddenProfitControl(originalWinAmount, 'win', game_id, user.user_id, providerRtp);
                    console.log(`[PROFIT_CONTROL] Win adjustment: ${this.formatCurrency(originalWinAmount)} → ${this.formatCurrency(profitControl.adjustedAmount)} (reduction: ${this.formatCurrency(profitControl.profitReduction)})`);
                    // Try to find the bet using session_id first, then fallback to round_id, then most recent bet
                    try {
                        const { MongoService } = require("../mongo/mongo.service");
                        await MongoService.initialize();
                        let betDoc = null;
                        // First try to find bet with session_id (if session_id is provided)
                        if (session_id) {
                            betDoc = await MongoService.getBetsCollection().findOne({ user_id: user.user_id, game_id: game_id, session_id: session_id }, { sort: { created_at: -1 } });
                            console.log(`[DEBUG] Looking for bet with session_id: ${session_id}`);
                        }
                        // If no bet found with session_id, try to find bet by matching transaction metadata
                        if (!betDoc && round_id) {
                            console.log(`[DEBUG] No bet found with session_id ${session_id}, looking for bet with round_id ${round_id}`);
                            // Find the bet transaction that matches this round_id
                            const betTransaction = await MongoService.getTransactionsCollection().findOne({
                                user_id: user.user_id,
                                game_id: game_id,
                                type: 'bet',
                                'metadata.round_id': round_id
                            }, { sort: { created_at: -1 } });
                            if (betTransaction) {
                                console.log(`[DEBUG] Found bet transaction with round_id ${round_id}, transaction_id: ${betTransaction.id}`);
                                // Find the bet record that corresponds to this transaction
                                betDoc = await MongoService.getBetsCollection().findOne({ 'transaction_id.id': betTransaction.id }, { sort: { created_at: -1 } });
                            }
                        }
                        // If still no bet found, try to find the most recent bet for this game
                        if (!betDoc) {
                            console.log(`[DEBUG] No bet found with round_id ${round_id}, looking for most recent bet for game ${game_id}`);
                            betDoc = await MongoService.getBetsCollection().findOne({ user_id: user.user_id, game_id: game_id }, { sort: { created_at: -1 } });
                        }
                        if (betDoc) {
                            betId = betDoc.id;
                        }
                    }
                    catch (error) {
                        console.error(`[ERROR] Failed to find bet in MongoDB:`, error);
                    }
                    if (betId) {
                        await this.updateBetWin({ bet_id: betId, win_amount: profitControl.adjustedAmount });
                        console.log(`[DEBUG] Updated bet ${betId} with adjusted win amount ${profitControl.adjustedAmount}`);
                    }
                    else {
                        console.log(`[WARNING] No bet found for user ${user.user_id}, game ${game_id}, session ${session_id}, round ${round_id}`);
                    }
                    // UPDATE bet in PostgreSQL bets table with win amount for CRM tracking
                    try {
                        const winOutcome = profitControl.adjustedAmount > 0 ? 'win' : 'lose';
                        // Find the pending bet to get bet_amount for multiplier calculation
                        // Try to match by round_id first (most accurate), then fall back to session_id
                        const betResult = await postgres_1.default.query(`SELECT id, bet_amount FROM bets
               WHERE user_id = $1
                 AND game_id = $2
                 AND (
                   (round_id = $3 AND $3 IS NOT NULL) OR
                   (session_id = $4 OR ($4 IS NULL AND session_id IS NULL))
                 )
                 AND outcome = 'pending'
               ORDER BY placed_at DESC
               LIMIT 1`, [user.user_id, game_id, round_id, session_id]);
                        if (betResult.rows.length > 0) {
                            const originalBetAmount = parseFloat(betResult.rows[0].bet_amount);
                            const multiplier = originalBetAmount > 0 ? profitControl.adjustedAmount / originalBetAmount : 0;
                            // Merge existing game_data with win context if available
                            const updateResult = await postgres_1.default.query(`UPDATE bets
                 SET win_amount = $1,
                     multiplier = $2,
                     outcome = $3,
                     result_at = CURRENT_TIMESTAMP,
                     game_data = CASE
                       WHEN $5::jsonb IS NOT NULL AND jsonb_typeof($5::jsonb) = 'object' THEN
                         COALESCE(game_data, '{}'::jsonb) || $5::jsonb
                       ELSE game_data
                     END
                 WHERE id = $4
                 RETURNING id`, [profitControl.adjustedAmount, multiplier, winOutcome, betResult.rows[0].id, context ? JSON.stringify(context) : null]);
                            console.log(`[BET_TRACKING] Updated bet in PostgreSQL: bet_id=${updateResult.rows[0].id}, bet_amount=${this.formatCurrency(originalBetAmount)}, win_amount=${this.formatCurrency(profitControl.adjustedAmount)}, outcome=${winOutcome}, multiplier=${multiplier.toFixed(2)}x, win_context=${context ? 'YES' : 'NO'}`);
                        }
                        else {
                            console.log(`[BET_TRACKING] No pending bet found to update for user_id=${user.user_id}, game_id=${game_id}, session_id=${session_id}`);
                        }
                    }
                    catch (error) {
                        console.error(`[ERROR] Failed to update bet in PostgreSQL bets table:`, error);
                    }
                    // Process win transaction with unified wallet balance update
                    console.log(`[UNIFIED_WALLET] Processing win with unified wallet balance: ${this.formatCurrency(profitControl.adjustedAmount)}`);
                    // UNIFIED WALLET: Get current balance from PostgreSQL
                    let currentCategoryBalance = 0;
                    try {
                        const balanceResult = await postgres_1.default.query('SELECT balance FROM user_balances WHERE user_id = $1', [user.user_id]);
                        if (balanceResult.rows.length === 0) {
                            console.error(`[ERROR] WIN: User balance not found for user_id: ${user.user_id}`);
                            currentCategoryBalance = 0;
                        }
                        else {
                            currentCategoryBalance = parseFloat(balanceResult.rows[0].balance);
                        }
                        console.log(`[DEBUG] WIN: Current unified wallet balance: ${this.formatCurrency(currentCategoryBalance)}`);
                    }
                    catch (error) {
                        console.error(`[ERROR] Failed to get balance from PostgreSQL for WIN:`, error);
                        currentCategoryBalance = 0;
                    }
                    const newCategoryBalance = currentCategoryBalance + profitControl.adjustedAmount;
                    console.log(`[UNIFIED_WALLET] Balance calculation: ${this.formatCurrency(currentCategoryBalance)} + ${this.formatCurrency(profitControl.adjustedAmount)} = ${this.formatCurrency(newCategoryBalance)}`);
                    // Insert win transaction with category metadata (for RTP tracking)
                    const transactionResult = await this.insertTransaction({
                        user_id: user.user_id,
                        type: 'win',
                        amount: profitControl.adjustedAmount,
                        balance_before: currentCategoryBalance,
                        balance_after: newCategoryBalance,
                        currency: user.currency,
                        external_reference: transaction_id,
                        description: description,
                        metadata: {
                            game_id,
                            session_id,
                            provider_transaction_id: transaction_id,
                            category,
                            round_id,
                            round_finished,
                            transaction_type: transactionType,
                            original_win_amount: parsedAmount,
                            profit_reduction: profitControl.profitReduction
                        }
                    });
                    // INSERT WIN transaction into PostgreSQL transactions table
                    let pgWinTransactionId = null;
                    try {
                        const pgWinTransactionResult = await postgres_1.default.query(`INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, currency, external_reference, description, metadata, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
               RETURNING id`, [
                            user.user_id,
                            'win',
                            profitControl.adjustedAmount, // Positive for win
                            currentCategoryBalance,
                            newCategoryBalance,
                            user.currency,
                            transaction_id,
                            description,
                            JSON.stringify({
                                game_id,
                                session_id,
                                provider_transaction_id: transaction_id,
                                category,
                                round_id,
                                round_finished,
                                transaction_type: transactionType,
                                original_win_amount: parsedAmount,
                                profit_reduction: profitControl.profitReduction
                            }),
                            'completed'
                        ]);
                        pgWinTransactionId = pgWinTransactionResult.rows[0].id;
                        console.log(`[WIN_TRACKING] Inserted WIN transaction into PostgreSQL: transaction_id=${pgWinTransactionId}, win_amount=${this.formatCurrency(profitControl.adjustedAmount)}, profit_hidden=${this.formatCurrency(profitControl.profitReduction)}`);
                    }
                    catch (error) {
                        console.error(`[ERROR] Failed to insert WIN transaction into PostgreSQL transactions table:`, error);
                    }
                    // UNIFIED WALLET: Update main balance in PostgreSQL
                    try {
                        const updateResult = await postgres_1.default.query('UPDATE user_balances SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING balance', [profitControl.adjustedAmount, user.user_id]);
                        if (updateResult.rows.length > 0) {
                            const actualBalanceAfter = parseFloat(updateResult.rows[0].balance);
                            console.log(`[UNIFIED_WALLET] Balance updated: ${this.formatCurrency(currentCategoryBalance)} + ${this.formatCurrency(profitControl.adjustedAmount)} = ${this.formatCurrency(actualBalanceAfter)}`);
                        }
                    }
                    catch (error) {
                        console.error(`[ERROR] Failed to update balance in PostgreSQL:`, error);
                        throw error;
                    }
                    console.log('CHANGEBALANCE win processed:', {
                        bet_id: betId,
                        transaction_id: transactionResult,
                        pg_transaction_id: pgWinTransactionId,
                        balance_before: this.formatCurrency(currentCategoryBalance),
                        balance_after: this.formatCurrency(newCategoryBalance),
                        win_amount: this.formatCurrency(profitControl.adjustedAmount),
                        rtp_reduction: this.formatCurrency(profitControl.profitReduction)
                    });
                    // Log balance update for audit
                    console.log(`[BALANCE_AUDIT] Win processed - Category: ${category}, Balance: ${this.formatCurrency(currentCategoryBalance)} -> ${this.formatCurrency(newCategoryBalance)}`);
                }
                else if (transactionType === 'LOSS') {
                    // LOSS transaction type (WIN with 0 amount from crash games)
                    type = 'loss';
                    description = 'Provider loss (crash game)';
                    console.log(`[DEBUG] CHANGEBALANCE: Processing LOSS transaction for crash game`);
                    // Try to find the bet using session_id first, then fallback to round_id, then most recent bet
                    let betRes = await postgres_1.default.query(`SELECT id FROM bets WHERE user_id = $1 AND game_id = $2 AND session_id = $3 ORDER BY placed_at DESC LIMIT 1`, [user.user_id, game_id, session_id]);
                    // If no bet found with session_id, try to find the bet with same round_id
                    if (betRes.rows.length === 0) {
                        console.log(`[DEBUG] No bet found with session_id ${session_id}, looking for bet with same round_id ${round_id}`);
                        betRes = await postgres_1.default.query(`SELECT b.id FROM bets b 
               JOIN transactions t ON b.transaction_id = t.id 
               WHERE b.user_id = $1 AND b.game_id = $2 
               AND t.metadata::jsonb->>'round_id' = $3 
               ORDER BY b.placed_at DESC LIMIT 1`, [user.user_id, game_id, round_id]);
                    }
                    // If still no bet found, try to find the most recent bet for this game
                    if (betRes.rows.length === 0) {
                        console.log(`[DEBUG] No bet found with round_id ${round_id}, looking for most recent bet for game ${game_id}`);
                        betRes = await postgres_1.default.query(`SELECT id FROM bets WHERE user_id = $1 AND game_id = $2 ORDER BY placed_at DESC LIMIT 1`, [user.user_id, game_id]);
                    }
                    if (betRes.rows.length > 0) {
                        betId = betRes.rows[0].id;
                        await this.updateBetLose({ bet_id: betId });
                        console.log(`[DEBUG] Updated bet ${betId} with loss (crash game)`);
                    }
                    else {
                        console.log(`[WARNING] No pending bet found for user ${user.user_id}, game ${game_id}, session ${session_id}`);
                    }
                    // No transaction needed for loss since bet amount was already deducted when bet was placed
                    console.log('CHANGEBALANCE loss processed:', { bet_id: betId });
                }
                else if (amount === 0) {
                    // Zero amount typically indicates a loss (bet was placed but no winnings)
                    type = 'loss';
                    description = 'Provider loss (zero amount)';
                    // Try to find the bet using session_id first, then fallback to most recent pending bet
                    let betRes = await postgres_1.default.query(`SELECT id FROM bets WHERE user_id = $1 AND game_id = $2 AND session_id = $3 ORDER BY placed_at DESC LIMIT 1`, [user.user_id, game_id, session_id]);
                    // If no bet found with session_id, try to find the most recent pending bet for this game
                    if (betRes.rows.length === 0) {
                        console.log(`[DEBUG] No bet found with session_id ${session_id}, looking for most recent pending bet`);
                        betRes = await postgres_1.default.query(`SELECT id FROM bets WHERE user_id = $1 AND game_id = $2 AND outcome = 'pending' ORDER BY placed_at DESC LIMIT 1`, [user.user_id, game_id]);
                    }
                    if (betRes.rows.length > 0) {
                        betId = betRes.rows[0].id;
                        await this.updateBetLose({ bet_id: betId });
                        console.log(`[DEBUG] Updated bet ${betId} with loss (zero amount)`);
                    }
                    else {
                        console.log(`[WARNING] No pending bet found for user ${user.user_id}, game ${game_id}, session ${session_id}`);
                    }
                    // No transaction needed for loss since bet amount was already deducted when bet was placed
                    console.log('CHANGEBALANCE loss processed:', { bet_id: betId });
                }
            }
            catch (error) {
                console.error('[CHANGEBALANCE] Critical error during transaction processing:', error);
                return this.createErrorResponseWrapped(request, 'OP_21', 'Internal server error during transaction processing');
            }
            // Get the correct current balance for response (ALWAYS use this method!)
            const finalBalance = await this.getCurrentBalanceForResponse(user.user_id, category);
            // Return success response with correct updated balance
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            return {
                request: {
                    command: request.command,
                    data: request.data,
                    request_timestamp: request.request_timestamp,
                    hash: request.hash
                },
                response: {
                    status: 'OK',
                    response_timestamp: timestamp,
                    hash: this.generateResponseHash('OK', timestamp),
                    data: {
                        transaction_id: transaction_id,
                        status: 'OK',
                        balance: finalBalance,
                        currency_code: user.currency
                    }
                }
            };
        }
        catch (error) {
            console.error('[CHANGEBALANCE] Critical error during processing:', error);
            return this.createErrorResponseWrapped(request, 'OP_21', 'Internal server error during transaction processing');
        }
    }
    // --- STATUS ---
    static async handleStatus(request) {
        const { token, user_id, transaction_id } = request.data;
        console.log('[DEBUG] STATUS request:', JSON.stringify(request, null, 2));
        // Check if we have either token or user_id
        if (!token && !user_id) {
            console.log('[DEBUG] STATUS: Missing token or user_id');
            return this.createErrorResponseWrapped(request, 'OP_21', 'Missing required parameters: token or user_id required');
        }
        let user = null;
        if (token) {
            user = await this.getUserByToken(token);
            console.log('[DEBUG] STATUS: user lookup by token result:', user);
        }
        else if (user_id) {
            // Look up user by user_id
            const result = await postgres_1.default.query(`SELECT u.id as user_id, u.username, up.currency FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = $1 LIMIT 1`, [user_id]);
            if (result.rows.length > 0) {
                user = result.rows[0];
            }
            console.log('[DEBUG] STATUS: user lookup by user_id result:', user);
        }
        if (!user) {
            console.log('[DEBUG] STATUS: User not found or token expired');
            return this.createErrorResponseWrapped(request, 'OP_21', 'User not found or token expired');
        }
        // If transaction_id is provided, check if the transaction exists and return its status
        if (transaction_id) {
            try {
                // Initialize MongoDB
                const { MongoService } = require("../mongo/mongo.service");
                await MongoService.initialize();
                const transaction = await MongoService.getTransactionsCollection().findOne({ external_reference: transaction_id, user_id: user.user_id });
                if (transaction) {
                    // If transaction is cancelled, return CANCELED status
                    if (transaction.status === 'cancelled') {
                        console.log(`[DEBUG] STATUS: Transaction ${transaction_id} is cancelled, returning CANCELED status`);
                        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                        return {
                            request: {
                                command: request.command,
                                data: request.data,
                                request_timestamp: request.request_timestamp,
                                hash: request.hash
                            },
                            response: {
                                status: 'OK',
                                response_timestamp: timestamp,
                                hash: this.generateResponseHash('OK', timestamp),
                                data: {
                                    user_id: user.user_id.toString(),
                                    transaction_id: transaction_id,
                                    transaction_status: 'CANCELED'
                                }
                            }
                        };
                    }
                    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                    // Return OK status for active transactions
                    return {
                        request: {
                            command: request.command,
                            data: request.data,
                            request_timestamp: request.request_timestamp,
                            hash: request.hash
                        },
                        response: {
                            status: 'OK',
                            response_timestamp: timestamp,
                            hash: this.generateResponseHash('OK', timestamp),
                            data: {
                                user_id: user.user_id.toString(),
                                transaction_id: transaction_id,
                                transaction_status: 'OK'
                            }
                        }
                    };
                }
                else {
                    console.log('[DEBUG] STATUS: Transaction not found, returning error');
                    // If transaction doesn't exist, return an error
                    return this.createErrorResponseWrapped(request, 'OP_41', 'Transaction not found');
                }
            }
            catch (error) {
                console.error(`[ERROR] Failed to get transaction status from MongoDB:`, error);
                return this.createErrorResponseWrapped(request, 'OP_41', 'Transaction not found');
            }
        }
        // If no transaction_id, return general status
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return {
            request: {
                command: request.command,
                data: request.data,
                request_timestamp: request.request_timestamp,
                hash: request.hash
            },
            response: {
                status: 'OK',
                response_timestamp: timestamp,
                hash: this.generateResponseHash('OK', timestamp),
                data: {
                    user_id: user.user_id.toString(),
                    transaction_status: 'OK'
                }
            }
        };
    }
    // --- CANCEL ---
    static async handleCancel(request) {
        const { token, user_id, transaction_id } = request.data;
        console.log('[DEBUG] CANCEL request:', JSON.stringify(request, null, 2));
        // Validate required parameters
        if (!transaction_id || (!token && !user_id)) {
            console.log('[DEBUG] CANCEL: Missing required parameters');
            return this.createErrorResponseWrapped(request, 'OP_21', 'Missing required parameters: transaction_id and token or user_id required');
        }
        // CRITICAL FIX: First get the transaction to find the correct user_id
        const transaction = await this.getTransactionForCancellation(transaction_id, user_id ? parseInt(user_id) : 0);
        if (!transaction) {
            console.log(`[DEBUG] CANCEL: Transaction ${transaction_id} not found`);
            return this.createErrorResponseWrapped(request, 'OP_41', 'Transaction not found or not available for cancellation');
        }
        // Handle already cancelled transaction (idempotent response)
        if (transaction.alreadyCancelled) {
            console.log(`[DEBUG] CANCEL: Transaction ${transaction_id} already cancelled - returning idempotent success response`);
            const actualUserId = transaction.user_id;
            const user = await this.getUserFromRequest(token, actualUserId.toString());
            if (!user) {
                console.log('[DEBUG] CANCEL: User not found or token expired');
                return this.createErrorResponseWrapped(request, 'OP_21', 'User not found or token expired');
            }
            // Return success response for already cancelled transaction
            return await this.createCancelSuccessResponse(request, user, 0); // Balance doesn't change for already cancelled
        }
        // CRITICAL FIX: Use the user_id from the transaction, not from the request
        const actualUserId = transaction.user_id;
        console.log(`[DEBUG] CANCEL: Using actual user_id from transaction: ${actualUserId} (request had: ${user_id})`);
        // Get user information using the correct user_id from the transaction
        const user = await this.getUserFromRequest(token, actualUserId.toString());
        if (!user) {
            console.log('[DEBUG] CANCEL: User not found or token expired');
            return this.createErrorResponseWrapped(request, 'OP_21', 'User not found or token expired');
        }
        // Process the cancellation based on transaction type
        const cancellationResult = await this.processTransactionCancellation(transaction, user, transaction_id);
        if (!cancellationResult.success) {
            return this.createErrorResponseWrapped(request, 'OP_99', cancellationResult.error || 'Cancellation failed');
        }
        // Update transaction status using the correct user_id
        await this.markTransactionAsCancelled(transaction_id, actualUserId);
        // Return success response with updated balance
        return await this.createCancelSuccessResponse(request, user, cancellationResult.updatedBalance);
    }
    // Helper method to get user from token or user_id
    static async getUserFromRequest(token, user_id) {
        if (token) {
            return await this.getUserByToken(token);
        }
        else if (user_id) {
            const result = await postgres_1.default.query(`SELECT u.id as user_id, u.username, up.currency FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = $1 LIMIT 1`, [user_id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        return null;
    }
    // Helper method to get transaction for cancellation
    static async getTransactionForCancellation(transaction_id, user_id) {
        console.log(`[IDEMPOTENCY] Checking transaction ${transaction_id} status for user ${user_id}`);
        try {
            // Initialize MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // CRITICAL FIX: First find the transaction by transaction_id only, then get the correct user_id
            const existingTransaction = await MongoService.getTransactionsCollection().findOne({ external_reference: transaction_id });
            if (!existingTransaction) {
                console.log(`[DEBUG] CANCEL: Transaction ${transaction_id} not found in MongoDB`);
                return null;
            }
            console.log(`[DEBUG] CANCEL: Transaction ${transaction_id} current status: ${existingTransaction.status}, actual user_id: ${existingTransaction.user_id}`);
            // CRITICAL FIX: Use the user_id from the transaction, not from the request
            const actualUserId = existingTransaction.user_id;
            // If already cancelled, return special indicator for idempotent response
            if (existingTransaction.status === 'cancelled') {
                console.log(`[DEBUG] CANCEL: Transaction ${transaction_id} already cancelled - returning idempotent indicator`);
                return { alreadyCancelled: true, user_id: actualUserId };
            }
            // Get full transaction details using the actual user_id from the transaction
            const transactionDetails = await MongoService.getTransactionsCollection().findOne({ external_reference: transaction_id, user_id: actualUserId });
            console.log(`[DEBUG] CANCEL: Transaction details:`, transactionDetails);
            return transactionDetails;
        }
        catch (error) {
            console.error(`[ERROR] Failed to get transaction for cancellation from MongoDB:`, error);
            return null;
        }
    }
    // Helper method to process transaction cancellation
    static async processTransactionCancellation(transaction, user, transaction_id) {
        try {
            // Parse transaction metadata
            const metadata = this.parseTransactionMetadata(transaction.metadata);
            const category = metadata?.category;
            // Validate transaction amount
            const transactionAmount = this.validateTransactionAmount(transaction.amount);
            if (transactionAmount === null) {
                return { success: false, error: 'Invalid transaction amount' };
            }
            // Calculate balance adjustment based on transaction type
            const balanceAdjustment = await this.calculateBalanceAdjustment(transaction);
            console.log(`[DEBUG] CANCEL: balanceAdjustment type: ${typeof balanceAdjustment}, value: ${balanceAdjustment}`);
            const adjustmentDescription = this.createAdjustmentDescription(transaction.type, balanceAdjustment);
            console.log(`[DEBUG] CANCEL: Processing ${transaction.type.toUpperCase()} cancellation - Amount: $${transactionAmount.toFixed(2)}, Adjustment: $${balanceAdjustment.toFixed(2)}`);
            // Update balance based on category or main balance
            const updatedBalance = await this.updateBalanceForCancellation(user.user_id, category, balanceAdjustment, transactionAmount, adjustmentDescription, transaction_id);
            return { success: true, updatedBalance, category };
        }
        catch (error) {
            console.error(`[DEBUG] CANCEL: Error processing cancellation:`, error);
            return { success: false, error: error.message };
        }
    }
    // Helper method to parse transaction metadata
    static parseTransactionMetadata(metadata) {
        if (!metadata)
            return null;
        try {
            if (typeof metadata === 'string') {
                return JSON.parse(metadata);
            }
            return metadata;
        }
        catch (error) {
            console.log(`[DEBUG] CANCEL: Error parsing metadata:`, error);
            return null;
        }
    }
    // Helper method to validate transaction amount
    static validateTransactionAmount(amount) {
        const parsedAmount = Number(amount) || 0;
        if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
            console.error(`[DEBUG] CANCEL: Invalid transaction amount: ${amount}`);
            return null;
        }
        return parsedAmount;
    }
    // Helper method to calculate balance adjustment
    static async calculateBalanceAdjustment(transaction) {
        const transactionType = transaction.type.toLowerCase();
        const amount = transaction.amount;
        switch (transactionType) {
            case 'bet':
                // For BET cancellation, we need to find the related WIN transaction and calculate net effect
                const betNetEffect = await this.calculateNetEffectForBet(transaction);
                console.log(`[DEBUG] CANCEL: Bet cancellation - Full bet: $${amount}, Net effect: $${betNetEffect}`);
                return betNetEffect;
            case 'win':
                // Cancel WIN = DEDUCT win amount AND ADD BACK bet amount
                const winNetEffect = await this.calculateNetEffectForWin(transaction);
                console.log(`[DEBUG] CANCEL: Win cancellation - Win amount: $${amount}, Net effect: $${winNetEffect}`);
                return winNetEffect;
            default:
                console.error(`[DEBUG] CANCEL: Unknown transaction type: ${transactionType}`);
                return 0;
        }
    }
    // Helper method to calculate net effect for a bet transaction cancellation
    static async calculateNetEffectForBet(betTransaction) {
        try {
            // Parse metadata to get round_id
            const metadata = this.parseTransactionMetadata(betTransaction.metadata);
            const roundId = metadata?.round_id;
            if (!roundId) {
                console.log(`[DEBUG] CANCEL: No round_id found in bet transaction metadata, returning full bet amount`);
                return Number(betTransaction.amount); // Fallback to full bet amount
            }
            // Find the related WIN transaction for the same round
            const winTransactionResult = await postgres_1.default.query(`SELECT amount FROM transactions 
         WHERE user_id = $1 
         AND type = 'win' 
         AND metadata::jsonb->>'round_id' = $2 
         AND status = 'completed'
         ORDER BY id DESC LIMIT 1`, [betTransaction.user_id, roundId.toString()]);
            if (winTransactionResult.rows.length === 0) {
                console.log(`[DEBUG] CANCEL: No win transaction found for round ${roundId}, returning full bet amount`);
                return Number(betTransaction.amount); // No win found, return full bet amount
            }
            const winAmount = Number(winTransactionResult.rows[0].amount);
            // When cancelling a bet, only refund the bet amount (don't consider wins)
            const netEffect = Number(betTransaction.amount);
            console.log(`[DEBUG] CANCEL: Round ${roundId} - Bet: $${betTransaction.amount}, Win: $${winAmount}, Net Effect: $${netEffect} (bet refund only)`);
            // Return the bet amount as refund (ignore wins/losses)
            return netEffect;
        }
        catch (error) {
            console.error(`[DEBUG] CANCEL: Error calculating net effect for bet:`, error);
            return Number(betTransaction.amount); // Fallback to full bet amount
        }
    }
    // Helper method to calculate net effect for a win transaction cancellation
    static async calculateNetEffectForWin(winTransaction) {
        try {
            // Parse metadata to get round_id
            const metadata = this.parseTransactionMetadata(winTransaction.metadata);
            const roundId = metadata?.round_id;
            if (!roundId) {
                console.log(`[DEBUG] CANCEL: No round_id found in win transaction metadata, returning negative win amount`);
                return -Number(winTransaction.amount); // Fallback to just deducting the win
            }
            // Find the related BET transaction for the same round
            const betTransactionResult = await postgres_1.default.query(`SELECT amount FROM transactions 
         WHERE user_id = $1 
         AND type = 'bet' 
         AND metadata::jsonb->>'round_id' = $2 
         AND status = 'completed'
         ORDER BY id DESC LIMIT 1`, [winTransaction.user_id, roundId.toString()]);
            if (betTransactionResult.rows.length === 0) {
                console.log(`[DEBUG] CANCEL: No bet transaction found for round ${roundId}, returning negative win amount`);
                return -Number(winTransaction.amount); // No bet found, just deduct the win
            }
            const betAmount = Number(betTransactionResult.rows[0].amount);
            const winAmount = Number(winTransaction.amount);
            // When cancelling a win, only deduct the win amount (don't consider bet)
            const netEffect = -winAmount; // Only deduct the win amount
            console.log(`[DEBUG] CANCEL: Round ${roundId} - Win: $${winAmount}, Bet: $${betAmount}, Net Effect: $${netEffect} (win deduction only)`);
            return netEffect;
        }
        catch (error) {
            console.error(`[DEBUG] CANCEL: Error calculating net effect for win:`, error);
            return -Number(winTransaction.amount); // Fallback to just deducting the win
        }
    }
    // Helper method to create adjustment description
    static createAdjustmentDescription(transactionType, amount) {
        switch (transactionType.toLowerCase()) {
            case 'bet':
                return `Cancelled bet refund: +$${amount.toFixed(2)}`;
            case 'win':
                return `Cancelled win reversal: -$${amount.toFixed(2)}`;
            default:
                return `Cancelled ${transactionType} adjustment: ${amount > 0 ? '+' : ''}$${amount.toFixed(2)}`;
        }
    }
    // Helper method to update balance for cancellation
    static async updateBalanceForCancellation(user_id, category, balanceAdjustment, transactionAmount, adjustmentDescription, originalTransactionId) {
        if (category) {
            // Update category balance only (user transfers from main wallet to category before playing)
            console.log(`[DEBUG] CANCEL: Updating category balance only (user transfers funds to category before playing)`);
            // Update category balance
            const categoryBalance = await this.updateCategoryBalanceForCancellation(user_id, category, balanceAdjustment, transactionAmount, adjustmentDescription, originalTransactionId);
            console.log(`[DEBUG] CANCEL: Category balance updated to: $${categoryBalance}`);
            console.log(`[DEBUG] CANCEL: Main wallet balance unchanged (user transfers funds to category before playing)`);
            // Return the category balance for consistency with provider expectations
            return categoryBalance;
        }
        else {
            // Update main balance only (for transactions without category)
            return await this.updateMainBalanceForCancellation(user_id, balanceAdjustment, transactionAmount, adjustmentDescription, originalTransactionId);
        }
    }
    // Helper method to update category balance
    static async updateCategoryBalanceForCancellation(user_id, category, balanceAdjustment, transactionAmount, adjustmentDescription, originalTransactionId) {
        console.log(`[DEBUG] CANCEL: Updating ${category} category balance in MongoDB`);
        console.log(`[DEBUG] CANCEL: User ID: ${user_id}, Category: ${category}, Adjustment: ${balanceAdjustment}`);
        try {
            // Initialize MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // Use atomic update for category balance
            const balanceUpdate = await MongoService.getAndUpdateCategoryBalance(user_id, category.toLowerCase().trim(), balanceAdjustment);
            const currentCategoryBalance = Math.round(balanceUpdate.balance_before * 100) / 100;
            const newCategoryBalance = Math.round(balanceUpdate.balance_after * 100) / 100;
            console.log(`[DEBUG] CANCEL: Category balance adjustment: $${currentCategoryBalance} + $${balanceAdjustment} = $${newCategoryBalance}`);
            console.log(`[DEBUG] CANCEL: Category balance updated successfully in MongoDB`);
            // Insert adjustment transaction record in MongoDB
            try {
                await MongoService.insertTransaction({
                    user_id: user_id,
                    type: 'adjustment',
                    amount: Math.abs(balanceAdjustment),
                    balance_before: currentCategoryBalance,
                    balance_after: newCategoryBalance,
                    currency: 'USD',
                    external_reference: `cancel_${originalTransactionId}`,
                    description: adjustmentDescription,
                    metadata: {
                        category: category,
                        original_transaction: originalTransactionId,
                        cancelled_transaction_id: originalTransactionId
                    }
                });
                console.log(`[DEBUG] CANCEL: Adjustment transaction inserted in MongoDB`);
            }
            catch (txError) {
                console.error(`[WARNING] CANCEL: Failed to insert adjustment transaction record:`, txError);
            }
            return newCategoryBalance;
        }
        catch (error) {
            console.error(`[ERROR] CANCEL: Failed to update category balance in MongoDB:`, error);
            throw error;
        }
    }
    // Helper method to update main balance
    static async updateMainBalanceForCancellation(user_id, balanceAdjustment, transactionAmount, adjustmentDescription, originalTransactionId) {
        console.log(`[DEBUG] CANCEL: Updating main wallet balance`);
        // Use database transaction to prevent race conditions
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Lock the row for update to prevent race conditions
            const currentBalanceResult = await client.query('SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE', [user_id]);
            if (currentBalanceResult.rows.length === 0) {
                throw new Error(`Balance record not found for user ${user_id}`);
            }
            const currentBalance = currency_utils_1.CurrencyUtils.safeParseBalance(currentBalanceResult.rows[0].balance);
            if (isNaN(currentBalance) || !isFinite(currentBalance)) {
                throw new Error(`Invalid balance in database: ${currentBalanceResult.rows[0].balance}`);
            }
            const newBalance = currentBalance + balanceAdjustment;
            if (isNaN(newBalance) || !isFinite(newBalance)) {
                throw new Error(`Invalid balance calculation: current=${currentBalance}, adjustment=${balanceAdjustment}, new=${newBalance}`);
            }
            console.log(`[DEBUG] CANCEL: Balance adjustment: $${currentBalance} + $${balanceAdjustment} = $${newBalance}`);
            await client.query('UPDATE user_balances SET balance = $1 WHERE user_id = $2', [parseFloat(newBalance.toFixed(2)), user_id]);
            await client.query('COMMIT');
            console.log(`[DEBUG] CANCEL: Balance updated successfully`);
            // Insert transaction record outside the database transaction to avoid conflicts
            try {
                await this.insertTransaction({
                    user_id: user_id,
                    type: 'adjustment',
                    amount: Math.abs(balanceAdjustment),
                    balance_before: parseFloat(currentBalance.toFixed(2)),
                    balance_after: parseFloat(newBalance.toFixed(2)),
                    currency: 'USD', // Default currency
                    external_reference: `cancel_${originalTransactionId}`,
                    description: adjustmentDescription
                });
            }
            catch (txError) {
                console.error(`[WARNING] CANCEL: Failed to insert transaction record:`, txError);
                // Don't fail the cancel operation if transaction record insertion fails
            }
            return parseFloat(newBalance.toFixed(2));
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error(`[ERROR] CANCEL: Failed to update main balance:`, error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Helper method to mark transaction as cancelled
    static async markTransactionAsCancelled(transaction_id, user_id) {
        try {
            // Initialize MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // Update transaction status to cancelled
            await MongoService.getTransactionsCollection().updateOne({ external_reference: transaction_id, user_id: user_id }, { $set: { status: 'cancelled', updated_at: new Date() } });
            // Update bet outcome to cancelled if it exists
            await MongoService.getBetsCollection().updateOne({ 'transaction_id.id': { $in: [parseInt(transaction_id)] } }, { $set: { outcome: 'cancelled', updated_at: new Date() } });
            console.log(`[DEBUG] CANCEL: Updated transaction and bet status to cancelled in MongoDB`);
        }
        catch (error) {
            console.error(`[ERROR] Failed to mark transaction as cancelled in MongoDB:`, error);
            throw error;
        }
    }
    // Helper method to create cancel success response
    static async createCancelSuccessResponse(request, user, updatedBalance) {
        console.log(`[DEBUG] CANCEL: Getting consistent balance for response`);
        // For cancel operations, return the category balance that was just updated
        // This ensures consistency with the balance method and user's category-based system
        let finalBalance = updatedBalance;
        // If updatedBalance is 0, it means this is an already-cancelled transaction
        // In this case, we need to get the current balance from the database
        if (updatedBalance === 0) {
            console.log(`[DEBUG] CANCEL: Already cancelled transaction - getting current balance`);
            // Check if we need to get category balance instead of main balance
            const { game_id } = request.data;
            let resolvedGameId = game_id || user.token_game_id;
            let resolvedCategory = null;
            if (resolvedGameId) {
                // Get category for this game
                let game = null;
                try {
                    const gameResult = await postgres_1.default.query("SELECT * FROM games WHERE id = $1", [resolvedGameId]);
                    if (gameResult.rows.length > 0) {
                        game = gameResult.rows[0];
                    }
                }
                catch (error) {
                    console.error(`[ERROR] Failed to get game ${resolvedGameId}:`, error);
                }
                if (game && game.category) {
                    resolvedCategory = game.category;
                }
            }
            if (!resolvedCategory && user.token_category) {
                resolvedCategory = user.token_category;
            }
            // Get current balance for the category or main balance
            if (resolvedCategory) {
                finalBalance = await this.getCurrentBalanceForResponse(user.user_id, resolvedCategory);
                console.log(`[DEBUG] CANCEL: Using current ${resolvedCategory} balance: ${this.formatCurrency(finalBalance)}`);
            }
            else {
                // Fallback to main balance
                const userBalance = await this.getUserBalance(user.user_id);
                finalBalance = userBalance.balance || 0;
                console.log(`[DEBUG] CANCEL: Using current main balance: ${this.formatCurrency(finalBalance)}`);
            }
        }
        else {
            // Check if we need to get category balance instead of main balance
            const { game_id } = request.data;
            let resolvedGameId = game_id || user.token_game_id;
            let resolvedCategory = null;
            if (resolvedGameId) {
                // Get category for this game
                let game = null;
                try {
                    const { MongoService } = require("../mongo/mongo.service");
                    await MongoService.initialize();
                    game = await MongoService.getGamesCollection().findOne({ id: resolvedGameId });
                }
                catch (error) {
                    console.error(`[ERROR] Failed to get game ${resolvedGameId}:`, error);
                }
                if (game && game.category) {
                    resolvedCategory = game.category;
                }
            }
            if (!resolvedCategory && user.token_category) {
                resolvedCategory = user.token_category;
            }
            // For cancel operations, always use the updated balance that was just calculated
            // This ensures the response matches the actual balance changes made
            console.log(`[CANCEL] Using updated category balance from cancellation: ${this.formatCurrency(finalBalance)}`);
        }
        console.log(`[DEBUG] CANCEL: Returning consistent balance: ${this.formatCurrency(finalBalance)}`);
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return {
            request: {
                command: request.command,
                data: request.data,
                request_timestamp: request.request_timestamp,
                hash: request.hash
            },
            response: {
                status: 'OK',
                response_timestamp: timestamp,
                hash: this.generateResponseHash('OK', timestamp),
                data: {
                    user_id: user.user_id.toString(),
                    transaction_id: request.data.transaction_id,
                    transaction_status: 'CANCELED',
                    balance: parseFloat(finalBalance.toFixed(2)),
                    currency_code: user.currency || 'USD'
                }
            }
        };
    }
    // --- FINISHROUND ---
    static async handleFinishRound(request) {
        const { token, user_id, game_id, round_id } = request.data;
        if (!user_id || !game_id || !round_id) {
            return this.createErrorResponseWrapped(request, 'OP_21', 'Missing required parameters');
        }
        // Get user - try token first, then fallback to user_id
        let user = null;
        if (token) {
            user = await this.getUserByToken(token);
            if (!user) {
                return this.createErrorResponseWrapped(request, 'OP_21', 'User not found or token expired');
            }
        }
        else {
            // For finishround without token, get user directly by user_id
            const userResult = await postgres_1.default.query('SELECT u.id as user_id, u.username, u.status_id, s.name as status_name, up.currency FROM users u LEFT JOIN statuses s ON u.status_id = s.id LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = $1 LIMIT 1', [user_id]);
            if (userResult.rows.length > 0) {
                user = userResult.rows[0];
                // Set default currency if not found
                if (!user.currency) {
                    user.currency = 'USD';
                }
                console.log(`[DEBUG] FINISHROUND: User found by user_id: ${user.user_id}, currency: ${user.currency}`);
            }
            else {
                return this.createErrorResponseWrapped(request, 'OP_21', 'User not found');
            }
        }
        // --- IDEMPOTENCY CHECK: Check if this round has already been finished ---
        console.log(`[IDEMPOTENCY] Checking if round ${round_id} has already been finished for user ${user.user_id}`);
        const existingRound = await postgres_1.default.query(`SELECT id FROM user_activity_logs 
       WHERE user_id = $1 AND action = 'finish_round' 
       AND metadata->>'round_id' = $2 
       AND metadata->>'game_id' = $3 
       LIMIT 1`, [user.user_id, round_id.toString(), game_id.toString()]);
        if (existingRound.rows.length > 0) {
            console.log(`[IDEMPOTENCY] Round ${round_id} already finished, returning success`);
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            return {
                request: {
                    command: request.command,
                    data: request.data,
                    request_timestamp: request.request_timestamp,
                    hash: request.hash
                },
                response: {
                    status: 'OK',
                    response_timestamp: timestamp,
                    hash: this.generateResponseHash('OK', timestamp),
                    data: {
                        user_id: user.user_id.toString(),
                        game_id: game_id,
                        round_id: round_id,
                        transaction_status: 'OK'
                    }
                }
            };
        }
        console.log(`[IDEMPOTENCY] Round ${round_id} is new, proceeding with finish round processing`);
        // Mark any pending bets for this round as 'lose' (they didn't win)
        console.log(`[FINISHROUND] Checking for pending bets in round ${round_id}`);
        const pendingBetsResult = await postgres_1.default.query(`UPDATE bets
       SET outcome = 'lose',
           win_amount = 0,
           multiplier = 0,
           result_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND game_id = $2
         AND round_id = $3
         AND outcome = 'pending'
       RETURNING id`, [user.user_id, game_id, round_id.toString()]);
        if (pendingBetsResult.rows.length > 0) {
            console.log(`[FINISHROUND] Marked ${pendingBetsResult.rows.length} pending bet(s) as 'lose' for round ${round_id}`);
        }
        else {
            console.log(`[FINISHROUND] No pending bets found for round ${round_id} (already resolved)`);
        }
        await postgres_1.default.query(`INSERT INTO user_activity_logs (user_id, action, category, description, metadata, created_by) VALUES ($1, 'finish_round', 'gaming', 'Round completed', $2, $1)`, [user.user_id, JSON.stringify({ game_id, round_id })]);
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return {
            request: {
                command: request.command,
                data: request.data,
                request_timestamp: request.request_timestamp,
                hash: request.hash
            },
            response: {
                status: 'OK',
                response_timestamp: timestamp,
                hash: this.generateResponseHash('OK', timestamp),
                data: {
                    user_id: user.user_id.toString(),
                    game_id: game_id,
                    round_id: round_id,
                    transaction_status: 'completed'
                }
            }
        };
    }
    // --- PING ---
    static async handlePing() {
        return this.createSuccessResponse({
            status: 'pong',
            timestamp: new Date().toISOString()
        });
    }
    // --- SUCCESS RESPONSE (for ping) ---
    static createSuccessResponse(data) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        return {
            status: 'OK',
            response_timestamp: timestamp,
            hash: this.generateResponseHash('OK', timestamp),
            data
        };
    }
    // --- MAIN HANDLER ---
    static async handleRequest(request, authHeader) {
        try {
            // Validate authorization header
            if (!this.validateAuthorization(request.command, authHeader)) {
                return this.createErrorResponseWrapped(request, 'OP_99', 'Invalid authorization');
            }
            // Validate request hash
            if (!this.validateRequestHash(request)) {
                return this.createErrorResponseWrapped(request, 'OP_99', 'Invalid request hash');
            }
            // Route to appropriate handler
            switch (request.command) {
                case 'authenticate':
                    return await this.handleAuthenticate(request);
                case 'balance':
                    return await this.handleBalance(request);
                case 'changebalance':
                    return await this.handleChangeBalance(request);
                case 'status':
                    return await this.handleStatus(request);
                case 'cancel':
                    return await this.handleCancel(request);
                case 'finishround':
                    return await this.handleFinishRound(request);
                case 'ping':
                    return await this.handlePing();
                default:
                    return this.createErrorResponseWrapped(request, 'OP_99', 'Unknown command');
            }
        }
        catch (error) {
            console.error('Provider callback error:', error);
            // Check for specific database constraint errors
            if (error.code === '23514') { // Check constraint violation
                if (error.constraint === 'transactions_type_check') {
                    console.error('Transaction type constraint violation:', error.message);
                    return this.createErrorResponseWrapped(request, 'OP_99', 'Invalid transaction type');
                }
                if (error.constraint === 'transactions_status_check') {
                    console.error('Transaction status constraint violation:', error.message);
                    return this.createErrorResponseWrapped(request, 'OP_99', 'Invalid transaction status');
                }
            }
            // Check for foreign key constraint errors
            if (error.code === '23503') { // Foreign key violation
                console.error('Foreign key constraint violation:', error.message);
                return this.createErrorResponseWrapped(request, 'OP_99', 'Referenced record not found');
            }
            // Check for unique constraint errors
            if (error.code === '23505') { // Unique constraint violation
                console.error('Unique constraint violation:', error.message);
                return this.createErrorResponseWrapped(request, 'OP_99', 'Duplicate transaction');
            }
            return this.createErrorResponseWrapped(request, 'OP_99', 'Internal server error');
        }
    }
    // --- AUTH HEADER VALIDATION ---
    static validateAuthorization(command, authHeader) {
        if (!this.SECRET_KEY) {
            throw new apiError_1.ApiError("Secret key not configured", 500);
        }
        console.log(`[AUTH_DEBUG] Validating authorization for command: ${command}`);
        console.log(`[AUTH_DEBUG] Received auth header: ${authHeader}`);
        console.log(`[AUTH_DEBUG] Secret key configured: ${this.SECRET_KEY ? 'YES' : 'NO'}`);
        // Handle both "Bearer <hash>" and just "<hash>" formats
        const hash = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        const expectedHash = crypto.createHash('sha1').update(command + this.SECRET_KEY).digest('hex');
        console.log(`[AUTH_DEBUG] Expected hash: ${expectedHash}`);
        console.log(`[AUTH_DEBUG] Hash match: ${hash === expectedHash}`);
        return hash === expectedHash;
    }
    // --- REQUEST HASH VALIDATION ---
    static validateRequestHash(request) {
        if (!this.SECRET_KEY) {
            throw new apiError_1.ApiError("Secret key not configured", 500);
        }
        const expectedHash = crypto.createHash('sha1')
            .update(request.command + request.request_timestamp + this.SECRET_KEY)
            .digest('hex');
        return request.hash === expectedHash;
    }
}
exports.ProviderCallbackService = ProviderCallbackService;
