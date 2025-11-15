"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameDataMappingSchema = exports.UpdateProviderConfigSchema = exports.ImportGameByIdSchema = exports.ImportGamesByCategorySchema = exports.AddProviderConfigSchema = void 0;
const zod_1 = require("zod");
// Schema for adding API provider configuration
exports.AddProviderConfigSchema = zod_1.z.object({
    provider_name: zod_1.z.string().min(1, "Provider name is required"),
    api_key: zod_1.z.string().min(1, "API key is required"),
    api_secret: zod_1.z.string().optional(),
    base_url: zod_1.z.string().url("Valid base URL is required"),
    is_active: zod_1.z.boolean().default(true),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Schema for importing games by category
exports.ImportGamesByCategorySchema = zod_1.z.object({
    provider_name: zod_1.z.string().min(1, "Provider name is required"),
    category: zod_1.z.string().min(1, "Category is required"),
    limit: zod_1.z.number().min(1).max(1000).default(100),
    offset: zod_1.z.number().min(0).default(0),
    force_update: zod_1.z.boolean().default(false)
});
// Schema for importing specific game by ID
exports.ImportGameByIdSchema = zod_1.z.object({
    provider_name: zod_1.z.string().min(1, "Provider name is required"),
    game_id: zod_1.z.string().min(1, "Game ID is required"),
    force_update: zod_1.z.boolean().default(false)
});
// Schema for updating provider configuration
exports.UpdateProviderConfigSchema = zod_1.z.object({
    api_key: zod_1.z.string().optional(),
    api_secret: zod_1.z.string().optional(),
    base_url: zod_1.z.string().url("Valid base URL is required").optional(),
    is_active: zod_1.z.boolean().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Schema for game data mapping
exports.GameDataMappingSchema = zod_1.z.object({
    name: zod_1.z.string(),
    provider: zod_1.z.string(),
    vendor: zod_1.z.string(),
    category: zod_1.z.string(),
    game_code: zod_1.z.string(),
    image_url: zod_1.z.string().url().optional(),
    thumbnail_url: zod_1.z.string().url().optional(),
    rtp_percentage: zod_1.z.number().optional(),
    volatility: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    min_bet: zod_1.z.number().optional(),
    max_bet: zod_1.z.number().optional(),
    max_win: zod_1.z.number().optional(),
    is_featured: zod_1.z.boolean().optional(),
    is_new: zod_1.z.boolean().optional(),
    is_hot: zod_1.z.boolean().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
