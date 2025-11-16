"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModulesController = void 0;
const admin_modules_service_1 = require("../services/admin-modules.service");
const apiError_1 = require("../utils/apiError");
const postgres_1 = __importDefault(require("../db/postgres"));
class AdminModulesController {
    /**
     * Get admin modules for the current user's role
     */
    static async getMyModules(req, res) {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId) {
                throw new apiError_1.ApiError('User not authenticated', 401);
            }
            // Get user's roles
            const userRolesQuery = `
        SELECT ur.role_id 
        FROM user_roles ur 
        WHERE ur.user_id = $1
      `;
            const userRolesResult = await postgres_1.default.query(userRolesQuery, [userId]);
            const roleIds = userRolesResult.rows.map(row => row.role_id);
            if (roleIds.length === 0) {
                return res.json({
                    success: true,
                    data: []
                });
            }
            // Check if user has admin role (role_id = 1)
            const isAdmin = roleIds.includes(1);
            let modules;
            if (isAdmin) {
                // Admin gets all modules
                modules = await admin_modules_service_1.AdminModulesService.getAllModulesTree();
            }
            else {
                // Other roles get modules based on their roles
                modules = await admin_modules_service_1.AdminModulesService.getModulesTreeByRoles(roleIds);
            }
            res.json({
                success: true,
                data: modules
            });
        }
        catch (error) {
            console.error('Error getting user modules:', error);
            if (error instanceof apiError_1.ApiError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    }
    /**
     * Get admin modules for a specific role (admin only)
     */
    static async getModulesByRole(req, res) {
        try {
            const { roleId } = req.params;
            const roleIdNum = parseInt(roleId);
            if (isNaN(roleIdNum)) {
                throw new apiError_1.ApiError('Invalid role ID', 400);
            }
            const modules = await admin_modules_service_1.AdminModulesService.getModulesTreeByRole(roleIdNum);
            res.json({
                success: true,
                data: modules
            });
        }
        catch (error) {
            console.error('Error getting modules by role:', error);
            if (error instanceof apiError_1.ApiError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    }
    /**
     * Get all admin modules (admin only)
     */
    static async getAllModules(req, res) {
        try {
            const modules = await admin_modules_service_1.AdminModulesService.getAllModulesTree();
            res.json({
                success: true,
                data: modules
            });
        }
        catch (error) {
            console.error('Error getting all modules:', error);
            if (error instanceof apiError_1.ApiError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    }
    /**
     * Create a new admin module (admin only)
     */
    static async createModule(req, res) {
        try {
            const { title, path, icon, parent_id, divider, role_id } = req.body;
            if (!title) {
                throw new apiError_1.ApiError('Title is required', 400);
            }
            if (!Array.isArray(role_id) || role_id.length === 0) {
                throw new apiError_1.ApiError('Role IDs array is required', 400);
            }
            const moduleData = {
                title,
                path: path || null,
                icon: icon || null,
                parent_id: parent_id || null,
                divider: divider || '0',
                role_id
            };
            const newModule = await admin_modules_service_1.AdminModulesService.createModule(moduleData);
            res.status(201).json({
                success: true,
                data: newModule
            });
        }
        catch (error) {
            console.error('Error creating module:', error);
            if (error instanceof apiError_1.ApiError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    }
    /**
     * Update an admin module (admin only)
     */
    static async updateModule(req, res) {
        try {
            const { id } = req.params;
            const moduleId = parseInt(id);
            if (isNaN(moduleId)) {
                throw new apiError_1.ApiError('Invalid module ID', 400);
            }
            const { title, path, icon, parent_id, divider, role_id } = req.body;
            const updateData = {};
            if (title !== undefined)
                updateData.title = title;
            if (path !== undefined)
                updateData.path = path;
            if (icon !== undefined)
                updateData.icon = icon;
            if (parent_id !== undefined)
                updateData.parent_id = parent_id;
            if (divider !== undefined)
                updateData.divider = divider;
            if (role_id !== undefined)
                updateData.role_id = role_id;
            if (Object.keys(updateData).length === 0) {
                throw new apiError_1.ApiError('No fields to update', 400);
            }
            const updatedModule = await admin_modules_service_1.AdminModulesService.updateModule(moduleId, updateData);
            res.json({
                success: true,
                data: updatedModule
            });
        }
        catch (error) {
            console.error('Error updating module:', error);
            if (error instanceof apiError_1.ApiError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    }
    /**
     * Delete an admin module (admin only)
     */
    static async deleteModule(req, res) {
        try {
            const { id } = req.params;
            const moduleId = parseInt(id);
            if (isNaN(moduleId)) {
                throw new apiError_1.ApiError('Invalid module ID', 400);
            }
            await admin_modules_service_1.AdminModulesService.deleteModule(moduleId);
            res.json({
                success: true,
                message: 'Module deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting module:', error);
            if (error instanceof apiError_1.ApiError) {
                res.status(error.statusCode).json({
                    success: false,
                    error: error.message
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    }
    /**
     * Get available roles for module assignment
     */
    static async getAvailableRoles(req, res) {
        try {
            const query = 'SELECT id, name, description FROM roles ORDER BY id';
            const result = await postgres_1.default.query(query);
            res.json({
                success: true,
                data: result.rows
            });
        }
        catch (error) {
            console.error('Error getting available roles:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
exports.AdminModulesController = AdminModulesController;
