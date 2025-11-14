import pool from "../../db/postgres";
import { ApiError } from "../../utils/apiError";

export interface GameStatusFilters {
  category?: string;
  provider?: string;
  is_active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GameStatusUpdate {
  game_ids?: number[];
  category?: string;
  provider?: string;
  is_active: boolean;
  reason?: string;
}

export interface GameStatusResponse {
  id: number;
  name: string;
  provider: string;
  category: string;
  is_active: boolean;
  updated_at: string;
}

export class AdminGameManagementService {
  // Get games with status filters
  static async getGamesWithStatus(filters: GameStatusFilters = {}) {
    const {
      category,
      provider,
      is_active,
      search,
      limit = 50,
      offset = 0
    } = filters;

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

    const params: any[] = [];
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

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Update game status by ID
  static async updateGameStatusById(gameId: number, isActive: boolean, reason?: string) {
    const result = await pool.query(
      `UPDATE games 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, name, provider, category, is_active, updated_at`,
      [isActive, gameId]
    );

    if (result.rows.length === 0) {
      throw new ApiError("Game not found", 404);
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
  static async updateGameStatusByCategory(category: string, isActive: boolean, reason?: string) {
    const result = await pool.query(
      `UPDATE games 
       SET is_active = $1, updated_at = NOW() 
       WHERE category = $2 
       RETURNING id, name, provider, category, is_active, updated_at`,
      [isActive, category]
    );

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
  static async updateGameStatusByProvider(provider: string, isActive: boolean, reason?: string) {
    const result = await pool.query(
      `UPDATE games 
       SET is_active = $1, updated_at = NOW() 
       WHERE provider = $2 
       RETURNING id, name, provider, category, is_active, updated_at`,
      [isActive, provider]
    );

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
  static async bulkUpdateGameStatus(gameIds: number[], isActive: boolean, reason?: string) {
    if (gameIds.length === 0) {
      throw new ApiError("No game IDs provided", 400);
    }

    const placeholders = gameIds.map((_, index) => `$${index + 2}`).join(',');
    const result = await pool.query(
      `UPDATE games 
       SET is_active = $1, updated_at = NOW() 
       WHERE id IN (${placeholders}) 
       RETURNING id, name, provider, category, is_active, updated_at`,
      [isActive, ...gameIds]
    );

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
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_games,
        COUNT(CASE WHEN is_active = false THEN 1 END) as disabled_games,
        COUNT(CASE WHEN is_active = true THEN 1 END) * 100.0 / COUNT(*) as active_percentage
      FROM games
    `);

    const categoryStats = await pool.query(`
      SELECT 
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as disabled
      FROM games 
      GROUP BY category 
      ORDER BY total DESC
    `);

    const providerStats = await pool.query(`
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
  static async getRecentStatusChanges(limit: number = 20) {
    const result = await pool.query(`
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
  private static async logGameStatusChange(data: {
    game_id: number;
    action: 'enabled' | 'disabled';
    reason: string;
    admin_id: number;
  }) {
    await pool.query(
      `INSERT INTO game_status_changes (game_id, action, reason, admin_id) 
       VALUES ($1, $2, $3, $4)`,
      [data.game_id, data.action, data.reason, data.admin_id]
    );
  }
} 