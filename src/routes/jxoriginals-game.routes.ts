import express from "express";
import { JxOriginalsGameController } from "../controllers/jxoriginals-game.controller";

const router = express.Router();

/**
 * Main game endpoint - handles POST requests from game clients
 * Mimics VanguardLTE Server.php endpoint
 */
router.post('/game', JxOriginalsGameController.handleGameRequest);

/**
 * Health check endpoint
 */
router.get('/health', JxOriginalsGameController.healthCheck);

export default router;
