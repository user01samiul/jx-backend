import { Request, Response } from 'express';
import { NotificationService } from '../../services/notification/notification.service';
import {
  NotificationFiltersInput,
  NotificationIdParam,
  MarkAsReadInput
} from './notification.schema';
import {
  CreateNotificationInput as CreateInputType,
  UpdateNotificationInput as UpdateInputType,
  BulkCreateNotificationInput as BulkInputType
} from '../../types/notification.types';
import { ApiError } from '../../utils/apiError';
import { ErrorMessages } from '../../constants/messages';

/**
 * Get user notifications with filters and pagination
 */
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const filters: NotificationFiltersInput = req.query as any;

    const result = await NotificationService.getUserNotifications(userId, filters);

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
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const count = await NotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        unread_count: count
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Get notification by ID
 */
export const getNotificationById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const { id } = req.params as NotificationIdParam;

    const notification = await NotificationService.getNotificationById(id, userId);

    if (!notification) {
      throw new ApiError('Notification not found', 404);
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Create a new notification (for admin use)
 */
export const createNotification = async (req: Request, res: Response) => {
  try {
    const input = req.body;
    const createdBy = req.user?.userId;

    const notification = await NotificationService.createNotification({
      ...input,
      created_by: createdBy
    } as CreateInputType);

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const { id } = req.params as NotificationIdParam;

    const success = await NotificationService.markAsRead(id, userId);

    if (!success) {
      throw new ApiError('Notification not found', 404);
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const input: MarkAsReadInput = req.body;

    let count = 0;

    if (input.mark_all || !input.notification_ids) {
      // Mark all as read
      count = await NotificationService.markAllAsRead(userId);
    } else if (input.notification_ids && input.notification_ids.length > 0) {
      // Mark specific notifications as read
      for (const notificationId of input.notification_ids) {
        const success = await NotificationService.markAsRead(notificationId, userId);
        if (success) count++;
      }
    }

    res.json({
      success: true,
      data: {
        marked_count: count
      },
      message: `${count} notification(s) marked as read`
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const { id } = req.params as NotificationIdParam;

    const success = await NotificationService.deleteNotification(id, userId);

    if (!success) {
      throw new ApiError('Notification not found', 404);
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Delete all read notifications
 */
export const deleteReadNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const count = await NotificationService.deleteReadNotifications(userId);

    res.json({
      success: true,
      data: {
        deleted_count: count
      },
      message: `${count} read notification(s) deleted`
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Update a notification
 */
export const updateNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const { id } = req.params as NotificationIdParam;
    const input = req.body as UpdateInputType;

    const notification = await NotificationService.updateNotification(id, userId!, input);

    if (!notification) {
      throw new ApiError('Notification not found', 404);
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const stats = await NotificationService.getNotificationStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Bulk create notifications (for admin use)
 */
export const bulkCreateNotifications = async (req: Request, res: Response) => {
  try {
    const input = req.body;
    const createdBy = req.user?.userId;

    const notifications = await NotificationService.bulkCreateNotifications({
      ...input,
      created_by: createdBy
    } as BulkInputType);

    res.status(201).json({
      success: true,
      data: {
        notifications,
        created_count: notifications.length
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Create system notification (helper endpoint)
 */
export const createSystemNotification = async (req: Request, res: Response) => {
  try {
    const { user_id, title, message, type = 'info', is_important = false } = req.body;

    if (!user_id || !title || !message) {
      throw new ApiError('user_id, title, and message are required', 400);
    }

    const notification = await NotificationService.createSystemNotification(
      user_id,
      title,
      message,
      type,
      is_important
    );

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Create game notification (helper endpoint)
 */
export const createGameNotification = async (req: Request, res: Response) => {
  try {
    const { user_id, title, message, game_id, action_url } = req.body;

    if (!user_id || !title || !message) {
      throw new ApiError('user_id, title, and message are required', 400);
    }

    const notification = await NotificationService.createGameNotification(
      user_id,
      title,
      message,
      game_id,
      action_url
    );

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * Create promotion notification (helper endpoint)
 */
export const createPromotionNotification = async (req: Request, res: Response) => {
  try {
    const { user_id, title, message, promotion_id, action_url } = req.body;

    if (!user_id || !title || !message) {
      throw new ApiError('user_id, title, and message are required', 400);
    }

    const notification = await NotificationService.createPromotionNotification(
      user_id,
      title,
      message,
      promotion_id,
      action_url
    );

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: ErrorMessages.INTERNAL_SERVER_ERROR
      });
    }
  }
}; 