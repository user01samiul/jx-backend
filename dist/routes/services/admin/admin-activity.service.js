"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldAdminActivities = exports.getAdminActivityStats = exports.getAdminActivityById = exports.getAdminActivities = exports.logAdminActivity = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
/**
 * Log admin activity for audit purposes
 */
const logAdminActivity = async (adminId, action, details, ipAddress, userAgent) => {
    try {
        await postgres_1.default.query(`INSERT INTO admin_activities (
        admin_id, 
        action, 
        details, 
        ip_address, 
        user_agent, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`, [
            adminId,
            action,
            JSON.stringify(details),
            ipAddress || null,
            userAgent || null
        ]);
    }
    catch (error) {
        console.error('Error logging admin activity:', error);
        // Don't throw error to avoid breaking the main operation
    }
};
exports.logAdminActivity = logAdminActivity;
/**
 * Get admin activities with filtering and pagination
 */
const getAdminActivities = async (filters = {}) => {
    try {
        const { admin_id, action, start_date, end_date, limit = 50, offset = 0 } = filters;
        let query = `
      SELECT 
        aa.id,
        aa.admin_id,
        u.username as admin_username,
        u.email as admin_email,
        aa.action,
        aa.details,
        aa.ip_address,
        aa.user_agent,
        aa.created_at
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        if (admin_id) {
            query += ` AND aa.admin_id = $${paramIndex}`;
            params.push(admin_id);
            paramIndex++;
        }
        if (action) {
            query += ` AND aa.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }
        if (start_date) {
            query += ` AND aa.created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }
        if (end_date) {
            query += ` AND aa.created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }
        // Add ordering and pagination
        query += ` ORDER BY aa.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        const result = await postgres_1.default.query(query, params);
        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) as total FROM admin_activities aa WHERE 1=1`;
        const countParams = [];
        let countParamIndex = 1;
        if (admin_id) {
            countQuery += ` AND aa.admin_id = $${countParamIndex}`;
            countParams.push(admin_id);
            countParamIndex++;
        }
        if (action) {
            countQuery += ` AND aa.action = $${countParamIndex}`;
            countParams.push(action);
            countParamIndex++;
        }
        if (start_date) {
            countQuery += ` AND aa.created_at >= $${countParamIndex}`;
            countParams.push(start_date);
            countParamIndex++;
        }
        if (end_date) {
            countQuery += ` AND aa.created_at <= $${countParamIndex}`;
            countParams.push(end_date);
            countParamIndex++;
        }
        const countResult = await postgres_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        return {
            activities: result.rows,
            total,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        };
    }
    catch (error) {
        console.error('Error fetching admin activities:', error);
        throw error;
    }
};
exports.getAdminActivities = getAdminActivities;
/**
 * Get admin activity by ID
 */
const getAdminActivityById = async (activityId) => {
    try {
        const result = await postgres_1.default.query(`SELECT 
        aa.id,
        aa.admin_id,
        u.username as admin_username,
        u.email as admin_email,
        aa.action,
        aa.details,
        aa.ip_address,
        aa.user_agent,
        aa.created_at
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      WHERE aa.id = $1`, [activityId]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    catch (error) {
        console.error('Error fetching admin activity:', error);
        throw error;
    }
};
exports.getAdminActivityById = getAdminActivityById;
/**
 * Get admin activity statistics
 */
const getAdminActivityStats = async (filters = {}) => {
    try {
        const { admin_id, start_date, end_date } = filters;
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (admin_id) {
            whereClause += ` AND admin_id = $${paramIndex}`;
            params.push(admin_id);
            paramIndex++;
        }
        if (start_date) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }
        if (end_date) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }
        // Get total activities
        const totalResult = await postgres_1.default.query(`SELECT COUNT(*) as total FROM admin_activities ${whereClause}`, params);
        // Get unique admins
        const uniqueAdminsResult = await postgres_1.default.query(`SELECT COUNT(DISTINCT admin_id) as total FROM admin_activities ${whereClause}`, params);
        // Get actions breakdown
        const actionsResult = await postgres_1.default.query(`SELECT 
        action,
        COUNT(*) as count
      FROM admin_activities 
      ${whereClause}
      GROUP BY action 
      ORDER BY count DESC`, params);
        // Get recent activities
        const recentResult = await postgres_1.default.query(`SELECT 
        aa.id,
        aa.admin_id,
        u.username as admin_username,
        aa.action,
        aa.created_at
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      ${whereClause}
      ORDER BY aa.created_at DESC 
      LIMIT 10`, params);
        return {
            total_activities: parseInt(totalResult.rows[0].total),
            unique_admins: parseInt(uniqueAdminsResult.rows[0].total),
            actions_breakdown: actionsResult.rows,
            recent_activities: recentResult.rows
        };
    }
    catch (error) {
        console.error('Error fetching admin activity stats:', error);
        throw error;
    }
};
exports.getAdminActivityStats = getAdminActivityStats;
/**
 * Clean up old admin activities (older than specified days)
 */
const cleanupOldAdminActivities = async (daysOld = 90) => {
    try {
        const result = await postgres_1.default.query(`DELETE FROM admin_activities 
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'`);
        return result.rowCount || 0;
    }
    catch (error) {
        console.error('Error cleaning up old admin activities:', error);
        throw error;
    }
};
exports.cleanupOldAdminActivities = cleanupOldAdminActivities;
