"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCountService = exports.markMessageAsReadService = exports.getUserMessagesService = void 0;
// src/services/user/messages.service.ts
const postgres_1 = __importDefault(require("../../db/postgres"));
/**
 * Get user messages with filtering and pagination
 */
const getUserMessagesService = async (userId, filters) => {
    const { type, read, page, limit } = filters;
    const offset = (page - 1) * limit;
    let whereConditions = ['user_id = $1'];
    let values = [userId];
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
    const countResult = await postgres_1.default.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    // Get unread count
    const unreadQuery = `
    SELECT COUNT(*) as unread_count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
  `;
    const unreadResult = await postgres_1.default.query(unreadQuery, [userId]);
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
    const messagesResult = await postgres_1.default.query(messagesQuery, values);
    return {
        messages: messagesResult.rows,
        unread_count: unreadCount,
        total
    };
};
exports.getUserMessagesService = getUserMessagesService;
/**
 * Mark a message as read
 */
const markMessageAsReadService = async (userId, messageId) => {
    const query = `
    UPDATE notifications
    SET
      is_read = true,
      updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, is_read as read, updated_at as read_at
  `;
    const result = await postgres_1.default.query(query, [messageId, userId]);
    if (result.rows.length === 0) {
        throw new Error('Message not found or does not belong to user');
    }
    return result.rows[0];
};
exports.markMessageAsReadService = markMessageAsReadService;
/**
 * Get unread message count
 */
const getUnreadCountService = async (userId) => {
    const query = `
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
  `;
    const result = await postgres_1.default.query(query, [userId]);
    return parseInt(result.rows[0].count);
};
exports.getUnreadCountService = getUnreadCountService;
