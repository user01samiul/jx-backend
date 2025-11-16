"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MiniGamesService_1 = __importDefault(require("../services/MiniGamesService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = express_1.default.Router();
/**
 * PLAYER ROUTES - Mini Games / Prize Engine
 */
/**
 * @route GET /api/mini-games
 * @desc Get all available mini games
 * @access Authenticated users
 */
router.get('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const games = await MiniGamesService_1.default.getAllGameTypes('ACTIVE');
        res.json({ success: true, games });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error fetching games:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/mini-games/:id
 * @desc Get mini game details with prizes
 * @access Authenticated users
 */
router.get('/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const game = await MiniGamesService_1.default.getGameTypeById(parseInt(id));
        if (!game) {
            return res.status(404).json({ success: false, error: 'Game not found' });
        }
        const prizes = await MiniGamesService_1.default.getGamePrizes(parseInt(id), 'ACTIVE');
        res.json({ success: true, game, prizes });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error fetching game:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/mini-games/:id/play
 * @desc Play a mini game
 * @access Authenticated users
 */
router.post('/:id/play', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const result = await MiniGamesService_1.default.playGame(userId, parseInt(id));
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        console.error('[MINI-GAMES] Error playing game:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/mini-games/:id/can-play
 * @desc Check if player can play game (cooldown & limits)
 * @access Authenticated users
 */
router.get('/:id/can-play', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const result = await MiniGamesService_1.default.canPlayerPlay(userId, parseInt(id));
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        console.error('[MINI-GAMES] Error checking play eligibility:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/mini-games/my-plays
 * @desc Get player's play history
 * @access Authenticated users
 */
router.get('/history/my-plays', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameId, limit } = req.query;
        const plays = await MiniGamesService_1.default.getPlayerPlays(userId, gameId ? parseInt(gameId) : undefined, limit ? parseInt(limit) : 50);
        res.json({ success: true, plays });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error fetching play history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/mini-games/my-cooldowns
 * @desc Get player's current cooldowns
 * @access Authenticated users
 */
router.get('/cooldowns/active', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const cooldowns = await MiniGamesService_1.default.getPlayerCooldowns(userId);
        res.json({ success: true, cooldowns });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error fetching cooldowns:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * ADMIN ROUTES - Mini Game Management
 */
/**
 * @route GET /api/mini-games/admin/games
 * @desc Get all mini games (including inactive)
 * @access Admin only
 */
router.get('/admin/games', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        const games = await MiniGamesService_1.default.getAllGameTypes(status);
        res.json({ success: true, games });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error fetching games:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/mini-games/admin/games
 * @desc Create new mini game
 * @access Admin only
 */
router.post('/admin/games', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const game = await MiniGamesService_1.default.createGameType(req.body);
        res.json({ success: true, game });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error creating game:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/mini-games/admin/games/:id
 * @desc Update mini game
 * @access Admin only
 */
router.put('/admin/games/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const game = await MiniGamesService_1.default.updateGameType(parseInt(id), req.body);
        res.json({ success: true, game });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error updating game:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/mini-games/admin/games/:id/prizes
 * @desc Get all prizes for a game (including inactive)
 * @access Admin only
 */
router.get('/admin/games/:id/prizes', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.query;
        const prizes = await MiniGamesService_1.default.getGamePrizes(parseInt(id), status);
        res.json({ success: true, prizes });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error fetching prizes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/mini-games/admin/prizes
 * @desc Create new prize
 * @access Admin only
 */
router.post('/admin/prizes', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const prize = await MiniGamesService_1.default.createPrize(req.body);
        res.json({ success: true, prize });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error creating prize:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/mini-games/admin/prizes/:id
 * @desc Update prize
 * @access Admin only
 */
router.put('/admin/prizes/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const prize = await MiniGamesService_1.default.updatePrize(parseInt(id), req.body);
        res.json({ success: true, prize });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error updating prize:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/mini-games/admin/games/:id/statistics
 * @desc Get game statistics
 * @access Admin only
 */
router.get('/admin/games/:id/statistics', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const statistics = await MiniGamesService_1.default.getGameStatistics(parseInt(id));
        res.json({ success: true, statistics });
    }
    catch (error) {
        console.error('[MINI-GAMES] Error fetching statistics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
