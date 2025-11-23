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
exports.cancelGameService = exports.getGamesByCategoryService = exports.getBetResultsService = exports.getGamePlayInfoService = exports.getPopularGamesService = exports.getGameStatisticsService = exports.processBetResultService = exports.placeBetService = exports.recordGamePlayService = exports.toggleGameFavoriteService = exports.getHotGamesService = exports.getNewGamesService = exports.getFeaturedGamesService = exports.getGameProvidersService = exports.getGameCategoriesService = exports.getGameByIdService = exports.getAvailableGamesService = exports.resolveGameId = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
const currency_utils_1 = require("../../utils/currency.utils");
const crypto_1 = __importDefault(require("crypto"));
// import { playGame } from "../api/game/game.controller";
/**
 * Helper function to resolve game_code or ID to actual database ID
 * Prioritizes game_code lookup since it's more user-facing
 * @param gameIdOrCode - Can be either database id or game_code (as number)
 * @returns The actual database ID
 * @throws ApiError if game not found
 */
const resolveGameId = async (gameIdOrCode) => {
    // First try to find by game_code (convert number to string)
    let result = await postgres_1.default.query(`SELECT id FROM games WHERE game_code = $1`, [gameIdOrCode.toString()]);
    // If not found by game_code, try to find by database ID
    if (result.rows.length === 0) {
        result = await postgres_1.default.query(`SELECT id FROM games WHERE id = $1`, [gameIdOrCode]);
    }
    if (result.rows.length === 0) {
        throw new apiError_1.ApiError("Game not found", 404);
    }
    return result.rows[0].id;
};
exports.resolveGameId = resolveGameId;
// Get all available games with filtering
const getAvailableGamesService = async (filters) => {
    const { category, provider, is_featured, is_new, is_hot, search, limit = 50, offset = 0 } = filters;
    let query = `
    SELECT 
      id,
      name,
      provider,
      category,
      subcategory,
      image_url,
      thumbnail_url,
      game_code,
      rtp_percentage,
      volatility,
      min_bet,
      max_bet,
      max_win,
      is_featured,
      is_new,
      is_hot,
      is_active,
      created_at,
      features,
      rating,
      popularity,
      description,
      last_win
    FROM games 
    WHERE is_active = TRUE
  `;
    const params = [];
    let paramCount = 0;
    if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(category);
    }
    if (provider) {
        paramCount++;
        query += ` AND provider = $${paramCount}`;
        params.push(provider);
    }
    if (is_featured !== undefined) {
        paramCount++;
        query += ` AND is_featured = $${paramCount}`;
        params.push(is_featured);
    }
    if (is_new !== undefined) {
        paramCount++;
        query += ` AND is_new = $${paramCount}`;
        params.push(is_new);
    }
    if (is_hot !== undefined) {
        paramCount++;
        query += ` AND is_hot = $${paramCount}`;
        params.push(is_hot);
    }
    if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR provider ILIKE $${paramCount} OR game_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
    }
    query += ` ORDER BY is_featured DESC, is_hot DESC, is_new DESC, name ASC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    const result = await postgres_1.default.query(query, params);
    return result.rows;
};
exports.getAvailableGamesService = getAvailableGamesService;
// Get game by game_code or ID with detailed information
// Prioritizes game_code lookup since it's more user-facing
const getGameByIdService = async (gameId) => {
    // First try to find by game_code (convert number to string)
    let gameExistsResult = await postgres_1.default.query(`SELECT id, name, is_active FROM games WHERE game_code = $1`, [gameId.toString()]);
    // If not found by game_code, try to find by database ID
    if (gameExistsResult.rows.length === 0) {
        gameExistsResult = await postgres_1.default.query(`SELECT id, name, is_active FROM games WHERE id = $1`, [gameId]);
    }
    if (gameExistsResult.rows.length === 0) {
        throw new apiError_1.ApiError("Game not found", 404);
    }
    const game = gameExistsResult.rows[0];
    // If game exists but is inactive, provide a specific error message
    if (!game.is_active) {
        throw new apiError_1.ApiError(`Game "${game.name}" is currently disabled. Please try another game.`, 403);
    }
    // Get full game details for active games using the actual database ID
    const result = await postgres_1.default.query(`
    SELECT
      id,
      name,
      provider,
      category,
      subcategory,
      image_url,
      thumbnail_url,
      game_code,
      rtp_percentage,
      volatility,
      min_bet,
      max_bet,
      max_win,
      is_featured,
      is_new,
      is_hot,
      is_active,
      created_at,
      updated_at,
      features,
      rating,
      popularity,
      description,
      last_win
    FROM games
    WHERE id = $1 AND is_active = TRUE
    `, [game.id]);
    return result.rows[0];
};
exports.getGameByIdService = getGameByIdService;
// Get game categories
const getGameCategoriesService = async () => {
    const result = await postgres_1.default.query(`
    SELECT DISTINCT 
      category,
      COUNT(*) as game_count
    FROM games 
    WHERE is_active = TRUE
    GROUP BY category
    ORDER BY game_count DESC, category ASC
    `);
    return result.rows;
};
exports.getGameCategoriesService = getGameCategoriesService;
// Get game providers
const getGameProvidersService = async () => {
    const result = await postgres_1.default.query(`
    SELECT DISTINCT 
      provider,
      COUNT(*) as game_count
    FROM games 
    WHERE is_active = TRUE
    GROUP BY provider
    ORDER BY game_count DESC, provider ASC
    `);
    return result.rows;
};
exports.getGameProvidersService = getGameProvidersService;
// Get featured games
const getFeaturedGamesService = async (limit = 10) => {
    const result = await postgres_1.default.query(`
    SELECT 
      id,
      name,
      provider,
      category,
      subcategory,
      image_url,
      thumbnail_url,
      game_code,
      rtp_percentage,
      volatility,
      min_bet,
      max_bet,
      max_win,
      is_featured,
      is_new,
      is_hot
    FROM games 
    WHERE is_active = TRUE AND is_featured = TRUE
    ORDER BY created_at DESC
    LIMIT $1
    `, [limit]);
    return result.rows;
};
exports.getFeaturedGamesService = getFeaturedGamesService;
// Get new games
const getNewGamesService = async (limit = 10, offset = 0, search) => {
    let query = `
    SELECT
      id,
      name,
      provider,
      category,
      subcategory,
      image_url,
      thumbnail_url,
      game_code,
      rtp_percentage,
      volatility,
      min_bet,
      max_bet,
      max_win,
      is_featured,
      is_new,
      is_hot
    FROM games
    WHERE is_active = TRUE AND is_new = TRUE
  `;
    const params = [];
    let paramCount = 0;
    if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR provider ILIKE $${paramCount} OR game_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
    }
    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    const result = await postgres_1.default.query(query, params);
    return result.rows;
};
exports.getNewGamesService = getNewGamesService;
// Get hot games
const getHotGamesService = async (limit = 10, offset = 0, search) => {
    let query = `
    SELECT
      id,
      name,
      provider,
      category,
      subcategory,
      image_url,
      thumbnail_url,
      game_code,
      rtp_percentage,
      volatility,
      min_bet,
      max_bet,
      max_win,
      is_featured,
      is_new,
      is_hot
    FROM games
    WHERE is_active = TRUE AND is_hot = TRUE
  `;
    const params = [];
    let paramCount = 0;
    if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR provider ILIKE $${paramCount} OR game_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
    }
    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    const result = await postgres_1.default.query(query, params);
    return result.rows;
};
exports.getHotGamesService = getHotGamesService;
// Toggle game favorite status (supports game_code or ID)
const toggleGameFavoriteService = async (userId, gameIdOrCode) => {
    // Resolve game_code or ID to actual database ID
    const actualGameId = await (0, exports.resolveGameId)(gameIdOrCode);
    // Check if game exists and get name
    const gameExists = await postgres_1.default.query("SELECT id, name FROM games WHERE id = $1 AND is_active = TRUE", [actualGameId]);
    if (gameExists.rows.length === 0) {
        throw new apiError_1.ApiError("Game not found", 404);
    }
    const gameName = gameExists.rows[0].name;
    // Check if preference exists
    const existingPreference = await postgres_1.default.query("SELECT id, is_favorite FROM user_game_preferences WHERE user_id = $1 AND game_id = $2", [userId, actualGameId]);
    if (existingPreference.rows.length > 0) {
        // Toggle existing preference
        const newFavoriteStatus = !existingPreference.rows[0].is_favorite;
        await postgres_1.default.query(`
      UPDATE user_game_preferences
      SET is_favorite = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND game_id = $3
      `, [newFavoriteStatus, userId, actualGameId]);
        // Log favorite toggle activity
        await postgres_1.default.query(`
      INSERT INTO user_activity_logs
      (user_id, action, category, description, metadata)
      VALUES ($1, $2, 'gaming', $3, $4)
      `, [
            userId,
            newFavoriteStatus ? 'add_favorite' : 'remove_favorite',
            `${newFavoriteStatus ? 'Added' : 'Removed'} ${gameName} to favorites`,
            JSON.stringify({ game_id: actualGameId, game_name: gameName, is_favorite: newFavoriteStatus })
        ]);
        return {
            game_id: actualGameId,
            is_favorite: newFavoriteStatus,
            message: `${gameName} ${newFavoriteStatus ? 'added to' : 'removed from'} favorites`
        };
    }
    else {
        // Create new preference as favorite
        await postgres_1.default.query(`
      INSERT INTO user_game_preferences
      (user_id, game_id, is_favorite, play_count, total_time_played)
      VALUES ($1, $2, TRUE, 0, 0)
      `, [userId, actualGameId]);
        // Log favorite add activity
        await postgres_1.default.query(`
      INSERT INTO user_activity_logs
      (user_id, action, category, description, metadata)
      VALUES ($1, 'add_favorite', 'gaming', $2, $3)
      `, [
            userId,
            `Added ${gameName} to favorites`,
            JSON.stringify({ game_id: actualGameId, game_name: gameName, is_favorite: true })
        ]);
        return {
            game_id: actualGameId,
            is_favorite: true,
            message: `${gameName} added to favorites`
        };
    }
};
exports.toggleGameFavoriteService = toggleGameFavoriteService;
// Record game play (supports game_code or ID)
const recordGamePlayService = async (userId, gameIdOrCode, playTimeSeconds = 0) => {
    // Resolve game_code or ID to actual database ID
    const actualGameId = await (0, exports.resolveGameId)(gameIdOrCode);
    // Check if game exists and get name
    const gameExists = await postgres_1.default.query("SELECT id, name FROM games WHERE id = $1 AND is_active = TRUE", [actualGameId]);
    if (gameExists.rows.length === 0) {
        throw new apiError_1.ApiError("Game not found", 404);
    }
    const gameName = gameExists.rows[0].name;
    // Update or create game preference
    const existingPreference = await postgres_1.default.query("SELECT id FROM user_game_preferences WHERE user_id = $1 AND game_id = $2", [userId, actualGameId]);
    if (existingPreference.rows.length > 0) {
        // Update existing preference
        await postgres_1.default.query(`
      UPDATE user_game_preferences
      SET play_count = play_count + 1,
          total_time_played = total_time_played + $1,
          last_played_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND game_id = $3
      `, [playTimeSeconds, userId, actualGameId]);
    }
    else {
        // Create new preference
        await postgres_1.default.query(`
      INSERT INTO user_game_preferences
      (user_id, game_id, play_count, total_time_played, last_played_at)
      VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
      `, [userId, actualGameId, playTimeSeconds]);
    }
    // Log game play activity
    await postgres_1.default.query(`
    INSERT INTO user_activity_logs
    (user_id, action, category, description, metadata)
    VALUES ($1, 'play_game', 'gaming', $2, $3)
    `, [
        userId,
        `Played ${gameName}`,
        JSON.stringify({
            game_id: actualGameId,
            game_name: gameName,
            play_time_seconds: playTimeSeconds
        })
    ]);
};
exports.recordGamePlayService = recordGamePlayService;
const balance_service_1 = require("../user/balance.service");
const promotion_service_1 = require("../promotion/promotion.service");
// Place a bet on a game (supports game_code or ID)
const placeBetService = async (userId, gameIdOrCode, betAmount, betType, gameData) => {
    // Resolve game_code or ID to actual database ID
    const actualGameId = await (0, exports.resolveGameId)(gameIdOrCode);
    console.log('[DEBUG] START placeBetService', { userId, gameId: actualGameId, betAmount, betType });
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        console.log('[DEBUG] Began DB transaction');
        // Get game data
        const gameResult = await client.query("SELECT name, category, provider FROM games WHERE id = $1 AND is_active = true", [actualGameId]);
        if (gameResult.rows.length === 0) {
            console.log('[DEBUG] Game not found or inactive');
            throw new apiError_1.ApiError("Game not found or inactive", 404);
        }
        const gameDataFromDB = gameResult.rows[0];
        const category = gameDataFromDB.category?.toLowerCase().trim() || 'slots';
        console.log('[AUDIT] Placing bet:', { userId, gameId: actualGameId, gameName: gameDataFromDB.name, category });
        // --- AUTO-GENERATE SESSION_ID FOR ROULETTE ---
        if (gameData.category === 'tablegame' &&
            gameData.name && gameData.name.toLowerCase().includes('roulette') &&
            gameData && typeof gameData === 'object') {
            // If session_id is missing or a placeholder, generate a valid one
            if (!gameData.session_id || typeof gameData.session_id !== 'string' || gameData.session_id.startsWith('roul-YYYYMMDD')) {
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const unique = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
                gameData.session_id = `roul-${yyyy}${mm}${dd}-${unique}`;
                console.log('[DEBUG] Auto-generated session_id for roulette:', gameData.session_id);
            }
            // Ensure bet_amount matches sum of chips
            if (Array.isArray(gameData.bets)) {
                const chipsSum = gameData.bets.reduce((sum, bet) => sum + (bet.chips || 0), 0);
                console.log('[DEBUG] Roulette chips sum:', chipsSum, 'bet_amount:', betAmount);
                if (chipsSum !== betAmount) {
                    console.log('[DEBUG] Chips sum does not match bet_amount');
                    throw new apiError_1.ApiError(`For roulette, bet_amount (${betAmount}) must equal the sum of chips (${chipsSum}) in bets array.`, 400);
                }
            }
        }
        // --- END ROULETTE SESSION_ID LOGIC ---
        // Validate bet amount
        if (betAmount < gameData.min_bet || betAmount > gameData.max_bet) {
            console.log('[DEBUG] Bet amount out of range', { betAmount, min_bet: gameData.min_bet, max_bet: gameData.max_bet });
            throw new apiError_1.ApiError(`Bet amount must be between $${gameData.min_bet} and $${gameData.max_bet}`, 400);
        }
        // Get user category balance from MongoDB and validate sufficient funds
        const { MongoService } = require("../mongo/mongo.service");
        await MongoService.initialize();
        // Get current category balance
        const currentBalance = await MongoService.getCategoryBalance(userId, category);
        console.log('[DEBUG] Checking category balance from MongoDB', {
            userId,
            category,
            currentBalance,
            betAmount
        });
        // Validate sufficient funds - balance should never go negative
        if (currentBalance < betAmount) {
            throw new apiError_1.ApiError(`Insufficient ${category} balance. Available: $${currentBalance.toFixed(2)}, Required: $${betAmount.toFixed(2)}`, 400);
        }
        // Use atomic operation to deduct bet amount and prevent race conditions
        const balanceUpdate = await MongoService.getAndUpdateCategoryBalance(userId, category, -betAmount);
        console.log('[DEBUG] Atomic balance update result', {
            balance_before: balanceUpdate.balance_before,
            balance_after: balanceUpdate.balance_after,
            deduction: betAmount
        });
        // Verify the balance didn't go negative after atomic update
        if (balanceUpdate.balance_after < 0) {
            // This should never happen with proper validation, but just in case
            throw new apiError_1.ApiError(`Balance validation failed. Balance would go negative: $${balanceUpdate.balance_after.toFixed(2)}`, 400);
        }
        // Get user currency
        console.log('[DEBUG] Querying user currency');
        const currencyResult = await client.query("SELECT currency FROM user_profiles WHERE user_id = $1", [userId]);
        console.log('[DEBUG] User currency result', currencyResult.rows);
        const currency = currencyResult.rows[0]?.currency || 'USD';
        // Process bet transaction using BalanceService (pass client)
        console.log('[DEBUG] Calling BalanceService.processTransaction');
        const transactionResult = await balance_service_1.BalanceService.processTransaction({
            user_id: userId,
            type: 'bet',
            amount: betAmount,
            currency: currency,
            description: `Bet placed on game ${actualGameId} (category: ${category})`,
            metadata: { game_id: actualGameId, game_data: gameData, category },
            balance_before: balanceUpdate.balance_before,
            balance_after: balanceUpdate.balance_after
        }, client);
        console.log('[DEBUG] BalanceService.processTransaction result', transactionResult);
        // Create MongoDB transaction record with correct balance values
        const mongoTransactionResult = await MongoService.insertTransaction({
            user_id: userId,
            type: 'bet',
            amount: betAmount,
            balance_before: balanceUpdate.balance_before,
            balance_after: balanceUpdate.balance_after,
            currency: currency,
            status: 'completed',
            description: `Bet placed on game ${actualGameId} (category: ${category})`,
            external_reference: `bet_${transactionResult.transaction_id}`,
            metadata: {
                game_id: actualGameId,
                game_data: gameData,
                category,
                transaction_id: transactionResult.transaction_id
            },
            created_by: userId
        });
        console.log('[DEBUG] MongoDB transaction created', mongoTransactionResult);
        // Create bet record
        console.log('[DEBUG] Inserting bet record');
        const betResult = await client.query(`
      INSERT INTO bets
      (user_id, game_id, transaction_id, bet_amount, outcome, game_data, placed_at)
      VALUES ($1, $2, $3, $4, 'pending', $5, CURRENT_TIMESTAMP)
      RETURNING id
      `, [userId, actualGameId, transactionResult.transaction_id, betAmount, gameData ? JSON.stringify(gameData) : null]);
        console.log('[DEBUG] Bet insert result', betResult.rows);
        // Create MongoDB bet record
        const mongoBetResult = await MongoService.insertBet({
            user_id: userId,
            game_id: actualGameId,
            bet_amount: betAmount,
            outcome: 'pending',
            game_data: gameData,
            transaction_id: transactionResult.transaction_id,
            mongo_transaction_id: mongoTransactionResult.insertedId,
            placed_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        });
        console.log('[DEBUG] MongoDB bet created', mongoBetResult);
        // Track per-game bet
        await client.query(`INSERT INTO user_game_bets (user_id, game_id, total_bet, total_win, total_loss, last_bet_at)
       VALUES ($1, $2, $3, 0, 0, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, game_id) DO UPDATE SET
         total_bet = user_game_bets.total_bet + $3,
         last_bet_at = CURRENT_TIMESTAMP`, [userId, actualGameId, betAmount]);
        // Record activity
        console.log('[DEBUG] Inserting user activity log');
        await client.query(`
      INSERT INTO user_activity_logs
      (user_id, action, category, description, metadata)
      VALUES ($1, 'place_bet', 'gaming', 'Placed bet on game', $2)
      `, [userId, JSON.stringify({ game_id: actualGameId, bet_amount: betAmount, bet_id: betResult.rows[0].id, category })]);
        console.log('[DEBUG] User activity log inserted');
        // Calculate affiliate commission for bet
        try {
            const { AffiliateService } = await Promise.resolve().then(() => __importStar(require('../affiliate/affiliate.service')));
            // Find affiliate relationships for this user
            const affiliateResult = await client.query('SELECT affiliate_id, level FROM affiliate_relationships WHERE referred_user_id = $1 ORDER BY level', [userId]);
            if (affiliateResult.rows.length > 0) {
                for (const relationship of affiliateResult.rows) {
                    await AffiliateService.calculateCommission(relationship.affiliate_id, userId, transactionResult.transaction_id, betAmount, 'bet_revenue');
                }
                console.log(`[AFFILIATE] Bet commission calculated for user ${userId}, ${affiliateResult.rows.length} affiliates`);
            }
        }
        catch (error) {
            console.error('[AFFILIATE] Bet commission calculation failed:', error);
            // Don't fail bet if commission calculation fails
        }
        await client.query('COMMIT');
        console.log('[AUDIT] Bet placed:', { userId, gameId: actualGameId, betAmount, betId: betResult.rows[0].id, category });
        // --- PROVIDER CALLBACK TRIGGER (optional, controlled by env) ---
        if (process.env.TRIGGER_PROVIDER_CALLBACK === 'true') {
            try {
                const axios = require('axios');
                const secret = process.env.SUPPLIER_SECRET_KEY || 'changeme';
                const command = 'changebalance';
                const request_timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                const hash = require('crypto').createHash('sha1').update(command + request_timestamp + secret).digest('hex');
                const xAuth = require('crypto').createHash('sha1').update(command + secret).digest('hex');
                const providerPayload = {
                    command,
                    request_timestamp,
                    hash,
                    data: {
                        token: (typeof gameData === 'object' && gameData.token) ? gameData.token : '',
                        user_id: userId,
                        amount: -betAmount,
                        transaction_id: `bet_${userId}_${actualGameId}_${Date.now()}`,
                        game_id: actualGameId,
                        session_id: gameData?.session_id || '',
                        currency_code: currency
                    }
                };
                const url = `${process.env.OPERATOR_HOME_URL || 'https://backend.jackpotx.net'}/innova/changebalance`;
                console.log('[PROVIDER CALLBACK] Sending:', JSON.stringify(providerPayload, null, 2));
                const providerResp = await axios.post(url, providerPayload, { headers: { 'X-Authorization': xAuth } });
                console.log('[PROVIDER CALLBACK] Response:', JSON.stringify(providerResp.data, null, 2));
            }
            catch (err) {
                console.error('[PROVIDER CALLBACK] Error:', err?.response?.data || err.message || err);
            }
        }
        // --- END PROVIDER CALLBACK TRIGGER ---
        // --- RTP CONTROL: Fetch effective RTP and use for win/loss decision ---
        const rtpResult = await postgres_1.default.query("SELECT effective_rtp FROM rtp_settings ORDER BY id DESC LIMIT 1");
        const effectiveRtp = rtpResult.rows.length > 0 ? Number(rtpResult.rows[0].effective_rtp) : 80;
        // Simulate win/loss based on RTP (for demo: random, in real use, integrate with actual game logic)
        const win = Math.random() < (effectiveRtp / 100);
        let winAmount = 0;
        if (win) {
            // For demo, win amount is 2x bet (customize as needed)
            winAmount = betAmount * 2;
        }
        // --- END RTP CONTROL ---
        // Process bet result (win/lose)
        await (0, exports.processBetResultService)(betResult.rows[0].id, win ? 'win' : 'lose', winAmount, gameData);
        // Update wagering progress for active promotions
        try {
            await promotion_service_1.PromotionService.updateWageringProgress(userId, betAmount);
        }
        catch (error) {
            console.error('[WAGERING] Error updating wagering progress:', error);
            // Don't fail the bet if wagering update fails
        }
        // After bet is processed, update RTP based on actual profit
        // Calculate total bets and total payouts for all time (or for a period)
        const profitResult = await postgres_1.default.query(`SELECT COALESCE(SUM(bet_amount),0) as total_bets, COALESCE(SUM(win_amount),0) as total_payouts FROM bets`);
        const totalBets = Number(profitResult.rows[0].total_bets);
        const totalPayouts = Number(profitResult.rows[0].total_payouts);
        const actualProfitPercent = totalBets > 0 ? ((totalBets - totalPayouts) / totalBets) * 100 : 0;
        return {
            bet_id: betResult.rows[0].id,
            transaction_id: transactionResult.transaction_id,
            bet_amount: betAmount,
            new_balance: catBalance,
            balance_before: catBalance + betAmount,
            balance_after: catBalance
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.log('[DEBUG] Error in placeBetService, transaction rolled back', error);
        throw error;
    }
    finally {
        client.release();
        console.log('[DEBUG] DB client released');
    }
};
exports.placeBetService = placeBetService;
// Process bet result (win/lose)
const processBetResultService = async (betId, outcome, winAmount = 0, gameResult) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        // Get bet details
        const betResult = await client.query("SELECT user_id, bet_amount, transaction_id, game_id FROM bets WHERE id = $1", [betId]);
        if (betResult.rows.length === 0) {
            throw new apiError_1.ApiError("Bet not found", 404);
        }
        const bet = betResult.rows[0];
        // Get game category
        const gameResultRow = await client.query("SELECT category FROM games WHERE id = $1", [bet.game_id]);
        const category = (gameResultRow.rows[0]?.category || '').toLowerCase().trim();
        console.log('[AUDIT] Processing bet result:', { betId, userId: bet.user_id, gameId: bet.game_id, category });
        // Update bet with result
        await client.query(`
      UPDATE bets 
      SET outcome = $1, win_amount = $2, result_at = CURRENT_TIMESTAMP, game_data = $3
      WHERE id = $4
      `, [outcome, winAmount, gameResult ? JSON.stringify(gameResult) : null, betId]);
        if (outcome === 'win' && winAmount > 0) {
            // Add win to category balance
            // Get and update category balance from MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            let catBalance = await MongoService.getCategoryBalance(bet.user_id, category);
            catBalance += Number(winAmount);
            await MongoService.updateCategoryBalance(bet.user_id, category, catBalance);
            // Track per-game win
            await client.query(`INSERT INTO user_game_bets (user_id, game_id, total_bet, total_win, total_loss, last_bet_at, last_result_at)
         VALUES ($1, $2, 0, $3, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, game_id) DO UPDATE SET
           total_win = user_game_bets.total_win + $3,
           last_result_at = CURRENT_TIMESTAMP`, [bet.user_id, bet.game_id, winAmount]);
            // Create win transaction
            const winTransactionResult = await client.query(`
        INSERT INTO transactions 
        (user_id, type, amount, balance_before, balance_after, currency, status, description, metadata, created_by)
        VALUES ($1, 'win', $2, $3, $4, 'USD', 'completed', $5, $6, $1)
        RETURNING id
        `, [
                bet.user_id,
                winAmount,
                catBalance - winAmount,
                catBalance,
                'Bet win',
                JSON.stringify({
                    bet_id: betId,
                    game_id: bet.game_id,
                    category: category,
                    outcome: outcome
                })
            ]);
            // Calculate affiliate commission for win
            try {
                const { AffiliateService } = await Promise.resolve().then(() => __importStar(require('../affiliate/affiliate.service')));
                // Find affiliate relationships for this user
                const affiliateResult = await client.query('SELECT affiliate_id, level FROM affiliate_relationships WHERE referred_user_id = $1 ORDER BY level', [bet.user_id]);
                if (affiliateResult.rows.length > 0) {
                    for (const relationship of affiliateResult.rows) {
                        await AffiliateService.calculateCommission(relationship.affiliate_id, bet.user_id, winTransactionResult.rows[0].id, winAmount, 'win_revenue');
                    }
                    console.log(`[AFFILIATE] Win commission calculated for user ${bet.user_id}, ${affiliateResult.rows.length} affiliates`);
                }
            }
            catch (error) {
                console.error('[AFFILIATE] Win commission calculation failed:', error);
                // Don't fail win processing if commission calculation fails
            }
            // Log win activity
            await logUserActivity(bet.user_id, 'win', 'game', `Won $${winAmount} from bet`, {
                bet_id: betId,
                game_id: bet.game_id,
                win_amount: winAmount,
                category: category
            });
        }
        else {
            // Track per-game loss
            await client.query(`INSERT INTO user_game_bets (user_id, game_id, total_bet, total_win, total_loss, last_bet_at, last_result_at)
         VALUES ($1, $2, 0, 0, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, game_id) DO UPDATE SET
           total_loss = user_game_bets.total_loss + $3,
           last_result_at = CURRENT_TIMESTAMP`, [bet.user_id, bet.game_id, bet.bet_amount]);
            // Calculate affiliate commission for loss (loss commission)
            try {
                const { AffiliateService } = await Promise.resolve().then(() => __importStar(require('../affiliate/affiliate.service')));
                // Find affiliate relationships for this user
                const affiliateResult = await client.query('SELECT affiliate_id, level FROM affiliate_relationships WHERE referred_user_id = $1 ORDER BY level', [bet.user_id]);
                if (affiliateResult.rows.length > 0) {
                    for (const relationship of affiliateResult.rows) {
                        await AffiliateService.calculateCommission(relationship.affiliate_id, bet.user_id, bet.transaction_id, bet.bet_amount, 'loss_revenue');
                    }
                    console.log(`[AFFILIATE] Loss commission calculated for user ${bet.user_id}, ${affiliateResult.rows.length} affiliates`);
                }
            }
            catch (error) {
                console.error('[AFFILIATE] Loss commission calculation failed:', error);
                // Don't fail loss processing if commission calculation fails
            }
            // Log loss activity
            await logUserActivity(bet.user_id, 'lose', 'game', `Lost $${bet.bet_amount} from bet`, {
                bet_id: betId,
                game_id: bet.game_id,
                loss_amount: bet.bet_amount,
                category: category
            });
        }
        await client.query('COMMIT');
        console.log('[DEBUG] Bet result processed successfully');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('[DEBUG] Error in processBetResultService:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.processBetResultService = processBetResultService;
// Get game statistics (supports game_code or ID)
const getGameStatisticsService = async (gameIdOrCode) => {
    // Resolve game_code or ID to actual database ID
    const actualGameId = await (0, exports.resolveGameId)(gameIdOrCode);
    const result = await postgres_1.default.query(`
    SELECT
      g.id,
      g.name,
      g.provider,
      g.category,
      COUNT(DISTINCT b.id) as total_bets,
      COUNT(DISTINCT b.user_id) as unique_players,
      COALESCE(SUM(b.bet_amount), 0) as total_wagered,
      COALESCE(SUM(b.win_amount), 0) as total_won,
      COALESCE(AVG(b.bet_amount), 0) as avg_bet_amount,
      COUNT(CASE WHEN b.outcome = 'win' THEN 1 END) as total_wins,
      COUNT(CASE WHEN b.outcome = 'lose' THEN 1 END) as total_losses,
      MAX(b.placed_at) as last_bet_at
    FROM games g
    LEFT JOIN bets b ON g.id = b.game_id
    WHERE g.id = $1
    GROUP BY g.id, g.name, g.provider, g.category
    `, [actualGameId]);
    if (result.rows.length === 0) {
        throw new apiError_1.ApiError("Game not found", 404);
    }
    return result.rows[0];
};
exports.getGameStatisticsService = getGameStatisticsService;
// Get popular games (by bet count)
const getPopularGamesService = async (limit = 10, offset = 0, search) => {
    let query = `
    SELECT
      g.id,
      g.name,
      g.provider,
      g.category,
      g.image_url,
      g.thumbnail_url,
      COUNT(DISTINCT b.id) as bet_count,
      COUNT(DISTINCT b.user_id) as player_count,
      COALESCE(SUM(b.bet_amount), 0) as total_wagered
    FROM games g
    LEFT JOIN bets b ON g.id = b.game_id
    WHERE g.is_active = TRUE
  `;
    const params = [];
    let paramCount = 0;
    if (search) {
        paramCount++;
        query += ` AND (g.name ILIKE $${paramCount} OR g.provider ILIKE $${paramCount} OR g.game_code ILIKE $${paramCount})`;
        params.push(`%${search}%`);
    }
    query += ` GROUP BY g.id, g.name, g.provider, g.category, g.image_url, g.thumbnail_url`;
    query += ` ORDER BY bet_count DESC, total_wagered DESC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    const result = await postgres_1.default.query(query, params);
    return result.rows;
};
exports.getPopularGamesService = getPopularGamesService;
// Generate unique game session token (20-50 alphanumeric characters)
const generateGameSessionToken = (userId, gameId) => {
    const timestamp = Date.now();
    const randomBytes = crypto_1.default.randomBytes(16).toString('hex');
    const baseString = `${userId}_${gameId}_${timestamp}_${randomBytes}`;
    // Generate SHA1 hash and take first 32 characters (alphanumeric only)
    const hash = crypto_1.default.createHash('sha1').update(baseString).digest('hex');
    return hash.substring(0, 32);
};
// Get play URL and related info from provider (supports game_code or ID)
const getGamePlayInfoService = async (gameIdOrCode, userId) => {
    // 1. Fetch game info (getGameByIdService already supports game_code lookup)
    const game = await (0, exports.getGameByIdService)(gameIdOrCode);
    // 1.5 Check if this is a JxOriginals game and route through GameRouterService
    if (game.provider === 'JxOriginals') {
        console.log('[GAME_SERVICE] Detected JxOriginals game, routing through GameRouterService');
        const { GameRouterService } = require("./game-router.service");
        const launchResponse = await GameRouterService.launchGame({
            gameId: game.id, // Use the resolved database ID
            userId,
            currency: undefined, // Will be fetched from user profile
            language: 'en',
            mode: 'real'
        });
        // Return in the same format as the rest of this function
        return {
            play_url: launchResponse.play_url,
            game: launchResponse.game,
            session_info: launchResponse.session
        };
    }
    // 2. Get user info and balance from category balances
    const userResult = await postgres_1.default.query(`SELECT u.id, u.username, u.email, up.currency
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     WHERE u.id = $1`, [userId]);
    if (userResult.rows.length === 0) {
        throw new apiError_1.ApiError("User not found", 404);
    }
    const user = userResult.rows[0];
    // 3. Get category-specific balance, fallback to main balance if not found
    const category = game.category?.toLowerCase().trim() || 'slots';
    let balanceResult = await postgres_1.default.query(`SELECT balance FROM user_category_balances
     WHERE user_id = $1 AND LOWER(TRIM(category)) = $2`, [userId, category]);
    let userBalance = 0;
    if (balanceResult.rows.length > 0) {
        userBalance = balanceResult.rows[0].balance;
    }
    else {
        // Fallback to main balance if category balance not found
        const mainBalanceResult = await postgres_1.default.query(`SELECT balance FROM user_balances WHERE user_id = $1`, [userId]);
        userBalance = mainBalanceResult.rows.length > 0 ? mainBalanceResult.rows[0].balance : 0;
    }
    // 3.5 Check if this is an IGPX game (provider: IGPixel or category: sportsbook)
    if (game.provider?.toLowerCase() === 'igpixel' || game.category?.toLowerCase() === 'sportsbook') {
        // Use IGPX payment gateway to create session
        const { getPaymentGatewayByCodeService } = require("../admin/payment-gateway.service");
        const igpxGateway = await getPaymentGatewayByCodeService('igpx');
        if (!igpxGateway || !igpxGateway.is_active) {
            throw new apiError_1.ApiError("IGPX gateway not available", 500);
        }
        const { PaymentIntegrationService } = require("../payment/payment-integration.service");
        const paymentService = PaymentIntegrationService.getInstance();
        const config = {
            api_key: igpxGateway.api_key,
            api_secret: igpxGateway.api_secret,
            api_endpoint: igpxGateway.api_endpoint,
            merchant_id: igpxGateway.merchant_id,
            payout_api_key: igpxGateway.payout_api_key,
            webhook_url: igpxGateway.webhook_url,
            webhook_secret: igpxGateway.webhook_secret,
            config: igpxGateway.config,
        };
        // Create IGPX session using payment integration
        const sessionResult = await paymentService.createPayment('igpx', config, {
            amount: 0, // No upfront payment for sportsbook
            currency: user.currency || 'USD',
            order_id: `igpx_${userId}_${Date.now()}`,
            metadata: {
                user_id: userId,
                language: 'en',
                balance: userBalance
            }
        });
        if (!sessionResult.success || !sessionResult.payment_url) {
            throw new apiError_1.ApiError(sessionResult.message || "Failed to create IGPX session", 500);
        }
        // Log game launch activity for IGPX
        await postgres_1.default.query(`INSERT INTO user_activity_logs
       (user_id, action, category, description, metadata)
       VALUES ($1, 'launch_game', 'gaming', $2, $3)`, [
            userId,
            `Launched ${game.name}`,
            JSON.stringify({
                game_id: game.id,
                game_name: game.name,
                provider: game.provider,
                session_url: sessionResult.payment_url,
                user_balance: userBalance,
                category: category,
                currency: user.currency
            })
        ]);
        return {
            play_url: sessionResult.payment_url,
            game: {
                ...game
            },
            session_info: {
                transaction_id: sessionResult.transaction_id,
                user_id: userId,
                balance: userBalance,
                currency: user.currency,
                provider: 'igpx'
            }
        };
    }
    // 4. Generate play URL using environment variable
    // Use different launcher for Pragmatic Play games
    let supplierLaunchHost;
    if (game.provider?.toLowerCase().includes('pragmatic') || game.vendor?.toLowerCase().includes('pragmatic')) {
        supplierLaunchHost = process.env.PRAGMATIC_LAUNCH_HOST || 'https://run.games378.com';
        console.log('[PRAGMATIC] Using Pragmatic Play launcher:', supplierLaunchHost);
    }
    else {
        supplierLaunchHost = process.env.SUPPLIER_LAUNCH_HOST;
    }
    if (!supplierLaunchHost) {
        throw new apiError_1.ApiError("Supplier launch host not configured", 500);
    }
    // 5. Get operator ID from environment
    const operatorId = process.env.SUPPLIER_OPERATOR_ID;
    if (!operatorId) {
        throw new apiError_1.ApiError("Supplier operator ID not configured", 500);
    }
    // 6. Generate unique token (20-50 alphanumeric characters)
    const token = generateGameSessionToken(userId, game.id);
    // 7. Insert or upsert the token into the tokens table for this user
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 30); // 30 days expiry
    try {
        await postgres_1.default.query(`INSERT INTO tokens (user_id, access_token, refresh_token, expired_at, is_active, game_id, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (access_token) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         refresh_token = EXCLUDED.refresh_token,
         expired_at = EXCLUDED.expired_at,
         is_active = EXCLUDED.is_active,
         game_id = EXCLUDED.game_id,
         category = EXCLUDED.category`, [userId, token, 'refresh_token_for_' + token, tokenExpiry, true, game.id, game.category]);
        console.log('[DEBUG][TOKEN_TRACE] Token inserted/updated in DB:', token);
    }
    catch (err) {
        console.error('[DEBUG][TOKEN_TRACE] Error inserting token:', err);
        throw err;
    }
    // 8. Generate session ID once to ensure consistency
    const sessionId = `${userId}_${game.id}_${Date.now()}`;
    // 9. Build URL according to provider documentation with all required parameters
    const params = new URLSearchParams({
        mode: 'real',
        game_id: game.game_code,
        token: token,
        user_id: userId.toString(),
        currency: user.currency || 'USD',
        language: 'en', // TODO: Get from user preferences
        operator_id: operatorId,
        home_url: process.env.OPERATOR_HOME_URL || 'https://backend.jackpotx.net',
        callback_url: process.env.SUPPLIER_CALLBACK_URL || `${process.env.OPERATOR_HOME_URL || 'https://backend.jackpotx.net'}/innova/`,
        balance: userBalance.toString(),
        session_id: sessionId
    });
    const originalPlayUrl = `${supplierLaunchHost}/?${params.toString()}`;
    // 9.5 Wrap play URL in proxy to mask IP address (rotating proxy or VPS proxy)
    let playUrl = originalPlayUrl;
    let proxySessionId = null;
    const proxyEnabled = process.env.USE_ROTATING_PROXY === 'true' || process.env.VPS_PROXY_ENABLED === 'true';
    if (proxyEnabled) {
        const { createProxyUrl } = require('./game-proxy.service');
        const proxyResult = createProxyUrl(originalPlayUrl, userId, game.id);
        playUrl = proxyResult.proxyUrl;
        proxySessionId = proxyResult.sessionId;
    }
    // --- EXTRA LOGGING FOR DEBUGGING TOKEN/SESSION ISSUES ---
    console.log('[DEBUG][GAME PLAY URL]', {
        userId,
        gameId: game.id,
        token,
        tokenExpiry: tokenExpiry.toISOString(),
        originalPlayUrl,
        playUrl,
        proxySessionId,
        proxyEnabled
    });
    // 10. Log game launch activity
    await postgres_1.default.query(`
    INSERT INTO user_activity_logs
    (user_id, action, category, description, metadata)
    VALUES ($1, 'launch_game', 'gaming', $2, $3)
    `, [
        userId,
        `Launched ${game.name}`,
        JSON.stringify({
            game_id: game.id,
            game_name: game.name,
            game_code: game.game_code,
            provider: game.provider,
            session_token: token,
            original_play_url: originalPlayUrl,
            proxied_play_url: playUrl,
            proxy_session_id: proxySessionId,
            proxy_enabled: true,
            user_balance: userBalance,
            category: category,
            currency: user.currency,
            session_id: sessionId
        })
    ]);
    // 11. Return all relevant info
    return {
        play_url: playUrl,
        game: {
            ...game
        },
        session_info: {
            token: token,
            user_id: userId,
            balance: userBalance,
            currency: user.currency,
            session_id: sessionId
        }
    };
};
exports.getGamePlayInfoService = getGamePlayInfoService;
const getBetResultsService = async (userId, limit = 50) => {
    let query = `
    SELECT b.id as bet_id, b.user_id, u.username, b.game_id, g.name as game_name, g.category, b.bet_amount, b.win_amount, b.outcome, b.placed_at, b.result_at
    FROM bets b
    JOIN users u ON b.user_id = u.id
    JOIN games g ON b.game_id = g.id
  `;
    const params = [];
    if (userId) {
        query += ' WHERE b.user_id = $1';
        params.push(userId);
    }
    query += ' ORDER BY b.placed_at DESC';
    if (limit) {
        query += userId ? ' LIMIT $2' : ' LIMIT $1';
        params.push(limit);
    }
    const result = await postgres_1.default.query(query, params);
    return result.rows;
};
exports.getBetResultsService = getBetResultsService;
// Get games by category with simplified data
const getGamesByCategoryService = async (filters) => {
    const { category, limit = 50 } = filters;
    let query = `
    SELECT 
      id,
      name,
      provider,
      category,
      subcategory,
      image_url,
      thumbnail_url,
      game_code,
      rtp_percentage,
      volatility,
      min_bet,
      max_bet,
      max_win,
      is_featured,
      is_new,
      is_hot,
      is_active,
      created_at
    FROM games 
    WHERE is_active = TRUE
  `;
    const params = [];
    let paramCount = 0;
    if (category) {
        paramCount++;
        query += ` AND LOWER(category) = LOWER($${paramCount})`;
        params.push(category);
    }
    query += ` ORDER BY is_featured DESC, is_hot DESC, is_new DESC, name ASC`;
    query += ` LIMIT $${paramCount + 1}`;
    params.push(limit);
    const result = await postgres_1.default.query(query, params);
    return result.rows;
};
exports.getGamesByCategoryService = getGamesByCategoryService;
// Cancel game transaction service
const cancelGameService = async (userId, transactionId, gameId, reason) => {
    const client = await postgres_1.default.connect();
    try {
        await client.query('BEGIN');
        console.log(`[CANCEL_GAME] Starting cancellation for user ${userId}, transaction ${transactionId}`);
        // 0. Check if transaction is already cancelled (idempotency check)
        const existingCancellation = await client.query(`SELECT id, original_transaction_id, original_type, original_amount, balance_adjustment, cancelled_by, created_at
       FROM cancellation_tracking 
       WHERE original_transaction_id = $1 AND user_id = $2
       LIMIT 1`, [transactionId, userId]);
        if (existingCancellation.rows.length > 0) {
            const cancellation = existingCancellation.rows[0];
            console.log(`[CANCEL_GAME] Transaction ${transactionId} already cancelled at ${cancellation.created_at}`);
            await client.query('COMMIT');
            return {
                success: true,
                transaction_id: transactionId,
                original_type: cancellation.original_type,
                original_amount: cancellation.original_amount,
                balance_adjustment: cancellation.balance_adjustment,
                status: 'CANCELED',
                message: 'Transaction already cancelled',
                cancelled_at: cancellation.created_at,
                cancelled_by: cancellation.cancelled_by
            };
        }
        // 1. Validate transaction exists and belongs to user
        let transaction = null;
        // First try to find in PostgreSQL by external_reference
        const transactionResult = await client.query(`SELECT id, type, amount, status, balance_before, balance_after, currency, metadata, external_reference 
       FROM transactions 
       WHERE external_reference = $1 AND user_id = $2 AND status != 'cancelled'
       LIMIT 1`, [transactionId, userId]);
        if (transactionResult.rows.length > 0) {
            transaction = transactionResult.rows[0];
        }
        else {
            // If not found in PostgreSQL, try to find in MongoDB by external_reference first
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // Try to find by external_reference in MongoDB
            const mongoTransactionByRef = await MongoService.getTransactionsCollection().findOne({
                external_reference: transactionId,
                user_id: userId,
                status: { $ne: 'cancelled' }
            });
            if (mongoTransactionByRef) {
                transaction = mongoTransactionByRef;
            }
            else {
                // If not found by external_reference, try to find by ID
                const mongoTransaction = await MongoService.getTransactionById(parseInt(transactionId));
                if (mongoTransaction && mongoTransaction.user_id === userId && mongoTransaction.status !== 'cancelled') {
                    transaction = mongoTransaction;
                }
            }
        }
        if (!transaction) {
            throw new apiError_1.ApiError("Transaction not found or already cancelled", 404);
        }
        console.log(`[CANCEL_GAME] Found transaction: ${JSON.stringify(transaction)}`);
        // 2. Validate transaction type (only bet and win can be cancelled)
        if (!['bet', 'win'].includes(transaction.type)) {
            throw new apiError_1.ApiError("Only bet and win transactions can be cancelled", 400);
        }
        // 3. Parse metadata to get category
        let category = null;
        let metadata = null;
        if (transaction.metadata) {
            try {
                metadata = typeof transaction.metadata === 'string'
                    ? JSON.parse(transaction.metadata)
                    : transaction.metadata;
                category = metadata.category;
            }
            catch (error) {
                console.log(`[CANCEL_GAME] Error parsing metadata:`, error);
            }
        }
        // 4. Calculate balance adjustment
        const transactionAmount = Number(transaction.amount) || 0;
        let balanceAdjustment = 0;
        let adjustmentDescription = '';
        if (transaction.type === 'bet') {
            // Cancel BET = ADD funds back to balance (bet was deducted, so add it back)
            balanceAdjustment = Math.abs(transactionAmount); // Use absolute value for bet cancellation
            adjustmentDescription = `Cancelled bet refund: +$${Math.abs(transactionAmount).toFixed(2)}`;
            console.log(`[CANCEL_GAME] Cancelling BET - ADDING $${Math.abs(transactionAmount).toFixed(2)} back to balance`);
        }
        else if (transaction.type === 'win') {
            // Cancel WIN = DEDUCT funds from balance (win was added, so deduct it back)
            balanceAdjustment = -Math.abs(transactionAmount); // Use absolute value for win cancellation
            adjustmentDescription = `Cancelled win reversal: -$${Math.abs(transactionAmount).toFixed(2)}`;
            console.log(`[CANCEL_GAME] Cancelling WIN - DEDUCTING $${Math.abs(transactionAmount).toFixed(2)} from balance`);
        }
        // 5. Update balance based on category or main balance
        let updatedBalance = 0;
        if (category) {
            // Update category balance in MongoDB
            const { MongoService } = require("../mongo/mongo.service");
            await MongoService.initialize();
            // CRITICAL FIX: Use the balance that existed BEFORE the transaction was processed
            // This ensures we only cancel the specific transaction, not affect subsequent transactions
            const balanceBeforeTransaction = transaction.balance_before || 0;
            const newCategoryBalance = balanceBeforeTransaction + balanceAdjustment;
            console.log(`[CANCEL_GAME] Category balance adjustment: $${balanceBeforeTransaction} + $${balanceAdjustment} = $${newCategoryBalance}`);
            console.log(`[CANCEL_GAME] Original transaction balance_before: ${transaction.balance_before}, balance_after: ${transaction.balance_after}`);
            await MongoService.updateCategoryBalance(userId, category, newCategoryBalance);
            updatedBalance = newCategoryBalance;
        }
        else {
            // Update main balance
            const mainBalanceResult = await client.query('SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE', [userId]);
            if (mainBalanceResult.rows.length === 0) {
                throw new apiError_1.ApiError("User balance record not found", 404);
            }
            const currentBalance = currency_utils_1.CurrencyUtils.safeParseBalance(mainBalanceResult.rows[0].balance);
            const newBalance = currentBalance + balanceAdjustment;
            console.log(`[CANCEL_GAME] Main balance adjustment: $${currentBalance} + $${balanceAdjustment} = $${newBalance}`);
            await client.query('UPDATE user_balances SET balance = $1 WHERE user_id = $2', [parseFloat(newBalance.toFixed(2)), userId]);
            updatedBalance = parseFloat(newBalance.toFixed(2));
        }
        // 6. Create adjustment transaction
        let adjustmentTransactionId;
        // Always create adjustment transaction in MongoDB for consistency
        const { MongoService } = require("../mongo/mongo.service");
        await MongoService.initialize();
        const adjustmentTransactionData = {
            user_id: userId,
            type: 'adjustment',
            amount: Math.abs(balanceAdjustment),
            balance_before: balanceBeforeTransaction,
            balance_after: updatedBalance,
            currency: transaction.currency || 'USD',
            external_reference: `cancel_${transactionId}`,
            description: adjustmentDescription,
            metadata: {
                category: category,
                original_transaction: transactionId,
                original_transaction_type: transaction.type,
                original_amount: transactionAmount,
                reason: reason,
                game_id: gameId
            },
            status: 'completed'
        };
        const adjustmentTransaction = await MongoService.insertTransaction(adjustmentTransactionData);
        adjustmentTransactionId = adjustmentTransaction.id;
        // Also create adjustment transaction in PostgreSQL for compatibility
        const adjustmentTransactionResult = await client.query(`INSERT INTO transactions 
       (user_id, type, amount, balance_before, balance_after, currency, external_reference, description, metadata, status)
       VALUES ($1, 'adjustment', $2, $3, $4, $5, $6, $7, $8, 'completed')
       RETURNING id`, [
            userId,
            Math.abs(balanceAdjustment),
            balanceBeforeTransaction,
            updatedBalance,
            transaction.currency || 'USD',
            `cancel_${transactionId}`,
            adjustmentDescription,
            JSON.stringify({
                original_transaction: transactionId,
                original_transaction_type: transaction.type,
                original_amount: transactionAmount,
                reason: reason,
                game_id: gameId,
                mongo_transaction_id: adjustmentTransaction.id
            })
        ]);
        // 7. Update original transaction status to cancelled
        if (transaction._id) {
            // MongoDB transaction - update by external_reference if that's what was passed
            const { MongoService } = require("../mongo/mongo.service");
            if (transactionId === transaction.external_reference) {
                // Update by external_reference
                await MongoService.getTransactionsCollection().updateOne({ external_reference: transactionId, user_id: userId }, { $set: { status: 'cancelled' } });
            }
            else {
                // Update by ID
                await MongoService.updateTransaction(transaction.id, { status: 'cancelled' });
            }
        }
        else {
            // PostgreSQL transaction
            await client.query("UPDATE transactions SET status = 'cancelled' WHERE external_reference = $1 AND user_id = $2", [transactionId, userId]);
        }
        // 8. Update bet outcome to cancelled if it exists (both MongoDB and PostgreSQL)
        // Update in MongoDB - find bet by transaction_id
        await MongoService.getBetsCollection().updateOne({ transaction_id: transaction.id, user_id: userId }, { $set: { outcome: 'cancelled' } });
        // Update in PostgreSQL for compatibility
        await client.query("UPDATE bets SET outcome = 'cancelled' WHERE transaction_id = (SELECT id FROM transactions WHERE external_reference = $1 AND user_id = $2 LIMIT 1)", [transactionId, userId]);
        // 9. Log cancellation activity
        await client.query(`INSERT INTO user_activity_logs (user_id, action, category, description, metadata, created_by) 
       VALUES ($1, 'cancel_transaction', 'gaming', $2, $3, $1)`, [
            userId,
            `Cancelled ${transaction.type} transaction`,
            JSON.stringify({
                transaction_id: transactionId,
                original_type: transaction.type,
                original_amount: transactionAmount,
                balance_adjustment: balanceAdjustment,
                reason: reason,
                game_id: gameId,
                category: category
            })
        ]);
        // 10. Track cancellation in cancellation_tracking table
        await client.query(`INSERT INTO cancellation_tracking (
        user_id, transaction_id, original_transaction_id, original_type, 
        original_amount, balance_adjustment, reason, game_id, category,
        currency, balance_before, balance_after, adjustment_transaction_id, cancelled_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
            userId,
            `cancel_${transactionId}`,
            transactionId,
            transaction.type,
            transactionAmount,
            balanceAdjustment,
            reason,
            gameId,
            category,
            transaction.currency || 'USD',
            balanceBeforeTransaction,
            updatedBalance,
            adjustmentTransactionId,
            'user'
        ]);
        await client.query('COMMIT');
        console.log(`[CANCEL_GAME] Successfully cancelled transaction ${transactionId} for user ${userId}`);
        return {
            success: true,
            transaction_id: transactionId,
            original_type: transaction.type,
            original_amount: transactionAmount,
            balance_adjustment: balanceAdjustment,
            new_balance: updatedBalance,
            currency: transaction.currency || 'USD',
            category: category,
            adjustment_transaction_id: adjustmentTransactionId
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error(`[CANCEL_GAME] Error cancelling transaction:`, error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.cancelGameService = cancelGameService;
