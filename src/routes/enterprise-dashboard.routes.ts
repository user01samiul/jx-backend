import express, { Request, Response } from 'express';
import EnterpriseIntegrationService from '../services/EnterpriseIntegrationService';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @route GET /api/enterprise/dashboard
 * @desc Get player's complete enterprise dashboard
 * @access Authenticated users
 */
router.get('/dashboard', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const dashboard = await EnterpriseIntegrationService.getPlayerDashboard(userId);
    res.json({ success: true, dashboard });
  } catch (error: any) {
    console.error('[ENTERPRISE] Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/enterprise/initialize
 * @desc Initialize new player with all enterprise features
 * @access Authenticated users
 */
router.post('/initialize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    await EnterpriseIntegrationService.initializeNewPlayer(userId);
    res.json({ success: true, message: 'Player initialized with enterprise features' });
  } catch (error: any) {
    console.error('[ENTERPRISE] Error initializing player:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
