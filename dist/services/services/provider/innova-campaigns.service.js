"use strict";
/**
 * Innova Campaigns API Service
 *
 * Manages free spins campaigns through Innova Gaming Platform API.
 * Handles creation, player management, and tracking of free spin campaigns.
 *
 * API Documentation: /InnovaSDK/campaigns-api-docs-v0.5.pdf
 */
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
var crypto_1 = __importDefault(require("crypto"));
var axios_1 = __importDefault(require("axios"));
var env_1 = require("../../configs/env");
// Configuration
var INNOVA_CAMPAIGNS_CONFIG = {
    baseUrl: process.env.INNOVA_API_HOST || 'https://ttlive.me',
    operatorId: env_1.env.SUPPLIER_OPERATOR_ID,
    secretKey: env_1.env.SUPPLIER_SECRET_KEY,
    timeout: 30000
};
/**
 * Innova Campaigns API Service
 */
var InnovaCampaignsService = /** @class */ (function () {
    function InnovaCampaignsService() {
        var _this = this;
        this.axiosInstance = axios_1.default.create({
            baseURL: INNOVA_CAMPAIGNS_CONFIG.baseUrl,
            timeout: INNOVA_CAMPAIGNS_CONFIG.timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Add request interceptor for authentication
        this.axiosInstance.interceptors.request.use(function (config) {
            var authHash = _this.generateAuthorizationHash();
            config.headers['X-Authorization'] = authHash;
            config.headers['X-Operator-Id'] = INNOVA_CAMPAIGNS_CONFIG.operatorId;
            return config;
        });
    }
    /**
     * Generate authorization hash for Innova Campaigns API
     * Format: sha1('campaigns' + operatorId + secretKey)
     */
    InnovaCampaignsService.prototype.generateAuthorizationHash = function () {
        var payload = 'campaigns' + INNOVA_CAMPAIGNS_CONFIG.operatorId + INNOVA_CAMPAIGNS_CONFIG.secretKey;
        return crypto_1.default.createHash('sha1').update(payload).digest('hex');
    };
    /**
     * List supported vendors
     */
    InnovaCampaignsService.prototype.listVendors = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('[INNOVA_CAMPAIGNS] Fetching vendors list');
                        return [4 /*yield*/, this.axiosInstance.get('/api/generic/campaigns/vendors')];
                    case 1:
                        response = _a.sent();
                        if (response.data.status === 'OK' && response.data.data) {
                            console.log('[INNOVA_CAMPAIGNS] Vendors fetched:', response.data.data);
                            return [2 /*return*/, response.data.data];
                        }
                        throw new Error('Failed to fetch vendors list');
                    case 2:
                        error_1 = _a.sent();
                        console.error('[INNOVA_CAMPAIGNS] Error fetching vendors:', error_1.message);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get game limits for campaigns
     */
    InnovaCampaignsService.prototype.getGameLimits = function (vendors, games, currencies) {
        return __awaiter(this, void 0, void 0, function () {
            var params, response, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        params = {};
                        if (vendors && vendors.length > 0)
                            params.vendors = vendors.join(',');
                        if (games && games.length > 0)
                            params.games = games.join(',');
                        if (currencies && currencies.length > 0)
                            params.currencies = currencies.join(',');
                        console.log('[INNOVA_CAMPAIGNS] Fetching game limits with params:', params);
                        return [4 /*yield*/, this.axiosInstance.get('/api/generic/campaigns/vendors/limits', { params: params })];
                    case 1:
                        response = _b.sent();
                        if (response.data.status === 'OK') {
                            console.log('[INNOVA_CAMPAIGNS] Game limits fetched, count:', ((_a = response.data.data) === null || _a === void 0 ? void 0 : _a.length) || 0);
                            return [2 /*return*/, response.data.data];
                        }
                        throw new Error('Failed to fetch game limits');
                    case 2:
                        error_2 = _b.sent();
                        console.error('[INNOVA_CAMPAIGNS] Error fetching game limits:', error_2.message);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List campaigns with optional filters
     */
    InnovaCampaignsService.prototype.listCampaigns = function (filters) {
        return __awaiter(this, void 0, void 0, function () {
            var params, response, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        params = {};
                        if (filters === null || filters === void 0 ? void 0 : filters.vendors)
                            params.vendors = filters.vendors.join(',');
                        if (filters === null || filters === void 0 ? void 0 : filters.currencies)
                            params.currencies = filters.currencies.join(',');
                        if (filters === null || filters === void 0 ? void 0 : filters.players)
                            params.players = filters.players.join(',');
                        if (filters === null || filters === void 0 ? void 0 : filters.games)
                            params.games = filters.games.join(',');
                        if ((filters === null || filters === void 0 ? void 0 : filters.include_expired) !== undefined)
                            params.include_expired = filters.include_expired;
                        if (filters === null || filters === void 0 ? void 0 : filters.per_page)
                            params.per_page = filters.per_page;
                        console.log('[INNOVA_CAMPAIGNS] Listing campaigns with filters:', params);
                        return [4 /*yield*/, this.axiosInstance.get('/api/generic/campaigns/list', { params: params })];
                    case 1:
                        response = _b.sent();
                        if (response.data.status === 'OK') {
                            console.log('[INNOVA_CAMPAIGNS] Campaigns listed, count:', ((_a = response.data.data) === null || _a === void 0 ? void 0 : _a.length) || 0);
                            return [2 /*return*/, response.data];
                        }
                        throw new Error('Failed to list campaigns');
                    case 2:
                        error_3 = _b.sent();
                        console.error('[INNOVA_CAMPAIGNS] Error listing campaigns:', error_3.message);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get campaign details by code
     */
    InnovaCampaignsService.prototype.getCampaignDetails = function (campaignCode) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('[INNOVA_CAMPAIGNS] Fetching campaign details:', campaignCode);
                        return [4 /*yield*/, this.axiosInstance.get("/api/generic/campaigns/".concat(campaignCode))];
                    case 1:
                        response = _a.sent();
                        if (response.data.status === 'OK' && response.data.data) {
                            console.log('[INNOVA_CAMPAIGNS] Campaign details fetched:', response.data.data);
                            return [2 /*return*/, response.data.data];
                        }
                        throw new Error('Campaign not found');
                    case 2:
                        error_4 = _a.sent();
                        console.error('[INNOVA_CAMPAIGNS] Error fetching campaign details:', error_4.message);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a new free spins campaign
     */
    InnovaCampaignsService.prototype.createCampaign = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_5;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        console.log('[INNOVA_CAMPAIGNS] Creating campaign:', {
                            campaign_code: request.campaign_code,
                            vendor: request.vendor,
                            freespins_per_player: request.freespins_per_player,
                            games_count: request.games.length,
                            players_count: Array.isArray(request.players) ? request.players.length : 1
                        });
                        return [4 /*yield*/, this.axiosInstance.post('/api/generic/campaigns/create', request)];
                    case 1:
                        response = _d.sent();
                        if (response.data.status === 'OK') {
                            console.log('[INNOVA_CAMPAIGNS] Campaign created successfully:', request.campaign_code);
                            return [2 /*return*/];
                        }
                        throw new Error("Failed to create campaign: ".concat(response.data.status));
                    case 2:
                        error_5 = _d.sent();
                        console.error('[INNOVA_CAMPAIGNS] Error creating campaign:', ((_a = error_5.response) === null || _a === void 0 ? void 0 : _a.data) || error_5.message);
                        throw new Error("Failed to create Innova campaign: ".concat(((_c = (_b = error_5.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error_5.message));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Cancel an existing campaign
     */
    InnovaCampaignsService.prototype.cancelCampaign = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('[INNOVA_CAMPAIGNS] Canceling campaign:', request.campaign_code);
                        return [4 /*yield*/, this.axiosInstance.post('/api/generic/campaigns/cancel', request)];
                    case 1:
                        response = _a.sent();
                        if (response.data.status === 'OK') {
                            console.log('[INNOVA_CAMPAIGNS] Campaign canceled successfully');
                            return [2 /*return*/];
                        }
                        throw new Error('Failed to cancel campaign');
                    case 2:
                        error_6 = _a.sent();
                        console.error('[INNOVA_CAMPAIGNS] Error canceling campaign:', error_6.message);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Add players to an existing campaign
     */
    InnovaCampaignsService.prototype.addPlayers = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('[INNOVA_CAMPAIGNS] Adding players to campaign:', {
                            campaign_code: request.campaign_code,
                            players_count: Array.isArray(request.players) ? request.players.length : 1
                        });
                        return [4 /*yield*/, this.axiosInstance.post('/api/generic/campaigns/players/add', request)];
                    case 1:
                        response = _a.sent();
                        if (response.data.status === 'OK') {
                            console.log('[INNOVA_CAMPAIGNS] Players added successfully');
                            return [2 /*return*/];
                        }
                        throw new Error('Failed to add players to campaign');
                    case 2:
                        error_7 = _a.sent();
                        console.error('[INNOVA_CAMPAIGNS] Error adding players:', error_7.message);
                        throw error_7;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Remove players from an existing campaign
     */
    InnovaCampaignsService.prototype.removePlayers = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('[INNOVA_CAMPAIGNS] Removing players from campaign:', {
                            campaign_code: request.campaign_code,
                            players_count: Array.isArray(request.players) ? request.players.length : 1
                        });
                        return [4 /*yield*/, this.axiosInstance.post('/api/generic/campaigns/players/remove', request)];
                    case 1:
                        response = _a.sent();
                        if (response.data.status === 'OK') {
                            console.log('[INNOVA_CAMPAIGNS] Players removed successfully');
                            return [2 /*return*/];
                        }
                        throw new Error('Failed to remove players from campaign');
                    case 2:
                        error_8 = _a.sent();
                        console.error('[INNOVA_CAMPAIGNS] Error removing players:', error_8.message);
                        throw error_8;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Helper: Generate unique campaign code
     */
    InnovaCampaignsService.prototype.generateCampaignCode = function (source, sourceId, userId) {
        var timestamp = Date.now();
        return "".concat(source.toUpperCase(), "_").concat(sourceId, "_USER_").concat(userId, "_").concat(timestamp);
    };
    /**
     * Helper: Calculate campaign expiry timestamp (24 hours from now)
     */
    InnovaCampaignsService.prototype.getDefaultExpiryTimestamp = function (hoursFromNow) {
        if (hoursFromNow === void 0) { hoursFromNow = 24; }
        return Math.floor(Date.now() / 1000) + (hoursFromNow * 60 * 60);
    };
    /**
     * Helper: Get current timestamp
     */
    InnovaCampaignsService.prototype.getCurrentTimestamp = function () {
        return Math.floor(Date.now() / 1000);
    };
    return InnovaCampaignsService;
}());
// Export singleton instance
exports.default = new InnovaCampaignsService();
