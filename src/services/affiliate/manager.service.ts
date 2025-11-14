import pool from "../../db/postgres";

export interface AffiliateTeam {
  id: number;
  name: string;
  description?: string;
  manager_id?: number;
  team_commission_rate: number;
  team_goals?: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ManagerDashboard {
  total_teams: number;
  total_affiliates: number;
  active_affiliates: number;
  total_commission_earned: number;
  team_summaries: Array<{
    team_id: number;
    team_name: string;
    affiliate_count: number;
    active_affiliates: number;
    total_referrals: number;
    total_commission: number;
  }>;
}

export class ManagerService {
  /**
   * Get manager dashboard data
   */
  static async getManagerDashboard(managerId: number): Promise<ManagerDashboard> {
    const client = await pool.connect();
    try {
      // Get basic stats
      const statsResult = await client.query(
        `SELECT 
          COUNT(DISTINCT at.id) as total_teams,
          COUNT(DISTINCT ap.id) as total_affiliates,
          COUNT(CASE WHEN ap.is_active = true THEN 1 END) as active_affiliates,
          COALESCE(SUM(ap.total_commission_earned), 0) as total_commission_earned
        FROM affiliate_teams at
        LEFT JOIN affiliate_profiles ap ON at.id = ap.team_id
        WHERE at.manager_id = $1`,
        [managerId]
      );

      const stats = statsResult.rows[0];

      // Get team summaries
      const teamSummariesResult = await client.query(
        `SELECT 
          at.id as team_id,
          at.name as team_name,
          COUNT(ap.id) as affiliate_count,
          COUNT(CASE WHEN ap.is_active = true THEN 1 END) as active_affiliates,
          COALESCE(SUM(ap.total_referrals), 0) as total_referrals,
          COALESCE(SUM(ap.total_commission_earned), 0) as total_commission
        FROM affiliate_teams at
        LEFT JOIN affiliate_profiles ap ON at.id = ap.team_id
        WHERE at.manager_id = $1
        GROUP BY at.id, at.name
        ORDER BY at.id`,
        [managerId]
      );

      return {
        total_teams: parseInt(stats.total_teams),
        total_affiliates: parseInt(stats.total_affiliates),
        active_affiliates: parseInt(stats.active_affiliates),
        total_commission_earned: parseFloat(stats.total_commission_earned),
        team_summaries: teamSummariesResult.rows
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all teams managed by a manager
   */
  static async getManagerTeams(managerId: number): Promise<AffiliateTeam[]> {
    const result = await pool.query(
      `SELECT * FROM affiliate_teams 
       WHERE manager_id = $1 
       ORDER BY created_at DESC`,
      [managerId]
    );
    return result.rows;
  }

  /**
   * Create a new team
   */
  static async createTeam(managerId: number, teamData: Partial<AffiliateTeam>): Promise<AffiliateTeam> {
    const result = await pool.query(
      `INSERT INTO affiliate_teams (
        name, description, manager_id, team_commission_rate, team_goals
      ) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        teamData.name,
        teamData.description,
        managerId,
        teamData.team_commission_rate || 5.00,
        teamData.team_goals ? JSON.stringify(teamData.team_goals) : null
      ]
    );
    return result.rows[0];
  }

  /**
   * Update team
   */
  static async updateTeam(teamId: number, managerId: number, teamData: Partial<AffiliateTeam>): Promise<AffiliateTeam> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(teamData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'manager_id') {
        if (key === 'team_goals') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(teamId, managerId);
    const result = await pool.query(
      `UPDATE affiliate_teams 
       SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount} AND manager_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error("Team not found or access denied");
    }

    return result.rows[0];
  }

  /**
   * Get affiliates in a team
   */
  static async getTeamAffiliates(teamId: number, managerId: number): Promise<any> {
    // Verify manager has access to this team
    const teamCheck = await pool.query(
      "SELECT id FROM affiliate_teams WHERE id = $1 AND manager_id = $2",
      [teamId, managerId]
    );

    if (teamCheck.rows.length === 0) {
      throw new Error("Team not found or access denied");
    }

    const result = await pool.query(
      `SELECT ap.*, u.username, u.email
       FROM affiliate_profiles ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.team_id = $1
       ORDER BY ap.created_at DESC`,
      [teamId]
    );

    return result.rows;
  }

  /**
   * Assign affiliate to team
   */
  static async assignAffiliateToTeam(affiliateId: number, teamId: number, managerId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify manager has access to this team
      const teamCheck = await client.query(
        "SELECT id FROM affiliate_teams WHERE id = $1 AND manager_id = $2",
        [teamId, managerId]
      );

      if (teamCheck.rows.length === 0) {
        throw new Error("Team not found or access denied");
      }

      // Update affiliate team assignment
      await client.query(
        "UPDATE affiliate_profiles SET team_id = $1, manager_id = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3",
        [teamId, managerId, affiliateId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get team performance
   */
  static async getTeamPerformance(teamId: number, managerId: number): Promise<any> {
    // Verify manager has access to this team
    const teamCheck = await pool.query(
      "SELECT id FROM affiliate_teams WHERE id = $1 AND manager_id = $2",
      [teamId, managerId]
    );

    if (teamCheck.rows.length === 0) {
      throw new Error("Team not found or access denied");
    }

    const result = await pool.query(
      `SELECT 
        at.name as team_name,
        COUNT(ap.id) as total_affiliates,
        COUNT(CASE WHEN ap.is_active = true THEN 1 END) as active_affiliates,
        COALESCE(SUM(ap.total_referrals), 0) as total_referrals,
        COALESCE(SUM(ap.total_commission_earned), 0) as total_commission_earned,
        COALESCE(SUM(ap.total_payouts_received), 0) as total_payouts
      FROM affiliate_teams at
      LEFT JOIN affiliate_profiles ap ON at.id = ap.team_id
      WHERE at.id = $1
      GROUP BY at.id, at.name`,
      [teamId]
    );

    return result.rows[0];
  }
} 