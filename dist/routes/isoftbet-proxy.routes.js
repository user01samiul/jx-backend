"use strict";
/**
 * ISoftBet Proxy Routes
 *
 * Handles XML configuration requests from ISoftBet games
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const isoftbet_proxy_controller_1 = require("../controllers/isoftbet-proxy.controller");
const router = (0, express_1.Router)();
/**
 * ISoftBet XML Generation Endpoint
 * GET /generate-xml/games/:gameId/:type/:sessionId/:param1/:param2
 *
 * This endpoint mimics the ISoftBet GPM (Game Platform Manager) server
 * and returns XML configuration files required by ISB games.
 */
router.get('/games/:gameId/:type/:sessionId/:param1/:param2', isoftbet_proxy_controller_1.ISoftBetProxyController.generateXML);
exports.default = router;
