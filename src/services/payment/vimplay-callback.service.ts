import pool from "../../db/postgres";
import { WageringEngineService } from "../bonus/wagering-engine.service";

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
          `SELECT user_id, expired_at, is_active
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
        status: VimplayStatus.SUCCESS,
        balance,
        player_id: userId.toString(),
        playerId: userId.toString(),
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
      const txnResult = await client.query(
        `INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         RETURNING id`,
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

      const transactionDbId = txnResult.rows[0].id;

      // Look up the actual game database ID from game_code
      const gameResult = await client.query(
        `SELECT id FROM games WHERE game_code = $1 AND LOWER(provider) = LOWER($2)`,
        [request.gameId, 'Vimplay']
      );

      if (gameResult.rows.length > 0) {
        const gameDbId = gameResult.rows[0].id;

        // INSERT bet record into bets table for bet history tracking
        await client.query(
          `INSERT INTO bets
           (user_id, game_id, transaction_id, bet_amount, win_amount, multiplier, outcome, session_id, round_id, game_data, placed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
          [
            userId,
            gameDbId,
            transactionDbId,
            betAmount,
            0,
            0,
            'pending',
            transactionId,
            request.roundId,
            JSON.stringify({
              site_id: request.siteId,
              in_game_bonus: request.trnasaction.inGameBouns,
              bonus_id: request.trnasaction.bonusId
            })
          ]
        );

        console.log(`[VIMPLAY] Bet record created: User ${userId}, Game ${gameDbId} (code: ${request.gameId}), Bet ${betAmount}, Round ${request.roundId}`);
      } else {
        console.log(`[VIMPLAY] Warning: Game not found for game_code ${request.gameId}, bet record not created`);
      }

      await client.query('COMMIT');

      // ==================== BONUS WAGERING INTEGRATION ====================
      // Process bet for bonus wagering
      if (betAmount > 0) {
        try {
          // Get active bonuses for this user
          const activeBonusesResult = await pool.query(
            `SELECT id, bonus_amount, wager_requirement_amount, wager_progress_amount
             FROM bonus_instances
             WHERE player_id = $1
             AND status IN ('active', 'wagering')
             AND expires_at > NOW()
             ORDER BY granted_at ASC`,
            [userId]
          );

          if (activeBonusesResult.rows.length > 0) {
            console.log(`[WAGERING] Found ${activeBonusesResult.rows.length} active bonus(es) for user ${userId}`);

            // Process wagering for each active bonus
            for (const bonus of activeBonusesResult.rows) {
              try {
                const wageringResult = await WageringEngineService.processBetWagering(
                  bonus.id,                           // bonus_instance_id
                  userId,                             // player_id
                  request.gameId?.toString() || 'unknown', // game_code
                  betAmount                           // bet amount (positive value)
                );

                console.log(`[WAGERING] ✅ Processed bet for bonus ${bonus.id}:`, {
                  bonus_id: bonus.id,
                  bet_amount: betAmount.toFixed(2),
                  wager_contribution: wageringResult.wagerContribution.toFixed(2),
                  is_completed: wageringResult.isCompleted,
                  progress: `${wageringResult.progressPercentage.toFixed(2)}%`
                });

                // If wagering completed, log it
                if (wageringResult.isCompleted) {
                  console.log(`[WAGERING] 🎉 Bonus ${bonus.id} wagering COMPLETED! Funds released to main wallet.`);
                }
              } catch (wageringError) {
                // Don't fail the bet transaction if wagering processing fails
                console.error(`[WAGERING] ⚠️ Error processing wagering for bonus ${bonus.id}:`, wageringError);
                // Log the error but continue - bet was already processed successfully
              }
            }
          } else {
            console.log(`[WAGERING] No active bonuses found for user ${userId}`);
          }
        } catch (bonusCheckError) {
          // Don't fail the bet if bonus checking fails
          console.error(`[WAGERING] ⚠️ Error checking active bonuses:`, bonusCheckError);
        }
      }
      // ==================== END WAGERING INTEGRATION ====================

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

      // Look up the actual game database ID from game_code
      const gameResult = await client.query(
        `SELECT id FROM games WHERE game_code = $1 AND LOWER(provider) = LOWER($2)`,
        [request.gameId, 'Vimplay']
      );

      if (gameResult.rows.length > 0) {
        const gameDbId = gameResult.rows[0].id;

        // UPDATE bet record with win amount and outcome
        const betUpdateResult = await client.query(
          `UPDATE bets
           SET win_amount = $1,
               multiplier = CASE WHEN bet_amount > 0 THEN $1 / bet_amount ELSE 0 END,
               outcome = CASE WHEN $1 > 0 THEN 'win' ELSE 'lose' END,
               result_at = CURRENT_TIMESTAMP
           WHERE user_id = $2
             AND game_id = $3
             AND round_id = $4
             AND outcome = 'pending'
           RETURNING id, bet_amount`,
          [winAmount, userId, gameDbId, request.roundId]
        );

        if (betUpdateResult.rows.length > 0) {
          const betAmount = parseFloat(betUpdateResult.rows[0].bet_amount);
          const multiplier = betAmount > 0 ? (winAmount / betAmount).toFixed(2) : '0';
          console.log(`[VIMPLAY] Bet updated: ID ${betUpdateResult.rows[0].id}, Win ${winAmount}, Multiplier ${multiplier}x`);
        } else {
          console.log(`[VIMPLAY] No pending bet found for game ${gameDbId} (code: ${request.gameId}), round ${request.roundId} (might be betwin transaction)`);
        }
      } else {
        console.log(`[VIMPLAY] Warning: Game not found for game_code ${request.gameId}, bet update skipped`);
      }

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
      const txnResult = await client.query(
        `INSERT INTO transactions
         (user_id, type, amount, currency, status, description, external_reference, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
         RETURNING id`,
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

      const transactionDbId = txnResult.rows[0].id;

      // Look up the actual game database ID from game_code
      const gameResult = await client.query(
        `SELECT id FROM games WHERE game_code = $1 AND LOWER(provider) = LOWER($2)`,
        [request.gameId, 'Vimplay']
      );

      if (gameResult.rows.length > 0) {
        const gameDbId = gameResult.rows[0].id;

        // INSERT bet record with immediate outcome (combined bet+win)
        const outcome = winAmount > 0 ? 'win' : 'lose';
        const multiplier = betAmount > 0 ? winAmount / betAmount : 0;

        await client.query(
          `INSERT INTO bets
           (user_id, game_id, transaction_id, bet_amount, win_amount, multiplier, outcome, session_id, round_id, game_data, placed_at, result_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userId,
            gameDbId,
            transactionDbId,
            betAmount,
            winAmount,
            multiplier,
            outcome,
            transactionId,
            request.roundId,
            JSON.stringify({
              site_id: request.siteId,
              in_game_bonus: inGameBonus,
              bonus_id: request.trnasaction.bonusId,
              betwin: true
            })
          ]
        );

        console.log(`[VIMPLAY] BetWin record created: User ${userId}, Game ${gameDbId} (code: ${request.gameId}), Bet ${betAmount}, Win ${winAmount}, Outcome ${outcome}, Multiplier ${multiplier.toFixed(2)}x`);
      } else {
        console.log(`[VIMPLAY] Warning: Game not found for game_code ${request.gameId}, bet record not created`);
      }

      await client.query('COMMIT');

      // ==================== BONUS WAGERING INTEGRATION ====================
      // Process bet for bonus wagering (only for real money bets, not in-game bonuses)
      if (!inGameBonus && betAmount > 0) {
        try {
          // Get active bonuses for this user
          const activeBonusesResult = await pool.query(
            `SELECT id, bonus_amount, wager_requirement_amount, wager_progress_amount
             FROM bonus_instances
             WHERE player_id = $1
             AND status IN ('active', 'wagering')
             AND expires_at > NOW()
             ORDER BY granted_at ASC`,
            [userId]
          );

          if (activeBonusesResult.rows.length > 0) {
            console.log(`[WAGERING] Found ${activeBonusesResult.rows.length} active bonus(es) for user ${userId}`);

            // Process wagering for each active bonus
            for (const bonus of activeBonusesResult.rows) {
              try {
                const wageringResult = await WageringEngineService.processBetWagering(
                  bonus.id,                           // bonus_instance_id
                  userId,                             // player_id
                  request.gameId?.toString() || 'unknown', // game_code
                  betAmount                           // bet amount (positive value)
                );

                console.log(`[WAGERING] ✅ Processed bet for bonus ${bonus.id}:`, {
                  bonus_id: bonus.id,
                  bet_amount: betAmount.toFixed(2),
                  wager_contribution: wageringResult.wagerContribution.toFixed(2),
                  is_completed: wageringResult.isCompleted,
                  progress: `${wageringResult.progressPercentage.toFixed(2)}%`
                });

                // If wagering completed, log it
                if (wageringResult.isCompleted) {
                  console.log(`[WAGERING] 🎉 Bonus ${bonus.id} wagering COMPLETED! Funds released to main wallet.`);
                }
              } catch (wageringError) {
                // Don't fail the bet transaction if wagering processing fails
                console.error(`[WAGERING] ⚠️ Error processing wagering for bonus ${bonus.id}:`, wageringError);
                // Log the error but continue - bet was already processed successfully
              }
            }
          } else {
            console.log(`[WAGERING] No active bonuses found for user ${userId}`);
          }
        } catch (bonusCheckError) {
          // Don't fail the bet if bonus checking fails
          console.error(`[WAGERING] ⚠️ Error checking active bonuses:`, bonusCheckError);
        }
      }
      // ==================== END WAGERING INTEGRATION ====================

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
