import express, { Request, Response } from 'express';
import LoyaltyService from '../services/LoyaltyService';
import { authenticateToken } from '../middlewares/auth.middleware';
import { adminMiddleware as isAdmin } from '../middlewares/admin.middleware';

const router = express.Router();

/**
 * PLAYER ROUTES - Loyalty Program
 */

/**
 * @route GET /api/loyalty/my-status
 * @desc Get logged-in player's loyalty status
 * @access Authenticated users
 */
router.get('/my-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const loyalty = await LoyaltyService.getPlayerLoyalty(userId);
    res.json({ success: true, loyalty });
  } catch (error: any) {
    console.error('[LOYALTY] Error fetching player loyalty:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/loyalty/tiers
 * @desc Get all loyalty tiers
 * @access Authenticated users
 */
router.get('/tiers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tiers = await LoyaltyService.getAllTiers();
    res.json({ success: true, tiers });
  } catch (error: any) {
    console.error('[LOYALTY] Error fetching tiers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/loyalty/transactions
 * @desc Get player's loyalty point transactions
 * @access Authenticated users
 */
router.get('/transactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit } = req.query;
    const transactions = await LoyaltyService.getPlayerTransactions(
      userId,
      limit ? parseInt(limit as string) : 50
    );
    res.json({ success: true, transactions });
  } catch (error: any) {
    console.error('[LOYALTY] Error fetching transactions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/loyalty/leaderboard
 * @desc Get loyalty points leaderboard
 * @access Authenticated users
 */
router.get('/leaderboard', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const leaderboard = await LoyaltyService.getLeaderboard(
      limit ? parseInt(limit as string) : 100
    );
    res.json({ success: true, leaderboard });
  } catch (error: any) {
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
router.get('/shop', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, category } = req.query;
    const items = await LoyaltyService.getShopItems(
      status as string,
      category as string
    );
    res.json({ success: true, items });
  } catch (error: any) {
    console.error('[LOYALTY] Error fetching shop items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/loyalty/shop/:id
 * @desc Get shop item by ID
 * @access Authenticated users
 */
router.get('/shop/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await LoyaltyService.getShopItemById(parseInt(id));

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, item });
  } catch (error: any) {
    console.error('[LOYALTY] Error fetching shop item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/loyalty/shop/purchase/:id
 * @desc Purchase shop item with loyalty points
 * @access Authenticated users
 */
router.post('/shop/purchase/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const result = await LoyaltyService.purchaseShopItem(userId, parseInt(id));
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[LOYALTY] Error purchasing item:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/loyalty/my-purchases
 * @desc Get player's purchase history
 * @access Authenticated users
 */
router.get('/my-purchases', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const purchases = await LoyaltyService.getPlayerPurchases(userId);
    res.json({ success: true, purchases });
  } catch (error: any) {
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
router.post('/admin/tiers', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const tier = await LoyaltyService.createTier(req.body);
    res.json({ success: true, tier });
  } catch (error: any) {
    console.error('[LOYALTY] Error creating tier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/loyalty/admin/tiers/:id
 * @desc Update loyalty tier
 * @access Admin only
 */
router.put('/admin/tiers/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tier = await LoyaltyService.updateTier(parseInt(id), req.body);
    res.json({ success: true, tier });
  } catch (error: any) {
    console.error('[LOYALTY] Error updating tier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/loyalty/admin/shop/items
 * @desc Create new shop item
 * @access Admin only
 */
router.post('/admin/shop/items', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const item = await LoyaltyService.createShopItem(req.body);
    res.json({ success: true, item });
  } catch (error: any) {
    console.error('[LOYALTY] Error creating shop item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/loyalty/admin/shop/items/:id
 * @desc Update shop item
 * @access Admin only
 */
router.put('/admin/shop/items/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await LoyaltyService.updateShopItem(parseInt(id), req.body);
    res.json({ success: true, item });
  } catch (error: any) {
    console.error('[LOYALTY] Error updating shop item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/loyalty/admin/points/add
 * @desc Manually add loyalty points to player
 * @access Admin only
 */
router.post('/admin/points/add', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, points, reason } = req.body;

    if (!userId || !points) {
      return res.status(400).json({ success: false, error: 'userId and points are required' });
    }

    const result = await LoyaltyService.addPoints(userId, points, reason || 'Admin adjustment');
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[LOYALTY] Error adding points:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/loyalty/admin/points/deduct
 * @desc Manually deduct loyalty points from player
 * @access Admin only
 */
router.post('/admin/points/deduct', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, points, reason } = req.body;

    if (!userId || !points) {
      return res.status(400).json({ success: false, error: 'userId and points are required' });
    }

    const result = await LoyaltyService.deductPoints(userId, points, reason || 'Admin adjustment');
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[LOYALTY] Error deducting points:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/loyalty/admin/shop/items
 * @desc Get all shop items (Admin view with all statuses)
 * @access Admin only
 */
router.get('/admin/shop/items', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status, category } = req.query;
    const items = await LoyaltyService.getShopItems(
      status as string,
      category as string
    );
    res.json({ success: true, items });
  } catch (error: any) {
    console.error('[LOYALTY] Error fetching shop items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
