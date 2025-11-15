"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const EnterpriseIntegrationService_1 = __importDefault(require("../services/EnterpriseIntegrationService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
/**
 * @route GET /api/enterprise/dashboard
 * @desc Get player's complete enterprise dashboard
 * @access Authenticated users
 */
router.get('/dashboard', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const dashboard = await EnterpriseIntegrationService_1.default.getPlayerDashboard(userId);
        res.json({ success: true, dashboard });
    }
    catch (error) {
        console.error('[ENTERPRISE] Error fetching dashboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/enterprise/initialize
 * @desc Initialize new player with all enterprise features
 * @access Authenticated users
 */
router.post('/initialize', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        await EnterpriseIntegrationService_1.default.initializeNewPlayer(userId);
        res.json({ success: true, message: 'Player initialized with enterprise features' });
    }
    catch (error) {
        console.error('[ENTERPRISE] Error initializing player:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
