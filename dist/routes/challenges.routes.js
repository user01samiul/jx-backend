"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ChallengesService_1 = __importDefault(require("../services/ChallengesService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = express_1.default.Router();
/**
 * ADMIN ROUTES - Challenge Template Management
 */
/**
 * @route GET /api/challenges/admin/templates
 * @desc Get all challenge templates
 * @access Admin only
 */
router.get('/admin/templates', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        const templates = await ChallengesService_1.default.getAllTemplates(status);
        res.json({ success: true, templates });
    }
    catch (error) {
        console.error('[CHALLENGES] Error fetching templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/challenges/admin/templates/:id
 * @desc Get challenge template by ID
 * @access Admin only
 */
router.get('/admin/templates/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const template = await ChallengesService_1.default.getTemplateById(parseInt(id));
        if (!template) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }
        res.json({ success: true, template });
    }
    catch (error) {
        console.error('[CHALLENGES] Error fetching template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/challenges/admin/templates
 * @desc Create new challenge template
 * @access Admin only
 */
router.post('/admin/templates', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const template = await ChallengesService_1.default.createTemplate(req.body);
        res.json({ success: true, template });
    }
    catch (error) {
        console.error('[CHALLENGES] Error creating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/challenges/admin/templates/:id
 * @desc Update challenge template
 * @access Admin only
 */
router.put('/admin/templates/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const template = await ChallengesService_1.default.updateTemplate(parseInt(id), req.body);
        res.json({ success: true, template });
    }
    catch (error) {
        console.error('[CHALLENGES] Error updating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route DELETE /api/challenges/admin/templates/:id
 * @desc Delete challenge template
 * @access Admin only
 */
router.delete('/admin/templates/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ChallengesService_1.default.deleteTemplate(parseInt(id));
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }
        res.json({ success: true, message: 'Template deleted successfully' });
    }
    catch (error) {
        console.error('[CHALLENGES] Error deleting template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/challenges/admin/assign
 * @desc Manually assign challenge to player
 * @access Admin only
 */
router.post('/admin/assign', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { userId, templateId } = req.body;
        if (!userId || !templateId) {
            return res.status(400).json({ success: false, error: 'userId and templateId are required' });
        }
        const challenge = await ChallengesService_1.default.assignChallengeToPlayer(userId, templateId);
        res.json({ success: true, challenge });
    }
    catch (error) {
        console.error('[CHALLENGES] Error assigning challenge:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/challenges/admin/auto-assign
 * @desc Trigger auto-assignment of challenges to eligible players
 * @access Admin only
 */
router.post('/admin/auto-assign', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        await ChallengesService_1.default.autoAssignChallenges();
        res.json({ success: true, message: 'Auto-assignment completed' });
    }
    catch (error) {
        console.error('[CHALLENGES] Error in auto-assignment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/challenges/admin/expire
 * @desc Expire old challenges
 * @access Admin only
 */
router.post('/admin/expire', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const expiredCount = await ChallengesService_1.default.expireOldChallenges();
        res.json({ success: true, expiredCount });
    }
    catch (error) {
        console.error('[CHALLENGES] Error expiring challenges:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * PLAYER ROUTES - Challenge Progress & Claims
 */
/**
 * @route GET /api/challenges/my-challenges
 * @desc Get logged-in player's challenges
 * @access Authenticated users
 */
router.get('/my-challenges', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        console.log('[CHALLENGES ROUTE] /my-challenges endpoint hit');
        console.log('[CHALLENGES ROUTE] Full req.user object:', JSON.stringify(req.user, null, 2));
        const userId = req.user.userId || req.user.id;
        console.log('[CHALLENGES ROUTE] Extracted userId:', userId);
        const { status } = req.query;
        console.log('[CHALLENGES ROUTE] Status filter:', status);
        const challenges = await ChallengesService_1.default.getPlayerChallenges(userId, status);
        console.log('[CHALLENGES ROUTE] Returning challenges count:', challenges.length);
        res.json({ success: true, challenges });
    }
    catch (error) {
        console.error('[CHALLENGES] Error fetching player challenges:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/challenges/claim/:challengeId
 * @desc Claim completed challenge reward
 * @access Authenticated users
 */
router.post('/claim/:challengeId', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { challengeId } = req.params;
        const result = await ChallengesService_1.default.claimChallengeReward(userId, parseInt(challengeId));
        res.json(Object.assign({ success: true }, result));
    }
    catch (error) {
        console.error('[CHALLENGES] Error claiming challenge:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/challenges/available
 * @desc Get available challenge templates (active, public)
 * @access Authenticated users
 */
router.get('/available', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const templates = await ChallengesService_1.default.getAllTemplates('ACTIVE');
        res.json({ success: true, templates });
    }
    catch (error) {
        console.error('[CHALLENGES] Error fetching available challenges:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
