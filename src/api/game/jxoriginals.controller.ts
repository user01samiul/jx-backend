/**
 * JxOriginals Game Controller
 *
 * Handles API requests specific to JxOriginals games
 */

import { Request, Response } from 'express';
import { JxOriginalsProviderService } from '../../services/provider/jxoriginals-provider.service';
import { GameRouterService } from '../../services/game/game-router.service';
import { ApiError } from '../../utils/apiError';

/**
 * List all JxOriginals games
 * GET /api/jxoriginals/games
 */
export const listJxOriginalsGames = async (req: Request, res: Response) => {
  try {
    const { category, vendor, limit, offset } = req.query;

    const games = await JxOriginalsProviderService.listGames({
      category: category as string,
      vendor: vendor as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({
      success: true,
      provider: 'JxOriginals',
      count: games.length,
      games
    });
  } catch (error) {
    console.error('[JXORIGINALS_CONTROLLER] List games error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list JxOriginals games'
    });
  }
};

/**
 * Get JxOriginals game by ID
 * GET /api/jxoriginals/games/:gameId
 */
export const getJxOriginalsGame = async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId);

    if (isNaN(gameId)) {
      throw new ApiError('Invalid game ID', 400);
    }

    const game = await GameRouterService.getGameInfo(gameId);

    if (game.provider !== 'JxOriginals') {
      throw new ApiError('Game is not a JxOriginals game', 400);
    }

    res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('[JXORIGINALS_CONTROLLER] Get game error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get game'
    });
  }
};

/**
 * Launch JxOriginals game
 * POST /api/jxoriginals/launch/:gameId
 */
export const launchJxOriginalsGame = async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId);
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    if (isNaN(gameId)) {
      throw new ApiError('Invalid game ID', 400);
    }

    console.log('[JXORIGINALS_CONTROLLER] Launching game:', { gameId, userId });

    // Verify this is a JxOriginals game
    const isJxOriginals = await JxOriginalsProviderService.isJxOriginalsGame(gameId);
    if (!isJxOriginals) {
      throw new ApiError('Game is not a JxOriginals game', 400);
    }

    // Launch the game
    const { currency, language, mode } = req.body;

    const launchResponse = await JxOriginalsProviderService.launchGame({
      gameId,
      userId,
      currency: currency || 'USD',
      language: language || 'en',
      mode: mode || 'real'
    });

    res.json(launchResponse);
  } catch (error) {
    console.error('[JXORIGINALS_CONTROLLER] Launch error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to launch game'
    });
  }
};

/**
 * Get JxOriginals game statistics
 * GET /api/jxoriginals/games/:gameId/stats
 */
export const getJxOriginalsGameStats = async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.gameId);

    if (isNaN(gameId)) {
      throw new ApiError('Invalid game ID', 400);
    }

    const stats = await JxOriginalsProviderService.getGameStats(gameId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[JXORIGINALS_CONTROLLER] Get stats error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get game stats'
    });
  }
};

/**
 * Get JxOriginals categories
 * GET /api/jxoriginals/categories
 */
export const getJxOriginalsCategories = async (req: Request, res: Response) => {
  try {
    const games = await JxOriginalsProviderService.listGames();

    // Group games by category
    const categoriesMap = new Map<string, any>();

    games.forEach(game => {
      const category = game.category || 'Other';
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, {
          name: category,
          game_count: 0,
          games: []
        });
      }
      const cat = categoriesMap.get(category)!;
      cat.game_count++;
      cat.games.push({
        id: game.id,
        name: game.name,
        game_code: game.game_code,
        image_url: game.thumbnail_url || game.image_url
      });
    });

    const categories = Array.from(categoriesMap.values());

    res.json({
      success: true,
      provider: 'JxOriginals',
      categories
    });
  } catch (error) {
    console.error('[JXORIGINALS_CONTROLLER] Get categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get categories'
    });
  }
};

/**
 * Get JxOriginals vendors
 * GET /api/jxoriginals/vendors
 */
export const getJxOriginalsVendors = async (req: Request, res: Response) => {
  try {
    const games = await JxOriginalsProviderService.listGames();

    // Group games by vendor
    const vendorsMap = new Map<string, any>();

    games.forEach(game => {
      const vendor = game.vendor || 'Unknown';
      if (!vendorsMap.has(vendor)) {
        vendorsMap.set(vendor, {
          name: vendor,
          game_count: 0,
          categories: new Set()
        });
      }
      const ven = vendorsMap.get(vendor)!;
      ven.game_count++;
      if (game.category) {
        ven.categories.add(game.category);
      }
    });

    const vendors = Array.from(vendorsMap.values()).map(v => ({
      ...v,
      categories: Array.from(v.categories)
    }));

    res.json({
      success: true,
      provider: 'JxOriginals',
      vendors
    });
  } catch (error) {
    console.error('[JXORIGINALS_CONTROLLER] Get vendors error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get vendors'
    });
  }
};

/**
 * Get featured JxOriginals games
 * GET /api/jxoriginals/featured
 */
export const getFeaturedJxOriginalsGames = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    const games = await JxOriginalsProviderService.listGames({
      limit: limit ? parseInt(limit as string) : 10
    });

    // Filter featured games
    const featured = games.filter(game => game.is_featured);

    res.json({
      success: true,
      provider: 'JxOriginals',
      count: featured.length,
      games: featured
    });
  } catch (error) {
    console.error('[JXORIGINALS_CONTROLLER] Get featured error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get featured games'
    });
  }
};

/**
 * Search JxOriginals games
 * GET /api/jxoriginals/search?q=sweet
 */
export const searchJxOriginalsGames = async (req: Request, res: Response) => {
  try {
    const { q, limit, offset } = req.query;

    if (!q || typeof q !== 'string') {
      throw new ApiError('Search query is required', 400);
    }

    const allGames = await JxOriginalsProviderService.listGames({
      limit: 1000 // Get all games for search
    });

    // Simple search in name and description
    const searchTerm = q.toLowerCase();
    const results = allGames.filter(game =>
      game.name.toLowerCase().includes(searchTerm) ||
      game.description?.toLowerCase().includes(searchTerm) ||
      game.game_code?.toLowerCase().includes(searchTerm)
    );

    // Apply pagination
    const start = offset ? parseInt(offset as string) : 0;
    const end = start + (limit ? parseInt(limit as string) : 20);
    const paginatedResults = results.slice(start, end);

    res.json({
      success: true,
      provider: 'JxOriginals',
      query: q,
      total: results.length,
      count: paginatedResults.length,
      games: paginatedResults
    });
  } catch (error) {
    console.error('[JXORIGINALS_CONTROLLER] Search error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Search failed'
    });
  }
};
