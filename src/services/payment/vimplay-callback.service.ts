import pool from "../../db/postgres";

export interface VimplayAuthRequest {
  token: string;
}

export interface VimplayDebitRequest {
  siteId: number;
  playerId: string;
  token: string;
  currency: string;
  roundId: string;
  gameId: number;
  trnasaction: {
    transactionId: string;
    betAmount: number;
    inGameBouns: boolean;
    bonusId?: string;
  };
}

export interface VimplayCreditRequest {
  siteId: number;
  playerId: string;
  token: string;
  currency: string;
  roundId: string;
  gameId: number;
  transaction: {
    transactionId: string;
    betAmount: number;
    inGameBouns: boolean;
    bonusId?: string;
    winAmount: number;
    betTransactionId: string;
  };
}

export interface VimplayBetWinRequest {
  siteId: number;
  playerId: string;
  token: string;
  currency: string;
  roundId: string;
  gameId: number;
  trnasaction: {
    transactionId: string;
    betAmount: number;
    bonusId?: string;
    inGameBouns: boolean;
    winAmount: number;
  };
}

export interface VimplayRefundRequest {
  transactionId: string;
  token: string;
  playerId: string;
  gameId: string;
}

export interface VimplayGameListRequest {
  secret: string;
}

export interface VimplayGameListResponse {
  id: number;
  name: string;
  images: {
    ls: {
      org: string;
      avif: string;
      webp: string;
    };
    pr: {
      org: string;
      avif: string;
      webp: string;
    };
    sq: {
      org: string;
      avif: string;
      webp: string;
    };
  };
  type: string;
}

export interface VimplayResponse {
  balance?: number;
  playerId?: string;
  player_id?: string;
  token?: string;
  transaction?: {
    status: number;
    transactionId: string;
    partnerTransactionId: string;
  };
  status?: number;
}

// Vimplay status codes
export const VimplayStatus = {
  SUCCESS: 111,
  INSUFFICIENT_BALANCE: 666,
  DUPLICATE_TRANSACTION: 555,
  SESSION_EXPIRED: 888,
  GENERAL_ERROR: 999,
};

export class VimplayCallbackService {
  private static instance: VimplayCallbackService;

  private constructor() {}

  public static getInstance(): VimplayCallbackService {
    if (!VimplayCallbackService.instance) {
      VimplayCallbackService.instance = new VimplayCallbackService();
    }
    return VimplayCallbackService.instance;
  }

