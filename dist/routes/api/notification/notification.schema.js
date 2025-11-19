"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkAsReadSchema = exports.NotificationIdParamSchema = exports.BulkCreateNotificationSchema = exports.UpdateNotificationSchema = exports.CreateNotificationSchema = exports.NotificationFiltersSchema = void 0;
const zod_1 = require("zod");
// =====================================================
// NOTIFICATION FILTER SCHEMAS
// =====================================================
exports.NotificationFiltersSchema = zod_1.z.object({
    type: zod_1.z.enum(['info', 'success', 'warning', 'error', 'promotion']).optional(),
    category: zod_1.z.enum(['general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus']).optional(),
    is_read: zod_1.z.boolean().optional(),
    is_important: zod_1.z.boolean().optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0)
});
// =====================================================
// CREATE NOTIFICATION SCHEMAS
// =====================================================
exports.CreateNotificationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
    message: zod_1.z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
    type: zod_1.z.enum(['info', 'success', 'warning', 'error', 'promotion']).default('info'),
    category: zod_1.z.enum(['general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus']).default('general'),
    is_important: zod_1.z.boolean().default(false),
    action_url: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    action_text: zod_1.z.string().max(100, "Action text must be less than 100 characters").optional().or(zod_1.z.literal('')),
    expires_at: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// =====================================================
// UPDATE NOTIFICATION SCHEMAS
// =====================================================
exports.UpdateNotificationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters").optional(),
    message: zod_1.z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters").optional(),
    type: zod_1.z.enum(['info', 'success', 'warning', 'error', 'promotion']).optional(),
    category: zod_1.z.enum(['general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus']).optional(),
    is_important: zod_1.z.boolean().optional(),
    action_url: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    action_text: zod_1.z.string().max(100, "Action text must be less than 100 characters").optional().or(zod_1.z.literal('')),
    expires_at: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// =====================================================
// BULK CREATE NOTIFICATION SCHEMAS
// =====================================================
exports.BulkCreateNotificationSchema = zod_1.z.object({
    user_ids: zod_1.z.array(zod_1.z.number().positive()).min(1, "At least one user ID is required"),
    title: zod_1.z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
    message: zod_1.z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
    type: zod_1.z.enum(['info', 'success', 'warning', 'error', 'promotion']).default('info'),
    category: zod_1.z.enum(['general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus']).default('general'),
    is_important: zod_1.z.boolean().default(false),
    action_url: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    action_text: zod_1.z.string().max(100, "Action text must be less than 100 characters").optional().or(zod_1.z.literal('')),
    expires_at: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// =====================================================
// NOTIFICATION ID PARAMETER SCHEMAS
// =====================================================
exports.NotificationIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().transform((val) => {
        const num = parseInt(val);
        if (isNaN(num) || num <= 0) {
            throw new Error("Invalid notification ID");
        }
        return num;
    })
});
// =====================================================
// MARK AS READ SCHEMAS
// =====================================================
exports.MarkAsReadSchema = zod_1.z.object({
    notification_ids: zod_1.z.array(zod_1.z.number().positive()).optional(), // If not provided, mark all as read
    mark_all: zod_1.z.boolean().default(false)
});
