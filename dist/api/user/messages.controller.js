"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.markMessageAsRead = exports.getUserMessages = void 0;
const messages_service_1 = require("../../services/user/messages.service");
/**
 * Get user messages with filtering and pagination
 */
const getUserMessages = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const filters = {
            type: req.query.type,
            read: req.query.read === 'true' ? true : req.query.read === 'false' ? false : undefined,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };
        const result = await (0, messages_service_1.getUserMessagesService)(userId, filters);
        res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getUserMessages = getUserMessages;
/**
 * Mark a message as read
 */
const markMessageAsRead = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const messageId = parseInt(req.params.message_id);
        if (isNaN(messageId)) {
            res.status(400).json({ success: false, message: "Invalid message ID" });
            return;
        }
        const result = await (0, messages_service_1.markMessageAsReadService)(userId, messageId);
        res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (err) {
        if (err.message === 'Message not found or does not belong to user') {
            res.status(404).json({ success: false, message: err.message });
            return;
        }
        next(err);
    }
};
exports.markMessageAsRead = markMessageAsRead;
/**
 * Get unread message count
 */
const getUnreadCount = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const count = await (0, messages_service_1.getUnreadCountService)(userId);
        res.status(200).json({
            success: true,
            data: {
                count
            }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getUnreadCount = getUnreadCount;
