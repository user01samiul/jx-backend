"use strict";
/**
 * JxOriginals Game Controller
 *
 * Handles HTTP requests from JxOriginals game clients
 * Mimics the VanguardLTE Server.php POST endpoint
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JxOriginalsGameController = void 0;
const jxoriginals_game_service_1 = require("../services/games/jxoriginals-game.service");
const apiError_1 = require("../utils/apiError");
const postgres_1 = __importDefault(require("../db/postgres"));
class JxOriginalsGameController {
    /**
     * Main game endpoint - handles all game commands via POST
     *
     * Expected POST data:
     * - cmd: Command string (e.g., "2\n100" for spin with 100 cent bet)
     * - token: Session token (optional, can come from query params or headers)
     * - game: Game code (e.g., 'aztec_gold_megaways')
     */
    static async handleGameRequest(req, res) {
        var _a;
        try {
            const { cmd } = req.body;
            // Get token from multiple possible sources
            const token = req.body.token || req.query.token || ((_a = req.headers['authorization']) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', ''));
            // Get game code from query params or body
            const gameCode = req.query.game || req.body.game;
            if (!cmd) {
                throw new apiError_1.ApiError('Missing cmd parameter', 400);
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
                throw new apiError_1.ApiError('Missing game parameter', 400);
            }
            console.log('[JXORIGINALS_GAME_CONTROLLER] Request:', {
                cmd: cmd.substring(0, 50),
                token: token.substring(0, 10) + '...',
                gameCode
            });
            // Validate token and get user
            const tokenResult = await postgres_1.default.query(`SELECT t.user_id, u.username
         FROM tokens t
         JOIN users u ON t.user_id = u.id
         WHERE t.access_token = $1
         AND t.is_active = true
         AND t.expired_at > NOW()`, [token]);
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
            let betAmount;
            const commandParts = cmd.split('\n');
            if (commandParts[0].trim() === '2' && commandParts[1]) {
                betAmount = parseInt(commandParts[1].trim());
            }
            // Handle game command
            const result = await jxoriginals_game_service_1.JxOriginalsGameService.handleGameCommand(Object.assign({ cmd,
                token,
                userId, gameCode: gameCode }, (betAmount && { betAmount })));
            // Return JSON response
            res.json(result);
        }
        catch (error) {
            console.error('[JXORIGINALS_GAME_CONTROLLER] Error:', error);
            if (error instanceof apiError_1.ApiError) {
                res.status(error.statusCode).json({
                    responseEvent: "error",
                    responseType: "",
                    serverResponse: error.message
                });
            }
            else {
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
    static async healthCheck(req, res) {
        res.json({
            status: 'ok',
            service: 'jxoriginals-game',
            timestamp: new Date().toISOString()
        });
    }
}
exports.JxOriginalsGameController = JxOriginalsGameController;
exports.default = JxOriginalsGameController;
