import express, { Request, Response } from 'express';
import MiniGamesService from '../services/MiniGamesService';
import { authenticateToken } from '../middlewares/auth.middleware';
import { adminMiddleware as isAdmin } from '../middlewares/admin.middleware';

const router = express.Router();

/**
 * PLAYER ROUTES - Mini Games / Prize Engine
 */

/**
 * @route GET /api/mini-games
 * @desc Get all available mini games
 * @access Authenticated users
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const games = await MiniGamesService.getAllGameTypes('ACTIVE');
    res.json({ success: true, games });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error fetching games:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/mini-games/:id
 * @desc Get mini game details with prizes
 * @access Authenticated users
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const game = await MiniGamesService.getGameTypeById(parseInt(id));

    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const prizes = await MiniGamesService.getGamePrizes(parseInt(id), 'ACTIVE');

    res.json({ success: true, game, prizes });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error fetching game:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/mini-games/:id/play
 * @desc Play a mini game
 * @access Authenticated users
 */
router.post('/:id/play', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const result = await MiniGamesService.playGame(userId, parseInt(id));
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error playing game:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/mini-games/:id/can-play
 * @desc Check if player can play game (cooldown & limits)
 * @access Authenticated users
 */
router.get('/:id/can-play', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const result = await MiniGamesService.canPlayerPlay(userId, parseInt(id));
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error checking play eligibility:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/mini-games/my-plays
 * @desc Get player's play history
 * @access Authenticated users
 */
router.get('/history/my-plays', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { gameId, limit } = req.query;

    const plays = await MiniGamesService.getPlayerPlays(
      userId,
      gameId ? parseInt(gameId as string) : undefined,
      limit ? parseInt(limit as string) : 50
    );

    res.json({ success: true, plays });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error fetching play history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/mini-games/my-cooldowns
 * @desc Get player's current cooldowns
 * @access Authenticated users
 */
router.get('/cooldowns/active', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const cooldowns = await MiniGamesService.getPlayerCooldowns(userId);
    res.json({ success: true, cooldowns });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error fetching cooldowns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ADMIN ROUTES - Mini Game Management
 */

/**
 * @route GET /api/mini-games/admin/games
 * @desc Get all mini games (including inactive)
 * @access Admin only
 */
router.get('/admin/games', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const games = await MiniGamesService.getAllGameTypes(status as string);
    res.json({ success: true, games });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error fetching games:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/mini-games/admin/games
 * @desc Create new mini game
 * @access Admin only
 */
router.post('/admin/games', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const game = await MiniGamesService.createGameType(req.body);
    res.json({ success: true, game });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error creating game:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/mini-games/admin/games/:id
 * @desc Update mini game
 * @access Admin only
 */
router.put('/admin/games/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const game = await MiniGamesService.updateGameType(parseInt(id), req.body);
    res.json({ success: true, game });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error updating game:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/mini-games/admin/games/:id/prizes
 * @desc Get all prizes for a game (including inactive)
 * @access Admin only
 */
router.get('/admin/games/:id/prizes', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.query;
    const prizes = await MiniGamesService.getGamePrizes(parseInt(id), status as string);
    res.json({ success: true, prizes });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error fetching prizes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/mini-games/admin/prizes
 * @desc Create new prize
 * @access Admin only
 */
router.post('/admin/prizes', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const prize = await MiniGamesService.createPrize(req.body);
    res.json({ success: true, prize });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error creating prize:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/mini-games/admin/prizes/:id
 * @desc Update prize
 * @access Admin only
 */
router.put('/admin/prizes/:id', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prize = await MiniGamesService.updatePrize(parseInt(id), req.body);
    res.json({ success: true, prize });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error updating prize:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/mini-games/admin/games/:id/statistics
 * @desc Get game statistics
 * @access Admin only
 */
router.get('/admin/games/:id/statistics', authenticateToken, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const statistics = await MiniGamesService.getGameStatistics(parseInt(id));
    res.json({ success: true, statistics });
  } catch (error: any) {
    console.error('[MINI-GAMES] Error fetching statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
