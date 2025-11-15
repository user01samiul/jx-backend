"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CampaignsService_1 = __importDefault(require("../services/CampaignsService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
/**
 * @route GET /api/campaigns/vendors
 * @desc Get list of supported campaign vendors
 * @access Admin
 */
router.get('/vendors', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const vendors = await CampaignsService_1.default.listVendors();
        res.json({ success: true, data: vendors });
    }
    catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/campaigns/game-limits
 * @desc Get betting limits for games
 * @access Admin
 */
router.get('/game-limits', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { vendors, games, currencies } = req.query;
        const limits = await CampaignsService_1.default.getGameLimits(vendors, games, currencies);
        res.json({ success: true, data: limits });
    }
    catch (error) {
        console.error('Error fetching game limits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/campaigns/sync-limits
 * @desc Sync game limits from platform to database
 * @access Admin
 */
router.post('/sync-limits/:vendor', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { vendor } = req.params;
        await CampaignsService_1.default.syncGameLimitsFromPlatform(vendor);
        res.json({ success: true, message: `Game limits synced for ${vendor}` });
    }
    catch (error) {
        console.error('Error syncing game limits:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/campaigns
 * @desc List all campaigns with filters
 * @access Admin
 */
router.get('/', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { vendors, currencies, players, games, include_expired, per_page } = req.query;
        const filters = {};
        if (vendors)
            filters.vendors = vendors;
        if (currencies)
            filters.currencies = currencies;
        if (players)
            filters.players = players;
        if (games)
            filters.games = games;
        if (include_expired !== undefined)
            filters.include_expired = include_expired === 'true';
        if (per_page)
            filters.per_page = parseInt(per_page);
        const campaigns = await CampaignsService_1.default.listCampaigns(filters);
        res.json({ success: true, data: campaigns });
    }
    catch (error) {
        console.error('Error listing campaigns:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/campaigns/:campaignCode
 * @desc Get campaign details
 * @access Admin
 */
router.get('/:campaignCode', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { campaignCode } = req.params;
        const campaign = await CampaignsService_1.default.getCampaignDetails(campaignCode);
        res.json({ success: true, data: campaign });
    }
    catch (error) {
        console.error('Error fetching campaign details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/campaigns
 * @desc Create a new campaign
 * @access Admin
 */
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const campaignData = req.body;
        await CampaignsService_1.default.createCampaign(campaignData);
        res.json({ success: true, message: 'Campaign created successfully' });
    }
    catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/campaigns/:campaignCode/cancel
 * @desc Cancel a campaign
 * @access Admin
 */
router.post('/:campaignCode/cancel', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { campaignCode } = req.params;
        await CampaignsService_1.default.cancelCampaign(campaignCode);
        res.json({ success: true, message: 'Campaign cancelled successfully' });
    }
    catch (error) {
        console.error('Error cancelling campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/campaigns/:campaignCode/players/add
 * @desc Add players to a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/add', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { campaignCode } = req.params;
        const { players } = req.body;
        if (!players || (Array.isArray(players) && players.length === 0)) {
            return res.status(400).json({ success: false, error: 'Players array is required' });
        }
        await CampaignsService_1.default.addPlayersToCampaign(campaignCode, players);
        res.json({ success: true, message: 'Players added to campaign successfully' });
    }
    catch (error) {
        console.error('Error adding players to campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/campaigns/:campaignCode/players/remove
 * @desc Remove players from a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/remove', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, async (req, res) => {
    try {
        const { campaignCode } = req.params;
        const { players } = req.body;
        if (!players || (Array.isArray(players) && players.length === 0)) {
            return res.status(400).json({ success: false, error: 'Players array is required' });
        }
        await CampaignsService_1.default.removePlayersFromCampaign(campaignCode, players);
        res.json({ success: true, message: 'Players removed from campaign successfully' });
    }
    catch (error) {
        console.error('Error removing players from campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/campaigns/user/:userId
 * @desc Get campaigns for a specific user (player endpoint)
 * @access Player
 */
router.get('/user/:userId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        // Ensure user can only see their own campaigns
        if (req.user.id !== userId && req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        const campaigns = await CampaignsService_1.default.getUserCampaigns(userId);
        res.json({ success: true, data: campaigns });
    }
    catch (error) {
        console.error('Error fetching user campaigns:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/campaigns/use-freespin
 * @desc Use a free spin from a campaign
 * @access Player
 */
router.post('/use-freespin', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { campaignId } = req.body;
        const userId = req.user.id;
        const success = await CampaignsService_1.default.useFreeSpinFromCampaign(userId, campaignId);
        if (success) {
            res.json({ success: true, message: 'Free spin used successfully' });
        }
        else {
            res.status(400).json({ success: false, error: 'No free spins remaining' });
        }
    }
    catch (error) {
        console.error('Error using free spin:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
