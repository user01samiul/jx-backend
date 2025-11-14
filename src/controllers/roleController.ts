import { Request, Response } from 'express';
import pool from '../db/postgres';

/**
 * Role Management Controller
 * Manages system roles and permissions
 */

// Get all roles
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              COUNT(DISTINCT ur.user_id) as user_count
       FROM roles r
       LEFT JOIN user_roles ur ON r.id = ur.role_id
       GROUP BY r.id
       ORDER BY r.id`
    );

    console.log('[ROLES] Query returned:', result.rowCount, 'roles');
    console.log('[ROLES] First role:', JSON.stringify(result.rows[0]));

    res.json({
      success: true,
      data: {
        roles: result.rows,
        total: result.rowCount,
      },
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles',
    });
  }
};

// Get single role by ID
export const getRoleById = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    const result = await pool.query(
      `SELECT r.*,
              COUNT(DISTINCT ur.user_id) as user_count
       FROM roles r
       LEFT JOIN user_roles ur ON r.id = ur.role_id
       WHERE r.id = $1
       GROUP BY r.id`,
      [roleId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Get users with this role
    const usersResult = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       WHERE ur.role_id = $1
       ORDER BY u.created_at DESC
       LIMIT 50`,
      [roleId]
    );

    res.json({
      success: true,
      data: {
        role: result.rows[0],
        users: usersResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role',
    });
  }
};

// Create new role
export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required',
      });
    }

    // Check if role already exists
    const existingRole = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      [name]
    );

    if (existingRole.rowCount! > 0) {
      return res.status(409).json({
        success: false,
        message: 'Role with this name already exists',
      });
    }

    const result = await pool.query(
      `INSERT INTO roles (name, description, created_by, updated_by)
       VALUES ($1, $2, $3, $3)
       RETURNING *`,
      [name, description || '', (req as any).user.userId]
    );

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create role',
    });
  }
};

// Update role
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const { name, description } = req.body;

    // Check if role exists
    const existingRole = await pool.query(
      'SELECT id FROM roles WHERE id = $1',
      [roleId]
    );

    if (existingRole.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    // Don't allow editing system roles (Admin, Player)
    if (parseInt(roleId) <= 2) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify system roles (Admin, Player)',
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      // Check if new name conflicts with existing role
      const nameCheck = await pool.query(
        'SELECT id FROM roles WHERE name = $1 AND id != $2',
        [name, roleId]
      );

      if (nameCheck.rowCount! > 0) {
        return res.status(409).json({
          success: false,
          message: 'Role name already exists',
        });
      }

      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_by = $${paramCount++}`);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push((req as any).user.userId);
    values.push(roleId);

    await pool.query(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.json({
      success: true,
      message: 'Role updated successfully',
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role',
    });
  }
};

// Delete role (only if no users assigned)
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    // Don't allow deleting system roles
    if (parseInt(roleId) <= 2) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system roles (Admin, Player)',
      });
    }

    // Check if any users have this role
    const usersWithRole = await pool.query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
      [roleId]
    );

    if (parseInt(usersWithRole.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role with assigned users. Reassign users first.',
      });
    }

    await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role',
    });
  }
};
