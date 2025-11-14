import express, { Request, Response } from 'express';
import ChallengesService from '../services/ChallengesService';
import { authenticateToken } from '../middlewares/auth.middleware';
import { adminMiddleware as isAdmin } from '../middlewares/admin.middleware';

const router = express.Router();

/**
 * ADMIN ROUTES - Challenge Template Management
 */

/**
 * @route GET /api/challenges/admin/templates
 * @desc Get all challenge templates
 * @access Admin only
 */
router.get('/admin/templates', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const templates = await ChallengesService.getAllTemplates(status as string);
    res.json({ success: true, templates });
  } catch (error: any) {
    console.error('[CHALLENGES] Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/challenges/admin/templates/:id
 * @desc Get challenge template by ID
 * @access Admin only
 */
router.get('/admin/templates/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await ChallengesService.getTemplateById(parseInt(id));

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error: any) {
    console.error('[CHALLENGES] Error fetching template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/challenges/admin/templates
 * @desc Create new challenge template
 * @access Admin only
 */
router.post('/admin/templates', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const template = await ChallengesService.createTemplate(req.body);
    res.json({ success: true, template });
  } catch (error: any) {
    console.error('[CHALLENGES] Error creating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/challenges/admin/templates/:id
 * @desc Update challenge template
 * @access Admin only
 */
router.put('/admin/templates/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await ChallengesService.updateTemplate(parseInt(id), req.body);
    res.json({ success: true, template });
  } catch (error: any) {
    console.error('[CHALLENGES] Error updating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/challenges/admin/templates/:id
 * @desc Delete challenge template
 * @access Admin only
 */
router.delete('/admin/templates/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await ChallengesService.deleteTemplate(parseInt(id));

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('[CHALLENGES] Error deleting template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/challenges/admin/assign
 * @desc Manually assign challenge to player
 * @access Admin only
 */
router.post('/admin/assign', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, templateId } = req.body;

    if (!userId || !templateId) {
      return res.status(400).json({ success: false, error: 'userId and templateId are required' });
    }

    const challenge = await ChallengesService.assignChallengeToPlayer(userId, templateId);
    res.json({ success: true, challenge });
  } catch (error: any) {
    console.error('[CHALLENGES] Error assigning challenge:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/challenges/admin/auto-assign
 * @desc Trigger auto-assignment of challenges to eligible players
 * @access Admin only
 */
router.post('/admin/auto-assign', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    await ChallengesService.autoAssignChallenges();
    res.json({ success: true, message: 'Auto-assignment completed' });
  } catch (error: any) {
    console.error('[CHALLENGES] Error in auto-assignment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/challenges/admin/expire
 * @desc Expire old challenges
 * @access Admin only
 */
router.post('/admin/expire', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const expiredCount = await ChallengesService.expireOldChallenges();
    res.json({ success: true, expiredCount });
  } catch (error: any) {
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
router.get('/my-challenges', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('[CHALLENGES ROUTE] /my-challenges endpoint hit');
    console.log('[CHALLENGES ROUTE] Full req.user object:', JSON.stringify((req as any).user, null, 2));

    const userId = (req as any).user.userId || (req as any).user.id;
    console.log('[CHALLENGES ROUTE] Extracted userId:', userId);

    const { status } = req.query;
    console.log('[CHALLENGES ROUTE] Status filter:', status);

    const challenges = await ChallengesService.getPlayerChallenges(userId, status as string);

    console.log('[CHALLENGES ROUTE] Returning challenges count:', challenges.length);
    res.json({ success: true, challenges });
  } catch (error: any) {
    console.error('[CHALLENGES] Error fetching player challenges:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/challenges/claim/:challengeId
 * @desc Claim completed challenge reward
 * @access Authenticated users
 */
router.post('/claim/:challengeId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const { challengeId } = req.params;

    const result = await ChallengesService.claimChallengeReward(userId, parseInt(challengeId));
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[CHALLENGES] Error claiming challenge:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/challenges/available
 * @desc Get available challenge templates (active, public)
 * @access Authenticated users
 */
router.get('/available', authenticateToken, async (req: Request, res: Response) => {
  try {
    const templates = await ChallengesService.getAllTemplates('ACTIVE');
    res.json({ success: true, templates });
  } catch (error: any) {
    console.error('[CHALLENGES] Error fetching available challenges:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
