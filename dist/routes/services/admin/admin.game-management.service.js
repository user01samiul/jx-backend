"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGameManagementService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const apiError_1 = require("../../utils/apiError");
class AdminGameManagementService {
    // Get games with status filters
    static async getGamesWithStatus(filters = {}) {
        const { category, provider, is_active, search, limit = 50, offset = 0 } = filters;
        let query = `
      SELECT 
        id,
        name,
        provider,
        category,
        subcategory,
        is_active,
        created_at,
        updated_at
      FROM games 
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 0;
        if (category) {
            paramCount++;
            query += ` AND category = $${paramCount}`;
            params.push(category);
        }
        if (provider) {
            paramCount++;
            query += ` AND provider = $${paramCount}`;
            params.push(provider);
        }
        if (is_active !== undefined) {
            paramCount++;
            query += ` AND is_active = $${paramCount}`;
            params.push(is_active);
        }
        if (search) {
            paramCount++;
            query += ` AND (name ILIKE $${paramCount} OR provider ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        query += ` ORDER BY updated_at DESC, name ASC`;
        query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);
        const result = await postgres_1.default.query(query, params);
        return result.rows;
    }
    // Update game status by ID
    static async updateGameStatusById(gameId, isActive, reason) {
        const result = await postgres_1.default.query(`UPDATE games 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, name, provider, category, is_active, updated_at`, [isActive, gameId]);
        if (result.rows.length === 0) {
            throw new apiError_1.ApiError("Game not found", 404);
        }
        // Log the status change
        await this.logGameStatusChange({
            game_id: gameId,
            action: isActive ? 'enabled' : 'disabled',
            reason: reason || 'Admin action',
            admin_id: 1 // TODO: Get from auth context
        });
        return result.rows[0];
    }
    // Update game status by category
    static async updateGameStatusByCategory(category, isActive, reason) {
        const result = await postgres_1.default.query(`UPDATE games 
       SET is_active = $1, updated_at = NOW() 
       WHERE category = $2 
       RETURNING id, name, provider, category, is_active, updated_at`, [isActive, category]);
        // Log the status change for each game
        for (const game of result.rows) {
            await this.logGameStatusChange({
                game_id: game.id,
                action: isActive ? 'enabled' : 'disabled',
                reason: reason || `Category ${category} ${isActive ? 'enabled' : 'disabled'}`,
                admin_id: 1 // TODO: Get from auth context
            });
        }
        return {
            updated_count: result.rows.length,
            games: result.rows
        };
    }
    // Update game status by provider
    static async updateGameStatusByProvider(provider, isActive, reason) {
        const result = await postgres_1.default.query(`UPDATE games 
       SET is_active = $1, updated_at = NOW() 
       WHERE provider = $2 
       RETURNING id, name, provider, category, is_active, updated_at`, [isActive, provider]);
        // Log the status change for each game
        for (const game of result.rows) {
            await this.logGameStatusChange({
                game_id: game.id,
                action: isActive ? 'enabled' : 'disabled',
                reason: reason || `Provider ${provider} ${isActive ? 'enabled' : 'disabled'}`,
                admin_id: 1 // TODO: Get from auth context
            });
        }
        return {
            updated_count: result.rows.length,
            games: result.rows
        };
    }
    // Bulk update game status by IDs
    static async bulkUpdateGameStatus(gameIds, isActive, reason) {
        if (gameIds.length === 0) {
            throw new apiError_1.ApiError("No game IDs provided", 400);
        }
        const placeholders = gameIds.map((_, index) => `$${index + 2}`).join(',');
        const result = await postgres_1.default.query(`UPDATE games 
       SET is_active = $1, updated_at = NOW() 
       WHERE id IN (${placeholders}) 
       RETURNING id, name, provider, category, is_active, updated_at`, [isActive, ...gameIds]);
        // Log the status change for each game
        for (const game of result.rows) {
            await this.logGameStatusChange({
                game_id: game.id,
                action: isActive ? 'enabled' : 'disabled',
                reason: reason || 'Bulk update',
                admin_id: 1 // TODO: Get from auth context
            });
        }
        return {
            updated_count: result.rows.length,
            games: result.rows
        };
    }
    // Get game status statistics
    static async getGameStatusStats() {
        const result = await postgres_1.default.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_games,
        COUNT(CASE WHEN is_active = false THEN 1 END) as disabled_games,
        COUNT(CASE WHEN is_active = true THEN 1 END) * 100.0 / COUNT(*) as active_percentage
      FROM games
    `);
        const categoryStats = await postgres_1.default.query(`
      SELECT 
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as disabled
      FROM games 
      GROUP BY category 
      ORDER BY total DESC
    `);
        const providerStats = await postgres_1.default.query(`
      SELECT 
        provider,
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as disabled
      FROM games 
      GROUP BY provider 
      ORDER BY total DESC
    `);
        return {
            overall: result.rows[0],
            by_category: categoryStats.rows,
            by_provider: providerStats.rows
        };
    }
    // Get recent game status changes
    static async getRecentStatusChanges(limit = 20) {
        const result = await postgres_1.default.query(`
      SELECT 
        gsc.id,
        gsc.game_id,
        g.name as game_name,
        g.provider,
        g.category,
        gsc.action,
        gsc.reason,
        gsc.created_at,
        u.username as admin_username
      FROM game_status_changes gsc
      LEFT JOIN games g ON gsc.game_id = g.id
      LEFT JOIN users u ON gsc.admin_id = u.id
      ORDER BY gsc.created_at DESC
      LIMIT $1
    `, [limit]);
        return result.rows;
    }
    // Log game status change
    static async logGameStatusChange(data) {
        await postgres_1.default.query(`INSERT INTO game_status_changes (game_id, action, reason, admin_id) 
       VALUES ($1, $2, $3, $4)`, [data.game_id, data.action, data.reason, data.admin_id]);
    }
}
exports.AdminGameManagementService = AdminGameManagementService;
