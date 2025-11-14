/**
 * JxOriginals Game Service
 *
 * Handles game logic for JxOriginals ISB-style games
 * Replaces VanguardLTE PHP Server.php with Node.js implementation
 */

import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";

// Game paytable configuration
const PAYTABLES: { [key: string]: { [symbol: string]: number[] } } = {
  'aztec_gold_megaways': {
    'SYM_1': [0, 0, 0, 2, 4, 8, 16],      // Low symbol
    'SYM_2': [0, 0, 0, 3, 5, 10, 18],     // Low symbol
    'SYM_3': [0, 0, 0, 3, 5, 10, 20],     // Low symbol
    'SYM_4': [0, 0, 0, 3, 5, 12, 20],     // Low symbol
    'SYM_5': [0, 0, 0, 4, 8, 16, 35],     // Medium symbol
    'SYM_6': [0, 0, 0, 4, 8, 16, 35],     // Medium symbol
    'SYM_7': [0, 0, 0, 5, 10, 20, 50],    // High symbol
    'SYM_8': [0, 0, 0, 5, 10, 20, 50],    // High symbol
    'SYM_9': [0, 0, 0, 10, 30, 80, 200],  // Premium symbol
    'SYM_10': [0, 0, 10, 50, 150, 400, 1000], // Top symbol
    'SYM_11': [0, 0, 0, 0, 0, 0, 0],      // Wild
    'SYM_12': [0, 0, 0, 0, 0, 0, 0]       // Scatter
  }
};

// Reel strips (loaded from reels.txt)
const REEL_STRIPS: { [key: string]: { [reel: string]: number[] } } = {
  'aztec_gold_megaways': {
    'reel1': [5,4,2,7,9,6,3,7,10,1,8,4,3,5,2,4,9,2,6,1,4,3,5,6,12,7,1,2,3,4,5,6,4,3,5,7,6,9,4,7,6,11,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,12,4,7,6,2,8,7,3,8,7,5,6,7,4,5,6,1,7,2,4,9,6,3,7,1,8,4,3,5,2,4,11,9,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,12,3,5,7,6,9,4,7,6,2,8,7,3,6,1,4,3,5,6,7,1,2,3,4,5,6,8,7,5,6,4,3,5,7,6,9,4,7,6,2,8,7,3,11,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,7,4,5,6,1,7,11,2,4,8,3,5,6,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,3,5,12,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3],
    'reel2': [5,4,2,7,9,6,3,7,10,1,8,4,3,5,2,4,9,2,6,1,4,3,5,6,7,1,2,3,4,5,6,4,3,5,7,6,9,4,7,6,11,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,7,5,12,6,7,4,5,6,1,7,2,4,9,6,3,7,1,8,4,3,5,2,4,11,9,2,4,3,5,7,6,9,12,4,7,6,2,8,7,3,8,3,12,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,6,1,4,3,5,6,7,1,2,3,4,5,6,8,7,5,6,4,3,5,7,6,9,4,7,6,2,12,8,7,3,11,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,7,4,5,6,1,7,11,2,4,8,3,5,6,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3],
    'reel3': [5,4,2,7,9,6,3,7,10,1,8,4,3,5,2,4,9,2,6,1,4,3,5,6,7,12,1,2,3,4,5,6,4,3,5,7,6,9,4,7,6,11,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,12,7,3,8,7,5,6,7,4,5,6,1,7,2,4,9,6,3,7,1,8,4,3,5,2,4,11,9,2,4,3,5,7,6,9,12,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,6,1,4,3,5,6,7,1,2,3,4,5,6,8,7,5,6,4,3,5,7,6,9,4,7,6,2,8,7,3,11,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,7,4,5,6,1,7,11,2,4,8,3,5,6,3,7,1,5,2,4,3,5,7,12,6,9,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3],
    'reel4': [5,4,2,7,9,6,3,7,10,1,8,4,3,5,2,4,9,2,6,1,4,3,5,6,7,1,2,3,4,5,6,4,3,5,7,6,9,4,7,6,11,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,7,5,6,7,4,5,6,1,12,7,2,4,9,6,3,7,1,8,4,3,5,2,4,11,9,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,12,2,4,3,5,7,6,9,4,7,6,2,8,7,3,6,1,4,3,5,6,7,1,2,3,4,5,6,8,7,5,6,4,3,5,7,6,9,4,7,6,2,8,7,3,11,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,7,4,5,6,1,7,11,2,4,8,3,5,6,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3],
    'reel5': [5,4,2,7,9,6,3,7,10,1,8,4,3,5,2,4,9,2,6,1,4,3,5,6,7,1,2,3,4,5,6,4,3,5,7,6,9,4,7,6,11,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,7,5,6,7,4,5,12,6,1,7,2,4,9,6,3,7,1,8,4,3,5,2,4,11,9,2,4,3,5,7,6,9,4,7,6,12,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,6,1,4,3,5,6,7,1,2,3,4,5,6,8,7,5,6,4,3,5,7,6,9,12,4,7,6,2,8,7,3,11,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,7,4,5,6,1,7,11,2,4,8,3,5,6,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3],
    'reel6': [5,4,2,7,9,6,3,7,10,1,8,4,3,12,5,2,4,9,2,6,1,4,3,5,6,7,1,2,3,4,5,6,4,3,5,7,6,9,4,7,6,11,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,12,7,3,8,7,5,6,7,4,5,6,1,7,2,4,9,6,3,7,1,8,4,3,5,2,4,11,9,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,12,3,6,1,4,3,5,6,7,1,2,3,4,5,6,8,7,5,6,4,3,5,7,6,9,4,7,6,2,8,7,3,11,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,7,4,5,6,1,7,11,2,4,8,3,5,6,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3,8,3,5,6,10,3,7,1,5,2,4,3,5,7,6,9,4,7,6,2,8,7,3]
  }
};