  /**
   * Authenticate user session
   */
  async authenticate(request: VimplayAuthRequest): Promise<VimplayResponse> {
    try {
      console.log('[VIMPLAY] Authenticate request:', { token: request.token });

      let userId: number | null = null;

      // Check if this is a Vimplay custom token (format: vimplay_userId_gameId_timestamp)
      if (request.token?.startsWith('vimplay_')) {
        console.log('[VIMPLAY] Detected Vimplay custom token format');

        // Look up token in database
        const tokenResult = await pool.query(
          `SELECT user_id, expired_at, is_active, metadata
           FROM tokens
           WHERE access_token = $1`,
          [request.token]
        );

        if (tokenResult.rows.length === 0) {
          console.error('[VIMPLAY] Token not found in database:', request.token);
          return {
            status: VimplayStatus.SESSION_EXPIRED,
            balance: 0,
            player_id: '',
            token: ''
          };
        }

        const tokenData = tokenResult.rows[0];

        // Check if token is expired
        if (new Date(tokenData.expired_at) < new Date()) {
          console.error('[VIMPLAY] Token expired:', request.token);
          return {
            status: VimplayStatus.SESSION_EXPIRED,
            balance: 0,
            player_id: '',
            token: ''
          };
        }

        // Check if token is active
        if (!tokenData.is_active) {
          console.error('[VIMPLAY] Token is inactive:', request.token);
          return {
            status: VimplayStatus.SESSION_EXPIRED,
            balance: 0,
            player_id: '',
            token: ''
          };
        }

        userId = tokenData.user_id;
        console.log('[VIMPLAY] Token validated from database, user_id:', userId);
      } else {
        // Fallback to JWT validation for backward compatibility
        console.log('[VIMPLAY] Attempting JWT token validation');
        const { getUserIdFromToken } = require('../auth/jwt.service');
        userId = await getUserIdFromToken(request.token);
      }

      if (!userId) {
        console.error('[VIMPLAY] Could not extract user ID from token');
        return {
          status: VimplayStatus.SESSION_EXPIRED,
          balance: 0,
          player_id: '',
          token: ''
        };
      }

      // Get user balance
      const balanceResult = await pool.query(
        `SELECT balance FROM user_balances WHERE user_id = $1`,
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        console.error('[VIMPLAY] User balance not found for user:', userId);
        return {
          status: VimplayStatus.GENERAL_ERROR,
          balance: 0,
          player_id: '',
          token: ''
        };
      }

      const balance = parseFloat(balanceResult.rows[0].balance) || 0;

      console.log(`[VIMPLAY] Auth successful: User ${userId}, Balance: ${balance}`);

      return {
        balance,
        player_id: userId.toString(),
        token: request.token
      };
    } catch (error: any) {
      console.error('[VIMPLAY] Auth error:', error);
      return {
        status: VimplayStatus.GENERAL_ERROR,
        balance: 0,
        player_id: '',
        token: ''
      };
    }
  }

  /**
   * Get user's current balance
   */
  private async getUserBalance(userId: number): Promise<number> {
    const result = await pool.query(
      `SELECT balance FROM user_balances WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    return parseFloat(result.rows[0].balance) || 0;
  }

  /**
   * Check if transaction already exists (for idempotency)
   */
  private async isTransactionProcessed(transactionId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT id FROM transactions WHERE external_reference = $1 AND metadata->>'vimplay_processed' = 'true'`,
      [transactionId]
    );

    return result.rows.length > 0;
  }

  /**
   * Process debit (bet) transaction
   */
  async processDebit(request: VimplayDebitRequest): Promise<VimplayResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const userId = parseInt(request.playerId);
      const transactionId = request.trnasaction.transactionId;
      const betAmount = request.trnasaction.betAmount;

      console.log(`[VIMPLAY] Processing debit: User ${userId}, Amount: ${betAmount}, TxID: ${transactionId}`);

      // Check for duplicate transaction
      if (await this.isTransactionProcessed(transactionId)) {
        console.log(`[VIMPLAY] Duplicate debit transaction: ${transactionId}`);
        const balance = await this.getUserBalance(userId);
        await client.query('COMMIT');

        return {
          balance,
          playerId: request.playerId,
          transaction: {
            status: VimplayStatus.DUPLICATE_TRANSACTION,
            transactionId,
            partnerTransactionId: transactionId
          }
        };
      }

      // Verify user exists and lock the row
      const userResult = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      const currentBalance = parseFloat(userResult.rows[0].balance);

      // Check sufficient balance
      if (currentBalance < betAmount) {
        await client.query('ROLLBACK');
        return {
          balance: currentBalance,
          playerId: request.playerId,
          transaction: {
            status: VimplayStatus.INSUFFICIENT_BALANCE,
            transactionId,
            partnerTransactionId: transactionId
          }
        };
      }

      const newBalance = currentBalance - betAmount;

