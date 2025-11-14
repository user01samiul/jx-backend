import { z } from "zod";

// =====================================================
// NOTIFICATION FILTER SCHEMAS
// =====================================================

export const NotificationFiltersSchema = z.object({
  type: z.enum(['info', 'success', 'warning', 'error', 'promotion']).optional(),
  category: z.enum(['general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus']).optional(),
  is_read: z.boolean().optional(),
  is_important: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export type NotificationFiltersInput = z.infer<typeof NotificationFiltersSchema>;

// =====================================================
// CREATE NOTIFICATION SCHEMAS
// =====================================================

export const CreateNotificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  message: z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
  type: z.enum(['info', 'success', 'warning', 'error', 'promotion']).default('info'),
  category: z.enum(['general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus']).default('general'),
  is_important: z.boolean().default(false),
  action_url: z.string().url().optional().or(z.literal('')),
  action_text: z.string().max(100, "Action text must be less than 100 characters").optional().or(z.literal('')),
  expires_at: z.string().datetime().optional().or(z.literal('')),
  metadata: z.record(z.any()).optional()
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;

// =====================================================
// UPDATE NOTIFICATION SCHEMAS
// =====================================================

export const UpdateNotificationSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters").optional(),
  message: z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters").optional(),
  type: z.enum(['info', 'success', 'warning', 'error', 'promotion']).optional(),
  category: z.enum(['general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus']).optional(),
  is_important: z.boolean().optional(),
  action_url: z.string().url().optional().or(z.literal('')),
  action_text: z.string().max(100, "Action text must be less than 100 characters").optional().or(z.literal('')),
  expires_at: z.string().datetime().optional().or(z.literal('')),
  metadata: z.record(z.any()).optional()
});

export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;

// =====================================================
// BULK CREATE NOTIFICATION SCHEMAS
// =====================================================

export const BulkCreateNotificationSchema = z.object({
  user_ids: z.array(z.number().positive()).min(1, "At least one user ID is required"),
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  message: z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
  type: z.enum(['info', 'success', 'warning', 'error', 'promotion']).default('info'),
  category: z.enum(['general', 'game', 'payment', 'promotion', 'system', 'security', 'bonus']).default('general'),
  is_important: z.boolean().default(false),
  action_url: z.string().url().optional().or(z.literal('')),
  action_text: z.string().max(100, "Action text must be less than 100 characters").optional().or(z.literal('')),
  expires_at: z.string().datetime().optional().or(z.literal('')),
  metadata: z.record(z.any()).optional()
});

export type BulkCreateNotificationInput = z.infer<typeof BulkCreateNotificationSchema>;

// =====================================================
// NOTIFICATION ID PARAMETER SCHEMAS
// =====================================================

export const NotificationIdParamSchema = z.object({
  id: z.string().transform((val) => {
    const num = parseInt(val);
    if (isNaN(num) || num <= 0) {
      throw new Error("Invalid notification ID");
    }
    return num;
  })
});

export type NotificationIdParam = z.infer<typeof NotificationIdParamSchema>;

// =====================================================
// MARK AS READ SCHEMAS
// =====================================================

export const MarkAsReadSchema = z.object({
  notification_ids: z.array(z.number().positive()).optional(), // If not provided, mark all as read
  mark_all: z.boolean().default(false)
});

export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>; 