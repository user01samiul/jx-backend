"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSupportService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
class AdminSupportService {
    // Get support tickets with filters
    static async getSupportTickets(filters) {
        const { page, limit, search, status, priority, category, user_id, assigned_to, start_date, end_date, unassigned_only, urgent_only } = filters;
        const offset = (page - 1) * limit;
        let whereConditions = [];
        let values = [];
        let valueIndex = 1;
        if (search) {
            whereConditions.push(`(st.subject ILIKE $${valueIndex} OR st.description ILIKE $${valueIndex} OR u.username ILIKE $${valueIndex})`);
            values.push(`%${search}%`);
            valueIndex++;
        }
        if (status) {
            whereConditions.push(`st.status = $${valueIndex}`);
            values.push(status);
            valueIndex++;
        }
        if (priority) {
            whereConditions.push(`st.priority = $${valueIndex}`);
            values.push(priority);
            valueIndex++;
        }
        if (category) {
            whereConditions.push(`st.category = $${valueIndex}`);
            values.push(category);
            valueIndex++;
        }
        if (user_id) {
            whereConditions.push(`st.user_id = $${valueIndex}`);
            values.push(user_id);
            valueIndex++;
        }
        if (assigned_to) {
            whereConditions.push(`st.assigned_to = $${valueIndex}`);
            values.push(assigned_to);
            valueIndex++;
        }
        if (start_date) {
            whereConditions.push(`st.created_at >= $${valueIndex}`);
            values.push(start_date);
            valueIndex++;
        }
        if (end_date) {
            whereConditions.push(`st.created_at <= $${valueIndex}`);
            values.push(end_date);
            valueIndex++;
        }
        if (unassigned_only) {
            whereConditions.push(`st.assigned_to IS NULL`);
        }
        if (urgent_only) {
            whereConditions.push(`st.priority = 'urgent'`);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        // Count query
        const countQuery = `
      SELECT COUNT(*) as total
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      ${whereClause}
    `;
        const countResult = await postgres_1.default.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Data query
        const dataQuery = `
      SELECT 
        st.*,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        a.username as assigned_admin_username,
        COUNT(str.id) as reply_count,
        MAX(str.created_at) as last_reply_at
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN users a ON st.assigned_to = a.id
      LEFT JOIN support_ticket_replies str ON st.id = str.ticket_id
      ${whereClause}
      GROUP BY st.id, u.id, a.id
      ORDER BY 
        CASE 
          WHEN st.priority = 'urgent' THEN 1
          WHEN st.priority = 'high' THEN 2
          WHEN st.priority = 'medium' THEN 3
          WHEN st.priority = 'low' THEN 4
        END,
        st.created_at DESC
      LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
    `;
        values.push(limit, offset);
        const dataResult = await postgres_1.default.query(dataQuery, values);
        return {
            tickets: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    // Get support ticket by ID
    static async getSupportTicketById(id) {
        const query = `
      SELECT 
        st.*,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        a.username as assigned_admin_username
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN users a ON st.assigned_to = a.id
      WHERE st.id = $1
    `;
        const result = await postgres_1.default.query(query, [id]);
        return result.rows[0] || null;
    }
    // Update support ticket
    static async updateSupportTicket(id, data) {
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
        UPDATE support_tickets 
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
    // Add reply to ticket
    static async addTicketReply(data) {
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            const replyQuery = `
        INSERT INTO support_ticket_replies (
          ticket_id, message, is_internal, attachments, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
            const replyValues = [
                data.ticket_id,
                data.message,
                data.is_internal,
                data.attachments,
                data.is_internal ? 'admin' : 'user'
            ];
            const replyResult = await client.query(replyQuery, replyValues);
            // Update ticket status
            const newStatus = data.is_internal ? 'waiting_for_user' : 'waiting_for_admin';
            await client.query(`UPDATE support_tickets 
         SET status = $1, updated_at = NOW()
         WHERE id = $2`, [newStatus, data.ticket_id]);
            await client.query('COMMIT');
            return replyResult.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Get support categories
    static async getSupportCategories() {
        const query = `
      SELECT 
        sc.*,
        COUNT(st.id) as ticket_count,
        COUNT(CASE WHEN st.status IN ('open', 'in_progress') THEN 1 END) as active_tickets
      FROM support_categories sc
      LEFT JOIN support_tickets st ON sc.slug = st.category
      WHERE sc.is_active = true
      GROUP BY sc.id
      ORDER BY sc.sort_order ASC, sc.name ASC
    `;
        const result = await postgres_1.default.query(query);
        return result.rows;
    }
    // Create support category
    static async createSupportCategory(data) {
        const query = `
      INSERT INTO support_categories (
        name, description, slug, is_active, sort_order, 
        auto_assign_to, response_template, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
        const values = [
            data.name,
            data.description,
            data.slug,
            data.is_active,
            data.sort_order,
            data.auto_assign_to,
            data.response_template
        ];
        const result = await postgres_1.default.query(query, values);
        return result.rows[0];
    }
    // Create notification
    static async createNotification(data) {
        const query = `
      INSERT INTO admin_notifications (
        title, message, type, target_users, user_ids, user_group,
        scheduled_at, expires_at, is_push, is_email, is_in_app,
        metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `;
        const values = [
            data.title,
            data.message,
            data.type,
            data.target_users,
            data.user_ids,
            data.user_group,
            data.scheduled_at,
            data.expires_at,
            data.is_push,
            data.is_email,
            data.is_in_app,
            data.metadata
        ];
        const result = await postgres_1.default.query(query, values);
        return result.rows[0];
    }
    // Get support statistics
    static async getSupportStatistics(filters) {
        const { start_date, end_date, group_by } = filters;
        let groupByClause = '';
        switch (group_by) {
            case 'day':
                groupByClause = 'DATE(st.created_at)';
                break;
            case 'week':
                groupByClause = 'DATE_TRUNC(\'week\', st.created_at)';
                break;
            case 'month':
                groupByClause = 'DATE_TRUNC(\'month\', st.created_at)';
                break;
            case 'category':
                groupByClause = 'st.category';
                break;
            case 'priority':
                groupByClause = 'st.priority';
                break;
            case 'status':
                groupByClause = 'st.status';
                break;
        }
        const query = `
      SELECT 
        ${groupByClause} as period,
        COUNT(st.id) as total_tickets,
        COUNT(CASE WHEN st.status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN st.status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN st.status = 'resolved' THEN 1 END) as resolved_tickets,
        COUNT(CASE WHEN st.priority = 'urgent' THEN 1 END) as urgent_tickets,
        AVG(EXTRACT(EPOCH FROM (st.updated_at - st.created_at))/3600) as avg_resolution_hours
      FROM support_tickets st
      WHERE st.created_at >= $1 AND st.created_at <= $2
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `;
        const result = await postgres_1.default.query(query, [start_date, end_date]);
        return result.rows;
    }
}
exports.AdminSupportService = AdminSupportService;
