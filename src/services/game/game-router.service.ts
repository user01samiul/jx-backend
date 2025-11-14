/**
 * Game Router Service
 *
 * Smart routing service that automatically detects game provider type
 * and routes to the appropriate launch service (Innova or JxOriginals).
 *
 * This service acts as a unified interface for the frontend,
 * abstracting away the complexity of multiple provider integrations.
 */

import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";
import { JxOriginalsProviderService } from "../provider/jxoriginals-provider.service";

// Supported provider types
export enum ProviderType {
  INNOVA = 'innova',
  JXORIGINALS = 'jxoriginals',
  IGPIXEL = 'igpixel',
  EXTERNAL = 'external'
}

// Provider detection mapping
const PROVIDER_MAP: { [key: string]: ProviderType } = {
  'JxOriginals': ProviderType.JXORIGINALS,
  'Pragmatic Play': ProviderType.INNOVA,
  'Evolution': ProviderType.INNOVA,
  'NetEnt': ProviderType.INNOVA,
  'IGPixel': ProviderType.IGPIXEL,
  'IGTech': ProviderType.IGPIXEL
};

export interface GameLaunchRequest {
  gameId: number;
  userId: number;
  currency?: string;
  language?: string;
  mode?: 'real' | 'demo';
}

export interface GameLaunchResponse {
  success: boolean;
  provider_type: ProviderType;
  play_url: string;
  game: any;
  session: any;
  metadata?: any;
}

export class GameRouterService {

  /**
   * Detect provider type for a game
   */
  static async detectProviderType(gameId: number): Promise<ProviderType> {
    console.log('[GAME_ROUTER] Detecting provider type for game:', gameId);

    const result = await pool.query(
      'SELECT provider, category FROM games WHERE id = $1',
      [gameId]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Game not found', 404);
    }

    const game = result.rows[0];
    const providerType = PROVIDER_MAP[game.provider];

    // Special case: IGPixel games
    if (game.category?.toLowerCase() === 'sportsbook' ||
        game.provider?.toLowerCase().includes('igpixel')) {
      console.log('[GAME_ROUTER] Detected IGPixel/Sportsbook game');
      return ProviderType.IGPIXEL;
    }

    // JxOriginals games
    if (providerType === ProviderType.JXORIGINALS) {
      console.log('[GAME_ROUTER] Detected JxOriginals game');
      return ProviderType.JXORIGINALS;
    }

    // Innova games (Pragmatic, Evolution, NetEnt, etc.)
    if (providerType === ProviderType.INNOVA) {
      console.log('[GAME_ROUTER] Detected Innova game');
      return ProviderType.INNOVA;
    }

    // Default to external provider
    console.log('[GAME_ROUTER] Detected external provider game');
    return ProviderType.EXTERNAL;
  }

  /**
   * Unified game launch endpoint
   * Automatically routes to correct provider service
   */
  static async launchGame(request: GameLaunchRequest): Promise<GameLaunchResponse> {
    const { gameId, userId, currency, language, mode } = request;

    console.log('[GAME_ROUTER] Launching game:', { gameId, userId, mode });

    try {
      // Detect provider type
      const providerType = await this.detectProviderType(gameId);
      console.log('[GAME_ROUTER] Provider type:', providerType);

      // Route to appropriate service
      let launchResponse: any;

      switch (providerType) {
        case ProviderType.JXORIGINALS:
          launchResponse = await this.launchJxOriginalsGame(request);
          break;

        case ProviderType.INNOVA:
          launchResponse = await this.launchInnovaGame(request);
          break;

        case ProviderType.IGPIXEL:
          launchResponse = await this.launchIGPixelGame(request);
          break;

        case ProviderType.EXTERNAL:
          throw new ApiError('External provider games not yet supported', 501);

        default:
          throw new ApiError('Unknown provider type', 500);
      }

      // Log successful launch
      await this.logGameLaunch(userId, gameId, providerType);

      return {
        ...launchResponse,
        provider_type: providerType
      };

    } catch (error) {
      console.error('[GAME_ROUTER] Launch error:', error);
      throw error;
    }
  }

