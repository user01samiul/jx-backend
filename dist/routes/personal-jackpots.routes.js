"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PersonalJackpotsService_1 = __importDefault(require("../services/PersonalJackpotsService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = express_1.default.Router();
/**
 * PLAYER ROUTES - Personal Jackpots
 */
/**
 * @route GET /api/personal-jackpots/my-jackpots
 * @desc Get player's active personal jackpots
 * @access Authenticated users
 */
router.get('/my-jackpots', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;
        const jackpots = await PersonalJackpotsService_1.default.getPlayerJackpots(userId, status);
        res.json({ success: true, jackpots });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error fetching player jackpots:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/personal-jackpots/my-wins
 * @desc Get player's jackpot win history
 * @access Authenticated users
 */
router.get('/my-wins', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit } = req.query;
        const wins = await PersonalJackpotsService_1.default.getPlayerWins(userId, limit ? parseInt(limit) : 50);
        res.json({ success: true, wins });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error fetching wins:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/personal-jackpots/check-trigger/:jackpotId
 * @desc Check if jackpot should trigger (internal use)
 * @access Authenticated users
 */
router.post('/check-trigger/:jackpotId', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { jackpotId } = req.params;
        const result = await PersonalJackpotsService_1.default.checkTrigger(userId, parseInt(jackpotId));
        if (result.triggered) {
            // Auto-trigger the win
            const winResult = await PersonalJackpotsService_1.default.triggerJackpotWin(userId, parseInt(jackpotId));
            res.json({ success: true, triggered: true, win: winResult });
        }
        else {
            res.json({ success: true, triggered: false });
        }
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error checking trigger:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * ADMIN ROUTES - Personal Jackpot Management
 */
/**
 * @route GET /api/personal-jackpots/admin/configs
 * @desc Get all jackpot configurations
 * @access Admin only
 */
router.get('/admin/configs', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        const configs = await PersonalJackpotsService_1.default.getAllConfigs(status);
        res.json({ success: true, configs });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error fetching configs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/personal-jackpots/admin/configs/:id
 * @desc Get jackpot configuration by ID
 * @access Admin only
 */
router.get('/admin/configs/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const config = await PersonalJackpotsService_1.default.getConfigById(parseInt(id));
        if (!config) {
            return res.status(404).json({ success: false, error: 'Configuration not found' });
        }
        res.json({ success: true, config });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error fetching config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/personal-jackpots/admin/configs
 * @desc Create new jackpot configuration
 * @access Admin only
 */
router.post('/admin/configs', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const config = await PersonalJackpotsService_1.default.createConfig(req.body);
        res.json({ success: true, config });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error creating config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/personal-jackpots/admin/configs/:id
 * @desc Update jackpot configuration
 * @access Admin only
 */
router.put('/admin/configs/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const config = await PersonalJackpotsService_1.default.updateConfig(parseInt(id), req.body);
        res.json({ success: true, config });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error updating config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/personal-jackpots/admin/initialize
 * @desc Manually initialize jackpot for player
 * @access Admin only
 */
router.post('/admin/initialize', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { userId, configId } = req.body;
        if (!userId || !configId) {
            return res.status(400).json({ success: false, error: 'userId and configId are required' });
        }
        const jackpot = await PersonalJackpotsService_1.default.initializePlayerJackpot(userId, configId);
        res.json({ success: true, jackpot });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error initializing jackpot:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/personal-jackpots/admin/trigger-win
 * @desc Manually trigger jackpot win for player
 * @access Admin only
 */
router.post('/admin/trigger-win', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { userId, jackpotId } = req.body;
        if (!userId || !jackpotId) {
            return res.status(400).json({ success: false, error: 'userId and jackpotId are required' });
        }
        const result = await PersonalJackpotsService_1.default.triggerJackpotWin(userId, jackpotId);
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error triggering win:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/personal-jackpots/admin/statistics/:configId
 * @desc Get jackpot statistics
 * @access Admin only
 */
router.get('/admin/statistics/:configId', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { configId } = req.params;
        const statistics = await PersonalJackpotsService_1.default.getJackpotStatistics(parseInt(configId));
        res.json({ success: true, statistics });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error fetching statistics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/personal-jackpots/admin/auto-initialize
 * @desc Trigger auto-initialization of jackpots for eligible players
 * @access Admin only
 */
router.post('/admin/auto-initialize', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        await PersonalJackpotsService_1.default.autoInitializeJackpots();
        res.json({ success: true, message: 'Auto-initialization completed' });
    }
    catch (error) {
        console.error('[PERSONAL-JACKPOTS] Error in auto-initialization:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
