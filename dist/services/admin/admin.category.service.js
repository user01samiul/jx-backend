"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCategoryService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
class AdminCategoryService {
    // Create a new game category
    async createCategory(data, adminId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if category name already exists
            const existingCategory = await client.query('SELECT id FROM game_categories WHERE name = $1', [data.name]);
            if (existingCategory.rows.length > 0) {
                throw new Error(`Category with name "${data.name}" already exists`);
            }
            // Check if parent category exists if provided
            if (data.parent_category_id) {
                const parentCategory = await client.query('SELECT id FROM game_categories WHERE id = $1', [data.parent_category_id]);
                if (parentCategory.rows.length === 0) {
                    throw new Error(`Parent category with ID ${data.parent_category_id} not found`);
                }
            }
            const query = `
        INSERT INTO game_categories (
          name, display_name, description, icon_url, color, display_order,
          is_active, parent_category_id, metadata, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
            const values = [
                data.name,
                data.display_name,
                data.description,
                data.icon_url,
                data.color,
                data.display_order || 0,
                data.is_active !== false,
                data.parent_category_id,
                data.metadata ? JSON.stringify(data.metadata) : null,
                adminId,
                adminId
            ];
            const result = await client.query(query, values);
            const category = result.rows[0];
            // Get game count for this category
            const gameCountResult = await client.query('SELECT COUNT(*) as count FROM games WHERE category = $1', [category.name]);
            category.game_count = parseInt(gameCountResult.rows[0].count);
            await client.query('COMMIT');
            return category;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Get all categories with filtering and pagination
    async getCategories(filters) {
        const conditions = [];
        const values = [];
        let paramCount = 1;
        if (filters.search) {
            conditions.push(`(c.name ILIKE $${paramCount} OR c.display_name ILIKE $${paramCount})`);
            values.push(`%${filters.search}%`);
            paramCount++;
        }
        if (filters.is_active !== undefined) {
            conditions.push(`c.is_active = $${paramCount}`);
            values.push(filters.is_active);
            paramCount++;
        }
        if (filters.parent_category_id) {
            conditions.push(`c.parent_category_id = $${paramCount}`);
            values.push(filters.parent_category_id);
            paramCount++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Get total count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM game_categories c
      ${whereClause}
    `;
        const countResult = await postgres_1.default.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Get categories with game counts
        const query = `
      SELECT 
        c.*,
        COALESCE(g.game_count, 0) as game_count,
        pc.display_name as parent_category_name
      FROM game_categories c
      LEFT JOIN (
        SELECT category, COUNT(*) as game_count
        FROM games
        GROUP BY category
      ) g ON c.name = g.category
      LEFT JOIN game_categories pc ON c.parent_category_id = pc.id
      ${whereClause}
      ORDER BY c.display_order ASC, c.display_name ASC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
        const offset = (filters.page - 1) * filters.limit;
        values.push(filters.limit, offset);
        const result = await postgres_1.default.query(query, values);
        return {
            categories: result.rows,
            pagination: {
                total,
                page: filters.page,
                limit: filters.limit,
                total_pages: Math.ceil(total / filters.limit)
            }
        };
    }
    // Get category by ID
    async getCategoryById(categoryId) {
        const query = `
      SELECT 
        c.*,
        COALESCE(g.game_count, 0) as game_count,
        pc.display_name as parent_category_name
      FROM game_categories c
      LEFT JOIN (
        SELECT category, COUNT(*) as game_count
        FROM games
        GROUP BY category
      ) g ON c.name = g.category
      LEFT JOIN game_categories pc ON c.parent_category_id = pc.id
      WHERE c.id = $1
    `;
        const result = await postgres_1.default.query(query, [categoryId]);
        return result.rows[0] || null;
    }
    // Update category
    async updateCategory(categoryId, data, adminId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if category exists
            const existingCategory = await client.query('SELECT id, name FROM game_categories WHERE id = $1', [categoryId]);
            if (existingCategory.rows.length === 0) {
                throw new Error(`Category with ID ${categoryId} not found`);
            }
            // Check if new name conflicts with existing category
            if (data.name && data.name !== existingCategory.rows[0].name) {
                const nameConflict = await client.query('SELECT id FROM game_categories WHERE name = $1 AND id != $2', [data.name, categoryId]);
                if (nameConflict.rows.length > 0) {
                    throw new Error(`Category with name "${data.name}" already exists`);
                }
            }
            // Check if parent category exists if provided
            if (data.parent_category_id) {
                const parentCategory = await client.query('SELECT id FROM game_categories WHERE id = $1', [data.parent_category_id]);
                if (parentCategory.rows.length === 0) {
                    throw new Error(`Parent category with ID ${data.parent_category_id} not found`);
                }
                // Prevent circular reference
                if (data.parent_category_id === categoryId) {
                    throw new Error('Category cannot be its own parent');
                }
            }
            const updateFields = [];
            const values = [];
            let paramCount = 1;
            if (data.name !== undefined) {
                updateFields.push(`name = $${paramCount++}`);
                values.push(data.name);
            }
            if (data.display_name !== undefined) {
                updateFields.push(`display_name = $${paramCount++}`);
                values.push(data.display_name);
            }
            if (data.description !== undefined) {
                updateFields.push(`description = $${paramCount++}`);
                values.push(data.description);
            }
            if (data.icon_url !== undefined) {
                updateFields.push(`icon_url = $${paramCount++}`);
                values.push(data.icon_url);
            }
            if (data.color !== undefined) {
                updateFields.push(`color = $${paramCount++}`);
                values.push(data.color);
            }
            if (data.display_order !== undefined) {
                updateFields.push(`display_order = $${paramCount++}`);
                values.push(data.display_order);
            }
            if (data.is_active !== undefined) {
                updateFields.push(`is_active = $${paramCount++}`);
                values.push(data.is_active);
            }
            if (data.parent_category_id !== undefined) {
                updateFields.push(`parent_category_id = $${paramCount++}`);
                values.push(data.parent_category_id);
            }
            if (data.metadata !== undefined) {
                updateFields.push(`metadata = $${paramCount++}`);
                values.push(data.metadata ? JSON.stringify(data.metadata) : null);
            }
            updateFields.push(`updated_by = $${paramCount++}`);
            values.push(adminId);
            values.push(categoryId);
            const query = `
        UPDATE game_categories 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;
            const result = await client.query(query, values);
            const category = result.rows[0];
            // Get game count for this category
            const gameCountResult = await client.query('SELECT COUNT(*) as count FROM games WHERE category = $1', [category.name]);
            category.game_count = parseInt(gameCountResult.rows[0].count);
            await client.query('COMMIT');
            return category;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Delete category
    async deleteCategory(categoryId, adminId) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if category exists
            const category = await client.query('SELECT id, name FROM game_categories WHERE id = $1', [categoryId]);
            if (category.rows.length === 0) {
                throw new Error(`Category with ID ${categoryId} not found`);
            }
            // Check if category has child categories
            const childCategories = await client.query('SELECT COUNT(*) as count FROM game_categories WHERE parent_category_id = $1', [categoryId]);
            if (parseInt(childCategories.rows[0].count) > 0) {
                throw new Error('Cannot delete category with child categories. Please delete child categories first.');
            }
            // Check if category has games
            const gamesCount = await client.query('SELECT COUNT(*) as count FROM games WHERE category = $1', [category.rows[0].name]);
            if (parseInt(gamesCount.rows[0].count) > 0) {
                throw new Error('Cannot delete category with games. Please reassign or delete games first.');
            }
            // Delete the category
            await client.query('DELETE FROM game_categories WHERE id = $1', [categoryId]);
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Bulk operations on categories
    async bulkCategoryOperation(data, adminId) {
        const client = await postgres_1.default.connect();
        const results = [];
        try {
            await client.query('BEGIN');
            for (const categoryId of data.category_ids) {
                try {
                    switch (data.operation) {
                        case 'activate':
                            await client.query('UPDATE game_categories SET is_active = true, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [adminId, categoryId]);
                            results.push({
                                category_id: categoryId,
                                success: true,
                                message: 'Category activated successfully'
                            });
                            break;
                        case 'deactivate':
                            await client.query('UPDATE game_categories SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [adminId, categoryId]);
                            results.push({
                                category_id: categoryId,
                                success: true,
                                message: 'Category deactivated successfully'
                            });
                            break;
                        case 'delete':
                            // Check if category has games
                            const gamesCount = await client.query('SELECT COUNT(*) as count FROM games g JOIN game_categories c ON g.category = c.name WHERE c.id = $1', [categoryId]);
                            if (parseInt(gamesCount.rows[0].count) > 0) {
                                results.push({
                                    category_id: categoryId,
                                    success: false,
                                    message: 'Cannot delete category with games'
                                });
                                continue;
                            }
                            await client.query('DELETE FROM game_categories WHERE id = $1', [categoryId]);
                            results.push({
                                category_id: categoryId,
                                success: true,
                                message: 'Category deleted successfully'
                            });
                            break;
                    }
                }
                catch (error) {
                    results.push({
                        category_id: categoryId,
                        success: false,
                        message: error.message
                    });
                }
            }
            await client.query('COMMIT');
            const successCount = results.filter(r => r.success).length;
            const totalCount = results.length;
            return {
                success: successCount > 0,
                message: `Processed ${totalCount} categories. ${successCount} successful, ${totalCount - successCount} failed.`,
                results
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Get category statistics
    async getCategoryStats(filters) {
        const conditions = [];
        const values = [];
        let paramCount = 1;
        if (filters.start_date) {
            conditions.push(`c.created_at >= $${paramCount}`);
            values.push(filters.start_date);
            paramCount++;
        }
        if (filters.end_date) {
            conditions.push(`c.created_at <= $${paramCount}`);
            values.push(filters.end_date);
            paramCount++;
        }
        if (!filters.include_inactive) {
            conditions.push(`c.is_active = true`);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Get basic statistics
        const statsQuery = `
      SELECT 
        COUNT(*) as total_categories,
        COUNT(CASE WHEN is_active THEN 1 END) as active_categories,
        COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_categories
      FROM game_categories c
      ${whereClause}
    `;
        const statsResult = await postgres_1.default.query(statsQuery, values);
        const stats = statsResult.rows[0];
        // Get categories with games count
        const categoriesWithGamesQuery = `
      SELECT COUNT(DISTINCT c.id) as categories_with_games
      FROM game_categories c
      JOIN games g ON c.name = g.category
      ${whereClause}
    `;
        const categoriesWithGamesResult = await postgres_1.default.query(categoriesWithGamesQuery, values);
        const categoriesWithGames = parseInt(categoriesWithGamesResult.rows[0].categories_with_games);
        // Get total games in categories
        const totalGamesQuery = `
      SELECT COUNT(*) as total_games
      FROM games g
      JOIN game_categories c ON g.category = c.name
      ${whereClause}
    `;
        const totalGamesResult = await postgres_1.default.query(totalGamesQuery, values);
        const totalGames = parseInt(totalGamesResult.rows[0].total_games);
        // Get top categories by game count
        const topCategoriesQuery = `
      SELECT 
        c.id as category_id,
        c.display_name as category_name,
        COUNT(g.id) as game_count
      FROM game_categories c
      LEFT JOIN games g ON c.name = g.category
      ${whereClause}
      GROUP BY c.id, c.display_name
      ORDER BY game_count DESC
      LIMIT 10
    `;
        const topCategoriesResult = await postgres_1.default.query(topCategoriesQuery, values);
        return {
            total_categories: parseInt(stats.total_categories),
            active_categories: parseInt(stats.active_categories),
            inactive_categories: parseInt(stats.inactive_categories),
            categories_with_games: categoriesWithGames,
            categories_without_games: parseInt(stats.total_categories) - categoriesWithGames,
            total_games_in_categories: totalGames,
            top_categories_by_games: topCategoriesResult.rows
        };
    }
    // Get category hierarchy
    async getCategoryHierarchy() {
        const query = `
      SELECT 
        c.*,
        COALESCE(g.game_count, 0) as game_count
      FROM game_categories c
      LEFT JOIN (
        SELECT category, COUNT(*) as game_count
        FROM games
        GROUP BY category
      ) g ON c.name = g.category
      WHERE c.parent_category_id IS NULL
      ORDER BY c.display_order ASC, c.display_name ASC
    `;
        const result = await postgres_1.default.query(query);
        const categories = result.rows;
        // Get children for each category
        for (const category of categories) {
            const childrenQuery = `
        SELECT 
          c.*,
          COALESCE(g.game_count, 0) as game_count
        FROM game_categories c
        LEFT JOIN (
          SELECT category, COUNT(*) as game_count
          FROM games
          GROUP BY category
        ) g ON c.name = g.category
        WHERE c.parent_category_id = $1
        ORDER BY c.display_order ASC, c.display_name ASC
      `;
            const childrenResult = await postgres_1.default.query(childrenQuery, [category.id]);
            category.children = childrenResult.rows;
        }
        return categories;
    }
    // Migrate existing game categories to new structure
    async migrateExistingCategories(adminId) {
        const client = await postgres_1.default.connect();
        const errors = [];
        let migratedCount = 0;
        try {
            await client.query('BEGIN');
            // Get all unique categories from games table
            const existingCategories = await client.query(`
        SELECT DISTINCT category, COUNT(*) as game_count
        FROM games
        WHERE category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY game_count DESC
      `);
            for (const row of existingCategories.rows) {
                try {
                    // Check if category already exists in game_categories table
                    const existingCategory = await client.query('SELECT id FROM game_categories WHERE name = $1', [row.category]);
                    if (existingCategory.rows.length === 0) {
                        // Create new category
                        await client.query(`
              INSERT INTO game_categories (
                name, display_name, description, display_order, is_active, created_by, updated_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                            row.category,
                            row.category.charAt(0).toUpperCase() + row.category.slice(1), // Capitalize first letter
                            `Migrated category: ${row.category}`,
                            migratedCount + 1,
                            true,
                            adminId,
                            adminId
                        ]);
                        migratedCount++;
                    }
                }
                catch (error) {
                    errors.push(`Failed to migrate category "${row.category}": ${error.message}`);
                }
            }
            await client.query('COMMIT');
            return {
                success: migratedCount > 0,
                message: `Successfully migrated ${migratedCount} categories.`,
                migrated_count: migratedCount,
                errors
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.AdminCategoryService = AdminCategoryService;
