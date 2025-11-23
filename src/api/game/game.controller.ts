// /api/game.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  getAvailableGamesService,
  getGameByIdService,
  getGameCategoriesService,
  getGameProvidersService,
  getFeaturedGamesService,
  getNewGamesService,
  getHotGamesService,
  getPopularGamesService,
  getGameStatisticsService,
  toggleGameFavoriteService,
  recordGamePlayService,
  placeBetService,
  processBetResultService,
  getGamePlayInfoService,
  getBetResultsService,
  getGamesByCategoryService,
  cancelGameService
} from "../../services/game/game.service";
import {
  PlaceBetInput,
  ProcessBetResultInput,
  RecordGamePlayInput,
  ToggleGameFavoriteInput,
  GameFiltersInput,
  PlayGameInput,
  CancelGameInput
} from "./game.schema";

// Get all available games with filtering
export const getAvailableGames = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: GameFiltersInput = req.query as any;
    const games = await getAvailableGamesService(filters);
    res.status(200).json({ success: true, data: games });
  } catch (err) {
    next(err);
  }
};

// Get game by ID
export const getGameById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    if (isNaN(gameId)) {
      res.status(400).json({ success: false, message: "Invalid game ID" });
      return;
    }

    const game = await getGameByIdService(gameId);
    res.status(200).json({ success: true, data: game });
  } catch (err) {
    next(err);
  }
};

// Get game categories
export const getGameCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await getGameCategoriesService();
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

// Get game providers (optionally filtered by category)
export const getGameProviders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const providers = await getGameProvidersService(category);
    res.status(200).json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
};

// Get featured games
export const getFeaturedGames = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const games = await getFeaturedGamesService(limit);
    res.status(200).json({ success: true, data: games });
  } catch (err) {
    next(err);
  }
};

// Get new games
export const getNewGames = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const games = await getNewGamesService(limit, offset, search);
    res.status(200).json({ success: true, data: games });
  } catch (err) {
    next(err);
  }
};

// Get hot games
export const getHotGames = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const games = await getHotGamesService(limit, offset, search);
    res.status(200).json({ success: true, data: games });
  } catch (err) {
    next(err);
  }
};

// Get popular games
export const getPopularGames = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const games = await getPopularGamesService(limit, offset, search);
    res.status(200).json({ success: true, data: games });
  } catch (err) {
    next(err);
  }
};

// Get game statistics
export const getGameStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const gameId = parseInt(req.params.id);
    if (isNaN(gameId)) {
      res.status(400).json({ success: false, message: "Invalid game ID" });
      return;
    }

    const statistics = await getGameStatisticsService(gameId);
    res.status(200).json({ success: true, data: statistics });
  } catch (err) {
    next(err);
  }
};

// Toggle game favorite status
export const toggleGameFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { game_id } = req.validated?.body as ToggleGameFavoriteInput;
    const result = await toggleGameFavoriteService(userId, game_id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// Record game play
export const recordGamePlay = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { game_id, play_time_seconds } = req.validated?.body as RecordGamePlayInput;
    await recordGamePlayService(userId, game_id, play_time_seconds || 0);
    res.status(200).json({ success: true, message: "Game play recorded successfully" });
  } catch (err) {
    next(err);
  }
};

// Place a bet
export const placeBet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUserId = (req as any).user?.userId;
    if (!adminUserId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    let { game_id, bet_amount, game_data, user_id } = req.validated?.body as PlaceBetInput;
    
    // Use user_id from request body if provided (for admin operations), otherwise use authenticated user
    const userId = user_id || adminUserId;

    // If game_data is missing or empty, auto-generate it
    if (!game_data || (typeof game_data === 'object' && Object.keys(game_data).length === 0)) {
      // Fetch game details
      const game = await getGameByIdService(game_id);
      let gameDataSample: any = {};
      switch (game.category) {
        case "tablegame":
          if (game.name.toLowerCase().includes("roulette")) {
            // Generate bets array to match bet_amount
            // Use a single straight bet if possible
            gameDataSample = {
              bets: [
                { bet_type: "straight", number: 17, chips: bet_amount }
              ],
              session_id: "roul-YYYYMMDD-001"
            };
          } else if (game.name.toLowerCase().includes("blackjack")) {
            gameDataSample = {
              hand_id: "bj-YYYYMMDD-001",
              action: "hit",
              player_cards: ["10H", "7C"],
              dealer_card: "9S"
            };
          } else {
            gameDataSample = { info: "No template available for this table game." };
          }
          break;
        case "slot":
          gameDataSample = {
            lines: 1,
            bet_per_line: bet_amount,
            spin_id: "slot-YYYYMMDD-001"
          };
          break;
        default:
          gameDataSample = { info: "No template available for this game type." };
      }
      game_data = gameDataSample;
    }

    const { MongoHybridService } = require('../../services/mongo/mongo-hybrid.service');
    const mongoHybridService = new MongoHybridService();
    
    const result = await mongoHybridService.placeBet(userId, game_id, bet_amount, game_data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// Process bet result (admin only)
export const processBetResult = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet_id, outcome, win_amount, game_result } = req.validated?.body as ProcessBetResultInput;
    const { MongoHybridService } = require('../../services/mongo/mongo-hybrid.service');
    const mongoHybridService = new MongoHybridService();
    
    const result = await mongoHybridService.processBetResult(bet_id, outcome, win_amount || 0, game_result);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// Keep the old function for backward compatibility
export const getAvailableGamesLegacy = (req: Request, res: Response) => {
  res.json({
    message: "List of available games",
    games: [
      { id: 1, name: "Blackjack" },
      { id: 2, name: "Roulette" },
      { id: 3, name: "Poker" },
    ],
  });
};

// Play game (get play URL and info from provider)
export const playGame = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { game_id } = req.validated?.body as PlayGameInput;
    if (!game_id && game_id !== 0) {
      res.status(400).json({ success: false, message: "game_id is required" });
      return;
    }
    const playInfo = await getGamePlayInfoService(game_id, userId);
    res.status(200).json({ success: true, data: playInfo });
  } catch (err) {
    next(err);
  }
};

