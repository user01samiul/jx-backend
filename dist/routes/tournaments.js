"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TournamentService_1 = __importDefault(require("../services/TournamentService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
/**
 * @route GET /api/tournaments
 * @desc Get all tournaments
 * @access Admin
 */
router.get('/', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { status, currency, limit } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (currency)
            filters.currency = currency;
        if (limit)
            filters.limit = parseInt(limit);
        const tournaments = await TournamentService_1.default.getTournaments(filters);
        res.json({ success: true, data: tournaments });
    }
    catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/tournaments
 * @desc Create a new tournament
 * @access Admin
 */
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { tournament, gameIds } = req.body;
        if (!tournament || !gameIds || !Array.isArray(gameIds)) {
            return res.status(400).json({ success: false, error: 'Tournament data and gameIds array are required' });
        }
        const tournamentId = await TournamentService_1.default.createTournament(tournament, gameIds);
        res.json({ success: true, message: 'Tournament created', data: { id: tournamentId } });
    }
    catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/tournaments/:id
 * @desc Update a tournament
 * @access Admin
 */
router.put('/:id', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);
        const updates = req.body;
        await TournamentService_1.default.updateTournament(tournamentId, updates);
        res.json({ success: true, message: 'Tournament updated' });
    }
    catch (error) {
        console.error('Error updating tournament:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route DELETE /api/tournaments/:id
 * @desc Delete a tournament
 * @access Admin
 */
router.delete('/:id', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);
        await TournamentService_1.default.deleteTournament(tournamentId);
        res.json({ success: true, message: 'Tournament deleted' });
    }
    catch (error) {
        console.error('Error deleting tournament:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/tournaments/:id/start
 * @desc Start a tournament instance
 * @access Admin
 */
router.post('/:id/start', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.id);
        const instanceId = await TournamentService_1.default.startTournamentInstance(tournamentId);
        res.json({ success: true, message: 'Tournament started', data: { instanceId } });
    }
    catch (error) {
        console.error('Error starting tournament:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/tournaments/:id/finish
 * @desc Finish a tournament and distribute prizes
 * @access Admin
 */
router.post('/:id/finish', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.id);
        const { prizeStructure } = req.body;
        if (!prizeStructure || !Array.isArray(prizeStructure)) {
            return res.status(400).json({ success: false, error: 'Prize structure array is required' });
        }
        await TournamentService_1.default.finishTournament(instanceId, prizeStructure);
        res.json({ success: true, message: 'Tournament finished and prizes distributed' });
    }
    catch (error) {
        console.error('Error finishing tournament:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/tournaments/active
 * @desc Get active tournaments (player endpoint)
 * @access Public/Player
 */
router.get('/active', async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const tournaments = await TournamentService_1.default.getActiveTournaments(userId);
        res.json({ success: true, data: tournaments });
    }
    catch (error) {
        console.error('Error fetching active tournaments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/tournaments/:instanceId/leaderboard
 * @desc Get tournament leaderboard
 * @access Public
 */
router.get('/:instanceId/leaderboard', async (req, res) => {
    try {
        const instanceId = parseInt(req.params.instanceId);
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const leaderboard = await TournamentService_1.default.getLeaderboard(instanceId, limit);
        res.json({ success: true, data: leaderboard });
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/tournaments/:instanceId/position/:userId
 * @desc Get player position in tournament
 * @access Player
 */
router.get('/:instanceId/position/:userId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.instanceId);
        const userId = parseInt(req.params.userId);
        // Ensure user can only see their own position (unless admin)
        if (req.user.id !== userId && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        const position = await TournamentService_1.default.getPlayerPosition(instanceId, userId);
        res.json({ success: true, data: position });
    }
    catch (error) {
        console.error('Error fetching player position:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/tournaments/:tournamentId/games
 * @desc Get eligible games for a tournament
 * @access Public
 */
router.get('/:tournamentId/games', async (req, res) => {
    try {
        const tournamentId = parseInt(req.params.tournamentId);
        const games = await TournamentService_1.default.getTournamentGames(tournamentId);
        res.json({ success: true, data: games });
    }
    catch (error) {
        console.error('Error fetching tournament games:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
