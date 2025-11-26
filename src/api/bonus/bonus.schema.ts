import { z } from "zod";

// =====================================================
// ADMIN BONUS PLAN SCHEMAS
// =====================================================

export const createBonusPlanSchema = z.object({
  name: z.string().min(3).max(255),
  brand_id: z.number().int().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  expiry_days: z.number().int().min(1).max(365),

  trigger_type: z.enum([
    'deposit', 'coded', 'coupon', 'manual', 'loyalty',
    'instant_cashback', 'scheduled_cashback', 'platform_bonus',
    'product_bonus', 'freebet', 'betslip_based', 'external_api', 'tournament_win'
  ]),

  // Deposit configuration
  min_deposit: z.number().positive().optional().nullable(),
  max_deposit: z.number().positive().optional().nullable(),
  payment_method_ids: z.array(z.number().int()).optional().nullable(),

  // Award configuration
  award_type: z.enum(['flat_amount', 'percentage']),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),

  // Wagering requirements
  wager_requirement_multiplier: z.number().min(0).max(100),
  wager_requirement_type: z.enum(['bonus', 'bonus_plus_deposit', 'deposit']).optional(),
  wager_requirement_action: z.enum(['release', 'forfeit']).optional(),
  is_incremental: z.boolean().optional(),

  // Game restrictions
  game_type_id: z.number().int().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  image_url: z.string().url().max(500).optional().nullable(),

  // Flags
  is_playable: z.boolean().optional(),
  playable_bonus_qualifies: z.boolean().optional(),
  release_playable_winnings: z.boolean().optional(),
  cancel_on_withdrawal: z.boolean().optional(),

  // Limits
  max_trigger_all: z.number().int().positive().optional().nullable(),
  max_trigger_per_player: z.number().int().positive().optional(),
  min_bonus_threshold: z.number().positive().optional().nullable(),
  bonus_max_release: z.number().positive().optional().nullable(),

  // Settings
  recurrence_type: z.enum(['non_recurring', 'daily', 'weekly', 'monthly']).optional(),
  allow_sportsbook: z.boolean().optional(),
  allow_poker: z.boolean().optional(),
  additional_award: z.boolean().optional(),

  // For coded bonuses
  bonus_code: z.string().max(50).optional().nullable(),
  max_code_usage: z.number().int().positive().optional().nullable(),

  // For loyalty bonuses
  loyalty_points_required: z.number().int().positive().optional().nullable(),
  vip_level_required: z.number().int().positive().optional().nullable(),

  // For cashback bonuses
  cashback_percentage: z.number().positive().max(100).optional().nullable(),
  cashback_calculation_period: z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),

  status: z.enum(['active', 'inactive', 'expired']).optional()
});

export const updateBonusPlanSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  expiry_days: z.number().int().min(1).max(365).optional(),
  amount: z.number().positive().optional(),
  wager_requirement_multiplier: z.number().min(0).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  image_url: z.string().url().max(500).optional().nullable(),
  is_playable: z.boolean().optional(),
  cancel_on_withdrawal: z.boolean().optional(),
  max_trigger_per_player: z.number().int().positive().optional(),
  bonus_max_release: z.number().positive().optional().nullable(),
  status: z.enum(['active', 'inactive', 'expired']).optional()
}).partial();

export const grantManualBonusSchema = z.object({
  player_id: z.number().int().positive(),
  bonus_plan_id: z.number().int().positive(),
  custom_amount: z.number().positive().optional().nullable(),
  notes: z.string().max(500)
});

export const getBonusPlansSchema = z.object({
  status: z.enum(['active', 'inactive', 'expired']).optional(),
  trigger_type: z.string().optional(),
  brand_id: z.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

// =====================================================
// USER BONUS SCHEMAS
// =====================================================

export const applyBonusCodeSchema = z.object({
  code: z.string().min(3).max(50)
});

export const getUserBonusesSchema = z.object({
  status: z.enum(['active', 'wagering', 'completed', 'expired', 'forfeited', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export const forfeitBonusSchema = z.object({
  reason: z.string().min(5).max(500)
});

// =====================================================
// GAME CONTRIBUTION SCHEMAS
// =====================================================

export const setGameContributionSchema = z.object({
  game_id: z.coerce.number().int().positive(),
  contribution_percentage: z.coerce.number().min(0).max(100),
  is_restricted: z.boolean().optional()
});

export const bulkSetGameContributionSchema = z.object({
  game_category: z.enum(['slots', 'table_games', 'live_casino', 'video_poker', 'other']),
  contribution_percentage: z.coerce.number().min(0).max(100)
});

// =====================================================
// CATEGORY CONTRIBUTION SCHEMAS
// =====================================================

export const setCategoryContributionSchema = z.object({
  category: z.string().min(1).max(100),
  contribution_percentage: z.coerce.number().min(0).max(100),
  is_restricted: z.boolean().optional()
});

// =====================================================
// BULK OPERATIONS SCHEMAS
// =====================================================

export const bulkGrantBonusesSchema = z.object({
  player_ids: z.array(z.number().int().positive()).min(1).max(100),
  bonus_plan_id: z.number().int().positive(),
  custom_amount: z.number().positive().optional().nullable(),
  notes: z.string().min(5).max(500)
});

export const bulkForfeitBonusesSchema = z.object({
  bonus_instance_ids: z.array(z.number().int().positive()).min(1).max(100),
  reason: z.string().min(5).max(500)
});

// =====================================================
// BONUS PLAN ADVANCED SCHEMAS
// =====================================================

export const cloneBonusPlanSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  bonus_code: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'inactive', 'expired']).optional()
}).partial();

// =====================================================
// AUDIT LOG SCHEMAS
// =====================================================

export const getAuditLogsSchema = z.object({
  admin_user_id: z.coerce.number().int().optional(),
  player_id: z.coerce.number().int().optional(),
  action_type: z.string().optional(),
  bonus_plan_id: z.coerce.number().int().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

// =====================================================
// TYPESCRIPT TYPES
// =====================================================

export type CreateBonusPlanInputType = z.infer<typeof createBonusPlanSchema>;
export type UpdateBonusPlanInputType = z.infer<typeof updateBonusPlanSchema>;
export type GrantManualBonusInputType = z.infer<typeof grantManualBonusSchema>;
export type ApplyBonusCodeInputType = z.infer<typeof applyBonusCodeSchema>;
export type SetGameContributionInputType = z.infer<typeof setGameContributionSchema>;
export type BulkSetGameContributionInputType = z.infer<typeof bulkSetGameContributionSchema>;
export type SetCategoryContributionInputType = z.infer<typeof setCategoryContributionSchema>;
export type BulkGrantBonusesInputType = z.infer<typeof bulkGrantBonusesSchema>;
export type BulkForfeitBonusesInputType = z.infer<typeof bulkForfeitBonusesSchema>;
export type CloneBonusPlanInputType = z.infer<typeof cloneBonusPlanSchema>;
