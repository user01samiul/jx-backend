import { z } from "zod";

// Game status filters schema
export const GameStatusFiltersSchema = z.object({
  category: z.string().optional(),
  provider: z.string().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0)
});

// Update game status by ID schema
export const UpdateGameStatusByIdSchema = z.object({
  game_id: z.number().positive(),
  is_active: z.boolean(),
  reason: z.string().optional()
});

// Update game status by category schema
export const UpdateGameStatusByCategorySchema = z.object({
  category: z.string().min(1),
  is_active: z.boolean(),
  reason: z.string().optional()
});

// Update game status by provider schema
export const UpdateGameStatusByProviderSchema = z.object({
  provider: z.string().min(1),
  is_active: z.boolean(),
  reason: z.string().optional()
});

// Bulk update game status schema
export const BulkUpdateGameStatusSchema = z.object({
  game_ids: z.array(z.number().positive()).min(1),
  is_active: z.boolean(),
  reason: z.string().optional()
});

// Get recent status changes schema
export const GetRecentStatusChangesSchema = z.object({
  limit: z.number().min(1).max(100).default(20)
});

// Export types
export type GameStatusFiltersInput = z.infer<typeof GameStatusFiltersSchema>;
export type UpdateGameStatusByIdInput = z.infer<typeof UpdateGameStatusByIdSchema>;
export type UpdateGameStatusByCategoryInput = z.infer<typeof UpdateGameStatusByCategorySchema>;
export type UpdateGameStatusByProviderInput = z.infer<typeof UpdateGameStatusByProviderSchema>;
export type BulkUpdateGameStatusInput = z.infer<typeof BulkUpdateGameStatusSchema>;
export type GetRecentStatusChangesInput = z.infer<typeof GetRecentStatusChangesSchema>; 