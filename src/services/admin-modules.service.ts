import pool from '../db/postgres';
import { ApiError } from '../utils/apiError';

export interface AdminModule {
  id: number;
  title: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  divider: string;
  role_id: number[];
}

export interface AdminModuleTree {
  id: number;
  title: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  divider: string;
  role_id: number[];
  children?: AdminModuleTree[];
}

export class AdminModulesService {
  /**
   * Get all admin modules for a specific role
   */
  static async getModulesByRole(roleId: number): Promise<AdminModule[]> {
    try {
      const query = `
        SELECT id, title, path, icon, parent_id, divider, role_id
        FROM admin_modules 
        WHERE $1 = ANY(role_id)
        ORDER BY id
      `;
      
      const result = await pool.query(query, [roleId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching admin modules by role:', error);
      throw new ApiError('Failed to fetch admin modules', 500);
    }
  }

  /**
   * Get admin modules as a hierarchical tree for a specific role
   */
  static async getModulesTreeByRole(roleId: number): Promise<AdminModuleTree[]> {
    try {
      const modules = await this.getModulesByRole(roleId);
      return this.buildModuleTree(modules);
    } catch (error) {
      console.error('Error fetching admin modules tree by role:', error);
      throw new ApiError('Failed to fetch admin modules tree', 500);
    }
  }

  /**
   * Get all admin modules (for admin users)
   */
  static async getAllModules(): Promise<AdminModule[]> {
    try {
      const query = `
        SELECT id, title, path, icon, parent_id, divider, role_id
        FROM admin_modules 
        ORDER BY id
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all admin modules:', error);
      throw new ApiError('Failed to fetch admin modules', 500);
    }
  }

  /**
   * Get all admin modules as a hierarchical tree (for admin users)
   */
  static async getAllModulesTree(): Promise<AdminModuleTree[]> {
    try {
      const modules = await this.getAllModules();
      return this.buildModuleTree(modules);
    } catch (error) {
      console.error('Error fetching all admin modules tree:', error);
      throw new ApiError('Failed to fetch admin modules tree', 500);
    }
  }

  /**
   * Create a new admin module
   */
  static async createModule(moduleData: Omit<AdminModule, 'id'>): Promise<AdminModule> {
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
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating admin module:', error);
      throw new ApiError('Failed to create admin module', 500);
    }
  }

  /**
   * Update an admin module
   */
  static async updateModule(id: number, moduleData: Partial<AdminModule>): Promise<AdminModule> {
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
        throw new ApiError('No fields to update', 400);
      }

      values.push(id);
      const query = `
        UPDATE admin_modules 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, title, path, icon, parent_id, divider, role_id
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new ApiError('Admin module not found', 404);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating admin module:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update admin module', 500);
    }
  }

  /**
   * Delete an admin module
   */
  static async deleteModule(id: number): Promise<void> {
    try {
      const query = 'DELETE FROM admin_modules WHERE id = $1';
      const result = await pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new ApiError('Admin module not found', 404);
      }
    } catch (error) {
      console.error('Error deleting admin module:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete admin module', 500);
    }
  }

  /**
   * Build hierarchical tree from flat module list
   */
  private static buildModuleTree(modules: AdminModule[]): AdminModuleTree[] {
    const moduleMap = new Map<number, AdminModuleTree>();
    const rootModules: AdminModuleTree[] = [];

    // Create map of all modules
    modules.forEach(module => {
      moduleMap.set(module.id, { ...module, children: [] });
    });

    // Build tree structure
    modules.forEach(module => {
      const moduleNode = moduleMap.get(module.id)!;
      
      if (module.parent_id === null) {
        rootModules.push(moduleNode);
      } else {
        const parent = moduleMap.get(module.parent_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(moduleNode);
        }
      }
    });

    return rootModules;
  }

  /**
   * Get modules for multiple roles (for users with multiple roles)
   */
  static async getModulesByRoles(roleIds: number[]): Promise<AdminModule[]> {
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
      
      const result = await pool.query(query, roleIds);
      return result.rows;
    } catch (error) {
      console.error('Error fetching admin modules by roles:', error);
      throw new ApiError('Failed to fetch admin modules', 500);
    }
  }

  /**
   * Get modules tree for multiple roles
   */
  static async getModulesTreeByRoles(roleIds: number[]): Promise<AdminModuleTree[]> {
    try {
      const modules = await this.getModulesByRoles(roleIds);
      return this.buildModuleTree(modules);
    } catch (error) {
      console.error('Error fetching admin modules tree by roles:', error);
      throw new ApiError('Failed to fetch admin modules tree', 500);
    }
  }
} 