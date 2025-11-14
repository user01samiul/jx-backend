import pool from "../../db/postgres";

export interface AdminActivityData {
  admin_id: number;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log admin activity for audit purposes
 */
export const logAdminActivity = async (
  adminId: number,
  action: string,
  details: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO admin_activities (
        admin_id, 
        action, 
        details, 
        ip_address, 
        user_agent, 
        created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [
        adminId,
        action,
        JSON.stringify(details),
        ipAddress || null,
        userAgent || null
      ]
    );
  } catch (error) {
    console.error('Error logging admin activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

/**
 * Get admin activities with filtering and pagination
 */
export const getAdminActivities = async (
  filters: {
    admin_id?: number;
    action?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  activities: any[];
  total: number;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> => {
  try {
    const {
      admin_id,
      action,
      start_date,
      end_date,
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT 
        aa.id,
        aa.admin_id,
        u.username as admin_username,
        u.email as admin_email,
        aa.action,
        aa.details,
        aa.ip_address,
        aa.user_agent,
        aa.created_at
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    if (admin_id) {
      query += ` AND aa.admin_id = $${paramIndex}`;
      params.push(admin_id);
      paramIndex++;
    }

    if (action) {
      query += ` AND aa.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND aa.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND aa.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY aa.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM admin_activities aa WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (admin_id) {
      countQuery += ` AND aa.admin_id = $${countParamIndex}`;
      countParams.push(admin_id);
      countParamIndex++;
    }

    if (action) {
      countQuery += ` AND aa.action = $${countParamIndex}`;
      countParams.push(action);
      countParamIndex++;
    }

    if (start_date) {
      countQuery += ` AND aa.created_at >= $${countParamIndex}`;
      countParams.push(start_date);
      countParamIndex++;
    }

    if (end_date) {
      countQuery += ` AND aa.created_at <= $${countParamIndex}`;
      countParams.push(end_date);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      activities: result.rows,
      total,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    throw error;
  }
};

/**
 * Get admin activity by ID
 */
export const getAdminActivityById = async (activityId: number): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT 
        aa.id,
        aa.admin_id,
        u.username as admin_username,
        u.email as admin_email,
        aa.action,
        aa.details,
        aa.ip_address,
        aa.user_agent,
        aa.created_at
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      WHERE aa.id = $1`,
      [activityId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching admin activity:', error);
    throw error;
  }
};

/**
 * Get admin activity statistics
 */
export const getAdminActivityStats = async (
  filters: {
    admin_id?: number;
    start_date?: string;
    end_date?: string;
  } = {}
): Promise<{
  total_activities: number;
  unique_admins: number;
  actions_breakdown: any[];
  recent_activities: any[];
}> => {
  try {
    const { admin_id, start_date, end_date } = filters;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (admin_id) {
      whereClause += ` AND admin_id = $${paramIndex}`;
      params.push(admin_id);
      paramIndex++;
    }

    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // Get total activities
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM admin_activities ${whereClause}`,
      params
    );

    // Get unique admins
    const uniqueAdminsResult = await pool.query(
      `SELECT COUNT(DISTINCT admin_id) as total FROM admin_activities ${whereClause}`,
      params
    );

    // Get actions breakdown
    const actionsResult = await pool.query(
      `SELECT 
        action,
        COUNT(*) as count
      FROM admin_activities 
      ${whereClause}
      GROUP BY action 
      ORDER BY count DESC`,
      params
    );

    // Get recent activities
    const recentResult = await pool.query(
      `SELECT 
        aa.id,
        aa.admin_id,
        u.username as admin_username,
        aa.action,
        aa.created_at
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      ${whereClause}
      ORDER BY aa.created_at DESC 
      LIMIT 10`,
      params
    );

    return {
      total_activities: parseInt(totalResult.rows[0].total),
      unique_admins: parseInt(uniqueAdminsResult.rows[0].total),
      actions_breakdown: actionsResult.rows,
      recent_activities: recentResult.rows
    };
  } catch (error) {
    console.error('Error fetching admin activity stats:', error);
    throw error;
  }
};

/**
 * Clean up old admin activities (older than specified days)
 */
export const cleanupOldAdminActivities = async (daysOld: number = 90): Promise<number> => {
  try {
    const result = await pool.query(
      `DELETE FROM admin_activities 
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'`
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up old admin activities:', error);
    throw error;
  }
}; 