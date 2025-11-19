"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionFiltersSchema = exports.ClaimPromotionSchema = void 0;
const zod_1 = require("zod");
// Schema for claiming a promotion
exports.ClaimPromotionSchema = zod_1.z.object({
    promotion_id: zod_1.z.number().positive("Promotion ID must be a positive number")
});
// Schema for promotion filters
exports.PromotionFiltersSchema = zod_1.z.object({
    type: zod_1.z.enum(["welcome_bonus", "deposit_bonus", "free_spins", "cashback", "reload_bonus", "tournament"]).optional(),
    status: zod_1.z.enum(["active", "completed", "expired", "cancelled"]).optional(),
    limit: zod_1.z.number().min(1).max(100).optional(),
    offset: zod_1.z.number().min(0).optional()
});
