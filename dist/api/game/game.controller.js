"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelGame = exports.getGamesByCategory = exports.getBetResults = exports.getGameDataSample = exports.playGame = exports.getAvailableGamesLegacy = exports.processBetResult = exports.placeBet = exports.recordGamePlay = exports.toggleGameFavorite = exports.getGameStatistics = exports.getPopularGames = exports.getHotGames = exports.getNewGames = exports.getFeaturedGames = exports.getGameProviders = exports.getGameCategories = exports.getGameById = exports.getAvailableGames = void 0;
const game_service_1 = require("../../services/game/game.service");
// Get all available games with filtering
const getAvailableGames = async (req, res, next) => {
    try {
        const filters = req.query;
        const games = await (0, game_service_1.getAvailableGamesService)(filters);
        res.status(200).json({ success: true, data: games });
    }
    catch (err) {
        next(err);
    }
};
exports.getAvailableGames = getAvailableGames;
// Get game by ID
const getGameById = async (req, res, next) => {
    try {
        const gameId = parseInt(req.params.id);
        if (isNaN(gameId)) {
            res.status(400).json({ success: false, message: "Invalid game ID" });
            return;
        }
        const game = await (0, game_service_1.getGameByIdService)(gameId);
        res.status(200).json({ success: true, data: game });
    }
    catch (err) {
        next(err);
    }
};
exports.getGameById = getGameById;
// Get game categories
const getGameCategories = async (req, res, next) => {
    try {
        const categories = await (0, game_service_1.getGameCategoriesService)();
        res.status(200).json({ success: true, data: categories });
    }
    catch (err) {
        next(err);
    }
};
exports.getGameCategories = getGameCategories;
// Get game providers (optionally filtered by category)
const getGameProviders = async (req, res, next) => {
    try {
        const category = req.query.category;
        const providers = await (0, game_service_1.getGameProvidersService)(category);
        res.status(200).json({ success: true, data: providers });
    }
    catch (err) {
        next(err);
    }
};
exports.getGameProviders = getGameProviders;
// Get featured games
const getFeaturedGames = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const games = await (0, game_service_1.getFeaturedGamesService)(limit);
        res.status(200).json({ success: true, data: games });
    }
    catch (err) {
        next(err);
    }
};
exports.getFeaturedGames = getFeaturedGames;
// Get new games
const getNewGames = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const games = await (0, game_service_1.getNewGamesService)(limit, offset, search);
        res.status(200).json({ success: true, data: games });
    }
    catch (err) {
        next(err);
    }
};
exports.getNewGames = getNewGames;
// Get hot games
const getHotGames = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const games = await (0, game_service_1.getHotGamesService)(limit, offset, search);
        res.status(200).json({ success: true, data: games });
    }
    catch (err) {
        next(err);
    }
};
exports.getHotGames = getHotGames;
// Get popular games
const getPopularGames = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const games = await (0, game_service_1.getPopularGamesService)(limit, offset, search);
        res.status(200).json({ success: true, data: games });
    }
    catch (err) {
        next(err);
    }
};
exports.getPopularGames = getPopularGames;
// Get game statistics
const getGameStatistics = async (req, res, next) => {
    try {
        const gameId = parseInt(req.params.id);
        if (isNaN(gameId)) {
            res.status(400).json({ success: false, message: "Invalid game ID" });
            return;
        }
        const statistics = await (0, game_service_1.getGameStatisticsService)(gameId);
        res.status(200).json({ success: true, data: statistics });
    }
    catch (err) {
        next(err);
    }
};
exports.getGameStatistics = getGameStatistics;
// Toggle game favorite status
const toggleGameFavorite = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { game_id } = req.validated?.body;
        const result = await (0, game_service_1.toggleGameFavoriteService)(userId, game_id);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
};
exports.toggleGameFavorite = toggleGameFavorite;
// Record game play
const recordGamePlay = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { game_id, play_time_seconds } = req.validated?.body;
        await (0, game_service_1.recordGamePlayService)(userId, game_id, play_time_seconds || 0);
        res.status(200).json({ success: true, message: "Game play recorded successfully" });
    }
    catch (err) {
        next(err);
    }
};
exports.recordGamePlay = recordGamePlay;
// Place a bet
const placeBet = async (req, res, next) => {
    try {
        const adminUserId = req.user?.userId;
        if (!adminUserId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        let { game_id, bet_amount, game_data, user_id } = req.validated?.body;
        // Use user_id from request body if provided (for admin operations), otherwise use authenticated user
        const userId = user_id || adminUserId;
        // If game_data is missing or empty, auto-generate it
        if (!game_data || (typeof game_data === 'object' && Object.keys(game_data).length === 0)) {
            // Fetch game details
            const game = await (0, game_service_1.getGameByIdService)(game_id);
            let gameDataSample = {};
            switch (game.category) {
                case "tablegame":
                    if (game.name.toLowerCase().includes("roulette")) {
                        // Generate bets array to match bet_amount
                        // Use a single straight bet if possible
                        gameDataSample = {
                            bets: [
                                { bet_type: "straight", number: 17, chips: bet_amount }
                            ],
                            session_id: "roul-YYYYMMDD-001"
                        };
                    }
                    else if (game.name.toLowerCase().includes("blackjack")) {
                        gameDataSample = {
                            hand_id: "bj-YYYYMMDD-001",
                            action: "hit",
                            player_cards: ["10H", "7C"],
                            dealer_card: "9S"
                        };
                    }
                    else {
                        gameDataSample = { info: "No template available for this table game." };
                    }
                    break;
                case "slot":
                    gameDataSample = {
                        lines: 1,
                        bet_per_line: bet_amount,
                        spin_id: "slot-YYYYMMDD-001"
                    };
                    break;
                default:
                    gameDataSample = { info: "No template available for this game type." };
            }
            game_data = gameDataSample;
        }
        const { MongoHybridService } = require('../../services/mongo/mongo-hybrid.service');
        const mongoHybridService = new MongoHybridService();
        const result = await mongoHybridService.placeBet(userId, game_id, bet_amount, game_data);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
};
exports.placeBet = placeBet;
// Process bet result (admin only)
const processBetResult = async (req, res, next) => {
    try {
        const { bet_id, outcome, win_amount, game_result } = req.validated?.body;
        const { MongoHybridService } = require('../../services/mongo/mongo-hybrid.service');
        const mongoHybridService = new MongoHybridService();
        const result = await mongoHybridService.processBetResult(bet_id, outcome, win_amount || 0, game_result);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
};
exports.processBetResult = processBetResult;
// Keep the old function for backward compatibility
const getAvailableGamesLegacy = (req, res) => {
    res.json({
        message: "List of available games",
        games: [
            { id: 1, name: "Blackjack" },
            { id: 2, name: "Roulette" },
            { id: 3, name: "Poker" },
        ],
    });
};
exports.getAvailableGamesLegacy = getAvailableGamesLegacy;
// Play game (get play URL and info from provider)
const playGame = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { game_id } = req.validated?.body;
        if (!game_id && game_id !== 0) {
            res.status(400).json({ success: false, message: "game_id is required" });
            return;
        }
        const playInfo = await (0, game_service_1.getGamePlayInfoService)(game_id, userId);
        res.status(200).json({ success: true, data: playInfo });
    }
    catch (err) {
        next(err);
    }
};
exports.playGame = playGame;
const getGameDataSample = async (req, res) => {
    const gameId = parseInt(req.params.id);
    if (isNaN(gameId)) {
        res.status(400).json({ success: false, message: "Invalid game ID" });
        return;
    }
    // Fetch game details
    const game = await (0, game_service_1.getGameByIdService)(gameId);
    if (!game) {
        res.status(404).json({ success: false, message: "Game not found" });
        return;
    }
    // Generate sample game_data based on game type/provider
    let gameDataSample = {};
    switch (game.category) {
        case "tablegame":
            if (game.name.toLowerCase().includes("roulette")) {
                gameDataSample = {
                    bets: [
                        { bet_type: "straight", number: 17, chips: 5 },
                        { bet_type: "red", chips: 10 }
                    ],
                    session_id: "roul-YYYYMMDD-001"
                };
            }
            else if (game.name.toLowerCase().includes("blackjack")) {
                gameDataSample = {
                    hand_id: "bj-YYYYMMDD-001",
                    action: "hit",
                    player_cards: ["10H", "7C"],
                    dealer_card: "9S"
                };
            }
            else {
                gameDataSample = { info: "No template available for this table game." };
            }
            break;
        case "slot":
            gameDataSample = {
                lines: 20,
                bet_per_line: 1,
                spin_id: "slot-YYYYMMDD-001"
            };
            break;
        default:
            gameDataSample = { info: "No template available for this game type." };
    }
    res.status(200).json({ success: true, data: gameDataSample });
};
exports.getGameDataSample = getGameDataSample;
const getBetResults = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const role = req.user?.role;
        const isAdmin = role && (role === 'Admin' || role === 'admin');
        let targetUserId = userId;
        let limit = parseInt(req.query.limit) || 50;
        if (isAdmin && req.query.user_id) {
            targetUserId = parseInt(req.query.user_id);
        }
        const { MongoHybridService } = require('../../services/mongo/mongo-hybrid.service');
        const mongoHybridService = new MongoHybridService();
        // Get bets from MongoDB
        const bets = await mongoHybridService.getBets(targetUserId, limit);
        // Get game data from PostgreSQL
        const pool = require('../../db/postgres').default;
        const enrichedBets = await Promise.all(bets.map(async (bet) => {
            const gameResult = await pool.query('SELECT name, category FROM games WHERE id = $1', [bet.game_id]);
            const gameName = gameResult.rows[0]?.name || 'Unknown Game';
            const category = gameResult.rows[0]?.category || 'slots';
            return {
                bet_id: bet.id,
                user_id: bet.user_id,
                game_id: bet.game_id,
                game_name: gameName,
                category: category,
                bet_amount: bet.bet_amount,
                win_amount: bet.win_amount,
                outcome: bet.outcome,
                placed_at: bet.placed_at,
                result_at: bet.result_at
            };
        }));
        res.status(200).json({ success: true, data: enrichedBets });
    }
    catch (err) {
        next(err);
    }
};
exports.getBetResults = getBetResults;
// Get games by category with simplified data
const getGamesByCategory = async (req, res, next) => {
    try {
        const filters = req.query;
        const games = await (0, game_service_1.getGamesByCategoryService)(filters);
        res.status(200).json({ success: true, data: games });
    }
    catch (err) {
        next(err);
    }
};
exports.getGamesByCategory = getGamesByCategory;
// Cancel game transaction
const cancelGame = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const { transaction_id, game_id, reason } = req.validated?.body;
        if (!transaction_id) {
            res.status(400).json({ success: false, message: "Transaction ID is required" });
            return;
        }
        console.log(`[CANCEL_GAME_CONTROLLER] User ${userId} requesting cancellation of transaction ${transaction_id}`);
        const result = await (0, game_service_1.cancelGameService)(userId, transaction_id, game_id, reason);
        res.status(200).json({
            success: true,
            message: "Transaction cancelled successfully",
            data: result
        });
    }
    catch (err) {
        next(err);
    }
};
exports.cancelGame = cancelGame;