// Available bet amounts (in currency units)
const AVAILABLE_BETS = [0.20, 0.40, 1.00, 2.00, 4.00, 8.00, 16.00, 32.00];

export interface GameCommand {
  cmd: string;
  token: string;
  userId: number;
  gameCode: string;
}

export interface GameSpinCommand extends GameCommand {
  betAmount: number; // Bet per line in cents
}

export class JxOriginalsGameService {

  /**
   * Main entry point for game commands
   */
  static async handleGameCommand(command: GameCommand): Promise<any> {
    const { cmd, token, userId, gameCode } = command;

    // Parse command (format: "commandId\nparams...")
    const commandParts = cmd.split('\n');
    const commandId = commandParts[0].trim();

    console.log('[JXORIGINALS_GAME] Command received:', { commandId, userId, gameCode });

    switch (commandId) {
      case '1': // Logout
        return this.handleLogout();

      case '5814': // Initialize game
        return await this.handleInitGame(userId, gameCode);

      case '2': // Spin
        return await this.handleSpin(command as GameSpinCommand, commandParts);

      case '104': // Bonus respin
        return await this.handleBonusRespin(userId, gameCode);

      case '192837': // Verification
        return this.handleVerification();

      case '5347': // Success confirmation
        return this.handleSuccess();

      case '105': // Get last response
        return await this.handleGetLastResponse(userId, gameCode);

      default:
        throw new ApiError(`Unknown game command: ${commandId}`, 400);
    }
  }

  /**
   * Handle logout command
   */
  private static handleLogout(): any {
    return {
      rootdata: {
        uid: "undefined",
        data: {
          logout: "1"
        }
      }
    };
  }

  /**
   * Handle verification command
   */
  private static handleVerification(): any {
    return {
      rootdata: {
        uid: "419427a2-d300-41d9-8d67-fe4eec61be5f",
        data: "1"
      }
    };
  }

