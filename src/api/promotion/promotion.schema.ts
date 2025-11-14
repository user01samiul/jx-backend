import { z } from "zod";

// Schema for claiming a promotion
export const ClaimPromotionSchema = z.object({
  promotion_id: z.number().positive("Promotion ID must be a positive number")
});

// Schema for promotion filters
export const PromotionFiltersSchema = z.object({
  type: z.enum(["welcome_bonus", "deposit_bonus", "free_spins", "cashback", "reload_bonus", "tournament"]).optional(),
  status: z.enum(["active", "completed", "expired", "cancelled"]).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

// Export types
export type ClaimPromotionInput = z.infer<typeof ClaimPromotionSchema>;
export type PromotionFiltersInput = z.infer<typeof PromotionFiltersSchema>; 