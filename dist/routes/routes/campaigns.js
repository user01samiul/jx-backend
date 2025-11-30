"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var innova_campaigns_service_1 = __importDefault(require("../services/provider/innova-campaigns.service"));
var auth_middleware_1 = require("../middlewares/auth.middleware");
var postgres_1 = __importDefault(require("../db/postgres"));
var router = express_1.default.Router();
/**
 * @route GET /api/campaigns/vendors
 * @desc Get list of supported campaign vendors
 * @access Admin
 */
router.get('/vendors', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var vendors, error_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                return [4 /*yield*/, innova_campaigns_service_1.default.listVendors()];
            case 1:
                vendors = _c.sent();
                res.json({ success: true, data: vendors });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _c.sent();
                console.error('Error fetching vendors:', error_1);
                // Fallback: Return known supported vendors from documentation
                if (((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.status) === 404 || ((_b = error_1.message) === null || _b === void 0 ? void 0 : _b.includes('404'))) {
                    console.log('[CAMPAIGNS] Innova API not available, returning hardcoded vendors');
                    res.json({
                        success: true,
                        data: ['pragmatic', '3oaks', '3oaksP', 'amigogaming'],
                        message: 'Hardcoded vendors list (Innova API not available)'
                    });
                }
                else {
                    res.status(500).json({ success: false, error: error_1.message });
                }
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * @route GET /api/campaigns/game-limits
 * @desc Get betting limits for games
 * @access Admin
 */
router.get('/game-limits', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, vendors, games, currencies, vendorsArray, gamesArray, currenciesArray, limits, error_2, requestedCurrency_1, requestedVendors, vendorGames_1, sampleLimits_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.query, vendors = _a.vendors, games = _a.games, currencies = _a.currencies;
                vendorsArray = vendors ? vendors.split(',') : undefined;
                gamesArray = games ? games.split(',').map(Number) : undefined;
                currenciesArray = currencies ? currencies.split(',') : undefined;
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                return [4 /*yield*/, innova_campaigns_service_1.default.getGameLimits(vendorsArray, gamesArray, currenciesArray)];
            case 2:
                limits = _d.sent();
                res.json({ success: true, data: limits });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _d.sent();
                console.error('Error fetching game limits:', error_2);
                // Fallback: Return sample game limits based on requested vendor
                if (((_b = error_2.response) === null || _b === void 0 ? void 0 : _b.status) === 404 || ((_c = error_2.message) === null || _c === void 0 ? void 0 : _c.includes('404'))) {
                    console.log('[CAMPAIGNS] Innova API not available, returning sample game limits');
                    requestedCurrency_1 = (currenciesArray === null || currenciesArray === void 0 ? void 0 : currenciesArray[0]) || 'USD';
                    requestedVendors = vendorsArray || ['pragmatic'];
                    vendorGames_1 = {
                        'pragmatic': [
                            { game_id: 23000, limits: [0.2, 0.4, 0.6, 0.8, 1, 2, 4, 6, 8, 10, 15, 20, 40, 60, 80, 100] },
                            { game_id: 23001, limits: [0.2, 0.4, 1, 2, 4, 10, 20, 60, 100] },
                            { game_id: 23002, limits: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50] }
                        ],
                        '3oaks': [
                            { game_id: 30000, limits: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100] },
                            { game_id: 30001, limits: [0.2, 0.5, 1, 2, 5, 10, 25, 50] },
                            { game_id: 30002, limits: [0.15, 0.3, 0.75, 1.5, 3, 7.5, 15, 30] }
                        ],
                        '3oaksP': [
                            { game_id: 31000, limits: [0.2, 0.4, 0.8, 1.6, 3.2, 6.4, 12.8, 25.6] },
                            { game_id: 31001, limits: [0.25, 0.5, 1, 2, 4, 8, 16, 32] },
                            { game_id: 31002, limits: [0.1, 0.3, 0.6, 1.2, 2.4, 4.8, 9.6] }
                        ],
                        'amigogaming': [
                            { game_id: 40000, limits: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50] },
                            { game_id: 40001, limits: [0.2, 0.6, 1.2, 2.4, 4.8, 9.6, 19.2] },
                            { game_id: 40002, limits: [0.15, 0.35, 0.7, 1.4, 2.8, 5.6, 11.2] }
                        ]
                    };
                    sampleLimits_1 = [];
                    requestedVendors.forEach(function (vendor) {
                        var games = vendorGames_1[vendor] || vendorGames_1['pragmatic'];
                        games.forEach(function (game) {
                            sampleLimits_1.push({
                                currency_code: requestedCurrency_1,
                                game_id: game.game_id,
                                vendor: vendor,
                                limits: game.limits
                            });
                        });
                    });
                    res.json({
                        success: true,
                        data: sampleLimits_1,
                        message: "Sample game limits for ".concat(requestedVendors.join(', '), " (Innova API not available)")
                    });
                }
                else {
                    res.status(500).json({ success: false, error: error_2.message });
                }
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @route GET /api/campaigns/games
 * @desc Get available games for campaign creation
 * @access Admin
 */
