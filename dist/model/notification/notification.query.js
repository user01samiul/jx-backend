"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationQuery = void 0;
exports.NotificationQuery = {
    // Get all notifications for a user with pagination
    GET_USER_NOTIFICATIONS: `
    SELECT 
      id, user_id, title, message, type, category, is_read, is_important,
      action_url, action_text, expires_at, created_at, updated_at, created_by, metadata
    FROM notifications 
    WHERE user_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2 OFFSET $3
  `,
    // Get unread notifications count for a user
    GET_UNREAD_COUNT: `
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE user_id = $1 AND is_read = false
  `,
    // Get notification by ID
    GET_NOTIFICATION_BY_ID: `
    SELECT 
      id, user_id, title, message, type, category, is_read, is_important,
      action_url, action_text, expires_at, created_at, updated_at, created_by, metadata
    FROM notifications 
    WHERE id = $1 AND user_id = $2
  `,
    // Create new notification
    CREATE_NOTIFICATION: `
    INSERT INTO notifications (
      user_id, title, message, type, category, is_important, 
      action_url, action_text, expires_at, created_by, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, user_id, title, message, type, category, is_read, is_important,
              action_url, action_text, expires_at, created_at, updated_at, created_by, metadata
  `,
    // Mark notification as read
    MARK_AS_READ: `
    UPDATE notifications 
    SET is_read = true, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $1 AND user_id = $2
    RETURNING id, is_read, updated_at
  `,
    // Mark all notifications as read for a user
    MARK_ALL_AS_READ: `
    UPDATE notifications 
    SET is_read = true, updated_at = CURRENT_TIMESTAMP 
    WHERE user_id = $1 AND is_read = false
    RETURNING id, is_read, updated_at
  `,
    // Delete notification
    DELETE_NOTIFICATION: `
    DELETE FROM notifications 
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `,
    // Delete all read notifications for a user
    DELETE_READ_NOTIFICATIONS: `
    DELETE FROM notifications 
    WHERE user_id = $1 AND is_read = true
    RETURNING id
  `,
    // Get notifications by type
    GET_NOTIFICATIONS_BY_TYPE: `
    SELECT 
      id, user_id, title, message, type, category, is_read, is_important,
      action_url, action_text, expires_at, created_at, updated_at, created_by, metadata
    FROM notifications 
    WHERE user_id = $1 AND type = $2
    ORDER BY created_at DESC 
    LIMIT $3 OFFSET $4
  `,
    // Get notifications by category
    GET_NOTIFICATIONS_BY_CATEGORY: `
    SELECT 
      id, user_id, title, message, type, category, is_read, is_important,
      action_url, action_text, expires_at, created_at, updated_at, created_by, metadata
    FROM notifications 
    WHERE user_id = $1 AND category = $2
    ORDER BY created_at DESC 
    LIMIT $3 OFFSET $4
  `,
    // Get important notifications
    GET_IMPORTANT_NOTIFICATIONS: `
    SELECT 
      id, user_id, title, message, type, category, is_read, is_important,
      action_url, action_text, expires_at, created_at, updated_at, created_by, metadata
    FROM notifications 
    WHERE user_id = $1 AND is_important = true
    ORDER BY created_at DESC 
    LIMIT $2 OFFSET $3
  `,
    // Get notifications that haven't expired
    GET_ACTIVE_NOTIFICATIONS: `
    SELECT 
      id, user_id, title, message, type, category, is_read, is_important,
      action_url, action_text, expires_at, created_at, updated_at, created_by, metadata
    FROM notifications 
    WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ORDER BY created_at DESC 
    LIMIT $2 OFFSET $3
  `,
    // Update notification
    UPDATE_NOTIFICATION: `
    UPDATE notifications 
    SET 
      title = COALESCE($3, title),
      message = COALESCE($4, message),
      type = COALESCE($5, type),
      category = COALESCE($6, category),
      is_important = COALESCE($7, is_important),
      action_url = $8,
      action_text = $9,
      expires_at = $10,
      metadata = COALESCE($11, metadata),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, title, message, type, category, is_read, is_important,
              action_url, action_text, expires_at, created_at, updated_at, created_by, metadata
  `,
};
