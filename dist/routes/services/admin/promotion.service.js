"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPromotionService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
class AdminPromotionService {
    // Create a new promotion
    static async createPromotion(data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const query = `
        INSERT INTO promotions (
          title, description, type, bonus_percentage, max_bonus_amount,
          min_deposit_amount, wagering_requirement, free_spins_count,
          max_free_spins_value, cashback_percentage, max_cashback_amount,
          start_date, end_date, is_active, is_featured, applicable_games,
          excluded_games, user_groups, max_claims_per_user, terms_conditions,
          image_url, promo_code, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW())
        RETURNING *
      `;
            const values = [
                data.title, data.description, data.type, data.bonus_percentage,
                data.max_bonus_amount, data.min_deposit_amount, data.wagering_requirement,
                data.free_spins_count, data.max_free_spins_value, data.cashback_percentage,
                data.max_cashback_amount, data.start_date, data.end_date, data.is_active,
                data.is_featured, data.applicable_games, data.excluded_games,
                data.user_groups, data.max_claims_per_user, data.terms_conditions,
                data.image_url, data.promo_code
            ];
            const result = await client.query(query, values);
            await client.query('COMMIT');
            return result.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Get promotions with filters
    static async getPromotions(filters) {
        const { page, limit, search, type, is_active, is_featured, start_date, end_date } = filters;
        const offset = (page - 1) * limit;
        let whereConditions = [];
        let values = [];
        let valueIndex = 1;
        if (search) {
            whereConditions.push(`(title ILIKE $${valueIndex} OR description ILIKE $${valueIndex})`);
            values.push(`%${search}%`);
            valueIndex++;
        }
        if (type) {
            whereConditions.push(`type = $${valueIndex}`);
            values.push(type);
            valueIndex++;
        }
        if (is_active !== undefined) {
            whereConditions.push(`is_active = $${valueIndex}`);
            values.push(is_active);
            valueIndex++;
        }
        if (is_featured !== undefined) {
            whereConditions.push(`is_featured = $${valueIndex}`);
            values.push(is_featured);
            valueIndex++;
        }
        if (start_date) {
            whereConditions.push(`start_date >= $${valueIndex}`);
            values.push(start_date);
            valueIndex++;
        }
        if (end_date) {
            whereConditions.push(`end_date <= $${valueIndex}`);
            values.push(end_date);
            valueIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        // Count query
        const countQuery = `
      SELECT COUNT(*) as total
      FROM promotions
      ${whereClause}
    `;
        const countResult = await postgres_1.default.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Data query
        const dataQuery = `
      SELECT 
        p.*,
        COUNT(pc.id) as total_claims,
        COUNT(DISTINCT pc.user_id) as unique_users
      FROM promotions p
      LEFT JOIN promotion_claims pc ON p.id = pc.promotion_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;
        values.push(limit, offset);
        const dataResult = await postgres_1.default.query(dataQuery, values);
        return {
            promotions: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    // Get promotion by ID
    static async getPromotionById(id) {
        const query = `
      SELECT 
        p.*,
        COUNT(pc.id) as total_claims,
        COUNT(DISTINCT pc.user_id) as unique_users,
        SUM(pc.bonus_amount) as total_bonus_paid,
        SUM(pc.free_spins_awarded) as total_free_spins_awarded
      FROM promotions p
      LEFT JOIN promotion_claims pc ON p.id = pc.promotion_id
      WHERE p.id = $1
      GROUP BY p.id
    `;
        const result = await postgres_1.default.query(query, [id]);
        return result.rows[0] || null;
    }
    // Update promotion
    static async updatePromotion(id, data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const updateFields = [];
            const values = [];
            let valueIndex = 1;
            Object.entries(data).forEach(([key, value]) => {
                if (key !== 'id' && value !== undefined) {
                    updateFields.push(`${key} = $${valueIndex}`);
                    values.push(value);
                    valueIndex++;
                }
            });
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            updateFields.push(`updated_at = NOW()`);
            values.push(id);
            const query = `
        UPDATE promotions 
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING *
      `;
            const result = await client.query(query, values);
            await client.query('COMMIT');
            return result.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Delete promotion
    static async deletePromotion(id) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Check if promotion has any claims
            const claimsCheck = await client.query('SELECT COUNT(*) FROM promotion_claims WHERE promotion_id = $1', [id]);
            if (parseInt(claimsCheck.rows[0].count) > 0) {
                throw new Error('Cannot delete promotion with existing claims');
            }
            const result = await client.query('DELETE FROM promotions WHERE id = $1 RETURNING *', [id]);
            await client.query('COMMIT');
            return result.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Toggle promotion status
    static async togglePromotion(id) {
        const query = `
      UPDATE promotions 
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
        const result = await postgres_1.default.query(query, [id]);
        return result.rows[0];
    }
    // Get promotion statistics
    static async getPromotionStats(filters) {
        const { promotion_id, start_date, end_date, group_by } = filters;
        let whereConditions = ['1=1'];
        let values = [];
        let valueIndex = 1;
        if (promotion_id) {
            whereConditions.push(`pc.promotion_id = $${valueIndex}`);
            values.push(promotion_id);
            valueIndex++;
        }
        if (start_date) {
            whereConditions.push(`pc.claimed_at >= $${valueIndex}`);
            values.push(start_date);
            valueIndex++;
        }
        if (end_date) {
            whereConditions.push(`pc.claimed_at <= $${valueIndex}`);
            values.push(end_date);
            valueIndex++;
        }
        let groupByClause = '';
        let dateFormat = '';
        switch (group_by) {
            case 'day':
                groupByClause = 'DATE(pc.claimed_at)';
                dateFormat = 'YYYY-MM-DD';
                break;
            case 'week':
                groupByClause = 'DATE_TRUNC(\'week\', pc.claimed_at)';
                dateFormat = 'YYYY-"W"WW';
                break;
            case 'month':
                groupByClause = 'DATE_TRUNC(\'month\', pc.claimed_at)';
                dateFormat = 'YYYY-MM';
                break;
        }
        const query = `
      SELECT 
        ${groupByClause} as period,
        COUNT(pc.id) as total_claims,
        COUNT(DISTINCT pc.user_id) as unique_users,
        SUM(pc.bonus_amount) as total_bonus_paid,
        SUM(pc.free_spins_awarded) as total_free_spins_awarded,
        AVG(pc.bonus_amount) as avg_bonus_amount
      FROM promotion_claims pc
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `;
        const result = await postgres_1.default.query(query, values);
        return result.rows;
    }
    // Get promotion overview statistics
    static async getPromotionOverviewStats() {
        const query = `
      SELECT 
        COUNT(*) as total_promotions,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_promotions,
        COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_promotions,
        COUNT(CASE WHEN start_date <= NOW() AND end_date >= NOW() THEN 1 END) as current_promotions
      FROM promotions
    `;
        const result = await postgres_1.default.query(query);
        return result.rows[0];
    }
    // Get promotion claims for a specific promotion
    static async getPromotionClaims(promotionId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const countQuery = `
      SELECT COUNT(*) as total
      FROM promotion_claims pc
      JOIN users u ON pc.user_id = u.id
      WHERE pc.promotion_id = $1
    `;
        const countResult = await postgres_1.default.query(countQuery, [promotionId]);
        const total = parseInt(countResult.rows[0].total);
        const dataQuery = `
      SELECT
        pc.*,
        u.username,
        u.email,
        p.title as promotion_name
      FROM promotion_claims pc
      JOIN users u ON pc.user_id = u.id
      JOIN promotions p ON pc.promotion_id = p.id
      WHERE pc.promotion_id = $1
      ORDER BY pc.claimed_at DESC
      LIMIT $2 OFFSET $3
    `;
        const dataResult = await postgres_1.default.query(dataQuery, [promotionId, limit, offset]);
        return {
            claims: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
exports.AdminPromotionService = AdminPromotionService;
