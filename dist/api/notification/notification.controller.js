"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPromotionNotification = exports.createGameNotification = exports.createSystemNotification = exports.bulkCreateNotifications = exports.getNotificationStats = exports.updateNotification = exports.deleteReadNotifications = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.createNotification = exports.getNotificationById = exports.getUnreadCount = exports.getUserNotifications = void 0;
const notification_service_1 = require("../../services/notification/notification.service");
const apiError_1 = require("../../utils/apiError");
const messages_1 = require("../../constants/messages");
/**
 * Get user notifications with filters and pagination
 */
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const filters = req.query;
        const result = await notification_service_1.NotificationService.getUserNotifications(userId, filters);
        res.json({
            success: true,
            data: {
                notifications: result.notifications,
                pagination: {
                    total: result.total,
                    limit: filters.limit || 20,
                    offset: filters.offset || 0,
                    has_more: (filters.offset || 0) + (filters.limit || 20) < result.total
                }
            }
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.getUserNotifications = getUserNotifications;
/**
 * Get unread notifications count
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const count = await notification_service_1.NotificationService.getUnreadCount(userId);
        res.json({
            success: true,
            data: {
                unread_count: count
            }
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.getUnreadCount = getUnreadCount;
/**
 * Get notification by ID
 */
const getNotificationById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const notification = await notification_service_1.NotificationService.getNotificationById(id, userId);
        if (!notification) {
            throw new apiError_1.ApiError('Notification not found', 404);
        }
        res.json({
            success: true,
            data: notification
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.getNotificationById = getNotificationById;
/**
 * Create a new notification (for admin use)
 */
const createNotification = async (req, res) => {
    try {
        const input = req.body;
        const createdBy = req.user?.userId;
        const notification = await notification_service_1.NotificationService.createNotification({
            ...input,
            created_by: createdBy
        });
        res.status(201).json({
            success: true,
            data: notification
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.createNotification = createNotification;
/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const success = await notification_service_1.NotificationService.markAsRead(id, userId);
        if (!success) {
            throw new apiError_1.ApiError('Notification not found', 404);
        }
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.markAsRead = markAsRead;
/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const input = req.body;
        let count = 0;
        if (input.mark_all || !input.notification_ids) {
            // Mark all as read
            count = await notification_service_1.NotificationService.markAllAsRead(userId);
        }
        else if (input.notification_ids && input.notification_ids.length > 0) {
            // Mark specific notifications as read
            for (const notificationId of input.notification_ids) {
                const success = await notification_service_1.NotificationService.markAsRead(notificationId, userId);
                if (success)
                    count++;
            }
        }
        res.json({
            success: true,
            data: {
                marked_count: count
            },
            message: `${count} notification(s) marked as read`
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.markAllAsRead = markAllAsRead;
/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const success = await notification_service_1.NotificationService.deleteNotification(id, userId);
        if (!success) {
            throw new apiError_1.ApiError('Notification not found', 404);
        }
        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.deleteNotification = deleteNotification;
/**
 * Delete all read notifications
 */
const deleteReadNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const count = await notification_service_1.NotificationService.deleteReadNotifications(userId);
        res.json({
            success: true,
            data: {
                deleted_count: count
            },
            message: `${count} read notification(s) deleted`
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.deleteReadNotifications = deleteReadNotifications;
/**
 * Update a notification
 */
const updateNotification = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const input = req.body;
        const notification = await notification_service_1.NotificationService.updateNotification(id, userId, input);
        if (!notification) {
            throw new apiError_1.ApiError('Notification not found', 404);
        }
        res.json({
            success: true,
            data: notification
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.updateNotification = updateNotification;
/**
 * Get notification statistics
 */
const getNotificationStats = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const stats = await notification_service_1.NotificationService.getNotificationStats(userId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.getNotificationStats = getNotificationStats;
/**
 * Bulk create notifications (for admin use)
 */
const bulkCreateNotifications = async (req, res) => {
    try {
        const input = req.body;
        const createdBy = req.user?.userId;
        const notifications = await notification_service_1.NotificationService.bulkCreateNotifications({
            ...input,
            created_by: createdBy
        });
        res.status(201).json({
            success: true,
            data: {
                notifications,
                created_count: notifications.length
            }
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.bulkCreateNotifications = bulkCreateNotifications;
/**
 * Create system notification (helper endpoint)
 */
const createSystemNotification = async (req, res) => {
    try {
        const { user_id, title, message, type = 'info', is_important = false } = req.body;
        if (!user_id || !title || !message) {
            throw new apiError_1.ApiError('user_id, title, and message are required', 400);
        }
        const notification = await notification_service_1.NotificationService.createSystemNotification(user_id, title, message, type, is_important);
        res.status(201).json({
            success: true,
            data: notification
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.createSystemNotification = createSystemNotification;
/**
 * Create game notification (helper endpoint)
 */
const createGameNotification = async (req, res) => {
    try {
        const { user_id, title, message, game_id, action_url } = req.body;
        if (!user_id || !title || !message) {
            throw new apiError_1.ApiError('user_id, title, and message are required', 400);
        }
        const notification = await notification_service_1.NotificationService.createGameNotification(user_id, title, message, game_id, action_url);
        res.status(201).json({
            success: true,
            data: notification
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.createGameNotification = createGameNotification;
/**
 * Create promotion notification (helper endpoint)
 */
const createPromotionNotification = async (req, res) => {
    try {
        const { user_id, title, message, promotion_id, action_url } = req.body;
        if (!user_id || !title || !message) {
            throw new apiError_1.ApiError('user_id, title, and message are required', 400);
        }
        const notification = await notification_service_1.NotificationService.createPromotionNotification(user_id, title, message, promotion_id, action_url);
        res.status(201).json({
            success: true,
            data: notification
        });
    }
    catch (error) {
        if (error instanceof apiError_1.ApiError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: messages_1.ErrorMessages.INTERNAL_SERVER_ERROR
            });
        }
    }
};
exports.createPromotionNotification = createPromotionNotification;
