// src/services/user/messages.service.ts
import pool from "../../db/postgres";

interface MessageFilters {
  type?: string;
  read?: boolean;
  page: number;
  limit: number;
}

/**
 * Get user messages with filtering and pagination
 */
export const getUserMessagesService = async (userId: number, filters: MessageFilters) => {
  const { type, read, page, limit } = filters;
  const offset = (page - 1) * limit;

  let whereConditions = ['user_id = $1'];
  let values: any[] = [userId];
  let valueIndex = 2;

  if (type) {
    whereConditions.push(`type = $${valueIndex}`);
    values.push(type);
    valueIndex++;
  }

  if (read !== undefined) {
    whereConditions.push(`is_read = $${valueIndex}`);
    values.push(read);
    valueIndex++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM notifications
    WHERE ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].total);

  // Get unread count
  const unreadQuery = `
    SELECT COUNT(*) as unread_count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
  `;
  const unreadResult = await pool.query(unreadQuery, [userId]);
  const unreadCount = parseInt(unreadResult.rows[0].unread_count);

  // Get messages
  const messagesQuery = `
    SELECT
      id,
      title as subject,
      message,
      type,
      COALESCE(
        CASE
          WHEN is_important = true THEN 'high'
          ELSE 'medium'
        END,
        (metadata->>'priority')::text,
        'medium'
      ) as priority,
      is_read as read,
      created_at as sent_at,
      COALESCE(
        (SELECT username FROM users WHERE id = created_by),
        'System'
      ) as sent_by,
      metadata
    FROM notifications
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
  `;

  values.push(limit, offset);
  const messagesResult = await pool.query(messagesQuery, values);

  return {
    messages: messagesResult.rows,
    unread_count: unreadCount,
    total
  };
};

/**
 * Mark a message as read
 */
export const markMessageAsReadService = async (userId: number, messageId: number) => {
  const query = `
    UPDATE notifications
    SET
      is_read = true,
      updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, is_read as read, updated_at as read_at
  `;

  const result = await pool.query(query, [messageId, userId]);

  if (result.rows.length === 0) {
    throw new Error('Message not found or does not belong to user');
  }

  return result.rows[0];
};

/**
 * Get unread message count
 */
export const getUnreadCountService = async (userId: number) => {
  const query = `
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
  `;

  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].count);
};