      // Update balance
      await client.query(
        `UPDATE user_balances SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [newBalance, userId]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          userId,
          'withdrawal',
          betAmount,
          request.currency,
          'completed',
          `Vimplay Bet - Round ${request.roundId}, Game ${request.gameId}`,
          transactionId,
          JSON.stringify({
            vimplay_action: 'debit',
            vimplay_transaction_id: transactionId,
            vimplay_processed: 'true',
            round_id: request.roundId,
            game_id: request.gameId,
            site_id: request.siteId,
            in_game_bonus: request.trnasaction.inGameBouns,
            bonus_id: request.trnasaction.bonusId,
            balance_before: currentBalance,
            balance_after: newBalance
          })
        ]
      );

      await client.query('COMMIT');

      console.log(`[VIMPLAY] Debit processed: User ${userId}, Balance: ${currentBalance} -> ${newBalance}`);

      return {
        balance: newBalance,
        playerId: request.playerId,
        transaction: {
          status: VimplayStatus.SUCCESS,
          transactionId,
          partnerTransactionId: transactionId
        }
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[VIMPLAY] Debit error:', error);

      return {
        balance: 0,
        playerId: request.playerId,
        transaction: {
          status: VimplayStatus.GENERAL_ERROR,
          transactionId: request.trnasaction.transactionId,
          partnerTransactionId: request.trnasaction.transactionId
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Process credit (win) transaction
   */
  async processCredit(request: VimplayCreditRequest): Promise<VimplayResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const userId = parseInt(request.playerId);
      const transactionId = request.transaction.transactionId;
      const winAmount = request.transaction.winAmount;

      console.log(`[VIMPLAY] Processing credit: User ${userId}, Amount: ${winAmount}, TxID: ${transactionId}`);

      // Check for duplicate transaction
      if (await this.isTransactionProcessed(transactionId)) {
        console.log(`[VIMPLAY] Duplicate credit transaction: ${transactionId}`);
        const balance = await this.getUserBalance(userId);
        await client.query('COMMIT');

        return {
          balance,
          playerId: request.playerId,
          transaction: {
            status: VimplayStatus.DUPLICATE_TRANSACTION,
            transactionId,
            partnerTransactionId: transactionId
          }
        };
      }

      // Verify user exists and lock the row
      const userResult = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      const currentBalance = parseFloat(userResult.rows[0].balance);
      const newBalance = currentBalance + winAmount;

      // Update balance
      await client.query(
        `UPDATE user_balances SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [newBalance, userId]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          userId,
          'deposit',
          winAmount,
          request.currency,
          'completed',
          `Vimplay Win - Round ${request.roundId}, Game ${request.gameId}`,
          transactionId,
          JSON.stringify({
            vimplay_action: 'credit',
            vimplay_transaction_id: transactionId,
            vimplay_processed: 'true',
            round_id: request.roundId,
            game_id: request.gameId,
            site_id: request.siteId,
            bet_transaction_id: request.transaction.betTransactionId,
            bet_amount: request.transaction.betAmount,
            win_amount: winAmount,
            in_game_bonus: request.transaction.inGameBouns,
            bonus_id: request.transaction.bonusId,
            balance_before: currentBalance,
            balance_after: newBalance
          })
        ]
      );

      await client.query('COMMIT');

      console.log(`[VIMPLAY] Credit processed: User ${userId}, Balance: ${currentBalance} -> ${newBalance}`);

      return {
        balance: newBalance,
        playerId: request.playerId,
        transaction: {
          status: VimplayStatus.SUCCESS,
          transactionId,
          partnerTransactionId: transactionId
        }
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[VIMPLAY] Credit error:', error);

      return {
        balance: 0,
        playerId: request.playerId,
        transaction: {
          status: VimplayStatus.GENERAL_ERROR,
          transactionId: request.transaction.transactionId,
          partnerTransactionId: request.transaction.transactionId
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Process betwin (combined bet+win) transaction
   */
  async processBetWin(request: VimplayBetWinRequest): Promise<VimplayResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const userId = parseInt(request.playerId);
      const transactionId = request.trnasaction.transactionId;
      const betAmount = request.trnasaction.betAmount;
      const winAmount = request.trnasaction.winAmount;
      const inGameBonus = request.trnasaction.inGameBouns;

      console.log(`[VIMPLAY] Processing betwin: User ${userId}, Bet: ${betAmount}, Win: ${winAmount}, TxID: ${transactionId}`);

      // Check for duplicate transaction
      if (await this.isTransactionProcessed(transactionId)) {
        console.log(`[VIMPLAY] Duplicate betwin transaction: ${transactionId}`);
        const balance = await this.getUserBalance(userId);
        await client.query('COMMIT');

        return {
          balance,
          playerId: request.playerId,
          transaction: {
            status: VimplayStatus.DUPLICATE_TRANSACTION,
            transactionId,
            partnerTransactionId: transactionId
          }
        };
      }

      // Verify user exists and lock the row
      const userResult = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      const currentBalance = parseFloat(userResult.rows[0].balance);

      // If inGameBonus is true, only add win amount (don't subtract bet)
      // Otherwise, subtract bet and add win (net change)
      let newBalance: number;
      if (inGameBonus) {
        newBalance = currentBalance + winAmount;
      } else {
        // Check sufficient balance for bet
        if (currentBalance < betAmount) {
          await client.query('ROLLBACK');
          return {
            balance: currentBalance,
            playerId: request.playerId,
            transaction: {
              status: VimplayStatus.INSUFFICIENT_BALANCE,
              transactionId,
              partnerTransactionId: transactionId
            }
          };
        }
        newBalance = currentBalance - betAmount + winAmount;
      }

      // Update balance
      await client.query(
        `UPDATE user_balances SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [newBalance, userId]
      );

      // Create transaction record
      await client.query(
        `INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          userId,
          'adjustment',
          inGameBonus ? winAmount : (winAmount - betAmount),
          request.currency,
          'completed',
          `Vimplay BetWin - Round ${request.roundId}, Game ${request.gameId}`,
          transactionId,
          JSON.stringify({
            vimplay_action: 'betwin',
            vimplay_transaction_id: transactionId,
            vimplay_processed: 'true',
            round_id: request.roundId,
            game_id: request.gameId,
            site_id: request.siteId,
            bet_amount: betAmount,
            win_amount: winAmount,
            in_game_bonus: inGameBonus,
            bonus_id: request.trnasaction.bonusId,
            balance_before: currentBalance,
            balance_after: newBalance
          })
        ]
      );

      await client.query('COMMIT');

      console.log(`[VIMPLAY] BetWin processed: User ${userId}, Balance: ${currentBalance} -> ${newBalance}`);

      return {
        balance: newBalance,
        playerId: request.playerId,
        transaction: {
          status: VimplayStatus.SUCCESS,
          transactionId,
          partnerTransactionId: transactionId
        }
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[VIMPLAY] BetWin error:', error);

      return {
        balance: 0,
        playerId: request.playerId,
        transaction: {
          status: VimplayStatus.GENERAL_ERROR,
          transactionId: request.trnasaction.transactionId,
          partnerTransactionId: request.trnasaction.transactionId
        }
      };
    } finally {
      client.release();
    }
  }

  /**
   * Process refund transaction
   */
  async processRefund(request: VimplayRefundRequest): Promise<VimplayResponse> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const userId = parseInt(request.playerId);
      const transactionId = request.transactionId;

      console.log(`[VIMPLAY] Processing refund: User ${userId}, TxID: ${transactionId}`);

      // Find the original transaction to refund
      const originalTxn = await client.query(
        `SELECT * FROM transactions WHERE external_reference = $1 AND user_id = $2`,
        [transactionId, userId]
      );

      if (originalTxn.rows.length === 0) {
        console.warn(`[VIMPLAY] Original transaction ${transactionId} not found for refund`);
        // Return success with current balance even if transaction not found (as per Vimplay docs)
        const balance = await this.getUserBalance(userId);
        await client.query('COMMIT');

        return {
          status: VimplayStatus.SUCCESS,
          balance
        };
      }

      const originalTransaction = originalTxn.rows[0];
      const refundAmount = parseFloat(originalTransaction.amount);

      // Check if already refunded
      const refundCheck = await client.query(
        `SELECT id FROM transactions WHERE metadata->>'vimplay_action' = 'refund' AND metadata->>'refund_transaction_id' = $1`,
        [transactionId]
      );

      if (refundCheck.rows.length > 0) {
        console.log(`[VIMPLAY] Transaction ${transactionId} already refunded`);
        const balance = await this.getUserBalance(userId);
        await client.query('COMMIT');

        return {
          status: VimplayStatus.DUPLICATE_TRANSACTION,
          balance
        };
      }

      // Get current balance and lock
      const userResult = await client.query(
        `SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      const currentBalance = parseFloat(userResult.rows[0].balance);
      const newBalance = currentBalance + refundAmount;

      // Update balance
      await client.query(
        `UPDATE user_balances SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [newBalance, userId]
      );

      // Create refund transaction record
      await client.query(
        `INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          userId,
          'refund',
          refundAmount,
          originalTransaction.currency,
          'completed',
          `Vimplay Refund - Game ${request.gameId}`,
          `refund_${transactionId}_${Date.now()}`,
          JSON.stringify({
            vimplay_action: 'refund',
            vimplay_processed: 'true',
            refund_transaction_id: transactionId,
            game_id: request.gameId,
            balance_before: currentBalance,
            balance_after: newBalance
          })
        ]
      );

      await client.query('COMMIT');

      console.log(`[VIMPLAY] Refund processed: User ${userId}, Amount: ${refundAmount}, Balance: ${currentBalance} -> ${newBalance}`);

      return {
        status: VimplayStatus.SUCCESS,
        balance: newBalance
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[VIMPLAY] Refund error:', error);

      return {
        status: VimplayStatus.GENERAL_ERROR,
        balance: 0
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get list of games for VimPlay partner integration
   */
  async getGameList(request: VimplayGameListRequest): Promise<VimplayGameListResponse[]> {
    try {
      // Verify secret
      const VIMPLAY_SECRET = process.env.VIMPLAY_PARTNER_SECRET || 'vimplay_secret_key';

      if (request.secret !== VIMPLAY_SECRET) {
        console.error('[VIMPLAY] Invalid secret for game list request');
        throw new Error('Invalid secret');
      }

      console.log('[VIMPLAY] Fetching game list');

      // Query games from database - filter for VimPlay provider or all active games
      const result = await pool.query(
        `SELECT
          id,
          name,
          image_url,
          thumbnail_url,
          category,
          provider
         FROM games
         WHERE is_active = true
         AND (provider = 'vimplay' OR provider IS NULL OR provider = '')
         ORDER BY name ASC`
      );

      // Transform database results to VimPlay format
      const games: VimplayGameListResponse[] = result.rows.map((game: any) => {
        // Use existing image URLs or provide defaults
        const imageUrl = game.image_url || game.thumbnail_url || 'https://backend.jackpotx.net/default-game.jpg';

        return {
          id: game.id,
          name: game.name,
          images: {
            ls: {
              org: imageUrl,
              avif: imageUrl.replace(/\.(jpg|png)$/, '.avif'),
              webp: imageUrl.replace(/\.(jpg|png)$/, '.webp')
            },
            pr: {
              org: imageUrl,
              avif: imageUrl.replace(/\.(jpg|png)$/, '.avif'),
              webp: imageUrl.replace(/\.(jpg|png)$/, '.webp')
            },
            sq: {
              org: imageUrl,
              avif: imageUrl.replace(/\.(jpg|png)$/, '.avif'),
              webp: imageUrl.replace(/\.(jpg|png)$/, '.webp')
            }
          },
          type: game.category || 'slot'
        };
      });

      console.log(`[VIMPLAY] Returning ${games.length} games`);

      return games;

    } catch (error: any) {
      console.error('[VIMPLAY] Game list error:', error);
      throw error;
    }
  }
}
