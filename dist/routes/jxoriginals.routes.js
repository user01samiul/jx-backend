"use strict";
/**
 * JxOriginals Routes
 *
 * API routes for JxOriginals games (internal games with full source code)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const jxOriginalsController = __importStar(require("../api/game/jxoriginals.controller"));
const jxoriginals_game_controller_1 = require("../controllers/jxoriginals-game.controller");
const router = (0, express_1.Router)();
/**
 * Public routes (no authentication required)
 */
// List all JxOriginals games
// GET /api/jxoriginals/games
router.get('/games', jxOriginalsController.listJxOriginalsGames);
// Get game by ID
// GET /api/jxoriginals/games/:gameId
router.get('/games/:gameId', jxOriginalsController.getJxOriginalsGame);
// Get game statistics
// GET /api/jxoriginals/games/:gameId/stats
router.get('/games/:gameId/stats', jxOriginalsController.getJxOriginalsGameStats);
// Get categories
// GET /api/jxoriginals/categories
router.get('/categories', jxOriginalsController.getJxOriginalsCategories);
// Get vendors
// GET /api/jxoriginals/vendors
router.get('/vendors', jxOriginalsController.getJxOriginalsVendors);
// Get featured games
// GET /api/jxoriginals/featured
router.get('/featured', jxOriginalsController.getFeaturedJxOriginalsGames);
// Search games
// GET /api/jxoriginals/search?q=sweet
router.get('/search', jxOriginalsController.searchJxOriginalsGames);
/**
 * Protected routes (authentication required)
 */
// Launch game
// POST /api/jxoriginals/launch/:gameId
router.post('/launch/:gameId', auth_middleware_1.authenticateToken, jxOriginalsController.launchJxOriginalsGame);
/**
 * Game Server Endpoints (replaces VanguardLTE Server.php)
 * These endpoints handle POST requests from the game client
 */
// Main game command endpoint (no auth middleware - token validated inside)
// POST /api/jxoriginals/game?game=aztec_gold_megaways
router.post('/game', jxoriginals_game_controller_1.JxOriginalsGameController.handleGameRequest);
// Health check
// GET /api/jxoriginals/game/health
router.get('/game/health', jxoriginals_game_controller_1.JxOriginalsGameController.healthCheck);
exports.default = router;
