/**
 * JxOriginals Provider Service
 *
 * Handles game launches and callbacks for internally hosted JxOriginals games.
 * These are games with full source code that we control completely.
 *
 * Unlike Innova integration, this service:
 * - Launches games directly from our server
 * - Has full control over RTP and game logic
 * - Uses PHP game servers with WebSocket communication
 * - Supports Pragmatic-style, ISB, and CT game architectures
 */

import pool from "../../db/postgres";
import crypto from "crypto";
import { ApiError } from "../../utils/apiError";
import { CurrencyUtils } from "../../utils/currency.utils";

// JxOriginals game configuration
const JXORIGINALS_CONFIG = {
  baseUrl: process.env.JXORIGINALS_BASE_URL || 'https://backend.jackpotx.net/JxOriginalGames',
  websocketUrl: process.env.JXORIGINALS_WS_URL || 'wss://backend.jackpotx.net:8443',
  provider: 'JxOriginals',
  secretKey: process.env.JXORIGINALS_SECRET_KEY || process.env.SUPPLIER_SECRET_KEY,
  operatorId: process.env.JXORIGINALS_OPERATOR_ID || process.env.SUPPLIER_OPERATOR_ID
};

// Game type mapping
const GAME_TYPE_MAP: { [key: string]: string } = {
  'sweet_bonanza': 'SweetBonanza',
  'gates_olympus': 'GatesofOlympus',
  'hercules_zeus': 'HerculesonofZeus',
  'sugar_rush': 'SugarRush',
  'aztec_gold_megaways': 'AztecGoldMegawaysISB',
  'fishing_gold': 'FishingForGoldISB',
  'ghosts_gold': 'GhostsNGoldISB',
  'hot_spin_deluxe': 'HotSpinDeluxeISB',
  'lost_boys_loot': 'LostBoysLootISB',
  'racetrack_riches': 'RacetrackRichesISB',
  'sheriff_nottingham': 'SheriffOfNotinghamISB',
  'stacks_gold': 'StacksOGoldISB',
  'golden_city': 'TheGoldenCityISB',
  'wild_ape': 'WildApeISB',
  'american_gigolo': 'AmericanGigoloCT',
  'bavarian_forest': 'BavarianForestCT'
};

// Game architecture types
const GAME_ARCHITECTURE: { [key: string]: 'pragmatic' | 'isb' | 'ct' } = {
  'SweetBonanza': 'pragmatic',
  'GatesofOlympus': 'pragmatic',
  'HerculesonofZeus': 'pragmatic',
  'SugarRush': 'pragmatic',
  'AztecGoldMegawaysISB': 'isb',
  'FishingForGoldISB': 'isb',
  'GhostsNGoldISB': 'isb',
  'HotSpinDeluxeISB': 'isb',
  'LostBoysLootISB': 'isb',
  'RacetrackRichesISB': 'isb',
  'SheriffOfNotinghamISB': 'isb',
  'StacksOGoldISB': 'isb',
  'TheGoldenCityISB': 'isb',
  'WildApeISB': 'isb',
  'AmericanGigoloCT': 'ct',
  'BavarianForestCT': 'ct'
};

export interface JxOriginalsLaunchRequest {
  gameId: number;
  userId: number;
  currency?: string;
  language?: string;
  mode?: 'real' | 'demo';
}

export interface JxOriginalsLaunchResponse {
  success: boolean;
  play_url: string;
  game: any;
  session: {
    token: string;
    session_id: string;
    balance: number;
    websocket_url?: string;
  };
}

export class JxOriginalsProviderService {

  /**
   * Check if a game is a JxOriginals game
   */
  static async isJxOriginalsGame(gameId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT provider FROM games WHERE id = $1',
      [gameId]
    );

