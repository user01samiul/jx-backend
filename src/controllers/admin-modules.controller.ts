import { Request, Response } from 'express';
import { AdminModulesService } from '../services/admin-modules.service';
import { ApiError } from '../utils/apiError';
import pool from '../db/postgres';

export class AdminModulesController {
  /**
   * Get admin modules for the current user's role
   */
  static async getMyModules(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new ApiError('User not authenticated', 401);
      }

      // Get user's roles
      const userRolesQuery = `
        SELECT ur.role_id 
        FROM user_roles ur 
        WHERE ur.user_id = $1
      `;
      const userRolesResult = await pool.query(userRolesQuery, [userId]);
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
        modules = await AdminModulesService.getAllModulesTree();
      } else {
        // Other roles get modules based on their roles
        modules = await AdminModulesService.getModulesTreeByRoles(roleIds);
      }

      res.json({
        success: true,
        data: modules
      });
    } catch (error) {
      console.error('Error getting user modules:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
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
  static async getModulesByRole(req: Request, res: Response) {
    try {
      const { roleId } = req.params;
      const roleIdNum = parseInt(roleId);

      if (isNaN(roleIdNum)) {
        throw new ApiError('Invalid role ID', 400);
      }

      const modules = await AdminModulesService.getModulesTreeByRole(roleIdNum);

      res.json({
        success: true,
        data: modules
      });
    } catch (error) {
      console.error('Error getting modules by role:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
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
  static async getAllModules(req: Request, res: Response) {
    try {
      const modules = await AdminModulesService.getAllModulesTree();

      res.json({
        success: true,
        data: modules
      });
    } catch (error) {
      console.error('Error getting all modules:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
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
  static async createModule(req: Request, res: Response) {
    try {
      const { title, path, icon, parent_id, divider, role_id } = req.body;

      if (!title) {
        throw new ApiError('Title is required', 400);
      }

      if (!Array.isArray(role_id) || role_id.length === 0) {
        throw new ApiError('Role IDs array is required', 400);
      }

      const moduleData = {
        title,
        path: path || null,
        icon: icon || null,
        parent_id: parent_id || null,
        divider: divider || '0',
        role_id
      };

      const newModule = await AdminModulesService.createModule(moduleData);

      res.status(201).json({
        success: true,
        data: newModule
      });
    } catch (error) {
      console.error('Error creating module:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
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
  static async updateModule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const moduleId = parseInt(id);

      if (isNaN(moduleId)) {
        throw new ApiError('Invalid module ID', 400);
      }

      const { title, path, icon, parent_id, divider, role_id } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (path !== undefined) updateData.path = path;
      if (icon !== undefined) updateData.icon = icon;
      if (parent_id !== undefined) updateData.parent_id = parent_id;
      if (divider !== undefined) updateData.divider = divider;
      if (role_id !== undefined) updateData.role_id = role_id;

      if (Object.keys(updateData).length === 0) {
        throw new ApiError('No fields to update', 400);
      }

      const updatedModule = await AdminModulesService.updateModule(moduleId, updateData);

      res.json({
        success: true,
        data: updatedModule
      });
    } catch (error) {
      console.error('Error updating module:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
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
  static async deleteModule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const moduleId = parseInt(id);

      if (isNaN(moduleId)) {
        throw new ApiError('Invalid module ID', 400);
      }

      await AdminModulesService.deleteModule(moduleId);

      res.json({
        success: true,
        message: 'Module deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting module:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      } else {
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
  static async getAvailableRoles(req: Request, res: Response) {
    try {
      const query = 'SELECT id, name, description FROM roles ORDER BY id';
      const result = await pool.query(query);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting available roles:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 