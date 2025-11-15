"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const postgres_1 = __importDefault(require("../db/postgres"));
const bcrypt_1 = __importDefault(require("bcrypt"));
/**
 * User Management Controller
 * Complete user management for admin panel
 */
// Get all users with advanced filtering
const getAllUsers = async (req, res) => {
    try {
        const { role_id, status_id, search, limit = 50, offset = 0, sort_by = 'created_at', sort_order = 'DESC', } = req.query;
        let query = `
      SELECT u.id, u.username, u.email, u.created_at, u.status_id, u.kyc_verified,
             s.name as status_name,
             r.name as role_name, r.id as role_id,
             COUNT(DISTINCT t.id) as transaction_count,
             COALESCE(SUM(CASE WHEN t.type = 'deposit' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_deposits,
             COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_withdrawals
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN statuses s ON u.status_id = s.id
      LEFT JOIN transactions t ON u.id = t.user_id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;
        if (role_id) {
            query += ` AND ur.role_id = $${paramCount++}`;
            params.push(role_id);
        }
        if (status_id) {
            query += ` AND u.status_id = $${paramCount++}`;
            params.push(status_id);
        }
        if (search) {
            query += ` AND (u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }
        query += `
      GROUP BY u.id, u.username, u.email, u.created_at, u.status_id, u.kyc_verified,
               s.name, r.name, r.id
      ORDER BY u.${sort_by} ${sort_order}
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;
        params.push(limit, offset);
        const result = await postgres_1.default.query(query, params);
        // Get total count
        let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE 1=1
    `;
        const countParams = [];
        let countParamNum = 1;
        if (role_id) {
            countQuery += ` AND ur.role_id = $${countParamNum++}`;
            countParams.push(role_id);
        }
        if (status_id) {
            countQuery += ` AND u.status_id = $${countParamNum++}`;
            countParams.push(status_id);
        }
        if (search) {
            countQuery += ` AND (u.username ILIKE $${countParamNum} OR u.email ILIKE $${countParamNum})`;
            countParams.push(`%${search}%`);
        }
        const countResult = await postgres_1.default.query(countQuery, countParams);
        res.json({
            success: true,
            data: {
                users: result.rows,
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
            },
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
        });
    }
};
exports.getAllUsers = getAllUsers;
// Get user by ID with full details
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const userResult = await postgres_1.default.query(`SELECT u.*,
              s.name as status_name,
              r.name as role_name, r.id as role_id
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       LEFT JOIN statuses s ON u.status_id = s.id
       WHERE u.id = $1`, [userId]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        // Get transaction summary
        const transactionsResult = await postgres_1.default.query(`SELECT
         COUNT(*) as total_transactions,
         SUM(CASE WHEN type = 'deposit' AND status = 'completed' THEN amount ELSE 0 END) as total_deposits,
         SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END) as total_withdrawals,
         SUM(CASE WHEN type = 'deposit' AND status = 'completed' THEN 1 ELSE 0 END) as deposit_count,
         SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN 1 ELSE 0 END) as withdrawal_count
       FROM transactions
       WHERE user_id = $1`, [userId]);
        res.json({
            success: true,
            data: {
                user: userResult.rows[0],
                transactions: transactionsResult.rows[0],
            },
        });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details',
        });
    }
};
exports.getUserById = getUserById;
// Create new user
const createUser = async (req, res) => {
    try {
        const { username, email, password, role_id = 2, // Default to Player
        status_id = 1, // Default to Active
         } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required',
            });
        }
        // Check if user already exists
        const existingUser = await postgres_1.default.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existingUser.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists',
            });
        }
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Hash password
            const hashedPassword = await bcrypt_1.default.hash(password, 10);
            // Create user
            const userResult = await client.query(`INSERT INTO users (username, email, password, status_id, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, created_at, status_id`, [username, email, hashedPassword, status_id, req.user.userId]);
            const newUser = userResult.rows[0];
            // Assign role
            await client.query(`INSERT INTO user_roles (user_id, role_id, created_by)
         VALUES ($1, $2, $3)`, [newUser.id, role_id, req.user.userId]);
            await client.query('COMMIT');
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: newUser,
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
        });
    }
};
exports.createUser = createUser;
// Update user
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, password, status_id, role_id, kyc_verified, } = req.body;
        // Check if user exists
        const existingUser = await postgres_1.default.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (existingUser.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }
        const client = await postgres_1.default.connect();
        try {
            await client.query('BEGIN');
            // Update user basic info
            const userUpdates = [];
            const userValues = [];
            let paramCount = 1;
            if (email) {
                userUpdates.push(`email = $${paramCount++}`);
                userValues.push(email);
            }
            if (password) {
                const hashedPassword = await bcrypt_1.default.hash(password, 10);
                userUpdates.push(`password = $${paramCount++}`);
                userValues.push(hashedPassword);
            }
            if (status_id !== undefined) {
                userUpdates.push(`status_id = $${paramCount++}`);
                userValues.push(status_id);
            }
            if (kyc_verified !== undefined) {
                userUpdates.push(`kyc_verified = $${paramCount++}`);
                userValues.push(kyc_verified);
                if (kyc_verified) {
                    userUpdates.push(`kyc_verified_at = CURRENT_TIMESTAMP`);
                    userUpdates.push(`kyc_status = 'approved'`);
                }
            }
            if (userUpdates.length > 0) {
                userUpdates.push(`updated_by = $${paramCount++}`);
                userUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
                userValues.push(req.user.userId);
                userValues.push(userId);
                await client.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramCount}`, userValues);
            }
            // Update role if provided
            if (role_id !== undefined) {
                await client.query(`UPDATE user_roles SET role_id = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3`, [role_id, req.user.userId, userId]);
            }
            await client.query('COMMIT');
            res.json({
                success: true,
                message: 'User updated successfully',
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
        });
    }
};
exports.updateUser = updateUser;
// Delete user (soft delete by setting status to inactive)
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // Don't allow deleting yourself
        if (parseInt(userId) === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account',
            });
        }
        // Don't allow deleting admin with ID 1
        if (parseInt(userId) === 1) {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete primary admin account',
            });
        }
        // Soft delete by setting status to inactive
        await postgres_1.default.query(`UPDATE users SET status_id = 2, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [req.user.userId, userId]);
        res.json({
            success: true,
            message: 'User deactivated successfully',
        });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
        });
    }
};
exports.deleteUser = deleteUser;
// Get user statistics dashboard
const getUserStats = async (req, res) => {
    try {
        const statsResult = await postgres_1.default.query(`
      SELECT
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.status_id = 1 THEN u.id END) as active_users,
        COUNT(DISTINCT CASE WHEN u.kyc_verified = true THEN u.id END) as verified_users,
        COUNT(DISTINCT CASE WHEN ur.role_id = 1 THEN u.id END) as admin_count,
        COUNT(DISTINCT CASE WHEN ur.role_id = 3 THEN u.id END) as support_count,
        COUNT(DISTINCT CASE WHEN ur.role_id = 2 THEN u.id END) as player_count,
        COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '24 hours' THEN u.id END) as new_users_24h,
        COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN u.id END) as new_users_7d,
        COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN u.id END) as new_users_30d
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
    `);
        res.json({
            success: true,
            data: statsResult.rows[0],
        });
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user statistics',
        });
    }
};
exports.getUserStats = getUserStats;
