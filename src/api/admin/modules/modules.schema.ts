import { z } from "zod";

// Create module schema
export const CreateModuleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  subtitle: z.string().optional(),
  path: z.string().optional(),
  icons: z.string().optional(),
  newtab: z.boolean().default(false),
  parentId: z.number().optional().nullable(),
  menuName: z.string().min(1, "Menu name is required").max(100, "Menu name too long")
});

// Update module schema
export const UpdateModuleSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long").optional(),
  subtitle: z.string().optional(),
  path: z.string().optional(),
  icons: z.string().optional(),
  newtab: z.boolean().optional(),
  parentId: z.number().optional().nullable(),
  menuName: z.string().min(1, "Menu name is required").max(100, "Menu name too long").optional()
});

// Module ID schema for delete operations
export const ModuleIdSchema = z.object({
  id: z.number().int().positive("Module ID must be a positive integer")
});

// Query parameters for listing modules
export const ModuleQuerySchema = z.object({
  parentId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  menuName: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0)
});

export type CreateModuleInput = z.infer<typeof CreateModuleSchema>;
export type UpdateModuleInput = z.infer<typeof UpdateModuleSchema>;
export type ModuleIdInput = z.infer<typeof ModuleIdSchema>;
export type ModuleQueryInput = z.infer<typeof ModuleQuerySchema>; 