  /**
   * Launch JxOriginals game
   */
  private static async launchJxOriginalsGame(request: GameLaunchRequest): Promise<GameLaunchResponse> {
    console.log('[GAME_ROUTER] Launching JxOriginals game');

    const response = await JxOriginalsProviderService.launchGame({
      gameId: request.gameId,
      userId: request.userId,
      currency: request.currency,
      language: request.language,
      mode: request.mode
    });

    return {
      success: response.success,
      provider_type: ProviderType.JXORIGINALS,
      play_url: response.play_url,
      game: response.game,
      session: response.session,
      metadata: {
        architecture: response.game.architecture,
        websocket_url: response.session.websocket_url
      }
    };
  }

  /**
   * Launch Innova game (existing integration)
   */
  private static async launchInnovaGame(request: GameLaunchRequest): Promise<GameLaunchResponse> {
    console.log('[GAME_ROUTER] Launching Innova game');

    // Use existing game service implementation
    const { getGamePlayInfoService } = require("./game.service");
    const response = await getGamePlayInfoService(request.gameId, request.userId);

    return {
      success: true,
      provider_type: ProviderType.INNOVA,
      play_url: response.play_url,
      game: response.game,
      session: response.session_info,
      metadata: {
        provider: 'innova',
        supplier_host: process.env.SUPPLIER_LAUNCH_HOST
      }
    };
  }

  /**
   * Launch IGPixel game (sportsbook)
   */
  private static async launchIGPixelGame(request: GameLaunchRequest): Promise<GameLaunchResponse> {
    console.log('[GAME_ROUTER] Launching IGPixel game');

    // Use existing game service implementation for IGPixel
    const { getGamePlayInfoService } = require("./game.service");
    const response = await getGamePlayInfoService(request.gameId, request.userId);

    return {
      success: true,
      provider_type: ProviderType.IGPIXEL,
      play_url: response.play_url,
      game: response.game,
      session: response.session_info,
      metadata: {
        provider: 'igpixel',
        transaction_id: response.session_info.transaction_id
      }
    };
  }

  /**
   * Get game info with provider detection
   */
  static async getGameInfo(gameId: number): Promise<any> {
    const result = await pool.query(
      `SELECT g.*,
              COUNT(DISTINCT b.user_id) as total_players,
              COUNT(b.id) as total_bets
       FROM games g
       LEFT JOIN bets b ON g.id = b.game_id
       WHERE g.id = $1
       GROUP BY g.id`,
      [gameId]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Game not found', 404);
    }

    const game = result.rows[0];
    const providerType = await this.detectProviderType(gameId);

    return {
      ...game,
      provider_type: providerType,
      integration_type: providerType === ProviderType.JXORIGINALS ? 'internal' : 'external'
    };
  }

  /**
   * List games grouped by provider type
   */
  static async listGamesByProvider(): Promise<any> {
    const result = await pool.query(
      `SELECT
        provider,
        COUNT(*) as game_count,
        ARRAY_AGG(DISTINCT category) as categories
       FROM games
       WHERE is_active = true
       GROUP BY provider
       ORDER BY game_count DESC`
    );

    const grouped = result.rows.map(row => {
      const providerType = PROVIDER_MAP[row.provider] || ProviderType.EXTERNAL;
      return {
        provider: row.provider,
        provider_type: providerType,
        game_count: parseInt(row.game_count),
        categories: row.categories,
        integration_type: providerType === ProviderType.JXORIGINALS ? 'internal' : 'external'
      };
    });

    return {
      providers: grouped,
      total_providers: grouped.length,
      internal_games: grouped
        .filter(p => p.provider_type === ProviderType.JXORIGINALS)
        .reduce((sum, p) => sum + p.game_count, 0),
      external_games: grouped
        .filter(p => p.provider_type !== ProviderType.JXORIGINALS)
        .reduce((sum, p) => sum + p.game_count, 0)
    };
  }

