import express, { Request, Response } from 'express';
import RiskManagementService from '../services/RiskManagementService';
import { authenticateToken } from '../middlewares/auth.middleware';
import { adminMiddleware as isAdmin } from '../middlewares/admin.middleware';

const router = express.Router();

/**
 * ADMIN ROUTES - Risk Management
 */

/**
 * @route GET /api/risk/admin/rules
 * @desc Get all risk rules
 * @access Admin only
 */
router.get('/admin/rules', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const rules = await RiskManagementService.getAllRules(status as string);
    res.json({ success: true, rules });
  } catch (error: any) {
    console.error('[RISK] Error fetching rules:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/risk/admin/rules/:id
 * @desc Get risk rule by ID
 * @access Admin only
 */
router.get('/admin/rules/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await RiskManagementService.getRuleById(parseInt(id));

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    res.json({ success: true, rule });
  } catch (error: any) {
    console.error('[RISK] Error fetching rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/risk/admin/rules
 * @desc Create new risk rule
 * @access Admin only
 */
router.post('/admin/rules', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const rule = await RiskManagementService.createRule(req.body);
    res.json({ success: true, rule });
  } catch (error: any) {
    console.error('[RISK] Error creating rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/risk/admin/rules/:id
 * @desc Update risk rule
 * @access Admin only
 */
router.put('/admin/rules/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await RiskManagementService.updateRule(parseInt(id), req.body);
    res.json({ success: true, rule });
  } catch (error: any) {
    console.error('[RISK] Error updating rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/risk/admin/rules/:id
 * @desc Delete risk rule
 * @access Admin only
 */
router.delete('/admin/rules/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await RiskManagementService.deleteRule(parseInt(id));

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (error: any) {
    console.error('[RISK] Error deleting rule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/risk/admin/evaluate/:userId
 * @desc Evaluate user against all risk rules
 * @access Admin only
 */
router.post('/admin/evaluate/:userId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const triggeredRules = await RiskManagementService.evaluateUser(parseInt(userId));
    res.json({ success: true, triggeredRules });
  } catch (error: any) {
    console.error('[RISK] Error evaluating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/risk/admin/events/:userId
 * @desc Get risk events for user
 * @access Admin only
 */
router.get('/admin/events/:userId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { resolved, limit } = req.query;

    const events = await RiskManagementService.getUserRiskEvents(
      parseInt(userId),
      resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      limit ? parseInt(limit as string) : 50
    );

    res.json({ success: true, events });
  } catch (error: any) {
    console.error('[RISK] Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/risk/admin/score/:userId
 * @desc Get player risk score
 * @access Admin only
 */
router.get('/admin/score/:userId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const score = await RiskManagementService.getPlayerRiskScore(parseInt(userId));
    res.json({ success: true, score });
  } catch (error: any) {
    console.error('[RISK] Error fetching risk score:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/risk/admin/resolve/:eventId
 * @desc Resolve risk event
 * @access Admin only
 */
router.post('/admin/resolve/:eventId', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({ success: false, error: 'resolution is required' });
    }

    const event = await RiskManagementService.resolveRiskEvent(parseInt(eventId), resolution);
    res.json({ success: true, event });
  } catch (error: any) {
    console.error('[RISK] Error resolving event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/risk/admin/high-risk-players
 * @desc Get list of high-risk players
 * @access Admin only
 */
router.get('/admin/high-risk-players', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { minScore, limit } = req.query;

    const players = await RiskManagementService.getHighRiskPlayers(
      minScore ? parseInt(minScore as string) : 10,
      limit ? parseInt(limit as string) : 100
    );

    res.json({ success: true, players });
  } catch (error: any) {
    console.error('[RISK] Error fetching high-risk players:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
