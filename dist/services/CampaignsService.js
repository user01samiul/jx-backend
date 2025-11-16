"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const postgres_1 = __importDefault(require("../db/postgres"));
class CampaignsService {
    constructor() {
        // Configurare din environment variables
        this.operatorId = process.env.INNOVA_OPERATOR_ID || 'jackpotx';
        this.secretKey = process.env.INNOVA_SECRET_KEY || '';
        this.platformApiHost = process.env.INNOVA_API_HOST || 'https://ttlive.me';
        // Creare client HTTP cu headers de autentificare
        this.apiClient = axios_1.default.create({
            baseURL: `${this.platformApiHost}/api/generic/campaigns`,
            headers: {
                'X-Operator-Id': this.operatorId,
                'X-Authorization': this.generateAuthHash(),
            },
        });
    }
    /**
     * Generate authentication hash: sha1('campaigns' + operatorId + secretKey)
     */
    generateAuthHash() {
        const data = 'campaigns' + this.operatorId + this.secretKey;
        return crypto_1.default.createHash('sha1').update(data).digest('hex');
    }
    /**
     * List available vendors that support campaigns
     */
    async listVendors() {
        try {
            const response = await this.apiClient.get('/vendors');
            return response.data.data || [];
        }
        catch (error) {
            console.error('Error fetching vendors:', error.message);
            throw new Error(`Failed to fetch vendors: ${error.message}`);
        }
    }
    /**
     * Get betting limits for specific vendors, games, and currencies
     */
    async getGameLimits(vendors, games, currencies) {
        try {
            const params = {};
            if (vendors)
                params.vendors = vendors;
            if (games)
                params.games = games;
            if (currencies)
                params.currencies = currencies;
            const response = await this.apiClient.get('/vendors/limits', { params });
            return response.data.data || [];
        }
        catch (error) {
            console.error('Error fetching game limits:', error.message);
            throw new Error(`Failed to fetch game limits: ${error.message}`);
        }
    }
    /**
     * List existing campaigns with optional filters
     */
    async listCampaigns(filters) {
        try {
            const params = {};
            if (filters === null || filters === void 0 ? void 0 : filters.vendors)
                params.vendors = filters.vendors;
            if (filters === null || filters === void 0 ? void 0 : filters.currencies)
                params.currencies = filters.currencies;
            if (filters === null || filters === void 0 ? void 0 : filters.players)
                params.players = filters.players;
            if (filters === null || filters === void 0 ? void 0 : filters.games)
                params.games = filters.games;
            if ((filters === null || filters === void 0 ? void 0 : filters.include_expired) !== undefined)
                params.include_expired = filters.include_expired;
            if (filters === null || filters === void 0 ? void 0 : filters.per_page)
                params.per_page = filters.per_page;
            const response = await this.apiClient.get('/list', { params });
            return response.data;
        }
        catch (error) {
            console.error('Error listing campaigns:', error.message);
            throw new Error(`Failed to list campaigns: ${error.message}`);
        }
    }
    /**
     * Get campaign details by campaign code
     */
    async getCampaignDetails(campaignCode) {
        try {
            const response = await this.apiClient.get(`/${campaignCode}`);
            return response.data.data;
        }
        catch (error) {
            console.error('Error fetching campaign details:', error.message);
            throw new Error(`Failed to fetch campaign details: ${error.message}`);
        }
    }
    /**
     * Create a new campaign
     */
    async createCampaign(campaign) {
        try {
            // Validate campaign data
            if (!campaign.vendor || !campaign.campaign_code) {
                throw new Error('Vendor and campaign_code are required');
            }
            // Store campaign in database
            await this.storeCampaignInDB(campaign);
            // Send to platform API
            const response = await this.apiClient.post('/create', campaign);
            if (response.data.status !== 'OK') {
                throw new Error('Campaign creation failed on platform');
            }
            console.log(`Campaign ${campaign.campaign_code} created successfully`);
        }
        catch (error) {
            console.error('Error creating campaign:', error.message);
            throw new Error(`Failed to create campaign: ${error.message}`);
        }
    }
    /**
     * Cancel an existing campaign
     */
    async cancelCampaign(campaignCode) {
        try {
            const response = await this.apiClient.post('/cancel', { campaign_code: campaignCode });
            if (response.data.status !== 'OK') {
                throw new Error('Campaign cancellation failed on platform');
            }
            // Update status in database
            await postgres_1.default.query('UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE campaign_code = $2', ['cancelled', campaignCode]);
            console.log(`Campaign ${campaignCode} cancelled successfully`);
        }
        catch (error) {
            console.error('Error cancelling campaign:', error.message);
            throw new Error(`Failed to cancel campaign: ${error.message}`);
        }
    }
    /**
     * Add players to a campaign
     */
    async addPlayersToCampaign(campaignCode, players) {
        try {
            const response = await this.apiClient.post('/players/add', {
                campaign_code: campaignCode,
                players,
            });
            if (response.data.status !== 'OK') {
                throw new Error('Adding players failed on platform');
            }
            // Add players to database
            await this.addPlayersToDBCampaign(campaignCode, players);
            console.log(`Players added to campaign ${campaignCode} successfully`);
        }
        catch (error) {
            console.error('Error adding players to campaign:', error.message);
            throw new Error(`Failed to add players to campaign: ${error.message}`);
        }
    }
    /**
     * Remove players from a campaign
     */
    async removePlayersFromCampaign(campaignCode, players) {
        try {
            const response = await this.apiClient.post('/players/remove', {
                campaign_code: campaignCode,
                players,
            });
            if (response.data.status !== 'OK') {
                throw new Error('Removing players failed on platform');
            }
            // Remove players from database
            await this.removePlayersFromDBCampaign(campaignCode, players);
            console.log(`Players removed from campaign ${campaignCode} successfully`);
        }
        catch (error) {
            console.error('Error removing players from campaign:', error.message);
            throw new Error(`Failed to remove players from campaign: ${error.message}`);
        }
    }
    /**
     * Store campaign in local database
     */
    async storeCampaignInDB(campaign) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Insert campaign
            const campaignResult = await client.query(`INSERT INTO campaigns (campaign_code, vendor_name, currency_code, freespins_per_player, begins_at, expires_at, status)
         VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6), 'active')
         RETURNING id`, [
                campaign.campaign_code,
                campaign.vendor,
                campaign.currency_code,
                campaign.freespins_per_player,
                campaign.begins_at,
                campaign.expires_at,
            ]);
            const campaignId = campaignResult.rows[0].id;
            // Insert campaign games
            for (const game of campaign.games) {
                await client.query(`INSERT INTO campaign_games (campaign_id, game_id, total_bet)
           VALUES ($1, $2, $3)`, [campaignId, game.game_id, game.total_bet]);
            }
            // Insert players if provided
            if (campaign.players) {
                const playerIds = Array.isArray(campaign.players)
                    ? campaign.players
                    : campaign.players.split(',');
                for (const playerId of playerIds) {
                    await client.query(`INSERT INTO campaign_players (campaign_id, user_id, freespins_remaining)
             VALUES ($1, $2, $3)
             ON CONFLICT (campaign_id, user_id) DO NOTHING`, [campaignId, parseInt(playerId.trim()), campaign.freespins_per_player]);
                }
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Add players to database campaign
     */
    async addPlayersToDBCampaign(campaignCode, players) {
        const playerIds = Array.isArray(players) ? players : players.split(',');
        const campaignResult = await postgres_1.default.query('SELECT id, freespins_per_player FROM campaigns WHERE campaign_code = $1', [campaignCode]);
        if (campaignResult.rows.length === 0) {
            throw new Error('Campaign not found in database');
        }
        const { id: campaignId, freespins_per_player } = campaignResult.rows[0];
        for (const playerId of playerIds) {
            await postgres_1.default.query(`INSERT INTO campaign_players (campaign_id, user_id, freespins_remaining)
         VALUES ($1, $2, $3)
         ON CONFLICT (campaign_id, user_id) DO NOTHING`, [campaignId, parseInt(playerId.trim()), freespins_per_player]);
        }
    }
    /**
     * Remove players from database campaign
     */
    async removePlayersFromDBCampaign(campaignCode, players) {
        const playerIds = Array.isArray(players) ? players : players.split(',');
        const campaignResult = await postgres_1.default.query('SELECT id FROM campaigns WHERE campaign_code = $1', [campaignCode]);
        if (campaignResult.rows.length === 0) {
            throw new Error('Campaign not found in database');
        }
        const campaignId = campaignResult.rows[0].id;
        for (const playerId of playerIds) {
            await postgres_1.default.query('DELETE FROM campaign_players WHERE campaign_id = $1 AND user_id = $2', [campaignId, parseInt(playerId.trim())]);
        }
    }
    /**
     * Get campaigns for a specific user
     */
    async getUserCampaigns(userId) {
        const result = await postgres_1.default.query(`SELECT c.*, cp.freespins_used, cp.freespins_remaining, cp.assigned_at
       FROM campaigns c
       INNER JOIN campaign_players cp ON c.id = cp.campaign_id
       WHERE cp.user_id = $1 AND c.status = 'active' AND c.expires_at > CURRENT_TIMESTAMP
       ORDER BY cp.assigned_at DESC`, [userId]);
        return result.rows;
    }
    /**
     * Use a free spin from a campaign
     */
    async useFreeSpinFromCampaign(userId, campaignId) {
        const result = await postgres_1.default.query(`UPDATE campaign_players
       SET freespins_used = freespins_used + 1,
           freespins_remaining = freespins_remaining - 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND campaign_id = $2 AND freespins_remaining > 0
       RETURNING id`, [userId, campaignId]);
        return result.rows.length > 0;
    }
    /**
     * Sync game limits from platform to database
     */
    async syncGameLimitsFromPlatform(vendor) {
        try {
            // Get games for this vendor from database
            const gamesResult = await postgres_1.default.query('SELECT id FROM games WHERE vendor = $1 AND is_active = true', [vendor]);
            const gameIds = gamesResult.rows.map(row => row.id).join(',');
            if (!gameIds) {
                console.log(`No games found for vendor ${vendor}`);
                return;
            }
            // Fetch limits from platform
            const limits = await this.getGameLimits(vendor, gameIds);
            // Store in database
            for (const limit of limits) {
                await postgres_1.default.query(`INSERT INTO campaign_game_limits (vendor_name, game_id, currency_code, limits, freespins_per_player_options)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (vendor_name, game_id, currency_code)
           DO UPDATE SET
             limits = EXCLUDED.limits,
             freespins_per_player_options = EXCLUDED.freespins_per_player_options,
             updated_at = CURRENT_TIMESTAMP`, [
                    limit.vendor,
                    limit.game_id,
                    limit.currency_code,
                    JSON.stringify(limit.limits),
                    limit.freespins_per_player ? JSON.stringify(limit.freespins_per_player) : null,
                ]);
            }
            console.log(`Synced game limits for vendor ${vendor}`);
        }
        catch (error) {
            console.error('Error syncing game limits:', error.message);
            throw error;
        }
    }
}
exports.default = new CampaignsService();
