"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jxoriginals_game_controller_1 = require("../controllers/jxoriginals-game.controller");
const router = express_1.default.Router();
/**
 * Main game endpoint - handles POST requests from game clients
 * Mimics VanguardLTE Server.php endpoint
 */
router.post('/game', jxoriginals_game_controller_1.JxOriginalsGameController.handleGameRequest);
/**
 * Health check endpoint
 */
router.get('/health', jxoriginals_game_controller_1.JxOriginalsGameController.healthCheck);
exports.default = router;
