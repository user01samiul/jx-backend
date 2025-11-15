"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleQuerySchema = exports.ModuleIdSchema = exports.UpdateModuleSchema = exports.CreateModuleSchema = void 0;
const zod_1 = require("zod");
// Create module schema
exports.CreateModuleSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(255, "Title too long"),
    subtitle: zod_1.z.string().optional(),
    path: zod_1.z.string().optional(),
    icons: zod_1.z.string().optional(),
    newtab: zod_1.z.boolean().default(false),
    parentId: zod_1.z.number().optional().nullable(),
    menuName: zod_1.z.string().min(1, "Menu name is required").max(100, "Menu name too long")
});
// Update module schema
exports.UpdateModuleSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(255, "Title too long").optional(),
    subtitle: zod_1.z.string().optional(),
    path: zod_1.z.string().optional(),
    icons: zod_1.z.string().optional(),
    newtab: zod_1.z.boolean().optional(),
    parentId: zod_1.z.number().optional().nullable(),
    menuName: zod_1.z.string().min(1, "Menu name is required").max(100, "Menu name too long").optional()
});
// Module ID schema for delete operations
exports.ModuleIdSchema = zod_1.z.object({
    id: zod_1.z.number().int().positive("Module ID must be a positive integer")
});
// Query parameters for listing modules
exports.ModuleQuerySchema = zod_1.z.object({
    parentId: zod_1.z.string().optional().transform(val => val ? parseInt(val) : undefined),
    menuName: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 50),
    offset: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 0)
});