    return result.rows.length > 0 && result.rows[0].provider === 'JxOriginals';
  }

  /**
   * Launch a JxOriginals game
   */
  static async launchGame(request: JxOriginalsLaunchRequest): Promise<JxOriginalsLaunchResponse> {
    const { gameId, userId, currency = 'USD', language = 'en', mode = 'real' } = request;

    console.log('[JXORIGINALS] Launching game:', { gameId, userId, mode });

    try {
      // 1. Get game from database
      const gameResult = await pool.query(
        `SELECT id, name, game_code, category, provider, vendor, rtp_percentage, min_bet, max_bet
         FROM games
         WHERE id = $1 AND provider = $2 AND is_active = true`,
        [gameId, 'JxOriginals']
      );

      if (gameResult.rows.length === 0) {
        throw new ApiError('JxOriginals game not found or inactive', 404);
      }

      const game = gameResult.rows[0];
      const gameFolder = GAME_TYPE_MAP[game.game_code] || game.game_code;
      const architecture = GAME_ARCHITECTURE[gameFolder] || 'pragmatic';

      console.log('[JXORIGINALS] Game details:', {
        name: game.name,
        code: game.game_code,
        folder: gameFolder,
        architecture
      });

      // 2. Get user info and balance
      const userResult = await pool.query(
        `SELECT u.id, u.username, up.currency
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new ApiError('User not found', 404);
      }

      const user = userResult.rows[0];
      const userCurrency = currency || user.currency || 'USD';

      // 3. Get category balance
      const category = game.category?.toLowerCase().trim() || 'slots';
      const { MongoService } = require("../mongo/mongo.service");
      await MongoService.initialize();

      const balance = await MongoService.getCategoryBalance(userId, category);
      console.log('[JXORIGINALS] User balance:', { userId, category, balance });

      // 4. Generate session token and session ID
      const token = this.generateSessionToken(userId, gameId);
      const sessionId = `jxo_${userId}_${gameId}_${Date.now()}`;
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 1); // 24 hours expiry

      // 5. Store token in database
      await pool.query(
        `INSERT INTO tokens (user_id, access_token, refresh_token, expired_at, is_active, game_id, category)
         VALUES ($1, $2, $3, $4, true, $5, $6)
         ON CONFLICT (access_token) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           expired_at = EXCLUDED.expired_at,
           is_active = true,
           game_id = EXCLUDED.game_id,
           category = EXCLUDED.category`,
        [userId, token, `refresh_${token}`, tokenExpiry, gameId, game.category]
      );

      console.log('[JXORIGINALS] Token created:', { token, sessionId, expiry: tokenExpiry });

      // 6. Build game launch URL based on architecture
      let playUrl: string;
      let websocketUrl: string | undefined;

      switch (architecture) {
        case 'pragmatic':
          // Pragmatic-style games use WebSocket binary protocol
          playUrl = this.buildPragmaticUrl(gameFolder, token, sessionId, userId, balance, userCurrency);
          websocketUrl = `${JXORIGINALS_CONFIG.websocketUrl}/pragmatic`;
          break;

        case 'isb':
          // ISB games use HTML5 + WebSocket JSON protocol
          playUrl = this.buildISBUrl(gameFolder, token, sessionId, userId, balance, userCurrency);
          websocketUrl = `${JXORIGINALS_CONFIG.websocketUrl}/slots`;
          break;

        case 'ct':
          // CryptoTech games use HTML interface
          playUrl = this.buildCTUrl(gameFolder, token, sessionId, userId, balance, userCurrency);
          break;

        default:
          throw new ApiError('Unknown game architecture', 500);
      }

      // 7. Log game launch activity
      await pool.query(
        `INSERT INTO user_activity_logs
         (user_id, action, category, description, metadata)
         VALUES ($1, 'launch_game', 'gaming', $2, $3)`,
        [
          userId,
          `Launched JxOriginals game: ${game.name}`,
          JSON.stringify({
            game_id: gameId,
            game_name: game.name,
            game_code: game.game_code,
            provider: 'JxOriginals',
            architecture,
            session_token: token,
            session_id: sessionId,
            balance,
            category,
            currency: userCurrency
          })
        ]
      );

      console.log('[JXORIGINALS] Game launched successfully:', { playUrl, websocketUrl });

      return {
        success: true,
        play_url: playUrl,
        game: {
          ...game,
          architecture,
          folder: gameFolder
        },
        session: {
          token,
          session_id: sessionId,
          balance,
          websocket_url: websocketUrl
        }
      };

    } catch (error) {
      console.error('[JXORIGINALS] Launch error:', error);
      throw error;
    }
  }

  /**
   * Build Pragmatic-style game URL
   * Routes through universal launcher since these games need special WebSocket client
   */
  private static buildPragmaticUrl(
    gameFolder: string,
    token: string,
    sessionId: string,
    userId: number,
    balance: number,
    currency: string
  ): string {
    // Get game_code from folder name using reverse lookup
    const gameCode = Object.entries(GAME_TYPE_MAP).find(([code, folder]) => folder === gameFolder)?.[0] || gameFolder.toLowerCase();

    const params = new URLSearchParams({
      game: gameCode,
      token,
      session_id: sessionId,
      user_id: userId.toString(),
      balance: balance.toString(),
      currency,
      mode: 'real'
    });

    return `https://jxoriginals.jackpotx.net/game-launcher.html?${params.toString()}`;
  }

  /**
   * Build ISB-style game URL
   * Routes through universal launcher which handles game-specific HTML files
   */
  private static buildISBUrl(
    gameFolder: string,
    token: string,
    sessionId: string,
    userId: number,
    balance: number,
    currency: string
  ): string {
    // Get game_code from folder name using reverse lookup
    const gameCode = Object.entries(GAME_TYPE_MAP).find(([code, folder]) => folder === gameFolder)?.[0] || gameFolder.toLowerCase();

    const params = new URLSearchParams({
      game: gameCode,
      token,
      session_id: sessionId,
      user_id: userId.toString(),
      balance: balance.toString(),
      currency,
      mode: 'real'
    });

    return `https://jxoriginals.jackpotx.net/game-launcher.html?${params.toString()}`;
  }

  /**
   * Build CryptoTech-style game URL
   * Routes through universal launcher
   */
  private static buildCTUrl(
    gameFolder: string,
    token: string,
    sessionId: string,
    userId: number,
    balance: number,
    currency: string
  ): string {
    // Get game_code from folder name using reverse lookup
    const gameCode = Object.entries(GAME_TYPE_MAP).find(([code, folder]) => folder === gameFolder)?.[0] || gameFolder.toLowerCase();

    const params = new URLSearchParams({
      game: gameCode,
      token,
      session_id: sessionId,
      user_id: userId.toString(),
      balance: balance.toString(),
      currency,
      mode: 'real'
    });

    return `https://jxoriginals.jackpotx.net/game-launcher.html?${params.toString()}`;
  }

  /**
   * Generate unique session token
   */
  private static generateSessionToken(userId: number, gameId: number): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const baseString = `jxo_${userId}_${gameId}_${timestamp}_${randomBytes}`;

    return crypto.createHash('sha256').update(baseString).digest('hex').substring(0, 40);
  }

  /**
   * Validate session token
   */
  static async validateToken(token: string): Promise<any> {
    const result = await pool.query(
      `SELECT t.*, u.username, up.currency
       FROM tokens t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE t.access_token = $1
       AND t.is_active = true
       AND t.expired_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Invalid or expired token', 401);
    }

    return result.rows[0];
  }

  /**
   * Get user balance for game session
   */
  static async getUserBalance(userId: number, category: string): Promise<number> {
    const { MongoService } = require("../mongo/mongo.service");
    await MongoService.initialize();

    return await MongoService.getCategoryBalance(userId, category);
  }

  /**
   * List all available JxOriginals games
   */
  static async listGames(filters?: {
    category?: string;
    vendor?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const { category, vendor, limit = 50, offset = 0 } = filters || {};

    let query = `
      SELECT id, name, game_code, category, subcategory, vendor,
             image_url, thumbnail_url, rtp_percentage, volatility,
             min_bet, max_bet, max_win, is_featured, is_new, is_hot,
             description, created_at
      FROM games
      WHERE provider = 'JxOriginals' AND is_active = true
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (vendor) {
      paramCount++;
      query += ` AND vendor = $${paramCount}`;
      params.push(vendor);
    }

    query += ` ORDER BY is_featured DESC, is_hot DESC, is_new DESC, name ASC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get game statistics
   */
  static async getGameStats(gameId: number): Promise<any> {
    const result = await pool.query(
      `SELECT
        g.id, g.name, g.game_code,
        COUNT(DISTINCT b.user_id) as total_players,
        COUNT(b.id) as total_bets,
        COALESCE(SUM(b.bet_amount), 0) as total_wagered,
        COALESCE(SUM(b.win_amount), 0) as total_won,
        COALESCE(AVG(b.bet_amount), 0) as avg_bet,
        MAX(b.placed_at) as last_played
       FROM games g
       LEFT JOIN bets b ON g.id = b.game_id
       WHERE g.id = $1 AND g.provider = 'JxOriginals'
       GROUP BY g.id, g.name, g.game_code`,
      [gameId]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Game not found', 404);
    }

    return result.rows[0];
  }
}

export default JxOriginalsProviderService;
