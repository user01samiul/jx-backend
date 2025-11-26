"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkSetGameContributionSchema = exports.setGameContributionSchema = exports.forfeitBonusSchema = exports.getUserBonusesSchema = exports.applyBonusCodeSchema = exports.getBonusPlansSchema = exports.grantManualBonusSchema = exports.updateBonusPlanSchema = exports.createBonusPlanSchema = void 0;
const zod_1 = require("zod");
// =====================================================
// ADMIN BONUS PLAN SCHEMAS
// =====================================================
exports.createBonusPlanSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(255),
    brand_id: zod_1.z.number().int().optional(),
    start_date: zod_1.z.coerce.date(),
    end_date: zod_1.z.coerce.date(),
    start_time: zod_1.z.string().optional().nullable(),
    end_time: zod_1.z.string().optional().nullable(),
    expiry_days: zod_1.z.number().int().min(1).max(365),
    trigger_type: zod_1.z.enum([
        'deposit', 'coded', 'coupon', 'manual', 'loyalty',
        'instant_cashback', 'scheduled_cashback', 'platform_bonus',
        'product_bonus', 'freebet', 'betslip_based', 'external_api', 'tournament_win'
    ]),
    // Deposit configuration
    min_deposit: zod_1.z.number().positive().optional().nullable(),
    max_deposit: zod_1.z.number().positive().optional().nullable(),
    payment_method_ids: zod_1.z.array(zod_1.z.number().int()).optional().nullable(),
    // Award configuration
    award_type: zod_1.z.enum(['flat_amount', 'percentage']),
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.string().length(3).optional(),
    // Wagering requirements
    wager_requirement_multiplier: zod_1.z.number().min(0).max(100),
    wager_requirement_type: zod_1.z.enum(['bonus', 'bonus_plus_deposit', 'deposit']).optional(),
    wager_requirement_action: zod_1.z.enum(['release', 'forfeit']).optional(),
    is_incremental: zod_1.z.boolean().optional(),
    // Game restrictions
    game_type_id: zod_1.z.number().int().optional().nullable(),
    description: zod_1.z.string().max(2000).optional().nullable(),
    image_url: zod_1.z.string().url().max(500).optional().nullable(),
    // Flags
    is_playable: zod_1.z.boolean().optional(),
    playable_bonus_qualifies: zod_1.z.boolean().optional(),
    release_playable_winnings: zod_1.z.boolean().optional(),
    cancel_on_withdrawal: zod_1.z.boolean().optional(),
    // Limits
    max_trigger_all: zod_1.z.number().int().positive().optional().nullable(),
    max_trigger_per_player: zod_1.z.number().int().positive().optional(),
    min_bonus_threshold: zod_1.z.number().positive().optional().nullable(),
    bonus_max_release: zod_1.z.number().positive().optional().nullable(),
    // Settings
    recurrence_type: zod_1.z.enum(['non_recurring', 'daily', 'weekly', 'monthly']).optional(),
    allow_sportsbook: zod_1.z.boolean().optional(),
    allow_poker: zod_1.z.boolean().optional(),
    additional_award: zod_1.z.boolean().optional(),
    // For coded bonuses
    bonus_code: zod_1.z.string().max(50).optional().nullable(),
    max_code_usage: zod_1.z.number().int().positive().optional().nullable(),
    // For loyalty bonuses
    loyalty_points_required: zod_1.z.number().int().positive().optional().nullable(),
    vip_level_required: zod_1.z.number().int().positive().optional().nullable(),
    // For cashback bonuses
    cashback_percentage: zod_1.z.number().positive().max(100).optional().nullable(),
    cashback_calculation_period: zod_1.z.enum(['daily', 'weekly', 'monthly']).optional().nullable(),
    status: zod_1.z.enum(['active', 'inactive', 'expired']).optional()
});
exports.updateBonusPlanSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(255).optional(),
    start_date: zod_1.z.coerce.date().optional(),
    end_date: zod_1.z.coerce.date().optional(),
    expiry_days: zod_1.z.number().int().min(1).max(365).optional(),
    amount: zod_1.z.number().positive().optional(),
    wager_requirement_multiplier: zod_1.z.number().min(0).max(100).optional(),
    description: zod_1.z.string().max(2000).optional().nullable(),
    image_url: zod_1.z.string().url().max(500).optional().nullable(),
    is_playable: zod_1.z.boolean().optional(),
    cancel_on_withdrawal: zod_1.z.boolean().optional(),
    max_trigger_per_player: zod_1.z.number().int().positive().optional(),
    bonus_max_release: zod_1.z.number().positive().optional().nullable(),
    status: zod_1.z.enum(['active', 'inactive', 'expired']).optional()
}).partial();
exports.grantManualBonusSchema = zod_1.z.object({
    player_id: zod_1.z.number().int().positive(),
    bonus_plan_id: zod_1.z.number().int().positive(),
    custom_amount: zod_1.z.number().positive().optional().nullable(),
    notes: zod_1.z.string().max(500)
});
exports.getBonusPlansSchema = zod_1.z.object({
    status: zod_1.z.enum(['active', 'inactive', 'expired']).optional(),
    trigger_type: zod_1.z.string().optional(),
    brand_id: zod_1.z.number().int().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
    offset: zod_1.z.coerce.number().int().min(0).optional()
});
// =====================================================
// USER BONUS SCHEMAS
// =====================================================
exports.applyBonusCodeSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(50)
});
exports.getUserBonusesSchema = zod_1.z.object({
    status: zod_1.z.enum(['active', 'wagering', 'completed', 'expired', 'forfeited', 'cancelled']).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
    offset: zod_1.z.coerce.number().int().min(0).optional()
});
exports.forfeitBonusSchema = zod_1.z.object({
    reason: zod_1.z.string().min(5).max(500)
});
// =====================================================
// GAME CONTRIBUTION SCHEMAS
// =====================================================
exports.setGameContributionSchema = zod_1.z.object({
    game_id: zod_1.z.number().int().positive(),
    contribution_percentage: zod_1.z.number().min(0).max(100),
    is_restricted: zod_1.z.boolean().optional()
});
exports.bulkSetGameContributionSchema = zod_1.z.object({
    game_category: zod_1.z.enum(['slots', 'table_games', 'live_casino', 'video_poker', 'other']),
    contribution_percentage: zod_1.z.number().min(0).max(100)
});
