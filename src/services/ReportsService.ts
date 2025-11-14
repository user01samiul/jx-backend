import pool from '../db/postgres';
import pgFormat from 'pg-format';

interface CustomReport {
  id?: number;
  name: string;
  description: string;
  category: 'FINANCIAL' | 'PLAYER' | 'GAME' | 'MARKETING' | 'RISK' | 'OPERATIONAL';
  sql_query: string;
  parameters?: any;
  schedule?: 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recipients?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  created_by: number;
}

interface ReportExecution {
  id?: number;
  report_id: number;
  executed_by: number;
  parameters?: any;
  row_count?: number;
  execution_time_ms?: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  error_message?: string;
}

class ReportsService {
  /**
   * Get all custom reports
   */
  async getAllReports(category?: string, status?: string): Promise<any[]> {
    let query = 'SELECT * FROM custom_reports WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get report by ID
   */
  async getReportById(reportId: number): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM custom_reports WHERE id = $1',
      [reportId]
    );
    return result.rows[0];
  }

  /**
   * Create custom report (Admin)
   */
  async createReport(report: CustomReport): Promise<any> {
    // Validate SQL query (basic validation)
    if (!this.validateSqlQuery(report.sql_query)) {
      throw new Error('Invalid or unsafe SQL query');
    }

    const result = await pool.query(
      `INSERT INTO custom_reports (
        name, description, category, sql_query, parameters, schedule, recipients, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        report.name,
        report.description,
        report.category,
        report.sql_query,
        report.parameters ? JSON.stringify(report.parameters) : null,
        report.schedule || 'MANUAL',
        report.recipients ? JSON.stringify(report.recipients) : null,
        report.status,
        report.created_by
      ]
    );
    return result.rows[0];
  }

  /**
   * Update custom report (Admin)
   */
  async updateReport(reportId: number, updates: Partial<CustomReport>): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Validate SQL query if being updated
    if (updates.sql_query && !this.validateSqlQuery(updates.sql_query)) {
      throw new Error('Invalid or unsafe SQL query');
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        if ((key === 'parameters' || key === 'recipients') && typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(reportId);

    const result = await pool.query(
      `UPDATE custom_reports SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete custom report (Admin)
   */
  async deleteReport(reportId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM custom_reports WHERE id = $1',
      [reportId]
    );
    return result.rowCount > 0;
  }

  /**
   * Execute custom report
   */
  async executeReport(reportId: number, executedBy: number, params?: any): Promise<any> {
    const startTime = Date.now();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get report definition
      const reportResult = await client.query(
        'SELECT * FROM custom_reports WHERE id = $1 AND status = $2',
        [reportId, 'ACTIVE']
      );

      if (reportResult.rows.length === 0) {
        throw new Error('Report not found or inactive');
      }

      const report = reportResult.rows[0];

      // Create execution record
      const executionResult = await client.query(
        `INSERT INTO report_executions (report_id, executed_by, parameters, status)
         VALUES ($1, $2, $3, 'RUNNING')
         RETURNING id`,
        [reportId, executedBy, params ? JSON.stringify(params) : null]
      );

      const executionId = executionResult.rows[0].id;

      // Execute the SQL query with parameters
      let sqlQuery = report.sql_query;

      // Replace parameters in query if provided
      if (params && Object.keys(params).length > 0) {
        Object.entries(params).forEach(([key, value]) => {
          sqlQuery = sqlQuery.replace(new RegExp(`\\$${key}`, 'g'), this.sanitizeValue(value));
        });
      }

      // Execute query
      const queryResult = await client.query(sqlQuery);
      const executionTime = Date.now() - startTime;

      // Update execution record
      await client.query(
        `UPDATE report_executions
         SET status = 'COMPLETED', row_count = $1, execution_time_ms = $2, completed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [queryResult.rowCount, executionTime, executionId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        executionId,
        data: queryResult.rows,
        rowCount: queryResult.rowCount,
        executionTime
      };
    } catch (error: any) {
      await client.query('ROLLBACK');

      // Log failed execution
      await client.query(
        `UPDATE report_executions
         SET status = 'FAILED', error_message = $1, completed_at = CURRENT_TIMESTAMP
         WHERE report_id = $2 AND executed_by = $3
         ORDER BY created_at DESC LIMIT 1`,
        [error.message, reportId, executedBy]
      );

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get report execution history
   */
  async getReportExecutions(reportId: number, limit: number = 50): Promise<any[]> {
    const result = await pool.query(
      `SELECT re.*, u.username as executed_by_username
       FROM report_executions re
       JOIN users u ON re.executed_by = u.id
       WHERE re.report_id = $1
       ORDER BY re.created_at DESC
       LIMIT $2`,
      [reportId, limit]
    );
    return result.rows;
  }

  /**
   * Get all report executions (Admin)
   */
  async getAllExecutions(limit: number = 100): Promise<any[]> {
    const result = await pool.query(
      `SELECT re.*, cr.name as report_name, u.username as executed_by_username
       FROM report_executions re
       JOIN custom_reports cr ON re.report_id = cr.id
       JOIN users u ON re.executed_by = u.id
       ORDER BY re.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Validate SQL query for safety
   */
  private validateSqlQuery(query: string): boolean {
    const uppercaseQuery = query.toUpperCase();

    // Disallow dangerous operations
    const dangerousKeywords = [
      'DROP',
      'DELETE FROM users',
      'UPDATE users',
      'TRUNCATE',
      'ALTER',
      'CREATE',
      'GRANT',
      'REVOKE',
      'INSERT INTO'
    ];

    for (const keyword of dangerousKeywords) {
      if (uppercaseQuery.includes(keyword)) {
        return false;
      }
    }

    // Must be a SELECT query
    if (!uppercaseQuery.trim().startsWith('SELECT')) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize parameter values
   */
  private sanitizeValue(value: any): string {
    if (typeof value === 'string') {
      // Escape single quotes
      return `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'number') {
      return value.toString();
    } else if (value === null || value === undefined) {
      return 'NULL';
    } else if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    } else {
      return `'${JSON.stringify(value)}'`;
    }
  }

  /**
   * Get predefined report templates
   */
  async getReportTemplates(): Promise<any[]> {
    return [
      {
        name: 'Daily Revenue Report',
        category: 'FINANCIAL',
        description: 'Total deposits, withdrawals, and GGR for the day',
        sql_query: `
          SELECT
            DATE(created_at) as date,
            SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
            SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
            SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) -
            SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as net_revenue
          FROM transactions
          WHERE created_at >= CURRENT_DATE
          GROUP BY DATE(created_at)
        `
      },
      {
        name: 'Top Players by Wagering',
        category: 'PLAYER',
        description: 'Players with highest wagering amounts',
        sql_query: `
          SELECT
            u.id, u.username, u.email,
            COUNT(*) as total_bets,
            SUM(amount) as total_wagered
          FROM transactions t
          JOIN users u ON t.user_id = u.id
          WHERE t.type = 'bet' AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY u.id, u.username, u.email
          ORDER BY total_wagered DESC
          LIMIT 100
        `
      },
      {
        name: 'Game Performance Report',
        category: 'GAME',
        description: 'Performance metrics for each game',
        sql_query: `
          SELECT
            g.id, g.name, g.provider,
            COUNT(*) as play_count,
            COUNT(DISTINCT user_id) as unique_players
          FROM games g
          LEFT JOIN game_sessions gs ON g.id = gs.game_id
          WHERE gs.created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY g.id, g.name, g.provider
          ORDER BY play_count DESC
        `
      },
      {
        name: 'New Players Report',
        category: 'MARKETING',
        description: 'New player registrations and activity',
        sql_query: `
          SELECT
            DATE(created_at) as registration_date,
            COUNT(*) as new_players,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_players
          FROM users
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY registration_date DESC
        `
      },
      {
        name: 'High Risk Players Report',
        category: 'RISK',
        description: 'Players with elevated risk scores',
        sql_query: `
          SELECT
            u.id, u.username, u.email, u.status,
            prs.risk_score, prs.last_updated
          FROM player_risk_scores prs
          JOIN users u ON prs.user_id = u.id
          WHERE prs.risk_score >= 10
          ORDER BY prs.risk_score DESC
        `
      }
    ];
  }

  /**
   * Create report from template
   */
  async createFromTemplate(templateIndex: number, createdBy: number): Promise<any> {
    const templates = await this.getReportTemplates();

    if (templateIndex < 0 || templateIndex >= templates.length) {
      throw new Error('Invalid template index');
    }

    const template = templates[templateIndex];

    return await this.createReport({
      ...template,
      status: 'ACTIVE',
      created_by: createdBy
    });
  }
}

export default new ReportsService();
