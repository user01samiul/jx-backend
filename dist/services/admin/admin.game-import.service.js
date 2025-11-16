"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGameImportService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
function getErrorMessage(error) {
    if (!error)
        return 'Unknown error';
    if (typeof error === 'string')
        return error;
    if (error.response && error.response.data && error.response.data.message)
        return error.response.data.message;
    if (error.message)
        return error.message;
    return 'Unknown error';
}
class AdminGameImportService {
    // Add new provider configuration
    async addProviderConfig(data) {
        const query = `
      INSERT INTO game_provider_configs 
      (provider_name, api_key, api_secret, base_url, is_active, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
        const values = [
            data.provider_name,
            data.api_key,
            data.api_secret,
            data.base_url,
            data.is_active,
            data.metadata ? JSON.stringify(data.metadata) : null
        ];
        const result = await postgres_1.default.query(query, values);
        return result.rows[0];
    }
    // Get provider configuration
    async getProviderConfig(providerName) {
        const query = `
      SELECT * FROM game_provider_configs 
      WHERE provider_name = $1 AND is_active = true
    `;
        const result = await postgres_1.default.query(query, [providerName]);
        return result.rows[0] || null;
    }
    // Update provider configuration
    async updateProviderConfig(providerName, data) {
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        if (data.api_key !== undefined) {
            updateFields.push(`api_key = $${paramCount++}`);
            values.push(data.api_key);
        }
        if (data.api_secret !== undefined) {
            updateFields.push(`api_secret = $${paramCount++}`);
            values.push(data.api_secret);
        }
        if (data.base_url !== undefined) {
            updateFields.push(`base_url = $${paramCount++}`);
            values.push(data.base_url);
        }
        if (data.is_active !== undefined) {
            updateFields.push(`is_active = $${paramCount++}`);
            values.push(data.is_active);
        }
        if (data.metadata !== undefined) {
            updateFields.push(`metadata = $${paramCount++}`);
            values.push(JSON.stringify(data.metadata));
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(providerName);
        const query = `
      UPDATE game_provider_configs 
      SET ${updateFields.join(', ')}
      WHERE provider_name = $${paramCount}
      RETURNING *
    `;
        const result = await postgres_1.default.query(query, values);
        return result.rows[0] || null;
    }
    // Get all provider configurations
    async getAllProviderConfigs() {
        const query = `
      SELECT * FROM game_provider_configs 
      ORDER BY provider_name
    `;
        const result = await postgres_1.default.query(query);
        return result.rows;
    }
    // Import games by category from external API
    async importGamesByCategory(data) {
        try {
            const providerConfig = await this.getProviderConfig(data.provider_name);
            if (!providerConfig) {
                return {
                    success: false,
                    message: `Provider configuration not found for: ${data.provider_name}`,
                    imported_count: 0,
                    updated_count: 0,
                    failed_count: 0,
                    errors: [`Provider ${data.provider_name} not configured`]
                };
            }
            const headers = await this.getProviderHeaders(providerConfig);
            const response = await axios_1.default.get(providerConfig.base_url, {
                headers,
                params: {
                    category: data.category,
                    limit: data.limit,
                    offset: data.offset
                },
                timeout: 30000
            });
            const games = response.data.games || response.data;
            if (!games || games.length === 0) {
                return {
                    success: true,
                    message: `No games found for category: ${data.category}`,
                    imported_count: 0,
                    updated_count: 0,
                    failed_count: 0
                };
            }
            const importResult = await this.importGamesToDatabase(this.transformProviderResponse(games, providerConfig.provider_name), data.force_update);
            return {
                success: true,
                message: `Successfully processed ${games.length} games for category: ${data.category}`,
                imported_count: importResult.imported_count,
                updated_count: importResult.updated_count,
                failed_count: importResult.failed_count,
                errors: importResult.errors,
                games: games
            };
        }
        catch (error) {
            console.error('Error importing games by category:', error);
            return {
                success: false,
                message: getErrorMessage(error),
                imported_count: 0,
                updated_count: 0,
                failed_count: 0,
                errors: [getErrorMessage(error)]
            };
        }
    }
    // Import specific game by ID
    async importGameById(data) {
        try {
            const providerConfig = await this.getProviderConfig(data.provider_name);
            if (!providerConfig) {
                return {
                    success: false,
                    message: `Provider configuration not found for: ${data.provider_name}`,
                    imported_count: 0,
                    updated_count: 0,
                    failed_count: 0,
                    errors: [`Provider ${data.provider_name} not configured`]
                };
            }
            const headers = await this.getProviderHeaders(providerConfig);
            const response = await axios_1.default.get(`${providerConfig.base_url}/games/${data.game_id}`, {
                headers,
                timeout: 30000
            });
            const games = this.transformProviderResponse([response.data], providerConfig.provider_name);
            if (!games || games.length === 0) {
                return {
                    success: false,
                    message: `Game not found with ID: ${data.game_id}`,
                    imported_count: 0,
                    updated_count: 0,
                    failed_count: 0,
                    errors: [`Game ${data.game_id} not found`]
                };
            }
            const importResult = await this.importGamesToDatabase(games, data.force_update);
            return {
                success: true,
                message: `Successfully processed game: ${games[0].name}`,
                imported_count: importResult.imported_count,
                updated_count: importResult.updated_count,
                failed_count: importResult.failed_count,
                errors: importResult.errors,
                games: games
            };
        }
        catch (error) {
            console.error('Error importing game by ID:', error);
            return {
                success: false,
                message: getErrorMessage(error),
                imported_count: 0,
                updated_count: 0,
                failed_count: 0,
                errors: [getErrorMessage(error)]
            };
        }
    }
    // Helper to generate X-Authorization header for game list
    static getGameListAuthorization(operatorID, secretKey) {
        const hashString = `games${operatorID}${secretKey}`;
        return crypto_1.default.createHash('sha1').update(hashString).digest('hex');
    }
    // Import all games from provider by all categories
    async importAllGamesByProvider(provider_name, debug = false) {
        try {
            const providerConfig = await this.getProviderConfig(provider_name);
            if (!providerConfig) {
                return { success: false, message: `Provider config not found for: ${provider_name}` };
            }
            // Get appropriate headers for the provider
            const headers = await this.getProviderHeaders(providerConfig);
            const response = await axios_1.default.get(providerConfig.base_url, { headers });
            if (debug) {
                return { success: true, raw: response.data };
            }
            const games = response.data.games || response.data;
            const categories = [...new Set(games.map(game => game.category || game.type || game.subtype || 'uncategorized'))];
            const results = [];
            for (const category of categories) {
                const importResult = await this.importGamesByCategory({
                    provider_name,
                    category,
                    limit: 1000,
                    offset: 0,
                    force_update: false
                });
                results.push(Object.assign({ category }, importResult));
            }
            return { success: true, message: "Imported all categories", results };
        }
        catch (error) {
            console.error('Error importing all games:', error);
            return {
                success: false,
                message: getErrorMessage(error),
                results: [],
                errors: [getErrorMessage(error)]
            };
        }
    }
    // IGPX-specific authentication method
    async getIgpxAuthToken(providerConfig) {
        try {
            const authUrl = `${providerConfig.base_url}/auth`;
            const authData = {
                username: providerConfig.api_key,
                password: providerConfig.api_secret
            };
            const response = await axios_1.default.post(authUrl, authData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            if (response.data && response.data.token) {
                return response.data.token;
            }
            return null;
        }
        catch (error) {
            console.error('IGPX authentication failed:', error);
            return null;
        }
    }
    // Helper method to get appropriate headers for any provider
    async getProviderHeaders(providerConfig) {
        // IGPX-specific authentication
        if (providerConfig.provider_name.toLowerCase() === 'igpixel') {
            const authToken = await this.getIgpxAuthToken(providerConfig);
            if (!authToken) {
                throw new Error('Failed to authenticate with IGPX');
            }
            return {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            };
        }
        else {
            // Default authentication method
            const xAuth = AdminGameImportService.getGameListAuthorization(providerConfig.provider_name, providerConfig.api_secret);
            return {
                'X-Authorization': xAuth,
                'X-Operator-Id': providerConfig.provider_name
            };
        }
    }
    // Fetch games from external provider API
    async fetchGamesFromProvider(providerConfig, category, limit, offset) {
        try {
            const headers = await this.getProviderHeaders(providerConfig);
            const response = await axios_1.default.get(`${providerConfig.base_url}/games`, {
                headers,
                params: {
                    category,
                    limit,
                    offset
                },
                timeout: 30000
            });
            return this.transformProviderResponse(response.data, providerConfig.provider_name);
        }
        catch (error) {
            console.error(`Error fetching games from provider ${providerConfig.provider_name}:`, error);
            throw new Error(`Failed to fetch games from provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Fetch specific game by ID from external provider API
    async fetchGameByIdFromProvider(providerConfig, gameId) {
        try {
            const headers = await this.getProviderHeaders(providerConfig);
            const response = await axios_1.default.get(`${providerConfig.base_url}/games/${gameId}`, {
                headers,
                timeout: 30000
            });
            const games = this.transformProviderResponse([response.data], providerConfig.provider_name);
            return games[0] || null;
        }
        catch (error) {
            console.error(`Error fetching game ${gameId} from provider ${providerConfig.provider_name}:`, error);
            throw new Error(`Failed to fetch game from provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Transform provider response to our format
    transformProviderResponse(data, providerName) {
        return data.map(item => {
            // Extract thumbnail and image URLs
            let image_url = undefined;
            let thumbnail_url = undefined;
            if (item.details && item.details.thumbnails) {
                // Prefer 440x590, then 300x300, then any available
                image_url = item.details.thumbnails["440x590"] || item.details.thumbnails["440x590-jpg"] || item.details.thumbnails["300x300"] || item.details.thumbnails["300x300-gif"] || Object.values(item.details.thumbnails)[0];
                thumbnail_url = item.details.thumbnails["300x300"] || item.details.thumbnails["300x300-gif"] || item.details.thumbnails["440x590"] || Object.values(item.details.thumbnails)[0];
            }
            // Extract RTP and volatility
            let rtp = undefined;
            let volatility = undefined;
            if (item.details) {
                rtp = item.details.rtp;
                volatility = item.details.volatility;
            }
            return {
                name: item.title || item.name || item.game_name,
                provider: item.vendor || providerName,
                vendor: item.vendor || providerName.toLowerCase().replace(/\s+/g, ''),
                category: item.type || item.subtype || item.category || 'slots',
                game_code: String(item.id || item.game_id || item.code),
                image_url,
                thumbnail_url,
                rtp_percentage: rtp,
                volatility,
                min_bet: undefined, // Not provided by API
                max_bet: undefined, // Not provided by API
                max_win: undefined, // Not provided by API
                is_featured: false,
                is_new: false,
                is_hot: false,
                metadata: item
            };
        });
    }
    // Import games to database
    async importGamesToDatabase(games, forceUpdate) {
        if (!Array.isArray(games)) {
            const msg = `importGamesToDatabase: games is not an array. Type: ${typeof games}, Value: ${JSON.stringify(games)}`;
            console.error(msg);
            return {
                imported_count: 0,
                updated_count: 0,
                failed_count: 0,
                errors: [msg]
            };
        }
        let importedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const errors = [];
        for (const game of games) {
            try {
                // Check if game already exists
                const existingGame = await postgres_1.default.query('SELECT id FROM games WHERE game_code = $1', [game.game_code]);
                if (existingGame.rows.length > 0) {
                    if (forceUpdate) {
                        // Update existing game
                        await postgres_1.default.query(`
              UPDATE games SET
                name = $1,
                provider = $2,
                vendor = $3,
                category = $4,
                image_url = $5,
                thumbnail_url = $6,
                rtp_percentage = $7,
                volatility = $8,
                min_bet = $9,
                max_bet = $10,
                max_win = $11,
                is_featured = $12,
                is_new = $13,
                is_hot = $14,
                updated_at = CURRENT_TIMESTAMP
              WHERE game_code = $15
            `, [
                            game.name,
                            game.provider,
                            game.vendor,
                            game.category,
                            game.image_url,
                            game.thumbnail_url,
                            game.rtp_percentage,
                            game.volatility,
                            game.min_bet,
                            game.max_bet,
                            game.max_win,
                            game.is_featured,
                            game.is_new,
                            game.is_hot,
                            game.game_code
                        ]);
                        updatedCount++;
                    }
                }
                else {
                    // Insert new game
                    await postgres_1.default.query(`
            INSERT INTO games (
              name, provider, vendor, category, game_code, image_url, thumbnail_url,
              rtp_percentage, volatility, min_bet, max_bet, max_win,
              is_featured, is_new, is_hot, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
                        game.name,
                        game.provider,
                        game.vendor,
                        game.category,
                        game.game_code,
                        game.image_url,
                        game.thumbnail_url,
                        game.rtp_percentage,
                        game.volatility,
                        game.min_bet,
                        game.max_bet,
                        game.max_win,
                        game.is_featured,
                        game.is_new,
                        game.is_hot
                    ]);
                    importedCount++;
                }
            }
            catch (error) {
                failedCount++;
                const errorMsg = `Failed to import game ${(game === null || game === void 0 ? void 0 : game.name) || '[unknown]'}: ${getErrorMessage(error)}`;
                errors.push(errorMsg);
                console.error(`${errorMsg} | Type of error: ${typeof error} | Value: ${JSON.stringify(error)}`);
            }
        }
        return {
            imported_count: importedCount,
            updated_count: updatedCount,
            failed_count: failedCount,
            errors: errors.length > 0 ? errors : undefined
        };
    }
    // Get import statistics
    async getImportStatistics() {
        const totalGames = await postgres_1.default.query('SELECT COUNT(*) FROM games');
        const totalProviders = await postgres_1.default.query('SELECT COUNT(*) FROM game_provider_configs');
        const gamesByProvider = await postgres_1.default.query(`
      SELECT provider, COUNT(*) as count 
      FROM games 
      GROUP BY provider 
      ORDER BY count DESC
    `);
        const gamesByCategory = await postgres_1.default.query(`
      SELECT category, COUNT(*) as count 
      FROM games 
      GROUP BY category 
      ORDER BY count DESC
    `);
        return {
            total_games: parseInt(totalGames.rows[0].count),
            total_providers: parseInt(totalProviders.rows[0].count),
            games_by_provider: gamesByProvider.rows,
            games_by_category: gamesByCategory.rows
        };
    }
}
exports.AdminGameImportService = AdminGameImportService;
