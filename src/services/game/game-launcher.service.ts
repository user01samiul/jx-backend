/**
 * Unified Game Launcher Service
 *
 * This service provides a unified interface for launching games from different providers.
 * It detects the game provider and routes to the appropriate launch mechanism while
 * ensuring a consistent response structure for the frontend.
 */

import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";

/**
 * Unified game launch response structure
 * This structure is used regardless of the provider to ensure frontend compatibility
 */
export interface UnifiedGameLaunchResponse {
  play_url: string;           // The URL to load in the iframe
  game: any;                  // Game details
  session_info?: {            // Optional: Session information (provider-specific)
    token?: string;
    user_id?: number;
    balance?: number | string;
    currency?: string;
    session_id?: string;
    provider?: string;
    [key: string]: any;       // Allow additional provider-specific fields
  };
  provider_metadata?: any;    // Optional: Provider-specific additional data
}

/**
 * Game launch request parameters
 */
export interface GameLaunchRequest {
  gameId: number;             // Database game ID
  userId: number;             // User ID
  currency?: string;          // User currency (optional, will be fetched if not provided)
  language?: string;          // Game language (default: 'en')
  mode?: 'real' | 'demo';     // Game mode (default: 'real')
}

/**
 * Provider types supported by the system
 */
export enum GameProvider {
  TIMELESS = 'Timeless',
  INNOVA = 'Innova',
  VIMPLAY = 'Vimplay',
  JXORIGINALS = 'JxOriginals',
  IGPIXEL = 'IGPixel',
  PRAGMATIC = 'Pragmatic Play',
  UNKNOWN = 'Unknown'
}

/**
 * Detect game provider from game data
 */
export function detectGameProvider(game: any): GameProvider {
  const provider = game.provider?.toLowerCase() || '';
  const category = game.category?.toLowerCase() || '';

  // Check for specific providers
  if (provider.includes('vimplay')) {
    return GameProvider.VIMPLAY;
  }

  if (provider.includes('jxoriginals') || provider === 'jxoriginals') {
    return GameProvider.JXORIGINALS;
  }

  if (provider.includes('igpixel') || category === 'sportsbook') {
    return GameProvider.IGPIXEL;
  }

  if (provider.includes('pragmatic')) {
    return GameProvider.PRAGMATIC;
  }

  if (provider.includes('timeless') || provider.includes('innova')) {
    return GameProvider.TIMELESS;
  }

  // Default to Timeless/Innova for backward compatibility
  return GameProvider.TIMELESS;
}

/**
 * Check if provider uses unified wallet (no category balances)
 */
export function isUnifiedWalletProvider(provider: GameProvider): boolean {
  return [
    GameProvider.VIMPLAY,
    GameProvider.IGPIXEL
  ].includes(provider);
}

/**
 * Get user balance based on provider type
 * Unified wallet providers use main balance, others use category balance
 */
export async function getUserBalance(userId: number, game: any, provider: GameProvider): Promise<number> {
  const category = game.category?.toLowerCase().trim() || 'slots';

  // Vimplay and IGPX use unified wallet (main balance)
  if (isUnifiedWalletProvider(provider)) {
    const mainBalanceResult = await pool.query(
      `SELECT balance FROM user_balances WHERE user_id = $1`,
      [userId]
    );
    return mainBalanceResult.rows.length > 0 ? mainBalanceResult.rows[0].balance : 0;
  }

  // Other providers use category-specific balance
  const balanceResult = await pool.query(
    `SELECT balance FROM user_category_balances
     WHERE user_id = $1 AND LOWER(TRIM(category)) = $2`,
    [userId, category]
  );

  if (balanceResult.rows.length > 0) {
    return balanceResult.rows[0].balance;
  }

  // Fallback to main balance if category balance not found
  const mainBalanceResult = await pool.query(
    `SELECT balance FROM user_balances WHERE user_id = $1`,
    [userId]
  );
  return mainBalanceResult.rows.length > 0 ? mainBalanceResult.rows[0].balance : 0;
}

/**
 * Launch a Vimplay game using the payment integration service
 */
