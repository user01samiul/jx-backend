"use strict";
/**
 * JxOriginals Game Controller
 *
 * Handles API requests specific to JxOriginals games
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchJxOriginalsGames = exports.getFeaturedJxOriginalsGames = exports.getJxOriginalsVendors = exports.getJxOriginalsCategories = exports.getJxOriginalsGameStats = exports.launchJxOriginalsGame = exports.getJxOriginalsGame = exports.listJxOriginalsGames = void 0;
const jxoriginals_provider_service_1 = require("../../services/provider/jxoriginals-provider.service");
const game_router_service_1 = require("../../services/game/game-router.service");
const apiError_1 = require("../../utils/apiError");
/**
 * List all JxOriginals games
 * GET /api/jxoriginals/games
 */
const listJxOriginalsGames = async (req, res) => {
    try {
        const { category, vendor, limit, offset } = req.query;
        const games = await jxoriginals_provider_service_1.JxOriginalsProviderService.listGames({
            category: category,
            vendor: vendor,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });
        res.json({
            success: true,
            provider: 'JxOriginals',
            count: games.length,
            games
        });
    }
    catch (error) {
        console.error('[JXORIGINALS_CONTROLLER] List games error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to list JxOriginals games'
        });
    }
};
exports.listJxOriginalsGames = listJxOriginalsGames;
/**
 * Get JxOriginals game by ID
 * GET /api/jxoriginals/games/:gameId
 */
const getJxOriginalsGame = async (req, res) => {
    try {
        const gameId = parseInt(req.params.gameId);
        if (isNaN(gameId)) {
            throw new apiError_1.ApiError('Invalid game ID', 400);
        }
        const game = await game_router_service_1.GameRouterService.getGameInfo(gameId);
        if (game.provider !== 'JxOriginals') {
            throw new apiError_1.ApiError('Game is not a JxOriginals game', 400);
        }
        res.json({
            success: true,
            game
        });
    }
    catch (error) {
        console.error('[JXORIGINALS_CONTROLLER] Get game error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to get game'
        });
    }
};
exports.getJxOriginalsGame = getJxOriginalsGame;
/**
 * Launch JxOriginals game
 * POST /api/jxoriginals/launch/:gameId
 */
const launchJxOriginalsGame = async (req, res) => {
    var _a;
    try {
        const gameId = parseInt(req.params.gameId);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            throw new apiError_1.ApiError('User not authenticated', 401);
        }
        if (isNaN(gameId)) {
            throw new apiError_1.ApiError('Invalid game ID', 400);
        }
        console.log('[JXORIGINALS_CONTROLLER] Launching game:', { gameId, userId });
        // Verify this is a JxOriginals game
        const isJxOriginals = await jxoriginals_provider_service_1.JxOriginalsProviderService.isJxOriginalsGame(gameId);
        if (!isJxOriginals) {
            throw new apiError_1.ApiError('Game is not a JxOriginals game', 400);
        }
        // Launch the game
        const { currency, language, mode } = req.body;
        const launchResponse = await jxoriginals_provider_service_1.JxOriginalsProviderService.launchGame({
            gameId,
            userId,
            currency: currency || 'USD',
            language: language || 'en',
            mode: mode || 'real'
        });
        res.json(launchResponse);
    }
    catch (error) {
        console.error('[JXORIGINALS_CONTROLLER] Launch error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to launch game'
        });
    }
};
exports.launchJxOriginalsGame = launchJxOriginalsGame;
/**
 * Get JxOriginals game statistics
 * GET /api/jxoriginals/games/:gameId/stats
 */
const getJxOriginalsGameStats = async (req, res) => {
    try {
        const gameId = parseInt(req.params.gameId);
        if (isNaN(gameId)) {
            throw new apiError_1.ApiError('Invalid game ID', 400);
        }
        const stats = await jxoriginals_provider_service_1.JxOriginalsProviderService.getGameStats(gameId);
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        console.error('[JXORIGINALS_CONTROLLER] Get stats error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || 'Failed to get game stats'
        });
    }
};
exports.getJxOriginalsGameStats = getJxOriginalsGameStats;
/**
 * Get JxOriginals categories
 * GET /api/jxoriginals/categories
 */
