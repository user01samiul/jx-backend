"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionStatsFiltersSchema = exports.TogglePromotionSchema = exports.PromotionFiltersSchema = exports.UpdatePromotionSchema = exports.CreatePromotionSchema = void 0;
const zod_1 = require("zod");
// Create Promotion Schema
exports.CreatePromotionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(100, "Title too long"),
    description: zod_1.z.string().min(1, "Description is required").max(500, "Description too long"),
    type: zod_1.z.enum([
        "welcome_bonus",
        "deposit_bonus",
        "free_spins",
        "cashback",
        "reload_bonus",
        "tournament",
        "loyalty_bonus",
        "referral_bonus"
    ]),
    bonus_percentage: zod_1.z.preprocess((val) => val === "" ? 0 : Number(val), zod_1.z.number().min(0).max(1000)).optional(),
    max_bonus_amount: zod_1.z.preprocess((val) => val === "" ? 0 : Number(val), zod_1.z.number().min(0)).optional(),
    min_deposit_amount: zod_1.z.preprocess((val) => val === "" ? 0 : Number(val), zod_1.z.number().min(0)).optional(),
    wagering_requirement: zod_1.z.preprocess((val) => val === "" ? 0 : Number(val), zod_1.z.number().min(0).max(1000)).optional(),
    free_spins_count: zod_1.z.preprocess((val) => val === "" ? 0 : Number(val), zod_1.z.number().int().min(0)).optional(),
    max_free_spins_value: zod_1.z.preprocess((val) => val === "" ? 0 : Number(val), zod_1.z.number().min(0)).optional(),
    cashback_percentage: zod_1.z.preprocess((val) => val === "" ? 0 : Number(val), zod_1.z.number().min(0).max(100)).optional(),
    max_cashback_amount: zod_1.z.preprocess((val) => val === "" ? 0 : Number(val), zod_1.z.number().min(0)).optional(),
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().default(true),
    is_featured: zod_1.z.boolean().default(false),
    applicable_games: zod_1.z.array(zod_1.z.string()).optional(),
    excluded_games: zod_1.z.array(zod_1.z.string()).optional(),
    user_groups: zod_1.z.array(zod_1.z.string()).optional(),
    max_claims_per_user: zod_1.z.preprocess((val) => val === "" ? 1 : Number(val), zod_1.z.number().int().min(1)).default(1),
    terms_conditions: zod_1.z.string().optional(),
    image_url: zod_1.z.string().optional(),
    promo_code: zod_1.z.string().optional()
});
// Update Promotion Schema
exports.UpdatePromotionSchema = exports.CreatePromotionSchema.partial().extend({
    id: zod_1.z.number().int().positive()
});
// Promotion Filters Schema
exports.PromotionFiltersSchema = zod_1.z.object({
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    type: zod_1.z.enum([
        "welcome_bonus",
        "deposit_bonus",
        "free_spins",
        "cashback",
        "reload_bonus",
        "tournament",
        "loyalty_bonus",
        "referral_bonus"
    ]).optional(),
    is_active: zod_1.z.boolean().optional(),
    is_featured: zod_1.z.boolean().optional(),
    start_date: zod_1.z.string().datetime().optional(),
    end_date: zod_1.z.string().datetime().optional()
});
// Toggle Promotion Schema
exports.TogglePromotionSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive()
});
// Promotion Stats Filters Schema
exports.PromotionStatsFiltersSchema = zod_1.z.object({
    promotion_id: zod_1.z.number().int().positive().optional(),
    start_date: zod_1.z.string().datetime().optional(),
    end_date: zod_1.z.string().datetime().optional(),
    group_by: zod_1.z.enum(["day", "week", "month"]).default("day")
});
