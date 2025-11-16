"use strict";
/**
 * Innova Campaigns API Service
 *
 * Manages free spins campaigns through Innova Gaming Platform API.
 * Handles creation, player management, and tracking of free spin campaigns.
 *
 * API Documentation: /InnovaSDK/campaigns-api-docs-v0.5.pdf
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../configs/env");
// Configuration
const INNOVA_CAMPAIGNS_CONFIG = {
    baseUrl: process.env.INNOVA_API_HOST || 'https://ttlive.me',
    operatorId: env_1.env.SUPPLIER_OPERATOR_ID,
    secretKey: env_1.env.SUPPLIER_SECRET_KEY,
    timeout: 30000
};
/**
 * Innova Campaigns API Service
 */
class InnovaCampaignsService {
    constructor() {
        this.axiosInstance = axios_1.default.create({
            baseURL: INNOVA_CAMPAIGNS_CONFIG.baseUrl,
            timeout: INNOVA_CAMPAIGNS_CONFIG.timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // Add request interceptor for authentication
        this.axiosInstance.interceptors.request.use((config) => {
            const authHash = this.generateAuthorizationHash();
            config.headers['X-Authorization'] = authHash;
            config.headers['X-Operator-Id'] = INNOVA_CAMPAIGNS_CONFIG.operatorId;
            return config;
        });
    }
    /**
     * Generate authorization hash for Innova Campaigns API
     * Format: sha1('campaigns' + operatorId + secretKey)
     */
    generateAuthorizationHash() {
        const payload = 'campaigns' + INNOVA_CAMPAIGNS_CONFIG.operatorId + INNOVA_CAMPAIGNS_CONFIG.secretKey;
        return crypto_1.default.createHash('sha1').update(payload).digest('hex');
    }
    /**
     * List supported vendors
     */
    async listVendors() {
        try {
            console.log('[INNOVA_CAMPAIGNS] Fetching vendors list');
            const response = await this.axiosInstance.get('/api/generic/campaigns/vendors');
            if (response.data.status === 'OK' && response.data.data) {
                console.log('[INNOVA_CAMPAIGNS] Vendors fetched:', response.data.data);
                return response.data.data;
            }
            throw new Error('Failed to fetch vendors list');
        }
        catch (error) {
            console.error('[INNOVA_CAMPAIGNS] Error fetching vendors:', error.message);
            throw error;
        }
    }
    /**
     * Get game limits for campaigns
     */
    async getGameLimits(vendors, games, currencies) {
        var _a;
        try {
            const params = {};
            if (vendors && vendors.length > 0)
                params.vendors = vendors.join(',');
            if (games && games.length > 0)
                params.games = games.join(',');
            if (currencies && currencies.length > 0)
                params.currencies = currencies.join(',');
            console.log('[INNOVA_CAMPAIGNS] Fetching game limits with params:', params);
            const response = await this.axiosInstance.get('/api/generic/campaigns/vendors/limits', { params });
            if (response.data.status === 'OK') {
                console.log('[INNOVA_CAMPAIGNS] Game limits fetched, count:', ((_a = response.data.data) === null || _a === void 0 ? void 0 : _a.length) || 0);
                return response.data.data;
            }
            throw new Error('Failed to fetch game limits');
        }
        catch (error) {
            console.error('[INNOVA_CAMPAIGNS] Error fetching game limits:', error.message);
            throw error;
        }
    }
    /**
     * List campaigns with optional filters
     */
    async listCampaigns(filters) {
        var _a;
        try {
            const params = {};
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
            const response = await this.axiosInstance.get('/api/generic/campaigns/list', { params });
            if (response.data.status === 'OK') {
                console.log('[INNOVA_CAMPAIGNS] Campaigns listed, count:', ((_a = response.data.data) === null || _a === void 0 ? void 0 : _a.length) || 0);
                return response.data;
            }
            throw new Error('Failed to list campaigns');
        }
        catch (error) {
            console.error('[INNOVA_CAMPAIGNS] Error listing campaigns:', error.message);
            throw error;
        }
    }
    /**
     * Get campaign details by code
     */
    async getCampaignDetails(campaignCode) {
        try {
            console.log('[INNOVA_CAMPAIGNS] Fetching campaign details:', campaignCode);
            const response = await this.axiosInstance.get(`/api/generic/campaigns/${campaignCode}`);
            if (response.data.status === 'OK' && response.data.data) {
                console.log('[INNOVA_CAMPAIGNS] Campaign details fetched:', response.data.data);
                return response.data.data;
            }
            throw new Error('Campaign not found');
        }
        catch (error) {
            console.error('[INNOVA_CAMPAIGNS] Error fetching campaign details:', error.message);
            throw error;
        }
    }
    /**
     * Create a new free spins campaign
     */
    async createCampaign(request) {
        var _a, _b, _c;
        try {
            console.log('[INNOVA_CAMPAIGNS] Creating campaign:', {
                campaign_code: request.campaign_code,
                vendor: request.vendor,
                freespins_per_player: request.freespins_per_player,
                games_count: request.games.length,
                players_count: Array.isArray(request.players) ? request.players.length : 1
            });
            const response = await this.axiosInstance.post('/api/generic/campaigns/create', request);
            if (response.data.status === 'OK') {
                console.log('[INNOVA_CAMPAIGNS] Campaign created successfully:', request.campaign_code);
                return;
            }
            throw new Error(`Failed to create campaign: ${response.data.status}`);
        }
        catch (error) {
            console.error('[INNOVA_CAMPAIGNS] Error creating campaign:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error(`Failed to create Innova campaign: ${((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || error.message}`);
        }
    }
    /**
     * Cancel an existing campaign
     */
    async cancelCampaign(request) {
        try {
            console.log('[INNOVA_CAMPAIGNS] Canceling campaign:', request.campaign_code);
            const response = await this.axiosInstance.post('/api/generic/campaigns/cancel', request);
            if (response.data.status === 'OK') {
                console.log('[INNOVA_CAMPAIGNS] Campaign canceled successfully');
                return;
            }
            throw new Error('Failed to cancel campaign');
        }
        catch (error) {
            console.error('[INNOVA_CAMPAIGNS] Error canceling campaign:', error.message);
            throw error;
        }
    }
    /**
     * Add players to an existing campaign
     */
    async addPlayers(request) {
        try {
            console.log('[INNOVA_CAMPAIGNS] Adding players to campaign:', {
                campaign_code: request.campaign_code,
                players_count: Array.isArray(request.players) ? request.players.length : 1
            });
            const response = await this.axiosInstance.post('/api/generic/campaigns/players/add', request);
            if (response.data.status === 'OK') {
                console.log('[INNOVA_CAMPAIGNS] Players added successfully');
                return;
            }
            throw new Error('Failed to add players to campaign');
        }
        catch (error) {
            console.error('[INNOVA_CAMPAIGNS] Error adding players:', error.message);
            throw error;
        }
    }
    /**
     * Remove players from an existing campaign
     */
    async removePlayers(request) {
        try {
            console.log('[INNOVA_CAMPAIGNS] Removing players from campaign:', {
                campaign_code: request.campaign_code,
                players_count: Array.isArray(request.players) ? request.players.length : 1
            });
            const response = await this.axiosInstance.post('/api/generic/campaigns/players/remove', request);
            if (response.data.status === 'OK') {
                console.log('[INNOVA_CAMPAIGNS] Players removed successfully');
                return;
            }
            throw new Error('Failed to remove players from campaign');
        }
        catch (error) {
            console.error('[INNOVA_CAMPAIGNS] Error removing players:', error.message);
            throw error;
        }
    }
    /**
     * Helper: Generate unique campaign code
     */
    generateCampaignCode(source, sourceId, userId) {
        const timestamp = Date.now();
        return `${source.toUpperCase()}_${sourceId}_USER_${userId}_${timestamp}`;
    }
    /**
     * Helper: Calculate campaign expiry timestamp (24 hours from now)
     */
    getDefaultExpiryTimestamp(hoursFromNow = 24) {
        return Math.floor(Date.now() / 1000) + (hoursFromNow * 60 * 60);
    }
    /**
     * Helper: Get current timestamp
     */
    getCurrentTimestamp() {
        return Math.floor(Date.now() / 1000);
    }
}
// Export singleton instance
exports.default = new InnovaCampaignsService();
