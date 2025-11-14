import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate as validateRequest } from '../middlewares/validate';
import {
  getUserNotifications,
  getUnreadCount,
  getNotificationById,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  updateNotification,
  getNotificationStats,
  bulkCreateNotifications,
  createSystemNotification,
  createGameNotification,
  createPromotionNotification
} from '../api/notification/notification.controller';
import {
  NotificationFiltersSchema,
  CreateNotificationSchema,
  UpdateNotificationSchema,
  BulkCreateNotificationSchema,
  NotificationIdParamSchema,
  MarkAsReadSchema
} from '../api/notification/notification.schema';

const router = Router();

// Create a wrapper for the authorize middleware
const adminAuth = (req: any, res: any, next: any) => {
  authorize(['Admin'])(req, res, next);
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
router.get('/', authenticate, getUserNotifications);

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
router.get('/unread-count', authenticate, getUnreadCount);

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
router.get('/stats', authenticate, getNotificationStats);

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
router.get('/:id', authenticate, validateRequest(NotificationIdParamSchema, 'params'), getNotificationById);

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
router.post('/:id/read', authenticate, validateRequest(NotificationIdParamSchema, 'params'), markAsRead);

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
router.post('/mark-read', authenticate, validateRequest(MarkAsReadSchema), markAllAsRead);

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
router.delete('/:id', authenticate, validateRequest(NotificationIdParamSchema, 'params'), deleteNotification);

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
router.delete('/delete-read', authenticate, deleteReadNotifications);

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
router.post('/admin', authenticate, adminAuth, validateRequest(CreateNotificationSchema), createNotification);

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
router.post('/admin/bulk', authenticate, adminAuth, validateRequest(BulkCreateNotificationSchema), bulkCreateNotifications);

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
router.put('/admin/:id', authenticate, adminAuth, validateRequest(NotificationIdParamSchema, 'params'), validateRequest(UpdateNotificationSchema), updateNotification);

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
router.post('/admin/system', authenticate, adminAuth, createSystemNotification);

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
router.post('/admin/game', authenticate, adminAuth, createGameNotification);

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
router.post('/admin/promotion', authenticate, adminAuth, createPromotionNotification);

export default router; 