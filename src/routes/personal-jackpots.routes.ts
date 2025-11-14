import express, { Request, Response } from 'express';
import PersonalJackpotsService from '../services/PersonalJackpotsService';
import { authenticateToken } from '../middlewares/auth.middleware';
import { adminMiddleware as isAdmin } from '../middlewares/admin.middleware';

const router = express.Router();

/**
 * PLAYER ROUTES - Personal Jackpots
 */

/**
 * @route GET /api/personal-jackpots/my-jackpots
 * @desc Get player's active personal jackpots
 * @access Authenticated users
 */
router.get('/my-jackpots', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { status } = req.query;

    const jackpots = await PersonalJackpotsService.getPlayerJackpots(userId, status as string);
    res.json({ success: true, jackpots });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error fetching player jackpots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/personal-jackpots/my-wins
 * @desc Get player's jackpot win history
 * @access Authenticated users
 */
router.get('/my-wins', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit } = req.query;

    const wins = await PersonalJackpotsService.getPlayerWins(
      userId,
      limit ? parseInt(limit as string) : 50
    );
    res.json({ success: true, wins });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error fetching wins:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/personal-jackpots/check-trigger/:jackpotId
 * @desc Check if jackpot should trigger (internal use)
 * @access Authenticated users
 */
router.post('/check-trigger/:jackpotId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { jackpotId } = req.params;

    const result = await PersonalJackpotsService.checkTrigger(userId, parseInt(jackpotId));

    if (result.triggered) {
      // Auto-trigger the win
      const winResult = await PersonalJackpotsService.triggerJackpotWin(userId, parseInt(jackpotId));
      res.json({ success: true, triggered: true, win: winResult });
    } else {
      res.json({ success: true, triggered: false });
    }
  } catch (error: any) {
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
router.get('/admin/configs', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const configs = await PersonalJackpotsService.getAllConfigs(status as string);
    res.json({ success: true, configs });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error fetching configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/personal-jackpots/admin/configs/:id
 * @desc Get jackpot configuration by ID
 * @access Admin only
 */
router.get('/admin/configs/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await PersonalJackpotsService.getConfigById(parseInt(id));

    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuration not found' });
    }

    res.json({ success: true, config });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error fetching config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/personal-jackpots/admin/configs
 * @desc Create new jackpot configuration
 * @access Admin only
 */
router.post('/admin/configs', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const config = await PersonalJackpotsService.createConfig(req.body);
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error creating config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/personal-jackpots/admin/configs/:id
 * @desc Update jackpot configuration
 * @access Admin only
 */
router.put('/admin/configs/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const config = await PersonalJackpotsService.updateConfig(parseInt(id), req.body);
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error updating config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/personal-jackpots/admin/initialize
 * @desc Manually initialize jackpot for player
 * @access Admin only
 */
router.post('/admin/initialize', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, configId } = req.body;

    if (!userId || !configId) {
      return res.status(400).json({ success: false, error: 'userId and configId are required' });
    }

    const jackpot = await PersonalJackpotsService.initializePlayerJackpot(userId, configId);
    res.json({ success: true, jackpot });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error initializing jackpot:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/personal-jackpots/admin/trigger-win
 * @desc Manually trigger jackpot win for player
 * @access Admin only
 */
router.post('/admin/trigger-win', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, jackpotId } = req.body;

    if (!userId || !jackpotId) {
      return res.status(400).json({ success: false, error: 'userId and jackpotId are required' });
    }

    const result = await PersonalJackpotsService.triggerJackpotWin(userId, jackpotId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error triggering win:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/personal-jackpots/admin/statistics/:configId
 * @desc Get jackpot statistics
 * @access Admin only
 */
router.get('/admin/statistics/:configId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const statistics = await PersonalJackpotsService.getJackpotStatistics(parseInt(configId));
    res.json({ success: true, statistics });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error fetching statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/personal-jackpots/admin/auto-initialize
 * @desc Trigger auto-initialization of jackpots for eligible players
 * @access Admin only
 */
router.post('/admin/auto-initialize', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    await PersonalJackpotsService.autoInitializeJackpots();
    res.json({ success: true, message: 'Auto-initialization completed' });
  } catch (error: any) {
    console.error('[PERSONAL-JACKPOTS] Error in auto-initialization:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