router.get('/games', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, vendor, search, query, params, paramIndex, result, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.query, vendor = _a.vendor, search = _a.search;
                query = "\n      SELECT id, name, provider\n      FROM games\n      WHERE 1=1\n    ";
                params = [];
                paramIndex = 1;
                // Filter by vendor/provider
                if (vendor) {
                    query += " AND provider ILIKE $".concat(paramIndex);
                    params.push("%".concat(vendor, "%"));
                    paramIndex++;
                }
                // Search by game name
                if (search) {
                    query += " AND name ILIKE $".concat(paramIndex);
                    params.push("%".concat(search, "%"));
                    paramIndex++;
                }
                query += " ORDER BY name LIMIT 200";
                return [4 /*yield*/, postgres_1.default.query(query, params)];
            case 1:
                result = _b.sent();
                res.json({
                    success: true,
                    data: result.rows,
                    count: result.rows.length
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('Error fetching games:', error_3);
                res.status(500).json({ success: false, error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Sync limits route removed - not supported by InnovaCampaignsService
// Game limits are fetched directly from Innova API on-demand
/**
 * @route GET /api/campaigns
 * @desc List all campaigns with filters
 * @access Admin
 */
router.get('/', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, vendors, currencies, players, games, include_expired, per_page, query, params, paramIndex, vendorList, currencyList, result, formattedCampaigns, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.query, vendors = _a.vendors, currencies = _a.currencies, players = _a.players, games = _a.games, include_expired = _a.include_expired, per_page = _a.per_page;
                query = "\n      SELECT\n        c.id,\n        c.campaign_code,\n        c.vendor_name,\n        c.currency_code,\n        c.freespins_per_player,\n        c.begins_at,\n        c.expires_at,\n        c.status,\n        c.created_at,\n        c.updated_at,\n        COALESCE(\n          json_agg(\n            DISTINCT jsonb_build_object(\n              'game_id', cg.game_id,\n              'total_bet', cg.total_bet\n            )\n          ) FILTER (WHERE cg.game_id IS NOT NULL),\n          '[]'\n        ) as games,\n        COUNT(DISTINCT cp.user_id) as player_count\n      FROM campaigns c\n      LEFT JOIN campaign_games cg ON c.id = cg.campaign_id\n      LEFT JOIN campaign_players cp ON c.id = cp.campaign_id\n      WHERE 1=1\n    ";
                params = [];
                paramIndex = 1;
                // Filter by vendor
                if (vendors) {
                    vendorList = vendors.split(',');
                    query += " AND c.vendor_name = ANY($".concat(paramIndex, ")");
                    params.push(vendorList);
                    paramIndex++;
                }
                // Filter by currency
                if (currencies) {
                    currencyList = currencies.split(',');
                    query += " AND c.currency_code = ANY($".concat(paramIndex, ")");
                    params.push(currencyList);
                    paramIndex++;
                }
                // Filter by expiry status
                if (include_expired !== 'true') {
                    query += " AND (c.status = 'active' AND c.expires_at > CURRENT_TIMESTAMP)";
                }
                query += "\n      GROUP BY c.id\n      ORDER BY c.created_at DESC\n      LIMIT ".concat(per_page ? parseInt(per_page) : 100, "\n    ");
                return [4 /*yield*/, postgres_1.default.query(query, params)];
            case 1:
                result = _b.sent();
                formattedCampaigns = result.rows.map(function (campaign) { return ({
                    id: campaign.id,
                    campaign_code: campaign.campaign_code,
                    vendor: campaign.vendor_name,
                    currency_code: campaign.currency_code,
                    freespins_per_player: campaign.freespins_per_player,
                    begins_at: campaign.begins_at,
                    expires_at: campaign.expires_at,
                    status: campaign.status,
                    games: campaign.games || [],
                    player_count: parseInt(campaign.player_count) || 0,
                    created_at: campaign.created_at,
                    updated_at: campaign.updated_at
                }); });
                res.json({
                    success: true,
                    data: {
                        status: 'OK',
                        data: formattedCampaigns,
                        total: formattedCampaigns.length
                    }
                });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                console.error('Error listing campaigns:', error_4);
                res.status(500).json({ success: false, error: error_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * @route GET /api/campaigns/:campaignCode
 * @desc Get campaign details
 * @access Admin
 */
router.get('/:campaignCode', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var campaignCode, campaign, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                campaignCode = req.params.campaignCode;
                return [4 /*yield*/, innova_campaigns_service_1.default.getCampaignDetails(campaignCode)];
            case 1:
                campaign = _a.sent();
                res.json({ success: true, data: campaign });
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('Error fetching campaign details:', error_5);
                res.status(500).json({ success: false, error: error_5.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * @route POST /api/campaigns
 * @desc Create a new campaign
 * @access Admin
 */
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var campaignData, innovaError_1, client, campaignInsertResult, campaignId, _i, _a, game, players, _b, players_1, playerId, playerIdInt, dbError_1, error_6;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 26, , 27]);
                campaignData = req.body;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                // Try to create via Innova API first
                return [4 /*yield*/, innova_campaigns_service_1.default.createCampaign(campaignData)];
            case 2:
                // Try to create via Innova API first
                _c.sent();
                console.log('[CAMPAIGNS] Campaign created via Innova API');
                return [3 /*break*/, 4];
            case 3:
                innovaError_1 = _c.sent();
                // If Innova API fails, continue to save locally
                // Common errors: 404, validation errors, vendor API errors
                console.log('[CAMPAIGNS] Innova API error, will save campaign locally only:', innovaError_1.message);
                return [3 /*break*/, 4];
            case 4: return [4 /*yield*/, postgres_1.default.connect()];
            case 5:
                client = _c.sent();
                _c.label = 6;
            case 6:
                _c.trys.push([6, 22, 24, 25]);
                return [4 /*yield*/, client.query('BEGIN')];
            case 7:
                _c.sent();
                return [4 /*yield*/, client.query("INSERT INTO campaigns (\n          campaign_code, vendor_name, currency_code, freespins_per_player,\n          begins_at, expires_at, status\n        ) VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6), $7)\n        ON CONFLICT (campaign_code) DO UPDATE SET\n          vendor_name = EXCLUDED.vendor_name,\n          currency_code = EXCLUDED.currency_code,\n          freespins_per_player = EXCLUDED.freespins_per_player,\n          begins_at = EXCLUDED.begins_at,\n          expires_at = EXCLUDED.expires_at,\n          updated_at = CURRENT_TIMESTAMP\n        RETURNING id", [
                        campaignData.campaign_code,
                        campaignData.vendor,
                        campaignData.currency_code || 'USD',
                        campaignData.freespins_per_player,
                        campaignData.begins_at,
                        campaignData.expires_at,
                        'active'
                    ])];
            case 8:
                campaignInsertResult = _c.sent();
                campaignId = campaignInsertResult.rows[0].id;
                console.log("[CAMPAIGNS] Campaign ".concat(campaignData.campaign_code, " saved to master table (ID: ").concat(campaignId, ")"));
                if (!(campaignData.games && campaignData.games.length > 0)) return [3 /*break*/, 13];
                _i = 0, _a = campaignData.games;
                _c.label = 9;
            case 9:
                if (!(_i < _a.length)) return [3 /*break*/, 12];
                game = _a[_i];
                return [4 /*yield*/, client.query("INSERT INTO campaign_games (campaign_id, game_id, total_bet)\n             VALUES ($1, $2, $3)\n             ON CONFLICT (campaign_id, game_id) DO NOTHING", [campaignId, game.game_id, game.total_bet])];
            case 10:
                _c.sent();
                _c.label = 11;
            case 11:
                _i++;
                return [3 /*break*/, 9];
            case 12:
                console.log("[CAMPAIGNS] ".concat(campaignData.games.length, " game(s) added to campaign"));
                _c.label = 13;
            case 13:
                players = Array.isArray(campaignData.players)
                    ? campaignData.players
                    : (campaignData.players ? campaignData.players.split(',').map(function (p) { return p.trim(); }) : []);
                if (!(players.length > 0)) return [3 /*break*/, 19];
                _b = 0, players_1 = players;
                _c.label = 14;
            case 14:
                if (!(_b < players_1.length)) return [3 /*break*/, 18];
                playerId = players_1[_b];
                playerIdInt = parseInt(playerId);
                // Insert into campaign_players (normalized table)
                return [4 /*yield*/, client.query("INSERT INTO campaign_players (campaign_id, user_id, freespins_remaining)\n             VALUES ($1, $2, $3)\n             ON CONFLICT (campaign_id, user_id) DO NOTHING", [campaignId, playerIdInt, campaignData.freespins_per_player])];
            case 15:
                // Insert into campaign_players (normalized table)
                _c.sent();
                // Also insert into user_free_spins_campaigns (for backwards compatibility)
                return [4 /*yield*/, client.query("INSERT INTO user_free_spins_campaigns (\n              user_id, campaign_code, source, vendor, game_id, currency_code,\n              freespins_total, freespins_remaining, total_bet_amount,\n              status, begins_at, expires_at\n            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11), to_timestamp($12))\n            ON CONFLICT (user_id, campaign_code) DO NOTHING", [
                        playerIdInt,
                        campaignData.campaign_code,
                        'manual',
                        campaignData.vendor,
                        campaignData.games[0].game_id,
                        campaignData.currency_code || 'USD',
                        campaignData.freespins_per_player,
                        campaignData.freespins_per_player,
                        campaignData.games[0].total_bet * campaignData.freespins_per_player,
                        'pending',
                        campaignData.begins_at,
                        campaignData.expires_at
                    ])];
            case 16:
                // Also insert into user_free_spins_campaigns (for backwards compatibility)
                _c.sent();
                _c.label = 17;
            case 17:
                _b++;
                return [3 /*break*/, 14];
            case 18:
                console.log("[CAMPAIGNS] ".concat(players.length, " player(s) added to campaign"));
                return [3 /*break*/, 20];
            case 19:
                console.log("[CAMPAIGNS] Campaign created without players (add them later via add-all endpoint)");
                _c.label = 20;
            case 20: return [4 /*yield*/, client.query('COMMIT')];
            case 21:
                _c.sent();
                return [3 /*break*/, 25];
            case 22:
                dbError_1 = _c.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 23:
                _c.sent();
                throw dbError_1;
            case 24:
                client.release();
                return [7 /*endfinally*/];
            case 25:
                res.json({
                    success: true,
                    message: 'Campaign created successfully',
                    note: 'Campaign saved locally (Innova API may not be available)'
                });
                return [3 /*break*/, 27];
            case 26:
                error_6 = _c.sent();
                console.error('Error creating campaign:', error_6);
                res.status(500).json({ success: false, error: error_6.message });
                return [3 /*break*/, 27];
            case 27: return [2 /*return*/];
        }
    });
}); });
/**
 * @route POST /api/campaigns/:campaignCode/cancel
 * @desc Cancel a campaign
 * @access Admin
 */
router.post('/:campaignCode/cancel', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var campaignCode, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                campaignCode = req.params.campaignCode;
                return [4 /*yield*/, innova_campaigns_service_1.default.cancelCampaign({ campaign_code: campaignCode })];
            case 1:
                _a.sent();
                res.json({ success: true, message: 'Campaign cancelled successfully' });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                console.error('Error cancelling campaign:', error_7);
                res.status(500).json({ success: false, error: error_7.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * @route POST /api/campaigns/:campaignCode/players/add
 * @desc Add players to a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/add', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var campaignCode, players, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                campaignCode = req.params.campaignCode;
                players = req.body.players;
                if (!players || (Array.isArray(players) && players.length === 0)) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Players array is required' })];
                }
                return [4 /*yield*/, innova_campaigns_service_1.default.addPlayers({ campaign_code: campaignCode, players: players })];
            case 1:
                _a.sent();
                res.json({ success: true, message: 'Players added to campaign successfully' });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error('Error adding players to campaign:', error_8);
                res.status(500).json({ success: false, error: error_8.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * @route POST /api/campaigns/:campaignCode/players/remove
 * @desc Remove players from a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/remove', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var campaignCode, players, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                campaignCode = req.params.campaignCode;
                players = req.body.players;
                if (!players || (Array.isArray(players) && players.length === 0)) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Players array is required' })];
                }
                return [4 /*yield*/, innova_campaigns_service_1.default.removePlayers({ campaign_code: campaignCode, players: players })];
            case 1:
                _a.sent();
                res.json({ success: true, message: 'Players removed from campaign successfully' });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error('Error removing players from campaign:', error_9);
                res.status(500).json({ success: false, error: error_9.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * @route POST /api/campaigns/:campaignCode/players/add-all
 * @desc Add ALL users to a campaign
 * @access Admin
 */
router.post('/:campaignCode/players/add-all', auth_middleware_1.authenticate, auth_middleware_1.adminAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var campaignCode, result, allUserIds, campaignResult, campaignData, campaignId, innovaError_2, client, _i, allUserIds_1, userId, userIdInt, totalBetAmount, beginsAtTimestamp, expiresAtTimestamp, dbError_2, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 20, , 21]);
                campaignCode = req.params.campaignCode;
                return [4 /*yield*/, postgres_1.default.query('SELECT id FROM users WHERE status_id = 1 ORDER BY id ASC')];
            case 1:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'No users found' })];
                }
                allUserIds = result.rows.map(function (row) { return row.id.toString(); });
                console.log("[CAMPAIGNS] Adding ".concat(allUserIds.length, " users to campaign ").concat(campaignCode));
                return [4 /*yield*/, postgres_1.default.query("SELECT c.*, cg.game_id, cg.total_bet\n       FROM campaigns c\n       LEFT JOIN campaign_games cg ON c.id = cg.campaign_id\n       WHERE c.campaign_code = $1\n       LIMIT 1", [campaignCode])];
            case 2:
                campaignResult = _a.sent();
                if (campaignResult.rows.length === 0) {
                    return [2 /*return*/, res.status(400).json({
                            success: false,
                            error: 'Campaign not found. Please create the campaign first.'
                        })];
                }
                campaignData = campaignResult.rows[0];
                campaignId = campaignData.id;
                console.log("[CAMPAIGNS] Campaign found (ID: ".concat(campaignId, "), adding all users..."));
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                return [4 /*yield*/, innova_campaigns_service_1.default.addPlayers({
                        campaign_code: campaignCode,
                        players: allUserIds
                    })];
            case 4:
                _a.sent();
                console.log('[CAMPAIGNS] Players added to Innova API');
                return [3 /*break*/, 6];
            case 5:
                innovaError_2 = _a.sent();
                console.log('[CAMPAIGNS] Innova API unavailable, continuing with local save only');
                return [3 /*break*/, 6];
            case 6: return [4 /*yield*/, postgres_1.default.connect()];
            case 7:
                client = _a.sent();
                _a.label = 8;
            case 8:
                _a.trys.push([8, 16, 18, 19]);
                return [4 /*yield*/, client.query('BEGIN')];
            case 9:
                _a.sent();
                _i = 0, allUserIds_1 = allUserIds;
                _a.label = 10;
            case 10:
                if (!(_i < allUserIds_1.length)) return [3 /*break*/, 14];
                userId = allUserIds_1[_i];
                userIdInt = parseInt(userId);
                // Insert into campaign_players (normalized table)
                return [4 /*yield*/, client.query("INSERT INTO campaign_players (campaign_id, user_id, freespins_remaining)\n           VALUES ($1, $2, $3)\n           ON CONFLICT (campaign_id, user_id) DO NOTHING", [campaignId, userIdInt, campaignData.freespins_per_player])];
            case 11:
                // Insert into campaign_players (normalized table)
                _a.sent();
                totalBetAmount = (campaignData.total_bet || 0) * campaignData.freespins_per_player;
                beginsAtTimestamp = Math.floor(new Date(campaignData.begins_at).getTime() / 1000);
                expiresAtTimestamp = Math.floor(new Date(campaignData.expires_at).getTime() / 1000);
                return [4 /*yield*/, client.query("INSERT INTO user_free_spins_campaigns (\n            user_id, campaign_code, source, vendor, game_id, currency_code,\n            freespins_total, freespins_remaining, total_bet_amount,\n            status, begins_at, expires_at\n          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11), to_timestamp($12))\n          ON CONFLICT (user_id, campaign_code) DO NOTHING", [
                        userIdInt,
                        campaignCode,
                        'manual',
                        campaignData.vendor_name,
                        campaignData.game_id,
                        campaignData.currency_code,
                        campaignData.freespins_per_player,
                        campaignData.freespins_per_player, // remaining = total initially
                        totalBetAmount,
                        'pending',
                        beginsAtTimestamp,
                        expiresAtTimestamp
                    ])];
            case 12:
                _a.sent();
                _a.label = 13;
            case 13:
                _i++;
                return [3 /*break*/, 10];
            case 14: return [4 /*yield*/, client.query('COMMIT')];
            case 15:
                _a.sent();
                console.log("[CAMPAIGNS] Saved campaign ".concat(campaignCode, " to local DB for ").concat(allUserIds.length, " users"));
                return [3 /*break*/, 19];
            case 16:
                dbError_2 = _a.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 17:
                _a.sent();
                console.error('[CAMPAIGNS] Error saving to local DB:', dbError_2);
                throw dbError_2; // Fail the request if local DB save fails
            case 18:
                client.release();
                return [7 /*endfinally*/];
            case 19:
                res.json({
                    success: true,
                    message: "Successfully added ".concat(allUserIds.length, " users to campaign"),
                    count: allUserIds.length,
                    data: { count: allUserIds.length }
                });
                return [3 /*break*/, 21];
            case 20:
                error_10 = _a.sent();
                console.error('Error adding all users to campaign:', error_10);
                res.status(500).json({ success: false, error: error_10.message });
                return [3 /*break*/, 21];
            case 21: return [2 /*return*/];
        }
    });
}); });
/**
 * @route GET /api/campaigns/user/me/debug
 * @desc Debug endpoint to check user authentication and raw data
 * @access Player
 */