  /**
   * Handle success confirmation
   */
  private static handleSuccess(): any {
    return {
      rootdata: {
        uid: "26d1001c-15ff-4d21-af9e-45dde0260165",
        data: {
          success: ""
        }
      }
    };
  }

  /**
   * Initialize game - return balance, bets, last state
   */
  private static async handleInitGame(userId: number, gameCode: string): Promise<any> {
    // Get user balance
    const { MongoService } = require("../mongo/mongo.service");
    await MongoService.initialize();

    const balance = await MongoService.getCategoryBalance(userId, 'slots');
    const balanceInCents = Math.round(balance * 100);

    // Get game bets in cents
    const gameBets = AVAILABLE_BETS.map(bet => Math.round(bet * 100 * 20)); // 20 lines

    // Check for last game state
    const lastEventResult = await pool.query(
      `SELECT metadata FROM user_activity_logs
       WHERE user_id = $1 AND action = 'game_spin'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    let freeSpinsStr = '';

    // If player has free spins in progress
    if (lastEventResult.rows.length > 0) {
      const lastEvent = lastEventResult.rows[0].metadata;
      if (lastEvent && lastEvent.freeGames > 0 && lastEvent.currentFreeGame < lastEvent.freeGames) {
        freeSpinsStr = `"freeGames": { "left": "${lastEvent.freeGames - lastEvent.currentFreeGame}", "total": "${lastEvent.freeGames}", "totalFreeGamesWinnings": "${Math.round(lastEvent.bonusWin * 100)}", "totalFreeGamesWinningsMoney": "${Math.round(lastEvent.bonusWin * 100)}", "multiplier": "1", "totalMultiplier": "1" },`;
      }
    }

    return {
      rootdata: {
        uid: "5640f7f3-4693-4059-841a-dc3afd3f1925",
        data: {
          version: {
            versionServer: "2.2.0.1-1",
            versionGMAPI: "8.1.16 GS:2.5.1 FR:v4"
          },
          balance: {
            cashBalance: balanceInCents.toString(),
            freeBalance: "0",
            ccyCode: "USD",
            ccyDecimal: {},
            ccyThousand: {},
            ccyPrefix: {},
            ccySuffix: {},
            ccyDecimalDigits: {}
          },
          id: {
            roundId: this.generateRoundId()
          },
          coinValues: {
            coinValueList: gameBets.join(','),
            coinValueDefault: gameBets[0].toString(),
            readValue: "1"
          },
          initial: {
            money: balanceInCents.toString(),
            coins: "20",
            coinValue: gameBets[0].toString(),
            lines: "20",
            currentState: "beginGame",
            lastGame: {
              endGame: {
                ...(freeSpinsStr && { freeGames: freeSpinsStr }),
                money: balanceInCents.toString(),
                bet: gameBets[0].toString(),
                symbols: {
                  line: ["-1--1--1--1--1", "-1--1--1--1--1", "-1--1--1--1--1"]
                },
                lines: {},
                totalWinnings: "0",
                totalWinningsMoney: "0",
                doubleWin: {
                  totalWinnings: "0",
                  totalWinningsMoney: "0",
                  money: balanceInCents.toString()
                },
                totalMultiplier: {},
                bonusRequest: {}
              }
            }
          }
        }
      }
    };
  }

  /**
   * Handle spin command
   */
  private static async handleSpin(command: GameSpinCommand, commandParts: string[]): Promise<any> {
    const { userId, gameCode } = command;

    // Parse bet amount from command (format: "2\nbetInCents")
    const betInCents = parseInt(commandParts[1].trim());
    const betline = betInCents / 100;
    const lines = 20;
    const totalBet = betline * lines;

    console.log('[JXORIGINALS_GAME] Spin:', { userId, betline, totalBet });

    // Get user balance
    const { MongoService } = require("../mongo/mongo.service");
    await MongoService.initialize();

    const balance = await MongoService.getCategoryBalance(userId, 'slots');

    // Validate balance
    if (balance < totalBet) {
      throw new ApiError('Insufficient balance', 400);
    }

    // Deduct bet
    await MongoService.updateCategoryBalance(userId, 'slots', -totalBet);

    // Generate reels outcome
    const reelsOutcome = this.generateReels(gameCode, 'normal');

    // Calculate wins
    const winResult = this.calculateWins(reelsOutcome, betline, betInCents, gameCode);

    // Add wins to balance
    if (winResult.totalWin > 0) {
      await MongoService.updateCategoryBalance(userId, 'slots', winResult.totalWin);
    }

    // Get new balance
    const newBalance = await MongoService.getCategoryBalance(userId, 'slots');
    const balanceInCents = Math.round((newBalance - winResult.totalWin) * 100);
    const balanceInCentsEnd = Math.round(newBalance * 100);

    // Log the spin
    await pool.query(
      `INSERT INTO user_activity_logs (user_id, action, category, description, metadata)
       VALUES ($1, 'game_spin', 'gaming', $2, $3)`,
      [
        userId,
        `Spin on ${gameCode}`,
        JSON.stringify({
          bet: totalBet,
          win: winResult.totalWin,
          reels: reelsOutcome,
          ways: winResult.ways
        })
      ]
    );

    // Format response
    const reelsFormatted = this.formatReelsForResponse(reelsOutcome);

    return {
      rootdata: {
        uid: "e505a70b-d71b-4cb6-a47f-79d607387412",
        data: {
          balance: {
            cashBalance: balanceInCentsEnd.toString(),
            freeBalance: "0"
          },
          id: {
            roundId: this.generateRoundId()
          },
          coinValues: {
            coinValueList: AVAILABLE_BETS.map(b => Math.round(b * 100 * 20)).join(','),
            coinValueDefault: (AVAILABLE_BETS[0] * 100 * 20).toString(),
            readValue: "0"
          },
          endGame: {
            money: balanceInCents.toString(),
            bet: "20",
            symbols: {
              line: reelsFormatted
            },
            lines: {},
            totalWinnings: Math.round((winResult.totalWin * 100) / betInCents).toString(),
            totalWinningsMoney: Math.round(winResult.totalWin * 100).toString(),
            totalMultiplier: {},
            bonusRequest: {},
            gameSpecific: {
              megaways: winResult.ways.toString()
            }
          },
          doubleWin: {
            totalWinnings: Math.round((winResult.totalWin * 100) / betInCents).toString(),
            totalWinningsMoney: Math.round(winResult.totalWin * 100).toString(),
            money: balanceInCentsEnd.toString()
          }
        }
      }
    };
  }

  /**
   * Generate random reels outcome
   */
  private static generateReels(gameCode: string, mode: 'normal' | 'bonus' = 'normal'): any {
    const reelStrips = REEL_STRIPS[gameCode];
    if (!reelStrips) {
      throw new ApiError(`No reel strips found for game: ${gameCode}`, 500);
    }

    const result: any = {
      ways: 1
    };

    // For each reel, pick random position and random height (3-7 symbols for Megaways)
    for (let reelNum = 1; reelNum <= 6; reelNum++) {
      const strip = reelStrips[`reel${reelNum}`];
      const stripLength = strip.length;

      // Random start position
      const startPos = Math.floor(Math.random() * stripLength);

      // Random height (3-7 symbols)
      const height = Math.floor(Math.random() * 5) + 3; // 3 to 7
      result.ways *= height;

      // Get symbols
      result[`reel${reelNum}`] = [];
      for (let i = 0; i < 7; i++) {
        if (i < height) {
          const pos = (startPos + i) % stripLength;
          result[`reel${reelNum}`][i] = strip[pos];
        } else {
          result[`reel${reelNum}`][i] = -1; // Empty position
        }
      }
    }

    return result;
  }

  /**
   * Calculate wins from reels outcome
   */
  private static calculateWins(reels: any, betline: number, betlineRaw: number, gameCode: string): any {
    const paytable = PAYTABLES[gameCode];
    if (!paytable) {
      throw new ApiError(`No paytable found for game: ${gameCode}`, 500);
    }

    let totalWin = 0;
    const ways = reels.ways;

    // Check each symbol (1-10, excluding wild=11 and scatter=12)
    for (let sym = 1; sym <= 10; sym++) {
      const symStr = sym.toString();
      const payline = paytable[`SYM_${sym}`];

      // Count symbols on each reel (including wilds)
      const symCounts = [0, 0, 0, 0, 0, 0, 0];
      let lastReel = 0;

      for (let reelNum = 1; reelNum <= 6; reelNum++) {
        let found = false;
        for (let pos = 0; pos < 7; pos++) {
          const reelSym = reels[`reel${reelNum}`][pos];
          if (reelSym === sym || reelSym === 11) { // Symbol or wild
            symCounts[reelNum]++;
            found = true;
            lastReel = reelNum;
          }
        }
        if (!found) break; // Stop if reel has no matching symbols
      }

      // Calculate win for consecutive reels
      if (symCounts[1] > 0 && symCounts[2] > 0) {
        // 2 reels
        const symWeight = symCounts[1] * symCounts[2];
        const win = payline[2] * betline * symWeight;
        if (win > 0) totalWin += win;

        // 3 reels
        if (symCounts[3] > 0) {
          const symWeight3 = symCounts[1] * symCounts[2] * symCounts[3];
          const win3 = payline[3] * betline * symWeight3;
          if (win3 > win) totalWin += (win3 - win);

          // 4 reels
          if (symCounts[4] > 0) {
            const symWeight4 = symWeight3 * symCounts[4];
            const win4 = payline[4] * betline * symWeight4;
            if (win4 > win3) totalWin += (win4 - win3);

            // 5 reels
            if (symCounts[5] > 0) {
              const symWeight5 = symWeight4 * symCounts[5];
              const win5 = payline[5] * betline * symWeight5;
              if (win5 > win4) totalWin += (win5 - win4);

              // 6 reels
              if (symCounts[6] > 0) {
                const symWeight6 = symWeight5 * symCounts[6];
                const win6 = payline[6] * betline * symWeight6;
                if (win6 > win5) totalWin += (win6 - win5);
              }
            }
          }
        }
      }
    }

    return {
      totalWin,
      ways
    };
  }

  /**
   * Format reels for response
   */
  private static formatReelsForResponse(reels: any): string[] {
    const result: string[] = [];

    for (let row = 0; row < 7; row++) {
      const symbols: string[] = [];
      for (let reel = 1; reel <= 6; reel++) {
        symbols.push(reels[`reel${reel}`][row].toString());
      }
      result.push(symbols.join('-'));
    }

    return result;
  }

  /**
   * Generate unique round ID
   */
  private static generateRoundId(): string {
    return Math.floor(Math.random() * 1e20).toString();
  }

  /**
   * Handle bonus respin
   */
  private static async handleBonusRespin(userId: number, gameCode: string): Promise<any> {
    // Simplified - return same structure as spin
    // In full implementation, would handle scatter respin feature
    return {
      rootdata: {
        uid: "5f45095e-1ab3-4dcb-a66c-8771be2326d5",
        data: {
          message: "Bonus feature not yet implemented"
        }
      }
    };
  }

  /**
   * Get last response
   */
  private static async handleGetLastResponse(userId: number, gameCode: string): Promise<any> {
    // Return last game state
    const lastEventResult = await pool.query(
      `SELECT metadata FROM user_activity_logs
       WHERE user_id = $1 AND action = 'game_spin'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (lastEventResult.rows.length === 0) {
      return { rootdata: { uid: "undefined", data: {} } };
    }

    // Return stored last response
    return { rootdata: { uid: "undefined", data: lastEventResult.rows[0].metadata } };
  }
}

export default JxOriginalsGameService;
