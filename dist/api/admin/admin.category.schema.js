"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryStatsFiltersSchema = exports.BulkCategoryOperationSchema = exports.CategoryFiltersSchema = exports.UpdateGameCategorySchema = exports.CreateGameCategorySchema = void 0;
const zod_1 = require("zod");
// Schema for creating a new game category
exports.CreateGameCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Category name is required").max(50, "Category name must be less than 50 characters"),
    display_name: zod_1.z.string().min(1, "Display name is required").max(100, "Display name must be less than 100 characters"),
    description: zod_1.z.string().optional(),
    icon_url: zod_1.z.string().url("Valid icon URL is required").optional(),
    color: zod_1.z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color").optional(),
    display_order: zod_1.z.number().int().min(0, "Display order must be a non-negative integer").default(0),
    is_active: zod_1.z.boolean().default(true),
    parent_category_id: zod_1.z.number().int().positive().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Schema for updating a game category
exports.UpdateGameCategorySchema = exports.CreateGameCategorySchema.partial();
// Schema for category filters
exports.CategoryFiltersSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().optional(),
    parent_category_id: zod_1.z.number().int().positive().optional(),
    page: zod_1.z.number().int().min(1).default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20)
});
// Schema for bulk category operations
exports.BulkCategoryOperationSchema = zod_1.z.object({
    category_ids: zod_1.z.array(zod_1.z.number().int().positive()).min(1, "At least one category ID is required"),
    operation: zod_1.z.enum(["activate", "deactivate", "delete"]),
    reason: zod_1.z.string().optional()
});
// Schema for category statistics
exports.CategoryStatsFiltersSchema = zod_1.z.object({
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    include_inactive: zod_1.z.boolean().default(false)
});
