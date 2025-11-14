import { z } from "zod";

// Support Ticket Priority Levels
export const SUPPORT_PRIORITY_LEVELS = [
  "low",
  "medium", 
  "high",
  "urgent"
] as const;

// Support Ticket Status
export const SUPPORT_TICKET_STATUS = [
  "open",
  "in_progress",
  "waiting_for_user",
  "waiting_for_admin",
  "resolved",
  "closed"
] as const;

// Support Ticket Categories
export const SUPPORT_CATEGORIES = [
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
] as const;

// Create Support Ticket Schema
export const CreateSupportTicketSchema = z.object({
  user_id: z.number().int().positive(),
  category: z.enum(SUPPORT_CATEGORIES),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  description: z.string().min(1, "Description is required").max(2000, "Description too long"),
  priority: z.enum(SUPPORT_PRIORITY_LEVELS).default("medium"),
  attachments: z.array(z.string().url()).optional(),
  metadata: z.record(z.any()).optional()
});

// Update Support Ticket Schema
export const UpdateSupportTicketSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(SUPPORT_TICKET_STATUS).optional(),
  priority: z.enum(SUPPORT_PRIORITY_LEVELS).optional(),
  category: z.enum(SUPPORT_CATEGORIES).optional(),
  subject: z.string().min(1).max(200).optional(),
  assigned_to: z.number().int().positive().optional(),
  admin_notes: z.string().optional(),
  resolution: z.string().optional(),
  tags: z.array(z.string()).optional()
});

// Support Ticket Filters Schema
export const SupportTicketFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(SUPPORT_TICKET_STATUS).optional(),
  priority: z.enum(SUPPORT_PRIORITY_LEVELS).optional(),
  category: z.enum(SUPPORT_CATEGORIES).optional(),
  user_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  unassigned_only: z.boolean().optional(),
  urgent_only: z.boolean().optional()
});

// Add Reply to Ticket Schema
export const AddTicketReplySchema = z.object({
  ticket_id: z.number().int().positive(),
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
  is_internal: z.boolean().default(false),
  attachments: z.array(z.string().url()).optional(),
  notify_user: z.boolean().default(true)
});

// Create Support Category Schema
export const CreateSupportCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  slug: z.string().min(1, "Slug is required").max(50, "Slug too long"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  auto_assign_to: z.number().int().positive().optional(),
  response_template: z.string().optional()
});

// Update Support Category Schema
export const UpdateSupportCategorySchema = CreateSupportCategorySchema.partial().extend({
  id: z.number().int().positive()
});

// Create Notification Schema
export const CreateNotificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  message: z.string().min(1, "Message is required").max(1000, "Message too long"),
  type: z.enum(["info", "success", "warning", "error", "announcement"]).default("info"),
  target_users: z.enum(["all", "specific", "group"]).default("all"),
  user_ids: z.array(z.number().int().positive()).optional(),
  user_group: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional(),
  is_push: z.boolean().default(false),
  is_email: z.boolean().default(false),
  is_in_app: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});

// Notification Filters Schema
export const NotificationFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(["info", "success", "warning", "error", "announcement"]).optional(),
  target_users: z.enum(["all", "specific", "group"]).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  is_scheduled: z.boolean().optional()
});

// Support Statistics Filters Schema
export const SupportStatisticsFiltersSchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  group_by: z.enum(["day", "week", "month", "category", "priority", "status"]).default("day"),
  include_details: z.boolean().default(false)
});

// Export types
export type CreateSupportTicketInput = z.infer<typeof CreateSupportTicketSchema>;
export type UpdateSupportTicketInput = z.infer<typeof UpdateSupportTicketSchema>;
export type SupportTicketFiltersInput = z.infer<typeof SupportTicketFiltersSchema>;
export type AddTicketReplyInput = z.infer<typeof AddTicketReplySchema>;
export type CreateSupportCategoryInput = z.infer<typeof CreateSupportCategorySchema>;
export type UpdateSupportCategoryInput = z.infer<typeof UpdateSupportCategorySchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type NotificationFiltersInput = z.infer<typeof NotificationFiltersSchema>;
export type SupportStatisticsFiltersInput = z.infer<typeof SupportStatisticsFiltersSchema>; 