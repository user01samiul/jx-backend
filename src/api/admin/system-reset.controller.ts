import { Request, Response, NextFunction } from 'express';
import pool from '../../db/postgres';
import { logUserActivity } from '../../services/user/user-activity.service';

interface ResetRequest {
  user_id?: number;
  reset_type: 'user' | 'system';
}

/**
 * Reset user or entire system to fresh state
 * @route POST /api/admin/system/reset
 * @access Admin only
 */
export const resetSystem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUserId = (req as any).user?.userId;
    if (!adminUserId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { user_id, reset_type }: ResetRequest = req.body;

    // Validate request
    if (!reset_type || !['user', 'system'].includes(reset_type)) {
      res.status(400).json({ 
        success: false, 
        message: "reset_type must be 'user' or 'system'" 
      });
      return;
    }

    if (reset_type === 'user' && !user_id) {
      res.status(400).json({ 
        success: false, 
        message: "user_id is required when reset_type is 'user'" 
      });
      return;
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify admin permissions (check user_roles table)
      const adminCheck = await client.query(
        `SELECT r.name as role FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1`,
        [adminUserId]
      );

      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'Admin') {
        res.status(403).json({ 
          success: false, 
          message: "Admin privileges required" 
        });
        return;
      }

      // If resetting specific user, verify user exists
      if (reset_type === 'user' && user_id) {
        const userExists = await client.query(
          'SELECT id, username FROM users WHERE id = $1',
          [user_id]
        );

        if (userExists.rows.length === 0) {
          res.status(404).json({ 
            success: false, 
            message: `User with ID ${user_id} not found` 
          });
          return;
        }
      }

      // Perform the reset
      const resetResult = await performSystemReset(client, reset_type, user_id);

      // Log admin activity
      await logUserActivity({
        userId: adminUserId,
        action: reset_type === 'user' ? 'admin_reset_user' : 'admin_reset_system',
        category: 'admin',
        description: reset_type === 'user' 
          ? `Admin reset user ${user_id} to fresh state`
          : 'Admin reset entire system to fresh state',
        metadata: { 
          reset_type, 
          target_user_id: user_id,
          reset_details: resetResult
        }
      });

      await client.query('COMMIT');

      res.json({
        success: true,
        message: reset_type === 'user' 
          ? `User ${user_id} reset successfully` 
          : 'System reset successfully',
        data: {
          reset_type,
          target_user_id: user_id,
          reset_details: resetResult,
          performed_by: adminUserId,
          performed_at: new Date().toISOString()
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (err: any) {
    next(err);
  }
};

/**
 * Perform the actual system reset
 */
async function performSystemReset(client: any, resetType: string, userId?: number): Promise<any> {
  const resetDetails: any = {
    deleted_bets: 0,
    deleted_transactions: 0,
    deleted_user_activities: 0,
    deleted_payment_transactions: 0,
    deleted_category_balances: 0,
    deleted_main_balances: 0,
    deleted_games: 0,
    reset_profiles: 0,
    reset_statuses: 0
  };

  try {
          // Delete operations in order to avoid foreign key constraints
      const deleteOperations = userId ? [
        { name: 'bets', query: 'DELETE FROM bets WHERE user_id = $1' },
        { name: 'transactions', query: 'DELETE FROM transactions WHERE user_id = $1' },
        { name: 'user_activity_logs', query: 'DELETE FROM user_activity_logs WHERE user_id = $1' },
        // { name: 'payment_transactions', query: 'DELETE FROM payment_transactions WHERE user_id = $1' },
        { name: 'category_balances', query: 'DELETE FROM user_category_balances WHERE user_id = $1' },
        { name: 'main_balances', query: 'DELETE FROM user_balances WHERE user_id = $1' }
      ] : [
        { name: 'bets', query: 'DELETE FROM bets' },
        { name: 'transactions', query: 'DELETE FROM transactions' },
        { name: 'user_activity_logs', query: 'DELETE FROM user_activity_logs' },
        // { name: 'payment_transactions', query: 'DELETE FROM payment_transactions' },
        { name: 'category_balances', query: 'DELETE FROM user_category_balances' },
        { name: 'main_balances', query: 'DELETE FROM user_balances' },
        { name: 'games', query: 'DELETE FROM games' }
      ];

      // Also clear MongoDB data
      try {
        const { MongoService } = require('../../services/mongo/mongo.service');
        
        // Initialize MongoDB connection
        await MongoService.initialize();
        
        if (userId) {
          // Clear specific user data from MongoDB
          await MongoService.getBetsCollection().deleteMany({ user_id: userId });
          await MongoService.getTransactionsCollection().deleteMany({ user_id: userId });
          await MongoService.getUserCategoryBalancesCollection().deleteMany({ user_id: userId });
        } else {
          // Clear all data from MongoDB
          await MongoService.getBetsCollection().deleteMany({});
          await MongoService.getTransactionsCollection().deleteMany({});
          await MongoService.getUserCategoryBalancesCollection().deleteMany({});
        }
        
        console.log('MongoDB data cleared successfully');
      } catch (mongoError) {
        console.error('Error clearing MongoDB data:', mongoError);
        // Don't fail the reset if MongoDB clearing fails
      }

    // Execute delete operations
    for (const operation of deleteOperations) {
      try {
        const result = userId ? 
          await client.query(operation.query, [userId]) :
          await client.query(operation.query);
        
        resetDetails[`deleted_${operation.name}`] = result.rowCount;
      } catch (error) {
        console.error(`Error deleting ${operation.name}:`, error);
      }
    }

    // Reset user profiles
    const profileQuery = userId ? 
      `UPDATE user_profiles SET 
        first_name = u.username,
        last_name = '',
        phone_number = NULL,
        date_of_birth = NULL,
        nationality = 'United States',
        country = 'United States',
        city = NULL,
        address = NULL,
        postal_code = NULL,
        gender = NULL,
        timezone = 'UTC',
        language = 'en',
        currency = 'USD'
      FROM users u WHERE user_profiles.user_id = u.id AND user_profiles.user_id = $1` :
      `UPDATE user_profiles SET 
        first_name = u.username,
        last_name = '',
        phone_number = NULL,
        date_of_birth = NULL,
        nationality = 'United States',
        country = 'United States',
        city = NULL,
        address = NULL,
        postal_code = NULL,
        gender = NULL,
        timezone = 'UTC',
        language = 'en',
        currency = 'USD'
      FROM users u WHERE user_profiles.user_id = u.id`;

    const profileReset = userId ? 
      await client.query(profileQuery, [userId]) :
      await client.query(profileQuery);
    
    resetDetails.reset_profiles = profileReset.rowCount;

    // Reset user statuses to active
    const statusQuery = userId ? 
      `UPDATE users SET status_id = 1 WHERE id = $1 AND status_id != 1` :
      `UPDATE users SET status_id = 1 WHERE status_id != 1`;

    const statusReset = userId ? 
      await client.query(statusQuery, [userId]) :
      await client.query(statusQuery);
    
    resetDetails.reset_statuses = statusReset.rowCount;

    // Reset auto-increment sequences (only for system reset)
    if (!userId) {
      const sequences = [
        'transactions_id_seq',
        'bets_id_seq',
        'user_activity_logs_id_seq'
        // 'payment_transactions_id_seq'
      ];

      for (const sequence of sequences) {
        try {
          await client.query(`ALTER SEQUENCE ${sequence} RESTART WITH 1`);
        } catch (error) {
          console.error(`Error resetting sequence ${sequence}:`, error);
        }
      }
    }

    return resetDetails;

  } catch (error) {
    console.error('Error in performSystemReset:', error);
    throw error;
  }
}

/**
 * Get system reset statistics
 * @route GET /api/admin/system/reset/stats
 * @access Admin only
 */
export const getResetStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUserId = (req as any).user?.userId;
    if (!adminUserId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const client = await pool.connect();
    
    try {
      // Get current system statistics
      const stats = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM user_balances) as total_main_balances,
          (SELECT COUNT(*) FROM user_category_balances) as total_category_balances,
          (SELECT COUNT(*) FROM transactions) as total_transactions,
          (SELECT COUNT(*) FROM bets) as total_bets,
          (SELECT COUNT(*) FROM games) as total_games,
          (SELECT COUNT(*) FROM user_profiles) as total_user_profiles,
          (SELECT COUNT(*) FROM user_activity_logs) as total_user_activity_logs,
          (SELECT COUNT(*) FROM payment_gateways) as total_payment_gateways
      `);

      res.json({
        success: true,
        data: {
          system_stats: stats.rows[0],
          reset_available: true,
          reset_types: ['user', 'system'],
          description: {
            user: 'Reset specific user to fresh state (keeps user account, removes all financial data)',
            system: 'Reset entire system to fresh state (keeps all users, removes all financial data)'
          }
        }
      });

    } finally {
      client.release();
    }

  } catch (err: any) {
    next(err);
  }
}; 