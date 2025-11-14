import { z } from "zod";

// Create Promotion Schema
export const CreatePromotionSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  type: z.enum([
    "welcome_bonus",
    "deposit_bonus",
    "free_spins",
    "cashback",
    "reload_bonus",
    "tournament",
    "loyalty_bonus",
    "referral_bonus"
  ]),
  bonus_percentage: z.preprocess((val) => val === "" ? 0 : Number(val), z.number().min(0).max(1000)).optional(),
  max_bonus_amount: z.preprocess((val) => val === "" ? 0 : Number(val), z.number().min(0)).optional(),
  min_deposit_amount: z.preprocess((val) => val === "" ? 0 : Number(val), z.number().min(0)).optional(),
  wagering_requirement: z.preprocess((val) => val === "" ? 0 : Number(val), z.number().min(0).max(1000)).optional(),
  free_spins_count: z.preprocess((val) => val === "" ? 0 : Number(val), z.number().int().min(0)).optional(),
  max_free_spins_value: z.preprocess((val) => val === "" ? 0 : Number(val), z.number().min(0)).optional(),
  cashback_percentage: z.preprocess((val) => val === "" ? 0 : Number(val), z.number().min(0).max(100)).optional(),
  max_cashback_amount: z.preprocess((val) => val === "" ? 0 : Number(val), z.number().min(0)).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  applicable_games: z.array(z.string()).optional(),
  excluded_games: z.array(z.string()).optional(),
  user_groups: z.array(z.string()).optional(),
  max_claims_per_user: z.preprocess((val) => val === "" ? 1 : Number(val), z.number().int().min(1)).default(1),
  terms_conditions: z.string().optional(),
  image_url: z.string().optional(),
  promo_code: z.string().optional()
});

// Update Promotion Schema
export const UpdatePromotionSchema = CreatePromotionSchema.partial().extend({
  id: z.number().int().positive()
});

// Promotion Filters Schema
export const PromotionFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum([
    "welcome_bonus",
    "deposit_bonus", 
    "free_spins",
    "cashback",
    "reload_bonus",
    "tournament",
    "loyalty_bonus",
    "referral_bonus"
  ]).optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
});

// Toggle Promotion Schema
export const TogglePromotionSchema = z.object({
  id: z.number().int().positive()
});

// Promotion Stats Filters Schema
export const PromotionStatsFiltersSchema = z.object({
  promotion_id: z.number().int().positive().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(["day", "week", "month"]).default("day")
});

// Export types
export type CreatePromotionInput = z.infer<typeof CreatePromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof UpdatePromotionSchema>;
export type PromotionFiltersInput = z.infer<typeof PromotionFiltersSchema>;
export type TogglePromotionInput = z.infer<typeof TogglePromotionSchema>;
export type PromotionStatsFiltersInput = z.infer<typeof PromotionStatsFiltersSchema>; 