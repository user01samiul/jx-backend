"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../middlewares/authenticate");
const authorize_1 = require("../middlewares/authorize");
const validate_1 = require("../middlewares/validate");
const notification_controller_1 = require("../api/notification/notification.controller");
const notification_schema_1 = require("../api/notification/notification.schema");
const router = (0, express_1.Router)();
// Create a wrapper for the authorize middleware
const adminAuth = (req, res, next) => {
    (0, authorize_1.authorize)(['Admin'])(req, res, next);
};
// =====================================================
// USER NOTIFICATION ROUTES (Authenticated Users)
// =====================================================
/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get user notifications with filters and pagination
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error, promotion]
 *         description: Filter by notification type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [general, game, payment, promotion, system, security, bonus]
 *         description: Filter by notification category
 *       - in: query
 *         name: is_read
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *       - in: query
 *         name: is_important
 *         schema:
 *           type: boolean
 *         description: Filter by importance
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of notifications to skip
 *     responses:
 *       200:
 *         description: Successfully retrieved notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *                         has_more:
 *                           type: boolean
 */
router.get('/', authenticate_1.authenticate, notification_controller_1.getUserNotifications);
/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     unread_count:
 *                       type: integer
 *                       example: 5
 */
router.get('/unread-count', authenticate_1.authenticate, notification_controller_1.getUnreadCount);
/**
 * @openapi
 * /api/notifications/stats:
 *   get:
 *     summary: Get notification statistics
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved notification stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     unread:
 *                       type: integer
 *                     important:
 *                       type: integer
 *                     by_type:
 *                       type: object
 *                     by_category:
 *                       type: object
 */
router.get('/stats', authenticate_1.authenticate, notification_controller_1.getNotificationStats);
/**
 * @openapi
 * /api/notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Successfully retrieved notification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 */
router.get('/:id', authenticate_1.authenticate, (0, validate_1.validate)(notification_schema_1.NotificationIdParamSchema, 'params'), notification_controller_1.getNotificationById);
/**
 * @openapi
 * /api/notifications/{id}/read:
 *   post:
 *     summary: Mark notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Successfully marked notification as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification marked as read"
 */
router.post('/:id/read', authenticate_1.authenticate, (0, validate_1.validate)(notification_schema_1.NotificationIdParamSchema, 'params'), notification_controller_1.markAsRead);
/**
 * @openapi
 * /api/notifications/mark-read:
 *   post:
 *     summary: Mark notifications as read
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notification_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of notification IDs to mark as read
 *               mark_all:
 *                 type: boolean
 *                 default: false
 *                 description: Mark all notifications as read
 *     responses:
 *       200:
 *         description: Successfully marked notifications as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     marked_count:
 *                       type: integer
 *                 message:
 *                   type: string
 *                   example: "5 notification(s) marked as read"
 */
router.post('/mark-read', authenticate_1.authenticate, (0, validate_1.validate)(notification_schema_1.MarkAsReadSchema), notification_controller_1.markAllAsRead);
/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Successfully deleted notification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Notification deleted successfully"
 */
router.delete('/:id', authenticate_1.authenticate, (0, validate_1.validate)(notification_schema_1.NotificationIdParamSchema, 'params'), notification_controller_1.deleteNotification);
/**
 * @openapi
 * /api/notifications/delete-read:
 *   delete:
 *     summary: Delete all read notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully deleted read notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted_count:
 *                       type: integer
 *                 message:
 *                   type: string
 *                   example: "10 read notification(s) deleted"
 */
router.delete('/delete-read', authenticate_1.authenticate, notification_controller_1.deleteReadNotifications);
// =====================================================
// ADMIN NOTIFICATION ROUTES (Admin Only)
// =====================================================
/**
 * @openapi
 * /api/admin/notifications:
 *   post:
 *     summary: Create a new notification (Admin only)
 *     tags:
 *       - Admin Notifications
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotificationInput'
 *     responses:
 *       201:
 *         description: Successfully created notification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 */
router.post('/admin', authenticate_1.authenticate, adminAuth, (0, validate_1.validate)(notification_schema_1.CreateNotificationSchema), notification_controller_1.createNotification);
/**
 * @openapi
 * /api/admin/notifications/bulk:
 *   post:
 *     summary: Bulk create notifications for multiple users (Admin only)
 *     tags:
 *       - Admin Notifications
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkCreateNotificationInput'
 *     responses:
 *       201:
 *         description: Successfully created notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     created_count:
 *                       type: integer
 */
router.post('/admin/bulk', authenticate_1.authenticate, adminAuth, (0, validate_1.validate)(notification_schema_1.BulkCreateNotificationSchema), notification_controller_1.bulkCreateNotifications);
/**
 * @openapi
 * /api/admin/notifications/{id}:
 *   put:
 *     summary: Update a notification (Admin only)
 *     tags:
 *       - Admin Notifications
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNotificationInput'
 *     responses:
 *       200:
 *         description: Successfully updated notification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 */
router.put('/admin/:id', authenticate_1.authenticate, adminAuth, (0, validate_1.validate)(notification_schema_1.NotificationIdParamSchema, 'params'), (0, validate_1.validate)(notification_schema_1.UpdateNotificationSchema), notification_controller_1.updateNotification);
// =====================================================
// HELPER NOTIFICATION ROUTES (Admin Only)
// =====================================================
/**
 * @openapi
 * /api/admin/notifications/system:
 *   post:
 *     summary: Create system notification (Admin only)
 *     tags:
 *       - Admin Notifications
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - message
 *             properties:
 *               user_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error]
 *                 default: info
 *               is_important:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Successfully created system notification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 */
router.post('/admin/system', authenticate_1.authenticate, adminAuth, notification_controller_1.createSystemNotification);
/**
 * @openapi
 * /api/admin/notifications/game:
 *   post:
 *     summary: Create game notification (Admin only)
 *     tags:
 *       - Admin Notifications
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - message
 *             properties:
 *               user_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               game_id:
 *                 type: integer
 *               action_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successfully created game notification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 */
router.post('/admin/game', authenticate_1.authenticate, adminAuth, notification_controller_1.createGameNotification);
/**
 * @openapi
 * /api/admin/notifications/promotion:
 *   post:
 *     summary: Create promotion notification (Admin only)
 *     tags:
 *       - Admin Notifications
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - message
 *             properties:
 *               user_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               promotion_id:
 *                 type: integer
 *               action_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successfully created promotion notification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 */
router.post('/admin/promotion', authenticate_1.authenticate, adminAuth, notification_controller_1.createPromotionNotification);
exports.default = router;
