/**
 * ISoftBet Proxy Routes
 *
 * Handles XML configuration requests from ISoftBet games
 */

import { Router } from 'express';
import { ISoftBetProxyController } from '../controllers/isoftbet-proxy.controller';

const router = Router();

/**
 * ISoftBet XML Generation Endpoint
 * GET /generate-xml/games/:gameId/:type/:sessionId/:param1/:param2
 *
 * This endpoint mimics the ISoftBet GPM (Game Platform Manager) server
 * and returns XML configuration files required by ISB games.
 */
router.get('/games/:gameId/:type/:sessionId/:param1/:param2', ISoftBetProxyController.generateXML);

export default router;