router.get('/user/me/debug', auth_middleware_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, allCampaigns, filteredCampaigns, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                userId = req.user.userId || req.user.id;
                return [4 /*yield*/, postgres_1.default.query("SELECT id, campaign_code, status, begins_at, expires_at, freespins_remaining, created_at\n       FROM user_free_spins_campaigns\n       WHERE user_id = $1\n       ORDER BY created_at DESC", [userId])];
            case 1:
                allCampaigns = _a.sent();
                return [4 /*yield*/, postgres_1.default.query("SELECT id, campaign_code, status, begins_at, expires_at, freespins_remaining\n       FROM user_free_spins_campaigns\n       WHERE user_id = $1\n         AND status IN ('pending', 'active')\n         AND expires_at > CURRENT_TIMESTAMP", [userId])];
            case 2:
                filteredCampaigns = _a.sent();
                res.json({
                    success: true,
                    debug: {
                        user_id: userId,
                        user_role: req.user.role,
                        current_timestamp: new Date().toISOString(),
                        all_campaigns_count: allCampaigns.rows.length,
                        all_campaigns: allCampaigns.rows,
                        filtered_campaigns_count: filteredCampaigns.rows.length,
                        filtered_campaigns: filteredCampaigns.rows
                    }
                });
                return [3 /*break*/, 4];
            case 3:
                error_11 = _a.sent();
                console.error('Error in debug endpoint:', error_11);
                res.status(500).json({ success: false, error: error_11.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @route GET /api/campaigns/user/me
 * @desc Get campaigns for the authenticated user
 * @access Player
 */
router.get('/user/me', auth_middleware_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, result, campaigns, error_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = req.user.userId || req.user.id;
                console.log("[CAMPAIGNS] Fetching campaigns for user ".concat(userId));
                return [4 /*yield*/, postgres_1.default.query("SELECT\n        fsc.id,\n        fsc.campaign_code,\n        fsc.vendor as vendor_name,\n        fsc.game_id,\n        fsc.currency_code,\n        fsc.freespins_total as freespins_per_player,\n        fsc.freespins_used,\n        fsc.freespins_remaining,\n        fsc.begins_at,\n        fsc.expires_at,\n        fsc.created_at as assigned_at,\n        fsc.total_win_amount,\n        fsc.status,\n        fsc.bonus_instance_id,\n        -- Bonus wallet data (if linked to a bonus instance)\n        bi.id as bonus_wallet_instance_id,\n        bi.bonus_amount as bonus_wallet_amount,\n        bi.remaining_bonus as bonus_wallet_remaining,\n        bi.wager_requirement_amount as wagering_required,\n        bi.wager_progress_amount as wagering_progress,\n        bi.wager_percentage_complete as wagering_complete_percentage,\n        CASE\n          WHEN bi.wager_percentage_complete >= 100 THEN true\n          ELSE false\n        END as can_withdraw,\n        bi.status as bonus_status\n       FROM user_free_spins_campaigns fsc\n       LEFT JOIN bonus_instances bi ON fsc.bonus_instance_id = bi.id\n       WHERE fsc.user_id = $1\n         AND fsc.status IN ('pending', 'active')\n         AND fsc.expires_at > CURRENT_TIMESTAMP\n       ORDER BY fsc.created_at DESC", [userId])];
            case 1:
                result = _a.sent();
                console.log("[CAMPAIGNS] Found ".concat(result.rows.length, " campaigns for user ").concat(userId));
                campaigns = result.rows.map(function (row) {
                    var campaign = {
                        id: row.id,
                        campaign_code: row.campaign_code,
                        vendor_name: row.vendor_name,
                        game_id: row.game_id,
                        currency_code: row.currency_code,
                        freespins_per_player: row.freespins_per_player,
                        freespins_used: row.freespins_used,
                        freespins_remaining: row.freespins_remaining,
                        begins_at: row.begins_at,
                        expires_at: row.expires_at,
                        assigned_at: row.assigned_at,
                        total_win_amount: parseFloat(row.total_win_amount || 0),
                        status: row.status
                    };
                    // Add bonus_wallet object if campaign is linked to a bonus instance
                    if (row.bonus_instance_id && row.bonus_wallet_instance_id) {
                        campaign.bonus_wallet = {
                            instance_id: row.bonus_wallet_instance_id,
                            bonus_amount: parseFloat(row.bonus_wallet_amount || 0),
                            remaining_bonus: parseFloat(row.bonus_wallet_remaining || 0),
                            wagering_required: parseFloat(row.wagering_required || 0),
                            wagering_progress: parseFloat(row.wagering_progress || 0),
                            wagering_complete_percentage: parseFloat(row.wagering_complete_percentage || 0),
                            can_withdraw: row.can_withdraw,
                            status: row.bonus_status
                        };
                    }
                    return campaign;
                });
                res.json({ success: true, data: campaigns });
                return [3 /*break*/, 3];
            case 2:
                error_12 = _a.sent();
                console.error('Error fetching user campaigns:', error_12);
                res.status(500).json({ success: false, error: error_12.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * @route GET /api/campaigns/user/:userId
 * @desc Get campaigns for a specific user (player endpoint)
 * @access Player
 */
router.get('/user/:userId', auth_middleware_1.authenticate, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, requestingUserId, result, campaigns, error_13;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = parseInt(req.params.userId);
                requestingUserId = req.user.userId || req.user.id;
                // Ensure user can only see their own campaigns
                if (requestingUserId !== userId && req.user.role !== 'Admin') {
                    return [2 /*return*/, res.status(403).json({ success: false, error: 'Unauthorized' })];
                }
                return [4 /*yield*/, postgres_1.default.query("SELECT\n        fsc.id,\n        fsc.campaign_code,\n        fsc.vendor as vendor_name,\n        fsc.game_id,\n        fsc.currency_code,\n        fsc.freespins_total as freespins_per_player,\n        fsc.freespins_used,\n        fsc.freespins_remaining,\n        fsc.begins_at,\n        fsc.expires_at,\n        fsc.created_at as assigned_at,\n        fsc.total_win_amount,\n        fsc.status,\n        fsc.bonus_instance_id,\n        -- Bonus wallet data (if linked to a bonus instance)\n        bi.id as bonus_wallet_instance_id,\n        bi.bonus_amount as bonus_wallet_amount,\n        bi.remaining_bonus as bonus_wallet_remaining,\n        bi.wager_requirement_amount as wagering_required,\n        bi.wager_progress_amount as wagering_progress,\n        bi.wager_percentage_complete as wagering_complete_percentage,\n        CASE\n          WHEN bi.wager_percentage_complete >= 100 THEN true\n          ELSE false\n        END as can_withdraw,\n        bi.status as bonus_status\n       FROM user_free_spins_campaigns fsc\n       LEFT JOIN bonus_instances bi ON fsc.bonus_instance_id = bi.id\n       WHERE fsc.user_id = $1\n         AND fsc.status IN ('pending', 'active')\n         AND fsc.expires_at > CURRENT_TIMESTAMP\n       ORDER BY fsc.created_at DESC", [userId])];
            case 1:
                result = _a.sent();
                campaigns = result.rows.map(function (row) {
                    var campaign = {
                        id: row.id,
                        campaign_code: row.campaign_code,
                        vendor_name: row.vendor_name,
                        game_id: row.game_id,
                        currency_code: row.currency_code,
                        freespins_per_player: row.freespins_per_player,
                        freespins_used: row.freespins_used,
                        freespins_remaining: row.freespins_remaining,
                        begins_at: row.begins_at,
                        expires_at: row.expires_at,
                        assigned_at: row.assigned_at,
                        total_win_amount: parseFloat(row.total_win_amount || 0),
                        status: row.status
                    };
                    // Add bonus_wallet object if campaign is linked to a bonus instance
                    if (row.bonus_instance_id && row.bonus_wallet_instance_id) {
                        campaign.bonus_wallet = {
                            instance_id: row.bonus_wallet_instance_id,
                            bonus_amount: parseFloat(row.bonus_wallet_amount || 0),
                            remaining_bonus: parseFloat(row.bonus_wallet_remaining || 0),
                            wagering_required: parseFloat(row.wagering_required || 0),
                            wagering_progress: parseFloat(row.wagering_progress || 0),
                            wagering_complete_percentage: parseFloat(row.wagering_complete_percentage || 0),
                            can_withdraw: row.can_withdraw,
                            status: row.bonus_status
                        };
                    }
                    return campaign;
                });
                res.json({ success: true, data: campaigns });
                return [3 /*break*/, 3];
            case 2:
                error_13 = _a.sent();
                console.error('Error fetching user campaigns:', error_13);
                res.status(500).json({ success: false, error: error_13.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// use-freespin route removed - free spins are tracked automatically via Innova callbacks
// See provider-callback.service.ts for automatic usage tracking
exports.default = router;
