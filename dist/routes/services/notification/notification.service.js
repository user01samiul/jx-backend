"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const notification_query_1 = require("../../model/notification/notification.query");
const apiError_1 = require("../../utils/apiError");
const messages_1 = require("../../constants/messages");
class NotificationService {
    /**
     * Get notifications for a user with pagination and filters
     */
    static async getUserNotifications(userId, filters = {}) {
        try {
            console.log('[NOTIFICATION] getUserNotifications called - userId:', userId, 'filters:', JSON.stringify(filters));
            const { type, category, is_read, is_important, limit = 20, offset = 0 } = filters;
            let query = notification_query_1.NotificationQuery.GET_USER_NOTIFICATIONS;
            let params = [userId, limit, offset];
            // Build WHERE clause based on filters
            const whereConditions = ['user_id = $1'];
            let paramIndex = 4;
            if (type !== undefined) {
                whereConditions.push(`type = $${paramIndex++}`);
                params.push(type);
            }
            if (category !== undefined) {
                whereConditions.push(`category = $${paramIndex++}`);
                params.push(category);
            }
            if (is_read !== undefined) {
                whereConditions.push(`is_read = $${paramIndex++}`);
                params.push(is_read);
            }
            if (is_important !== undefined) {
                whereConditions.push(`is_important = $${paramIndex++}`);
                params.push(is_important);
            }
            // Add expiration filter to only show active notifications
            whereConditions.push(`(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`);
            if (whereConditions.length > 1) {
                query = query.replace('WHERE user_id = $1', `WHERE ${whereConditions.join(' AND ')}`);
            }
            console.log('[NOTIFICATION] Final query:', query);
            console.log('[NOTIFICATION] Query params:', JSON.stringify(params));
            const result = await postgres_1.default.query(query, params);
            console.log('[NOTIFICATION] Query result - rows:', result.rows.length, 'data:', JSON.stringify(result.rows));
            // Get total count for pagination
            const countQuery = `
        SELECT COUNT(*) as total
        FROM notifications
        WHERE ${whereConditions.join(' AND ')}
      `;
            const countResult = await postgres_1.default.query(countQuery, params.slice(0, -2)); // Remove limit and offset
            console.log('[NOTIFICATION] Total count:', countResult.rows[0].total);
            return {
                notifications: result.rows,
                total: parseInt(countResult.rows[0].total)
            };
        }
        catch (error) {
            console.error('[NOTIFICATION] Error in getUserNotifications:', error);
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Get unread notifications count for a user
     */
    static async getUnreadCount(userId) {
        try {
            const result = await postgres_1.default.query(notification_query_1.NotificationQuery.GET_UNREAD_COUNT, [userId]);
            return parseInt(result.rows[0].count);
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Get notification by ID
     */
    static async getNotificationById(notificationId, userId) {
        try {
            const result = await postgres_1.default.query(notification_query_1.NotificationQuery.GET_NOTIFICATION_BY_ID, [notificationId, userId]);
            return result.rows[0] || null;
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Create a new notification
     */
    static async createNotification(input) {
        try {
            const { user_id, title, message, type = 'info', category = 'general', is_important = false, action_url, action_text, expires_at, created_by, metadata } = input;
            const result = await postgres_1.default.query(notification_query_1.NotificationQuery.CREATE_NOTIFICATION, [
                user_id,
                title,
                message,
                type,
                category,
                is_important,
                action_url,
                action_text,
                expires_at,
                created_by,
                metadata ? JSON.stringify(metadata) : null
            ]);
            return result.rows[0];
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId, userId) {
        try {
            const result = await postgres_1.default.query(notification_query_1.NotificationQuery.MARK_AS_READ, [notificationId, userId]);
            return result.rowCount > 0;
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(userId) {
        try {
            const result = await postgres_1.default.query(notification_query_1.NotificationQuery.MARK_ALL_AS_READ, [userId]);
            return result.rowCount;
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Delete a notification
     */
    static async deleteNotification(notificationId, userId) {
        try {
            const result = await postgres_1.default.query(notification_query_1.NotificationQuery.DELETE_NOTIFICATION, [notificationId, userId]);
            return result.rowCount > 0;
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Delete all read notifications for a user
     */
    static async deleteReadNotifications(userId) {
        try {
            const result = await postgres_1.default.query(notification_query_1.NotificationQuery.DELETE_READ_NOTIFICATIONS, [userId]);
            return result.rowCount;
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Update a notification
     */
    static async updateNotification(notificationId, userId, input) {
        try {
            const { title, message, type, category, is_important, action_url, action_text, expires_at, metadata } = input;
            const result = await postgres_1.default.query(notification_query_1.NotificationQuery.UPDATE_NOTIFICATION, [
                notificationId,
                userId,
                title,
                message,
                type,
                category,
                is_important,
                action_url,
                action_text,
                expires_at,
                metadata ? JSON.stringify(metadata) : null
            ]);
            return result.rows[0] || null;
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Get notification statistics for a user
     */
    static async getNotificationStats(userId) {
        try {
            // Get total count
            const totalResult = await postgres_1.default.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1', [userId]);
            // Get unread count
            const unreadResult = await postgres_1.default.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', [userId]);
            // Get important count
            const importantResult = await postgres_1.default.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_important = true', [userId]);
            // Get count by type
            const typeResult = await postgres_1.default.query('SELECT type, COUNT(*) as count FROM notifications WHERE user_id = $1 GROUP BY type', [userId]);
            // Get count by category
            const categoryResult = await postgres_1.default.query('SELECT category, COUNT(*) as count FROM notifications WHERE user_id = $1 GROUP BY category', [userId]);
            const byType = {};
            const byCategory = {};
            typeResult.rows.forEach((row) => {
                byType[row.type] = parseInt(row.count);
            });
            categoryResult.rows.forEach((row) => {
                byCategory[row.category] = parseInt(row.count);
            });
            return {
                total: parseInt(totalResult.rows[0].count),
                unread: parseInt(unreadResult.rows[0].count),
                important: parseInt(importantResult.rows[0].count),
                by_type: byType,
                by_category: byCategory
            };
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Bulk create notifications for multiple users
     */
    static async bulkCreateNotifications(input) {
        try {
            const { user_ids, title, message, type = 'info', category = 'general', is_important = false, action_url, action_text, expires_at, created_by, metadata } = input;
            // Create notifications one by one for simplicity
            // In production, you might want to use a transaction for better performance
            const notifications = [];
            for (const userId of user_ids) {
                const notification = await this.createNotification({
                    user_id: userId,
                    title,
                    message,
                    type,
                    category,
                    is_important,
                    action_url,
                    action_text,
                    expires_at,
                    created_by,
                    metadata
                });
                notifications.push(notification);
            }
            return notifications;
        }
        catch (error) {
            throw new apiError_1.ApiError(messages_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    /**
     * Create system notification (helper method)
     */
    static async createSystemNotification(userId, title, message, type = 'info', isImportant = false) {
        return this.createNotification({
            user_id: userId,
            title,
            message,
            type,
            category: 'system',
            is_important: isImportant,
            created_by: 1 // System user
        });
    }
    /**
     * Create game notification (helper method)
     */
    static async createGameNotification(userId, title, message, gameId, actionUrl) {
        return this.createNotification({
            user_id: userId,
            title,
            message,
            type: 'info',
            category: 'game',
            action_url: actionUrl,
            metadata: gameId ? { game_id: gameId } : undefined
        });
    }
    /**
     * Create promotion notification (helper method)
     */
    static async createPromotionNotification(userId, title, message, promotionId, actionUrl) {
        return this.createNotification({
            user_id: userId,
            title,
            message,
            type: 'promotion',
            category: 'promotion',
            action_url: actionUrl,
            metadata: promotionId ? { promotion_id: promotionId } : undefined
        });
    }
}
exports.NotificationService = NotificationService;