  /**
   * Get games by provider type
   */
  static async getGamesByProviderType(
    providerType: ProviderType,
    filters?: {
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    const { category, limit = 50, offset = 0 } = filters || {};

    // Get provider names for this type
    const providers = Object.entries(PROVIDER_MAP)
      .filter(([_, type]) => type === providerType)
      .map(([name, _]) => name);

    if (providers.length === 0) {
      return [];
    }

    let query = `
      SELECT id, name, provider, category, subcategory,
             image_url, thumbnail_url, game_code,
             rtp_percentage, volatility, min_bet, max_bet, max_win,
             is_featured, is_new, is_hot
      FROM games
      WHERE is_active = true
      AND provider = ANY($1)
    `;

    const params: any[] = [providers];
    let paramCount = 1;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    query += ` ORDER BY is_featured DESC, is_hot DESC, name ASC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      ...row,
      provider_type: providerType,
      integration_type: providerType === ProviderType.JXORIGINALS ? 'internal' : 'external'
    }));
  }

  /**
   * Log game launch
   */
  private static async logGameLaunch(
    userId: number,
    gameId: number,
    providerType: ProviderType
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO user_activity_logs
         (user_id, action, category, description, metadata)
         VALUES ($1, 'launch_game', 'gaming', $2, $3)`,
        [
          userId,
          'Game launched via router',
          JSON.stringify({
            game_id: gameId,
            provider_type: providerType,
            timestamp: new Date().toISOString()
          })
        ]
      );
    } catch (error) {
      console.error('[GAME_ROUTER] Failed to log game launch:', error);
      // Don't throw - logging failure shouldn't prevent game launch
    }
  }

  /**
   * Get provider statistics
   */
  static async getProviderStats(): Promise<any> {
    const result = await pool.query(
      `SELECT
        g.provider,
        COUNT(DISTINCT g.id) as total_games,
        COUNT(DISTINCT b.user_id) as total_players,
        COUNT(b.id) as total_bets,
        COALESCE(SUM(b.bet_amount), 0) as total_wagered,
        COALESCE(SUM(b.win_amount), 0) as total_won
       FROM games g
       LEFT JOIN bets b ON g.id = b.game_id
       WHERE g.is_active = true
       GROUP BY g.provider
       ORDER BY total_wagered DESC`
    );

    return result.rows.map(row => {
      const providerType = PROVIDER_MAP[row.provider] || ProviderType.EXTERNAL;
      return {
        provider: row.provider,
        provider_type: providerType,
        integration_type: providerType === ProviderType.JXORIGINALS ? 'internal' : 'external',
        total_games: parseInt(row.total_games),
        total_players: parseInt(row.total_players),
        total_bets: parseInt(row.total_bets),
        total_wagered: parseFloat(row.total_wagered),
        total_won: parseFloat(row.total_won),
        house_edge: row.total_wagered > 0
          ? ((parseFloat(row.total_wagered) - parseFloat(row.total_won)) / parseFloat(row.total_wagered) * 100).toFixed(2)
          : 0
      };
    });
  }

  /**
   * Health check for all provider integrations
   */
  static async checkProvidersHealth(): Promise<any> {
    const health: any = {
      timestamp: new Date().toISOString(),
      providers: {}
    };

    // Check JxOriginals
    try {
      const jxoGames = await JxOriginalsProviderService.listGames({ limit: 1 });
      health.providers.jxoriginals = {
        status: 'healthy',
        available_games: jxoGames.length > 0,
        websocket_configured: !!process.env.JXORIGINALS_WS_URL
      };
    } catch (error) {
      health.providers.jxoriginals = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Check Innova
    try {
      const innovaConfigured = !!(process.env.SUPPLIER_LAUNCH_HOST && process.env.SUPPLIER_OPERATOR_ID);
      health.providers.innova = {
        status: innovaConfigured ? 'healthy' : 'not_configured',
        configured: innovaConfigured
      };
    } catch (error) {
      health.providers.innova = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Check IGPixel
    try {
      const igpxConfigured = !!process.env.IGPX_API_KEY;
      health.providers.igpixel = {
        status: igpxConfigured ? 'healthy' : 'not_configured',
        configured: igpxConfigured
      };
    } catch (error) {
      health.providers.igpixel = {
        status: 'unhealthy',
        error: error.message
      };
    }

    return health;
  }
}

export default GameRouterService;
