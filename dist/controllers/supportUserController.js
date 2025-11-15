"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupportUserStats = exports.deleteSupportUser = exports.updateSupportUser = exports.createSupportUser = exports.getSupportUserById = exports.getAllSupportUsers = void 0;
const postgres_1 = __importDefault(require("../db/postgres"));
const bcrypt_1 = __importDefault(require("bcrypt"));
/**
 * Support User Management Controller
 * Manages support staff users who can access chat and CRM features
 */
// Get all support users
const getAllSupportUsers = async (req, res) => {
    try {
        const result = await postgres_1.default.query(`SELECT u.id, u.username, u.email, u.created_at, u.status_id,
              s.name as status_name,
              r.name as role_name, r.id as role_id,
              ca.status as agent_status, ca.max_concurrent_chats,
              ca.current_chat_count, ca.total_chats_handled, ca.avg_rating,
              ca.last_active_at as last_agent_activity
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       LEFT JOIN statuses s ON u.status_id = s.id
       LEFT JOIN chat_agents ca ON u.id = ca.user_id
       WHERE ur.role_id IN (1, 3)
       ORDER BY u.created_at DESC`);
        res.json({
            success: true,
            data: {
                users: result.rows,
                total: result.rowCount,
            },
        });
    }
    catch (error) {
        console.error('Error fetching support users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch support users',
        });
    }
};
exports.getAllSupportUsers = getAllSupportUsers;
// Get single support user by ID
const getSupportUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await postgres_1.default.query(`SELECT u.id, u.username, u.email, u.created_at, u.status_id,
              s.name as status_name,
              r.name as role_name, r.id as role_id,
              ca.status as agent_status, ca.max_concurrent_chats,
              ca.current_chat_count, ca.total_chats_handled, ca.avg_rating,
              ca.last_active_at as last_agent_activity,
              ca.specializations, ca.languages, ca.settings
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       LEFT JOIN statuses s ON u.status_id = s.id
       LEFT JOIN chat_agents ca ON u.id = ca.user_id
       WHERE u.id = $1 AND ur.role_id IN (1, 3)`, [userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Support user not found',
            });
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Error fetching support user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch support user',
        });
    }
};
exports.getSupportUserById = getSupportUserById;
// Create new support user
const createSupportUser = async (req, res) => {
    try {
        const { username, email, password, role_id = 3, // Default to Support role
        max_concurrent_chats = 5, specializations = [], languages = ['en'], } = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required',
            });
        }
        // Check if role_id is valid (Admin or Support)
        if (![1, 3].includes(role_id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be Admin (1) or Support (3)',
            });
        }
        // Check if username or email already exists
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
         VALUES ($1, $2, $3, 1, $4)
         RETURNING id, username, email, created_at`, [username, email, hashedPassword, req.user.userId]);
            const newUser = userResult.rows[0];
            // Assign role
            await client.query(`INSERT INTO user_roles (user_id, role_id, created_by)
         VALUES ($1, $2, $3)`, [newUser.id, role_id, req.user.userId]);
            // Create agent profile if Support role
            if (role_id === 3 || role_id === 1) {
                await client.query(`INSERT INTO chat_agents (user_id, status, max_concurrent_chats, specializations, languages)
           VALUES ($1, 'offline', $2, $3, $4)`, [newUser.id, max_concurrent_chats, specializations, languages]);
            }
            await client.query('COMMIT');
            res.status(201).json({
                success: true,
                message: 'Support user created successfully',
                data: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    role_id,
                    created_at: newUser.created_at,
                },
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
        console.error('Error creating support user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create support user',
        });
    }
};
exports.createSupportUser = createSupportUser;
// Update support user
const updateSupportUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, password, status_id, role_id, max_concurrent_chats, specializations, languages, } = req.body;
        // Check if user exists and is a support user
        const existingUser = await postgres_1.default.query(`SELECT u.id FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.id = $1 AND ur.role_id IN (1, 3)`, [userId]);
        if (existingUser.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Support user not found',
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
            if (status_id) {
                userUpdates.push(`status_id = $${paramCount++}`);
                userValues.push(status_id);
            }
            if (userUpdates.length > 0) {
                userUpdates.push(`updated_by = $${paramCount++}`);
                userUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
                userValues.push(req.user.userId);
                userValues.push(userId);
                await client.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${paramCount}`, userValues);
            }
            // Update role if provided
            if (role_id && [1, 3].includes(role_id)) {
                await client.query(`UPDATE user_roles SET role_id = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3`, [role_id, req.user.userId, userId]);
            }
            // Update agent settings
            const agentUpdates = [];
            const agentValues = [];
            paramCount = 1;
            if (max_concurrent_chats !== undefined) {
                agentUpdates.push(`max_concurrent_chats = $${paramCount++}`);
                agentValues.push(max_concurrent_chats);
            }
            if (specializations !== undefined) {
                agentUpdates.push(`specializations = $${paramCount++}`);
                agentValues.push(specializations);
            }
            if (languages !== undefined) {
                agentUpdates.push(`languages = $${paramCount++}`);
                agentValues.push(languages);
            }
            if (agentUpdates.length > 0) {
                agentUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
                agentValues.push(userId);
                await client.query(`UPDATE chat_agents SET ${agentUpdates.join(', ')} WHERE user_id = $${paramCount}`, agentValues);
            }
            await client.query('COMMIT');
            res.json({
                success: true,
                message: 'Support user updated successfully',
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
        console.error('Error updating support user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update support user',
        });
    }
};
exports.updateSupportUser = updateSupportUser;
// Delete support user (soft delete by setting status to inactive)
const deleteSupportUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // Check if user exists and is a support user
        const existingUser = await postgres_1.default.query(`SELECT u.id FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.id = $1 AND ur.role_id IN (1, 3)`, [userId]);
        if (existingUser.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Support user not found',
            });
        }
        // Don't allow deleting yourself
        if (parseInt(userId) === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account',
            });
        }
        // Soft delete by setting status to inactive (status_id = 2)
        await postgres_1.default.query(`UPDATE users SET status_id = 2, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [req.user.userId, userId]);
        // Set agent status to offline
        await postgres_1.default.query(`UPDATE chat_agents SET status = 'offline', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`, [userId]);
        res.json({
            success: true,
            message: 'Support user deactivated successfully',
        });
    }
    catch (error) {
        console.error('Error deleting support user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete support user',
        });
    }
};
exports.deleteSupportUser = deleteSupportUser;
// Get support user statistics
const getSupportUserStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await postgres_1.default.query(`SELECT
        ca.total_chats_handled,
        ca.avg_rating,
        ca.avg_response_time,
        ca.current_chat_count,
        ca.max_concurrent_chats,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN cs.status = 'active' THEN cs.id END) as active_sessions,
        COUNT(DISTINCT CASE WHEN cs.status = 'closed' THEN cs.id END) as closed_sessions,
        AVG(CASE WHEN cs.closed_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (cs.closed_at - cs.started_at)) / 60
            END) as avg_session_duration_minutes
       FROM chat_agents ca
       LEFT JOIN chat_sessions cs ON cs.assigned_agent_id = ca.user_id
       WHERE ca.user_id = $1
       GROUP BY ca.user_id, ca.total_chats_handled, ca.avg_rating,
                ca.avg_response_time, ca.current_chat_count, ca.max_concurrent_chats`, [userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Support user not found',
            });
        }
        res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('Error fetching support user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch support user statistics',
        });
    }
};
exports.getSupportUserStats = getSupportUserStats;
