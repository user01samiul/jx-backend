"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const LoyaltyService_1 = __importDefault(require("../services/LoyaltyService"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = express_1.default.Router();
/**
 * PLAYER ROUTES - Loyalty Program
 */
/**
 * @route GET /api/loyalty/my-status
 * @desc Get logged-in player's loyalty status
 * @access Authenticated users
 */
router.get('/my-status', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const loyalty = await LoyaltyService_1.default.getPlayerLoyalty(userId);
        res.json({ success: true, loyalty });
    }
    catch (error) {
        console.error('[LOYALTY] Error fetching player loyalty:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/loyalty/tiers
 * @desc Get all loyalty tiers
 * @access Authenticated users
 */
router.get('/tiers', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const tiers = await LoyaltyService_1.default.getAllTiers();
        res.json({ success: true, tiers });
    }
    catch (error) {
        console.error('[LOYALTY] Error fetching tiers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/loyalty/transactions
 * @desc Get player's loyalty point transactions
 * @access Authenticated users
 */
router.get('/transactions', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit } = req.query;
        const transactions = await LoyaltyService_1.default.getPlayerTransactions(userId, limit ? parseInt(limit) : 50);
        res.json({ success: true, transactions });
    }
    catch (error) {
        console.error('[LOYALTY] Error fetching transactions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/loyalty/leaderboard
 * @desc Get loyalty points leaderboard
 * @access Authenticated users
 */
router.get('/leaderboard', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { limit } = req.query;
        const leaderboard = await LoyaltyService_1.default.getLeaderboard(limit ? parseInt(limit) : 100);
        res.json({ success: true, leaderboard });
    }
    catch (error) {
        console.error('[LOYALTY] Error fetching leaderboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * LOYALTY SHOP ROUTES
 */
/**
 * @route GET /api/loyalty/shop
 * @desc Get all shop items
 * @access Authenticated users
 */
router.get('/shop', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { status, category } = req.query;
        const items = await LoyaltyService_1.default.getShopItems(status, category);
        res.json({ success: true, items });
    }
    catch (error) {
        console.error('[LOYALTY] Error fetching shop items:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/loyalty/shop/:id
 * @desc Get shop item by ID
 * @access Authenticated users
 */
router.get('/shop/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const item = await LoyaltyService_1.default.getShopItemById(parseInt(id));
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        res.json({ success: true, item });
    }
    catch (error) {
        console.error('[LOYALTY] Error fetching shop item:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/loyalty/shop/purchase/:id
 * @desc Purchase shop item with loyalty points
 * @access Authenticated users
 */
router.post('/shop/purchase/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const result = await LoyaltyService_1.default.purchaseShopItem(userId, parseInt(id));
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('[LOYALTY] Error purchasing item:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/loyalty/my-purchases
 * @desc Get player's purchase history
 * @access Authenticated users
 */
router.get('/my-purchases', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const purchases = await LoyaltyService_1.default.getPlayerPurchases(userId);
        res.json({ success: true, purchases });
    }
    catch (error) {
        console.error('[LOYALTY] Error fetching purchases:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * ADMIN ROUTES - Loyalty Management
 */
/**
 * @route POST /api/loyalty/admin/tiers
 * @desc Create new loyalty tier
 * @access Admin only
 */
router.post('/admin/tiers', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const tier = await LoyaltyService_1.default.createTier(req.body);
        res.json({ success: true, tier });
    }
    catch (error) {
        console.error('[LOYALTY] Error creating tier:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/loyalty/admin/tiers/:id
 * @desc Update loyalty tier
 * @access Admin only
 */
router.put('/admin/tiers/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tier = await LoyaltyService_1.default.updateTier(parseInt(id), req.body);
        res.json({ success: true, tier });
    }
    catch (error) {
        console.error('[LOYALTY] Error updating tier:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/loyalty/admin/shop/items
 * @desc Create new shop item
 * @access Admin only
 */
router.post('/admin/shop/items', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const item = await LoyaltyService_1.default.createShopItem(req.body);
        res.json({ success: true, item });
    }
    catch (error) {
        console.error('[LOYALTY] Error creating shop item:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route PUT /api/loyalty/admin/shop/items/:id
 * @desc Update shop item
 * @access Admin only
 */
router.put('/admin/shop/items/:id', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const item = await LoyaltyService_1.default.updateShopItem(parseInt(id), req.body);
        res.json({ success: true, item });
    }
    catch (error) {
        console.error('[LOYALTY] Error updating shop item:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/loyalty/admin/points/add
 * @desc Manually add loyalty points to player
 * @access Admin only
 */
router.post('/admin/points/add', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { userId, points, reason } = req.body;
        if (!userId || !points) {
            return res.status(400).json({ success: false, error: 'userId and points are required' });
        }
        const result = await LoyaltyService_1.default.addPoints(userId, points, reason || 'Admin adjustment');
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('[LOYALTY] Error adding points:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * @route POST /api/loyalty/admin/points/deduct
 * @desc Manually deduct loyalty points from player
 * @access Admin only
 */
router.post('/admin/points/deduct', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { userId, points, reason } = req.body;
        if (!userId || !points) {
            return res.status(400).json({ success: false, error: 'userId and points are required' });
        }
        const result = await LoyaltyService_1.default.deductPoints(userId, points, reason || 'Admin adjustment');
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error('[LOYALTY] Error deducting points:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});
/**
 * @route GET /api/loyalty/admin/shop/items
 * @desc Get all shop items (Admin view with all statuses)
 * @access Admin only
 */
router.get('/admin/shop/items', auth_middleware_1.authenticateToken, admin_middleware_1.adminMiddleware, async (req, res) => {
    try {
        const { status, category } = req.query;
        const items = await LoyaltyService_1.default.getShopItems(status, category);
        res.json({ success: true, items });
    }
    catch (error) {
        console.error('[LOYALTY] Error fetching shop items:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
