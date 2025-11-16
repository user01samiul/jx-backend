"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModulesService = void 0;
const postgres_1 = __importDefault(require("../db/postgres"));
const apiError_1 = require("../utils/apiError");
class AdminModulesService {
    /**
     * Get all admin modules for a specific role
     */
    static async getModulesByRole(roleId) {
        try {
            const query = `
        SELECT id, title, path, icon, parent_id, divider, role_id
        FROM admin_modules 
        WHERE $1 = ANY(role_id)
        ORDER BY id
      `;
            const result = await postgres_1.default.query(query, [roleId]);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching admin modules by role:', error);
            throw new apiError_1.ApiError('Failed to fetch admin modules', 500);
        }
    }
    /**
     * Get admin modules as a hierarchical tree for a specific role
     */
    static async getModulesTreeByRole(roleId) {
        try {
            const modules = await this.getModulesByRole(roleId);
            return this.buildModuleTree(modules);
        }
        catch (error) {
            console.error('Error fetching admin modules tree by role:', error);
            throw new apiError_1.ApiError('Failed to fetch admin modules tree', 500);
        }
    }
    /**
     * Get all admin modules (for admin users)
     */
    static async getAllModules() {
        try {
            const query = `
        SELECT id, title, path, icon, parent_id, divider, role_id
        FROM admin_modules 
        ORDER BY id
      `;
            const result = await postgres_1.default.query(query);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching all admin modules:', error);
            throw new apiError_1.ApiError('Failed to fetch admin modules', 500);
        }
    }
    /**
     * Get all admin modules as a hierarchical tree (for admin users)
     */
    static async getAllModulesTree() {
        try {
            const modules = await this.getAllModules();
            return this.buildModuleTree(modules);
        }
        catch (error) {
            console.error('Error fetching all admin modules tree:', error);
            throw new apiError_1.ApiError('Failed to fetch admin modules tree', 500);
        }
    }
    /**
     * Create a new admin module
     */
    static async createModule(moduleData) {
        try {
            const query = `
        INSERT INTO admin_modules (title, path, icon, parent_id, divider, role_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, path, icon, parent_id, divider, role_id
      `;
            const values = [
                moduleData.title,
                moduleData.path,
                moduleData.icon,
                moduleData.parent_id,
                moduleData.divider,
                moduleData.role_id
            ];
            const result = await postgres_1.default.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            console.error('Error creating admin module:', error);
            throw new apiError_1.ApiError('Failed to create admin module', 500);
        }
    }
    /**
     * Update an admin module
     */
    static async updateModule(id, moduleData) {
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;
            if (moduleData.title !== undefined) {
                fields.push(`title = $${paramCount++}`);
                values.push(moduleData.title);
            }
            if (moduleData.path !== undefined) {
                fields.push(`path = $${paramCount++}`);
                values.push(moduleData.path);
            }
            if (moduleData.icon !== undefined) {
                fields.push(`icon = $${paramCount++}`);
                values.push(moduleData.icon);
            }
            if (moduleData.parent_id !== undefined) {
                fields.push(`parent_id = $${paramCount++}`);
                values.push(moduleData.parent_id);
            }
            if (moduleData.divider !== undefined) {
                fields.push(`divider = $${paramCount++}`);
                values.push(moduleData.divider);
            }
            if (moduleData.role_id !== undefined) {
                fields.push(`role_id = $${paramCount++}`);
                values.push(moduleData.role_id);
            }
            if (fields.length === 0) {
                throw new apiError_1.ApiError('No fields to update', 400);
            }
            values.push(id);
            const query = `
        UPDATE admin_modules 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, title, path, icon, parent_id, divider, role_id
      `;
            const result = await postgres_1.default.query(query, values);
            if (result.rows.length === 0) {
                throw new apiError_1.ApiError('Admin module not found', 404);
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Error updating admin module:', error);
            if (error instanceof apiError_1.ApiError)
                throw error;
            throw new apiError_1.ApiError('Failed to update admin module', 500);
        }
    }
    /**
     * Delete an admin module
     */
    static async deleteModule(id) {
        try {
            const query = 'DELETE FROM admin_modules WHERE id = $1';
            const result = await postgres_1.default.query(query, [id]);
            if (result.rowCount === 0) {
                throw new apiError_1.ApiError('Admin module not found', 404);
            }
        }
        catch (error) {
            console.error('Error deleting admin module:', error);
            if (error instanceof apiError_1.ApiError)
                throw error;
            throw new apiError_1.ApiError('Failed to delete admin module', 500);
        }
    }
    /**
     * Build hierarchical tree from flat module list
     */
    static buildModuleTree(modules) {
        const moduleMap = new Map();
        const rootModules = [];
        // Create map of all modules
        modules.forEach(module => {
            moduleMap.set(module.id, { ...module, children: [] });
        });
        // Build tree structure
        modules.forEach(module => {
            const moduleNode = moduleMap.get(module.id);
            if (module.parent_id === null) {
                rootModules.push(moduleNode);
            }
            else {
                const parent = moduleMap.get(module.parent_id);
                if (parent) {
                    if (!parent.children)
                        parent.children = [];
                    parent.children.push(moduleNode);
                }
            }
        });
        return rootModules;
    }
    /**
     * Get modules for multiple roles (for users with multiple roles)
     */
    static async getModulesByRoles(roleIds) {
        try {
            if (roleIds.length === 0) {
                return [];
            }
            // Create placeholders for the IN clause
            const placeholders = roleIds.map((_, index) => `$${index + 1}`).join(',');
            const query = `
        SELECT DISTINCT id, title, path, icon, parent_id, divider, role_id
        FROM admin_modules 
        WHERE role_id && ARRAY[${placeholders}]
        ORDER BY id
      `;
            const result = await postgres_1.default.query(query, roleIds);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching admin modules by roles:', error);
            throw new apiError_1.ApiError('Failed to fetch admin modules', 500);
        }
    }
    /**
     * Get modules tree for multiple roles
     */
    static async getModulesTreeByRoles(roleIds) {
        try {
            const modules = await this.getModulesByRoles(roleIds);
            return this.buildModuleTree(modules);
        }
        catch (error) {
            console.error('Error fetching admin modules tree by roles:', error);
            throw new apiError_1.ApiError('Failed to fetch admin modules tree', 500);
        }
    }
}
exports.AdminModulesService = AdminModulesService;