const getJxOriginalsCategories = async (req, res) => {
    try {
        const games = await jxoriginals_provider_service_1.JxOriginalsProviderService.listGames();
        // Group games by category
        const categoriesMap = new Map();
        games.forEach(game => {
            const category = game.category || 'Other';
            if (!categoriesMap.has(category)) {
                categoriesMap.set(category, {
                    name: category,
                    game_count: 0,
                    games: []
                });
            }
            const cat = categoriesMap.get(category);
            cat.game_count++;
            cat.games.push({
                id: game.id,
                name: game.name,
                game_code: game.game_code,
                image_url: game.thumbnail_url || game.image_url
            });
        });
        const categories = Array.from(categoriesMap.values());
        res.json({
            success: true,
            provider: 'JxOriginals',
            categories
        });
    }
    catch (error) {
        console.error('[JXORIGINALS_CONTROLLER] Get categories error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get categories'
        });
    }
};
exports.getJxOriginalsCategories = getJxOriginalsCategories;
/**
 * Get JxOriginals vendors
 * GET /api/jxoriginals/vendors
 */
const getJxOriginalsVendors = async (req, res) => {
    try {
        const games = await jxoriginals_provider_service_1.JxOriginalsProviderService.listGames();
        // Group games by vendor
        const vendorsMap = new Map();
        games.forEach(game => {
            const vendor = game.vendor || 'Unknown';
            if (!vendorsMap.has(vendor)) {
                vendorsMap.set(vendor, {
                    name: vendor,
                    game_count: 0,
                    categories: new Set()
                });
            }
            const ven = vendorsMap.get(vendor);
            ven.game_count++;
            if (game.category) {
                ven.categories.add(game.category);
            }
        });
        const vendors = Array.from(vendorsMap.values()).map(v => (Object.assign(Object.assign({}, v), { categories: Array.from(v.categories) })));
        res.json({
            success: true,
            provider: 'JxOriginals',
            vendors
        });
    }
    catch (error) {
        console.error('[JXORIGINALS_CONTROLLER] Get vendors error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get vendors'
        });
    }
};
exports.getJxOriginalsVendors = getJxOriginalsVendors;
/**
 * Get featured JxOriginals games
 * GET /api/jxoriginals/featured
 */
const getFeaturedJxOriginalsGames = async (req, res) => {
    try {
        const { limit } = req.query;
        const games = await jxoriginals_provider_service_1.JxOriginalsProviderService.listGames({
            limit: limit ? parseInt(limit) : 10
        });
        // Filter featured games
        const featured = games.filter(game => game.is_featured);
        res.json({
            success: true,
            provider: 'JxOriginals',
            count: featured.length,
            games: featured
        });
    }
    catch (error) {
        console.error('[JXORIGINALS_CONTROLLER] Get featured error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get featured games'
        });
    }
};
exports.getFeaturedJxOriginalsGames = getFeaturedJxOriginalsGames;
/**
 * Search JxOriginals games
 * GET /api/jxoriginals/search?q=sweet
 */
const searchJxOriginalsGames = async (req, res) => {
    try {
        const { q, limit, offset } = req.query;
        if (!q || typeof q !== 'string') {
            throw new apiError_1.ApiError('Search query is required', 400);
        }
        const allGames = await jxoriginals_provider_service_1.JxOriginalsProviderService.listGames({
            limit: 1000 // Get all games for search
        });
        // Simple search in name and description
        const searchTerm = q.toLowerCase();
        const results = allGames.filter(game => {
            var _a, _b;
            return game.name.toLowerCase().includes(searchTerm) ||
                ((_a = game.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchTerm)) ||
                ((_b = game.game_code) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchTerm));
        });
        // Apply pagination
        const start = offset ? parseInt(offset) : 0;
        const end = start + (limit ? parseInt(limit) : 20);
        const paginatedResults = results.slice(start, end);
        res.json({
            success: true,
            provider: 'JxOriginals',
            query: q,
            total: results.length,
            count: paginatedResults.length,
            games: paginatedResults
        });
    }
    catch (error) {
        console.error('[JXORIGINALS_CONTROLLER] Search error:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || 'Search failed'
        });
    }
};
exports.searchJxOriginalsGames = searchJxOriginalsGames;