export const getGameDataSample = async (req: Request, res: Response) => {
  const gameId = parseInt(req.params.id);
  if (isNaN(gameId)) {
    res.status(400).json({ success: false, message: "Invalid game ID" });
    return;
  }

  // Fetch game details
  const game = await getGameByIdService(gameId);
  if (!game) {
    res.status(404).json({ success: false, message: "Game not found" });
    return;
  }

  // Generate sample game_data based on game type/provider
  let gameDataSample: any = {};
  switch (game.category) {
    case "tablegame":
      if (game.name.toLowerCase().includes("roulette")) {
        gameDataSample = {
          bets: [
            { bet_type: "straight", number: 17, chips: 5 },
            { bet_type: "red", chips: 10 }
          ],
          session_id: "roul-YYYYMMDD-001"
        };
      } else if (game.name.toLowerCase().includes("blackjack")) {
        gameDataSample = {
          hand_id: "bj-YYYYMMDD-001",
          action: "hit",
          player_cards: ["10H", "7C"],
          dealer_card: "9S"
        };
      } else {
        gameDataSample = { info: "No template available for this table game." };
      }
      break;
    case "slot":
      gameDataSample = {
        lines: 20,
        bet_per_line: 1,
        spin_id: "slot-YYYYMMDD-001"
      };
      break;
    default:
      gameDataSample = { info: "No template available for this game type." };
  }

  res.status(200).json({ success: true, data: gameDataSample });
};

export const getBetResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req as any).user?.role;
    const isAdmin = role && (role === 'Admin' || role === 'admin');
    let targetUserId = userId;
    let limit = parseInt(req.query.limit as string) || 50;
    if (isAdmin && req.query.user_id) {
      targetUserId = parseInt(req.query.user_id as string);
    }
    
    const { MongoHybridService } = require('../../services/mongo/mongo-hybrid.service');
    const mongoHybridService = new MongoHybridService();
    
    // Get bets from MongoDB
    const bets = await mongoHybridService.getBets(targetUserId, limit);
    
    // Get game data from PostgreSQL
    const pool = require('../../db/postgres').default;
    const enrichedBets = await Promise.all(bets.map(async (bet: any) => {
      const gameResult = await pool.query('SELECT name, category FROM games WHERE id = $1', [bet.game_id]);
      const gameName = gameResult.rows[0]?.name || 'Unknown Game';
      const category = gameResult.rows[0]?.category || 'slots';
      
      return {
        bet_id: bet.id,
        user_id: bet.user_id,
        game_id: bet.game_id,
        game_name: gameName,
        category: category,
        bet_amount: bet.bet_amount,
        win_amount: bet.win_amount,
        outcome: bet.outcome,
        placed_at: bet.placed_at,
        result_at: bet.result_at
      };
    }));
    
    res.status(200).json({ success: true, data: enrichedBets });
  } catch (err) {
    next(err);
  }
};

// Get games by category with simplified data
export const getGamesByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters: { category?: string; limit?: number; offset?: number } = req.query as any;
    const games = await getGamesByCategoryService(filters);
    res.status(200).json({ success: true, data: games });
  } catch (err) {
    next(err);
  }
};

// Cancel game transaction
export const cancelGame = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { transaction_id, game_id, reason } = req.validated?.body as CancelGameInput;
    
    if (!transaction_id) {
      res.status(400).json({ success: false, message: "Transaction ID is required" });
      return;
    }

    console.log(`[CANCEL_GAME_CONTROLLER] User ${userId} requesting cancellation of transaction ${transaction_id}`);

    const result = await cancelGameService(userId, transaction_id, game_id, reason);
    
    res.status(200).json({ 
      success: true, 
      message: "Transaction cancelled successfully",
      data: result 
    });
  } catch (err) {
    next(err);
  }
};