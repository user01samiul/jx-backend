"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRecentStatusChangesSchema = exports.BulkUpdateGameStatusSchema = exports.UpdateGameStatusByProviderSchema = exports.UpdateGameStatusByCategorySchema = exports.UpdateGameStatusByIdSchema = exports.GameStatusFiltersSchema = void 0;
const zod_1 = require("zod");
// Game status filters schema
exports.GameStatusFiltersSchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    provider: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    search: zod_1.z.string().optional(),
    limit: zod_1.z.number().min(1).max(100).default(50),
    offset: zod_1.z.number().min(0).default(0)
});
// Update game status by ID schema
exports.UpdateGameStatusByIdSchema = zod_1.z.object({
    game_id: zod_1.z.number().positive(),
    is_active: zod_1.z.boolean(),
    reason: zod_1.z.string().optional()
});
// Update game status by category schema
exports.UpdateGameStatusByCategorySchema = zod_1.z.object({
    category: zod_1.z.string().min(1),
    is_active: zod_1.z.boolean(),
    reason: zod_1.z.string().optional()
});
// Update game status by provider schema
exports.UpdateGameStatusByProviderSchema = zod_1.z.object({
    provider: zod_1.z.string().min(1),
    is_active: zod_1.z.boolean(),
    reason: zod_1.z.string().optional()
});
// Bulk update game status schema
exports.BulkUpdateGameStatusSchema = zod_1.z.object({
    game_ids: zod_1.z.array(zod_1.z.number().positive()).min(1),
    is_active: zod_1.z.boolean(),
    reason: zod_1.z.string().optional()
});
// Get recent status changes schema
exports.GetRecentStatusChangesSchema = zod_1.z.object({
    limit: zod_1.z.number().min(1).max(100).default(20)
});
