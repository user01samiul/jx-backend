import express, { Request, Response } from 'express';
import TournamentService from '../services/TournamentService';
import { authenticate, adminAuth } from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * @route GET /api/tournaments
 * @desc Get all tournaments
 * @access Admin
 */
router.get('/', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { status, currency, limit } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (currency) filters.currency = currency;
    if (limit) filters.limit = parseInt(limit as string);

    const tournaments = await TournamentService.getTournaments(filters);
    res.json({ success: true, data: tournaments });
  } catch (error: any) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/tournaments
 * @desc Create a new tournament
 * @access Admin
 */
router.post('/', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const { tournament, gameIds } = req.body;

    if (!tournament || !gameIds || !Array.isArray(gameIds)) {
      return res.status(400).json({ success: false, error: 'Tournament data and gameIds array are required' });
    }

    const tournamentId = await TournamentService.createTournament(tournament, gameIds);
    res.json({ success: true, message: 'Tournament created', data: { id: tournamentId } });
  } catch (error: any) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/tournaments/:id
 * @desc Update a tournament
 * @access Admin
 */
router.put('/:id', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const updates = req.body;
    await TournamentService.updateTournament(tournamentId, updates);
    res.json({ success: true, message: 'Tournament updated' });
  } catch (error: any) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route DELETE /api/tournaments/:id
 * @desc Delete a tournament
 * @access Admin
 */
router.delete('/:id', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    await TournamentService.deleteTournament(tournamentId);
    res.json({ success: true, message: 'Tournament deleted' });
  } catch (error: any) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/tournaments/:id/start
 * @desc Start a tournament instance
 * @access Admin
 */
router.post('/:id/start', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const instanceId = await TournamentService.startTournamentInstance(tournamentId);
    res.json({ success: true, message: 'Tournament started', data: { instanceId } });
  } catch (error: any) {
    console.error('Error starting tournament:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/tournaments/:id/finish
 * @desc Finish a tournament and distribute prizes
 * @access Admin
 */
router.post('/:id/finish', authenticate, adminAuth, async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.id);
    const { prizeStructure } = req.body;

    if (!prizeStructure || !Array.isArray(prizeStructure)) {
      return res.status(400).json({ success: false, error: 'Prize structure array is required' });
    }

    await TournamentService.finishTournament(instanceId, prizeStructure);
    res.json({ success: true, message: 'Tournament finished and prizes distributed' });
  } catch (error: any) {
    console.error('Error finishing tournament:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/tournaments/active
 * @desc Get active tournaments (player endpoint)
 * @access Public/Player
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tournaments = await TournamentService.getActiveTournaments(userId);
    res.json({ success: true, data: tournaments });
  } catch (error: any) {
    console.error('Error fetching active tournaments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/tournaments/:instanceId/leaderboard
 * @desc Get tournament leaderboard
 * @access Public
 */
router.get('/:instanceId/leaderboard', async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const leaderboard = await TournamentService.getLeaderboard(instanceId, limit);
    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/tournaments/:instanceId/position/:userId
 * @desc Get player position in tournament
 * @access Player
 */
router.get('/:instanceId/position/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId);
    const userId = parseInt(req.params.userId);

    // Ensure user can only see their own position (unless admin)
    if (req.user.id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const position = await TournamentService.getPlayerPosition(instanceId, userId);
    res.json({ success: true, data: position });
  } catch (error: any) {
    console.error('Error fetching player position:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route GET /api/tournaments/:tournamentId/games
 * @desc Get eligible games for a tournament
 * @access Public
 */
router.get('/:tournamentId/games', async (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.tournamentId);
    const games = await TournamentService.getTournamentGames(tournamentId);
    res.json({ success: true, data: games });
  } catch (error: any) {
    console.error('Error fetching tournament games:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
