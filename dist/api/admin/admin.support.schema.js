"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportStatisticsFiltersSchema = exports.NotificationFiltersSchema = exports.CreateNotificationSchema = exports.UpdateSupportCategorySchema = exports.CreateSupportCategorySchema = exports.AddTicketReplySchema = exports.SupportTicketFiltersSchema = exports.UpdateSupportTicketSchema = exports.CreateSupportTicketSchema = exports.SUPPORT_CATEGORIES = exports.SUPPORT_TICKET_STATUS = exports.SUPPORT_PRIORITY_LEVELS = void 0;
const zod_1 = require("zod");
// Support Ticket Priority Levels
exports.SUPPORT_PRIORITY_LEVELS = [
    "low",
    "medium",
    "high",
    "urgent"
];
// Support Ticket Status
exports.SUPPORT_TICKET_STATUS = [
    "open",
    "in_progress",
    "waiting_for_user",
    "waiting_for_admin",
    "resolved",
    "closed"
];
// Support Ticket Categories
exports.SUPPORT_CATEGORIES = [
    "account_issues",
    "payment_problems",
    "game_issues",
    "technical_support",
    "bonus_questions",
    "kyc_verification",
    "general_inquiry",
    "complaint",
    "feature_request",
    "other"
];
// Create Support Ticket Schema
exports.CreateSupportTicketSchema = zod_1.z.object({
    user_id: zod_1.z.number().int().positive(),
    category: zod_1.z.enum(exports.SUPPORT_CATEGORIES),
    subject: zod_1.z.string().min(1, "Subject is required").max(200, "Subject too long"),
    description: zod_1.z.string().min(1, "Description is required").max(2000, "Description too long"),
    priority: zod_1.z.enum(exports.SUPPORT_PRIORITY_LEVELS).default("medium"),
    attachments: zod_1.z.array(zod_1.z.string().url()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Update Support Ticket Schema
exports.UpdateSupportTicketSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive(),
    status: zod_1.z.enum(exports.SUPPORT_TICKET_STATUS).optional(),
    priority: zod_1.z.enum(exports.SUPPORT_PRIORITY_LEVELS).optional(),
    category: zod_1.z.enum(exports.SUPPORT_CATEGORIES).optional(),
    subject: zod_1.z.string().min(1).max(200).optional(),
    assigned_to: zod_1.z.number().int().positive().optional(),
    admin_notes: zod_1.z.string().optional(),
    resolution: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional()
});
// Support Ticket Filters Schema
exports.SupportTicketFiltersSchema = zod_1.z.object({
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(exports.SUPPORT_TICKET_STATUS).optional(),
    priority: zod_1.z.enum(exports.SUPPORT_PRIORITY_LEVELS).optional(),
    category: zod_1.z.enum(exports.SUPPORT_CATEGORIES).optional(),
    user_id: zod_1.z.number().int().positive().optional(),
    assigned_to: zod_1.z.number().int().positive().optional(),
    start_date: zod_1.z.string().datetime().optional(),
    end_date: zod_1.z.string().datetime().optional(),
    unassigned_only: zod_1.z.boolean().optional(),
    urgent_only: zod_1.z.boolean().optional()
});
// Add Reply to Ticket Schema
exports.AddTicketReplySchema = zod_1.z.object({
    ticket_id: zod_1.z.number().int().positive(),
    message: zod_1.z.string().min(1, "Message is required").max(2000, "Message too long"),
    is_internal: zod_1.z.boolean().default(false),
    attachments: zod_1.z.array(zod_1.z.string().url()).optional(),
    notify_user: zod_1.z.boolean().default(true)
});
// Create Support Category Schema
exports.CreateSupportCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(100, "Name too long"),
    description: zod_1.z.string().min(1, "Description is required").max(500, "Description too long"),
    slug: zod_1.z.string().min(1, "Slug is required").max(50, "Slug too long"),
    is_active: zod_1.z.boolean().default(true),
    sort_order: zod_1.z.number().int().min(0).default(0),
    auto_assign_to: zod_1.z.number().int().positive().optional(),
    response_template: zod_1.z.string().optional()
});
// Update Support Category Schema
exports.UpdateSupportCategorySchema = exports.CreateSupportCategorySchema.partial().extend({
    id: zod_1.z.number().int().positive()
});
// Create Notification Schema
exports.CreateNotificationSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(200, "Title too long"),
    message: zod_1.z.string().min(1, "Message is required").max(1000, "Message too long"),
    type: zod_1.z.enum(["info", "success", "warning", "error", "announcement"]).default("info"),
    target_users: zod_1.z.enum(["all", "specific", "group"]).default("all"),
    user_ids: zod_1.z.array(zod_1.z.number().int().positive()).optional(),
    user_group: zod_1.z.string().optional(),
    scheduled_at: zod_1.z.string().datetime().optional(),
    expires_at: zod_1.z.string().datetime().optional(),
    is_push: zod_1.z.boolean().default(false),
    is_email: zod_1.z.boolean().default(false),
    is_in_app: zod_1.z.boolean().default(true),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Notification Filters Schema
exports.NotificationFiltersSchema = zod_1.z.object({
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    type: zod_1.z.enum(["info", "success", "warning", "error", "announcement"]).optional(),
    target_users: zod_1.z.enum(["all", "specific", "group"]).optional(),
    start_date: zod_1.z.string().datetime().optional(),
    end_date: zod_1.z.string().datetime().optional(),
    is_scheduled: zod_1.z.boolean().optional()
});
// Support Statistics Filters Schema
exports.SupportStatisticsFiltersSchema = zod_1.z.object({
    start_date: zod_1.z.string().datetime(),
    end_date: zod_1.z.string().datetime(),
    group_by: zod_1.z.enum(["day", "week", "month", "category", "priority", "status"]).default("day"),
    include_details: zod_1.z.boolean().default(false)
});
