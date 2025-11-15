"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const RiskManagementService_1 = __importDefault(require("../services/RiskManagementService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = express_1.default.Router();
/**
 * ADMIN ROUTES - Risk Management
 */
/**
 * @route GET /api/risk/admin/rules
 * @desc Get all risk rules
 * @access Admin only
 */
router.get('/admin/rules', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        const rules = await RiskManagementService_1.default.getAllRules(status);
        res.json({ success: true, rules });
    }
    catch (error) {
        console.error('[RISK] Error fetching rules:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/risk/admin/rules/:id
 * @desc Get risk rule by ID
 * @access Admin only
 */
router.get('/admin/rules/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const rule = await RiskManagementService_1.default.getRuleById(parseInt(id));
        if (!rule) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        res.json({ success: true, rule });
    }
    catch (error) {
        console.error('[RISK] Error fetching rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/risk/admin/rules
 * @desc Create new risk rule
 * @access Admin only
 */
router.post('/admin/rules', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const rule = await RiskManagementService_1.default.createRule(req.body);
        res.json({ success: true, rule });
    }
    catch (error) {
        console.error('[RISK] Error creating rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/risk/admin/rules/:id
 * @desc Update risk rule
 * @access Admin only
 */
router.put('/admin/rules/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const rule = await RiskManagementService_1.default.updateRule(parseInt(id), req.body);
        res.json({ success: true, rule });
    }
    catch (error) {
        console.error('[RISK] Error updating rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route DELETE /api/risk/admin/rules/:id
 * @desc Delete risk rule
 * @access Admin only
 */
router.delete('/admin/rules/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await RiskManagementService_1.default.deleteRule(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        res.json({ success: true, message: 'Rule deleted successfully' });
    }
    catch (error) {
        console.error('[RISK] Error deleting rule:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/risk/admin/evaluate/:userId
 * @desc Evaluate user against all risk rules
 * @access Admin only
 */
router.post('/admin/evaluate/:userId', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const triggeredRules = await RiskManagementService_1.default.evaluateUser(parseInt(userId));
        res.json({ success: true, triggeredRules });
    }
    catch (error) {
        console.error('[RISK] Error evaluating user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/risk/admin/events/:userId
 * @desc Get risk events for user
 * @access Admin only
 */
router.get('/admin/events/:userId', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const { resolved, limit } = req.query;
        const events = await RiskManagementService_1.default.getUserRiskEvents(parseInt(userId), resolved === 'true' ? true : resolved === 'false' ? false : undefined, limit ? parseInt(limit) : 50);
        res.json({ success: true, events });
    }
    catch (error) {
        console.error('[RISK] Error fetching events:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/risk/admin/score/:userId
 * @desc Get player risk score
 * @access Admin only
 */
router.get('/admin/score/:userId', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const score = await RiskManagementService_1.default.getPlayerRiskScore(parseInt(userId));
        res.json({ success: true, score });
    }
    catch (error) {
        console.error('[RISK] Error fetching risk score:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/risk/admin/resolve/:eventId
 * @desc Resolve risk event
 * @access Admin only
 */
router.post('/admin/resolve/:eventId', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { eventId } = req.params;
        const { resolution } = req.body;
        if (!resolution) {
            return res.status(400).json({ success: false, error: 'resolution is required' });
        }
        const event = await RiskManagementService_1.default.resolveRiskEvent(parseInt(eventId), resolution);
        res.json({ success: true, event });
    }
    catch (error) {
        console.error('[RISK] Error resolving event:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/risk/admin/high-risk-players
 * @desc Get list of high-risk players
 * @access Admin only
 */
router.get('/admin/high-risk-players', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { minScore, limit } = req.query;
        const players = await RiskManagementService_1.default.getHighRiskPlayers(minScore ? parseInt(minScore) : 10, limit ? parseInt(limit) : 100);
        res.json({ success: true, players });
    }
    catch (error) {
        console.error('[RISK] Error fetching high-risk players:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
