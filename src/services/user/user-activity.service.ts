import pool from "../../db/postgres";

export const logUserActivity = async ({
  userId,
  action,
  category,
  description,
  ipAddress,
  userAgent,
  sessionId,
  metadata,
}: {
  userId: number;
  action: string;
  category?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: object;
}) => {
  await pool.query(
    `INSERT INTO user_activity_logs
      (user_id, action, category, description, ip_address, user_agent, session_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      action,
      category || null,
      description || null,
      ipAddress || null,
      userAgent || null,
      sessionId || null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}; 