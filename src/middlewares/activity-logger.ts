import { Request, Response, NextFunction } from 'express';
import pool from '../db/postgres';

/**
 * Activity Logger Middleware
 * Logs all admin actions to admin_activities table
 */

interface ActivityDetails {
  [key: string]: any;
}

/**
 * Log an activity to the admin_activities table
 */
export const logActivity = async (
  req: Request,
  action: string,
  details: ActivityDetails = {}
): Promise<void> => {
  try {
    const user = (req as any).user;

    if (!user || !user.userId) {
      console.warn('[ActivityLogger] No user found in request, skipping log');
      return;
    }

    const adminId = user.userId;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Add request metadata to details
    const enrichedDetails = {
      ...details,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO admin_activities (admin_id, action, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [adminId, action, JSON.stringify(enrichedDetails), ipAddress, userAgent]
    );

    console.log(`[ActivityLogger] Logged: ${action} by user ${adminId}`);
  } catch (error) {
    console.error('[ActivityLogger] Error logging activity:', error);
    // Don't throw - logging shouldn't break the main flow
  }
};

/**
 * Middleware to automatically log endpoint access
 * Use this for important admin endpoints
 */
export const autoLogActivity = (action: string, getDetails?: (req: Request) => ActivityDetails) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const details = getDetails ? getDetails(req) : {};
      await logActivity(req, action, details);
    } catch (error) {
      console.error('[ActivityLogger] Auto-log error:', error);
    }
    next();
  };
};

/**
 * Helper to log after successful response
 */
export const logAfterSuccess = (
  req: Request,
  res: Response,
  action: string,
  details: ActivityDetails = {}
) => {
  // Log asynchronously without blocking response
  setImmediate(async () => {
    try {
      await logActivity(req, action, details);
    } catch (error) {
      console.error('[ActivityLogger] Post-response log error:', error);
    }
  });
};

export default {
  logActivity,
  autoLogActivity,
  logAfterSuccess,
};
