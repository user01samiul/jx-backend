import { z } from "zod";

// Schema for creating a new game category
export const CreateGameCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50, "Category name must be less than 50 characters"),
  display_name: z.string().min(1, "Display name is required").max(100, "Display name must be less than 100 characters"),
  description: z.string().optional().default(""),
  icon_url: z.string().optional().default(""),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color").optional().default("#3B82F6"),
  display_order: z.number().int().min(0, "Display order must be a non-negative integer").default(0),
  is_active: z.boolean().default(true),
  parent_category_id: z.number().int().positive().nullable().optional().default(null),
  metadata: z.any().optional().default({})
});

// Schema for updating a game category
export const UpdateGameCategorySchema = CreateGameCategorySchema.partial();

// Schema for category filters
export const CategoryFiltersSchema = z.object({
  search: z.string().optional(),
  is_active: z.string().optional().transform(val => {
    if (val === "true") return true;
    if (val === "false") return false;
    return undefined;
  }),
  parent_category_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Schema for bulk category operations
export const BulkCategoryOperationSchema = z.object({
  category_ids: z.array(z.number().int().positive()).min(1, "At least one category ID is required"),
  action: z.enum(["activate", "deactivate", "delete"]),
  reason: z.string().optional()
});

// Schema for category statistics
export const CategoryStatsFiltersSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  include_inactive: z.string().optional().transform(val => val === "true").default("false")
});

export type CreateGameCategoryInput = z.infer<typeof CreateGameCategorySchema>;
export type UpdateGameCategoryInput = z.infer<typeof UpdateGameCategorySchema>;
export type CategoryFiltersInput = z.infer<typeof CategoryFiltersSchema>;
export type BulkCategoryOperationInput = z.infer<typeof BulkCategoryOperationSchema>;
export type CategoryStatsFiltersInput = z.infer<typeof CategoryStatsFiltersSchema>; 