export async function launchVimplayGame(
  game: any,
  userId: number,
  userBalance: number,
  userCurrency: string
): Promise<UnifiedGameLaunchResponse> {
  console.log('[GAME_LAUNCHER] Launching Vimplay game:', {
    game_id: game.id,
    game_name: game.name,
    user_id: userId,
    balance: userBalance,
    currency: userCurrency
  });

  // Get Vimplay provider config from game_provider_configs table
  const providerResult = await pool.query(
    `SELECT provider_name, api_key, base_url, metadata
     FROM game_provider_configs
     WHERE LOWER(provider_name) = 'vimplay' AND is_active = true
     LIMIT 1`
  );

  if (providerResult.rows.length === 0) {
    throw new ApiError("Vimplay provider not configured or inactive", 500);
  }

  const providerConfig = providerResult.rows[0];
  const metadata = providerConfig.metadata || {};

  // Normalize config structure to match PaymentIntegrationService expectations
  const config = {
    api_endpoint: providerConfig.base_url,
    api_key: providerConfig.api_key,
    config: {
      site_id: metadata.site_id,
      currency: userCurrency
    },
    metadata: metadata
  };

  // Use PaymentIntegrationService to launch the game
  const { PaymentIntegrationService } = require("../payment/payment-integration.service");
  const paymentService = PaymentIntegrationService.getInstance();

  // Generate unique external token for this session
  const externalToken = `vimplay_${userId}_${game.id}_${Date.now()}`;

  // IMPORTANT: Store the token in database for Vimplay callback validation
  const tokenExpiry = new Date();
  tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hour expiry

  await pool.query(
    `INSERT INTO tokens (user_id, access_token, refresh_token, expired_at, is_active, game_id, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (access_token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       expired_at = EXCLUDED.expired_at,
       is_active = EXCLUDED.is_active,
       game_id = EXCLUDED.game_id,
       category = EXCLUDED.category`,
    [
      userId,
      externalToken,
      `refresh_${externalToken}`,
      tokenExpiry,
      true,
      game.id,
      game.category || 'slots'
    ]
  );

  console.log('[VIMPLAY_LAUNCHER] Token stored in database:', {
    token: externalToken,
    user_id: userId,
    game_id: game.id,
    expiry: tokenExpiry.toISOString()
  });

  const launchResult = await paymentService.createPayment('vimplay', config, {
    amount: 0, // No upfront payment for Vimplay
    currency: userCurrency,
    order_id: externalToken,
    metadata: {
      game_id: game.game_code, // Vimplay uses game_code
      user_id: userId,
      language: 'en',
      game_mode: 'real',
      nickname: `Player${userId}`,
      external_token: externalToken
    }
  });

  if (!launchResult.success || !launchResult.payment_url) {
    throw new ApiError(launchResult.message || "Failed to launch Vimplay game", 500);
  }

  // Log game launch activity
  await pool.query(
    `INSERT INTO user_activity_logs
     (user_id, action, category, description, metadata)
     VALUES ($1, 'launch_game', 'gaming', $2, $3)`,
    [
      userId,
      `Launched Vimplay game: ${game.name}`,
      JSON.stringify({
        game_id: game.id,
        game_name: game.name,
        game_code: game.game_code,
        provider: 'Vimplay',
        external_token: externalToken,
        user_balance: userBalance,
        currency: userCurrency,
        game_url: launchResult.payment_url
      })
    ]
  );

  // Return unified response structure
  return {
    play_url: launchResult.payment_url,
    game: {
      ...game
    },
    session_info: {
      user_id: userId,
      balance: userBalance,
      currency: userCurrency,
      provider: 'Vimplay',
      external_token: externalToken
    },
    provider_metadata: launchResult.gateway_response
  };
}

/**
 * Unified game launcher
 * Detects provider and routes to appropriate launch mechanism
 */
export class GameLauncherService {
  /**
   * Launch a game with pre-fetched game data (avoids refetching)
   */
  static async launchGameWithData(request: GameLaunchRequest & { game: any }): Promise<UnifiedGameLaunchResponse> {
    const { game, userId, currency, language = 'en', mode = 'real' } = request;

    console.log('[GAME_LAUNCHER] Launch request with data:', { gameId: game.id, gameName: game.name, provider: game.provider, userId, language, mode });

    // Detect provider
    const provider = detectGameProvider(game);
    console.log('[GAME_LAUNCHER] Detected provider:', provider);

    // Get user info
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.email, up.currency
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new ApiError("User not found", 404);
    }

    const user = userResult.rows[0];
    const userCurrency = currency || user.currency || 'USD';

    // Get user balance (unified or category-based depending on provider)
    const userBalance = await getUserBalance(userId, game, provider);

    // Route to appropriate launcher based on provider
    switch (provider) {
      case GameProvider.VIMPLAY:
        return await launchVimplayGame(game, userId, userBalance, userCurrency);

      case GameProvider.JXORIGINALS:
      case GameProvider.IGPIXEL:
      case GameProvider.TIMELESS:
      case GameProvider.INNOVA:
      case GameProvider.PRAGMATIC:
      default:
        // For other providers, use the existing getGamePlayInfoService
        // Pass the database ID (game.id) for lookup
        const { getGamePlayInfoService } = require("./game.service");
        return await getGamePlayInfoService(game.id, userId);
    }
  }

  /**
   * Launch a game with unified response structure (original method for backward compatibility)
   */
  static async launchGame(request: GameLaunchRequest): Promise<UnifiedGameLaunchResponse> {
    const { gameId, userId, currency, language = 'en', mode = 'real' } = request;

    console.log('[GAME_LAUNCHER] Launch request:', { gameId, userId, language, mode });

    // Get game details
    const { getGameByIdService } = require("./game.service");
    const game = await getGameByIdService(gameId);

    // Use launchGameWithData to avoid code duplication
    return await this.launchGameWithData({
      game,
      gameId,
      userId,
      currency,
      language,
      mode
    });
  }

  /**
   * Check if a provider is supported
   */
  static isSupportedProvider(provider: string): boolean {
    const normalizedProvider = provider?.toLowerCase() || '';
    return Object.values(GameProvider)
      .map(p => p.toLowerCase())
      .some(p => normalizedProvider.includes(p.toLowerCase()));
  }
}
