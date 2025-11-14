/**
 * JxOriginals Routes
 *
 * API routes for JxOriginals games (internal games with full source code)
 */

import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import * as jxOriginalsController from '../api/game/jxoriginals.controller';
import { JxOriginalsGameController } from '../controllers/jxoriginals-game.controller';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// List all JxOriginals games
// GET /api/jxoriginals/games
router.get('/games', jxOriginalsController.listJxOriginalsGames);

// Get game by ID
// GET /api/jxoriginals/games/:gameId
router.get('/games/:gameId', jxOriginalsController.getJxOriginalsGame);

// Get game statistics
// GET /api/jxoriginals/games/:gameId/stats
router.get('/games/:gameId/stats', jxOriginalsController.getJxOriginalsGameStats);

// Get categories
// GET /api/jxoriginals/categories
router.get('/categories', jxOriginalsController.getJxOriginalsCategories);

// Get vendors
// GET /api/jxoriginals/vendors
router.get('/vendors', jxOriginalsController.getJxOriginalsVendors);

// Get featured games
// GET /api/jxoriginals/featured
router.get('/featured', jxOriginalsController.getFeaturedJxOriginalsGames);

// Search games
// GET /api/jxoriginals/search?q=sweet
router.get('/search', jxOriginalsController.searchJxOriginalsGames);

/**
 * Protected routes (authentication required)
 */

// Launch game
// POST /api/jxoriginals/launch/:gameId
router.post('/launch/:gameId', authenticateToken, jxOriginalsController.launchJxOriginalsGame);

/**
 * Game Server Endpoints (replaces VanguardLTE Server.php)
 * These endpoints handle POST requests from the game client
 */

// Main game command endpoint (no auth middleware - token validated inside)
// POST /api/jxoriginals/game?game=aztec_gold_megaways
router.post('/game', JxOriginalsGameController.handleGameRequest);

// Health check
// GET /api/jxoriginals/game/health
router.get('/game/health', JxOriginalsGameController.healthCheck);

export default router;
