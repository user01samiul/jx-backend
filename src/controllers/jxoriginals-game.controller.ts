/**
 * JxOriginals Game Controller
 *
 * Handles HTTP requests from JxOriginals game clients
 * Mimics the VanguardLTE Server.php POST endpoint
 */

import { Request, Response } from 'express';
import { JxOriginalsGameService } from '../services/games/jxoriginals-game.service';
import { ApiError } from '../utils/apiError';
import pool from '../db/postgres';

export class JxOriginalsGameController {

  /**
   * Main game endpoint - handles all game commands via POST
   *
   * Expected POST data:
   * - cmd: Command string (e.g., "2\n100" for spin with 100 cent bet)
   * - token: Session token (optional, can come from query params or headers)
   * - game: Game code (e.g., 'aztec_gold_megaways')
   */
  static async handleGameRequest(req: Request, res: Response): Promise<void> {
    try {
      const { cmd } = req.body;

      // Get token from multiple possible sources
      const token = req.body.token || req.query.token || req.headers['authorization']?.replace('Bearer ', '');

      // Get game code from query params or body
      const gameCode = req.query.game || req.body.game;

      if (!cmd) {
        throw new ApiError('Missing cmd parameter', 400);
      }

      if (!token) {
        res.status(401).json({
          responseEvent: "error",
          responseType: "",
          serverResponse: "invalid login"
        });
        return;
      }

      if (!gameCode) {
        throw new ApiError('Missing game parameter', 400);
      }

      console.log('[JXORIGINALS_GAME_CONTROLLER] Request:', {
        cmd: cmd.substring(0, 50),
        token: token.substring(0, 10) + '...',
        gameCode
      });

      // Validate token and get user
      const tokenResult = await pool.query(
        `SELECT t.user_id, u.username
         FROM tokens t
         JOIN users u ON t.user_id = u.id
         WHERE t.access_token = $1
         AND t.is_active = true
         AND t.expired_at > NOW()`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        res.status(401).json({
          responseEvent: "error",
          responseType: "",
          serverResponse: "invalid login"
        });
        return;
      }

      const userId = tokenResult.rows[0].user_id;

      // Parse bet amount if this is a spin command
      let betAmount: number | undefined;
      const commandParts = cmd.split('\n');
      if (commandParts[0].trim() === '2' && commandParts[1]) {
        betAmount = parseInt(commandParts[1].trim());
      }

      // Handle game command
      const result = await JxOriginalsGameService.handleGameCommand({
        cmd,
        token,
        userId,
        gameCode: gameCode as string,
        ...(betAmount && { betAmount })
      });

      // Return JSON response
      res.json(result);

    } catch (error: any) {
      console.error('[JXORIGINALS_GAME_CONTROLLER] Error:', error);

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          responseEvent: "error",
          responseType: "",
          serverResponse: error.message
        });
      } else {
        res.status(500).json({
          responseEvent: "error",
          responseType: "",
          serverResponse: "Internal server error"
        });
      }
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'ok',
      service: 'jxoriginals-game',
      timestamp: new Date().toISOString()
    });
  }
}

export default JxOriginalsGameController;
