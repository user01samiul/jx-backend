import pool from '../db/postgres';

interface RiskRule {
  id?: number;
  name: string;
  description: string;
  rule_type: 'DEPOSIT_PATTERN' | 'WITHDRAWAL_PATTERN' | 'BETTING_PATTERN' | 'WIN_RATE' | 'BONUS_ABUSE' | 'MULTI_ACCOUNT';
  condition: any;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'LOG' | 'FLAG' | 'LIMIT' | 'BLOCK' | 'REVIEW';
  action_config?: any;
  status: 'ACTIVE' | 'INACTIVE';
  priority: number;
}

interface RiskEvent {
  id?: number;
  user_id: number;
  rule_id: number;
  event_type: string;
  risk_level: string;
  details: any;
  action_taken?: string;
  resolved: boolean;
}

class RiskManagementService {
  /**
   * Get all risk rules
   */
  async getAllRules(status?: string): Promise<any[]> {
    let query = 'SELECT * FROM risk_rules';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get risk rule by ID
   */
  async getRuleById(ruleId: number): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM risk_rules WHERE id = $1',
      [ruleId]
    );
    return result.rows[0];
  }

  /**
   * Create risk rule (Admin)
   */
  async createRule(rule: RiskRule): Promise<any> {
    const result = await pool.query(
      `INSERT INTO risk_rules (
        name, description, rule_type, condition, risk_level, action, action_config, status, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        rule.name,
        rule.description,
        rule.rule_type,
        JSON.stringify(rule.condition),
        rule.risk_level,
        rule.action,
        rule.action_config ? JSON.stringify(rule.action_config) : null,
        rule.status,
        rule.priority
      ]
    );
    return result.rows[0];
  }

  /**
   * Update risk rule (Admin)
   */
  async updateRule(ruleId: number, updates: Partial<RiskRule>): Promise<any> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        if ((key === 'condition' || key === 'action_config') && typeof value === 'object') {
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

    values.push(ruleId);

    const result = await pool.query(
      `UPDATE risk_rules SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete risk rule (Admin)
   */
  async deleteRule(ruleId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM risk_rules WHERE id = $1',
      [ruleId]
    );
    return result.rowCount > 0;
  }

  /**
   * Evaluate user against all active risk rules
   */
  async evaluateUser(userId: number): Promise<any[]> {
    const triggeredRules: any[] = [];

    // Get all active rules
    const rules = await this.getAllRules('ACTIVE');

    // Get user data for evaluation
    const userData = await this.getUserRiskData(userId);

    for (const rule of rules) {
      const condition = JSON.parse(rule.condition);
      let triggered = false;
      let details: any = {};

      switch (rule.rule_type) {
        case 'DEPOSIT_PATTERN':
          triggered = await this.checkDepositPattern(userId, condition);
          details = { type: 'deposit_pattern', condition };
          break;

        case 'WITHDRAWAL_PATTERN':
          triggered = await this.checkWithdrawalPattern(userId, condition);
          details = { type: 'withdrawal_pattern', condition };
          break;

        case 'BETTING_PATTERN':
          triggered = await this.checkBettingPattern(userId, condition);
          details = { type: 'betting_pattern', condition };
          break;

        case 'WIN_RATE':
          triggered = await this.checkWinRate(userId, condition);
          details = { type: 'win_rate', condition };
          break;

        case 'BONUS_ABUSE':
          triggered = await this.checkBonusAbuse(userId, condition);
          details = { type: 'bonus_abuse', condition };
          break;

        case 'MULTI_ACCOUNT':
          triggered = await this.checkMultiAccount(userId, condition);
          details = { type: 'multi_account', condition };
          break;
      }

      if (triggered) {
        // Log risk event
        await this.logRiskEvent(userId, rule.id, rule.rule_type, rule.risk_level, details);

        // Execute action
        await this.executeRiskAction(userId, rule);

        triggeredRules.push({
          rule_id: rule.id,
          rule_name: rule.name,
          risk_level: rule.risk_level,
          action: rule.action
        });
      }
    }

    return triggeredRules;
  }

  /**
   * Get user risk data for evaluation
   */
  private async getUserRiskData(userId: number): Promise<any> {
    const user = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    // Get recent transactions
    const deposits = await pool.query(
      `SELECT COUNT(*) as count, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1 AND type = 'deposit' AND created_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );

    const withdrawals = await pool.query(
      `SELECT COUNT(*) as count, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1 AND type = 'withdrawal' AND created_at > NOW() - INTERVAL '30 days'`,
      [userId]
    );

    return {
      user: user.rows[0],
      deposits: deposits.rows[0],
      withdrawals: withdrawals.rows[0]
    };
  }

  /**
   * Check deposit pattern
   */
  private async checkDepositPattern(userId: number, condition: any): Promise<boolean> {
    const timeframe = condition.timeframe_hours || 24;
    const minCount = condition.min_count || 5;
    const minAmount = condition.min_amount || 1000;

    const result = await pool.query(
      `SELECT COUNT(*) as count, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1 AND type = 'deposit'
       AND created_at > NOW() - INTERVAL '${timeframe} hours'`,
      [userId]
    );

    const { count, total } = result.rows[0];
    return parseInt(count) >= minCount || parseFloat(total || 0) >= minAmount;
  }

  /**
   * Check withdrawal pattern
   */
  private async checkWithdrawalPattern(userId: number, condition: any): Promise<boolean> {
    const timeframe = condition.timeframe_hours || 24;
    const minCount = condition.min_count || 3;

    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM transactions
       WHERE user_id = $1 AND type = 'withdrawal'
       AND created_at > NOW() - INTERVAL '${timeframe} hours'`,
      [userId]
    );

    return parseInt(result.rows[0].count) >= minCount;
  }

  /**
   * Check betting pattern
   */
  private async checkBettingPattern(userId: number, condition: any): Promise<boolean> {
    const timeframe = condition.timeframe_hours || 24;
    const maxBetAmount = condition.max_bet_amount || 10000;

    // This would require bet history tracking
    // For now, return false as placeholder
    return false;
  }

  /**
   * Check win rate
   */
  private async checkWinRate(userId: number, condition: any): Promise<boolean> {
    const minWinRate = condition.min_win_rate || 0.8; // 80%
    const minGames = condition.min_games || 100;

    // This would require game history tracking
    // Placeholder implementation
    return false;
  }

  /**
   * Check bonus abuse
   */
  private async checkBonusAbuse(userId: number, condition: any): Promise<boolean> {
    const timeframe = condition.timeframe_days || 30;
    const maxBonusClaims = condition.max_bonus_claims || 10;

    // Count bonus claims
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM transactions
       WHERE user_id = $1 AND type = 'bonus'
       AND created_at > NOW() - INTERVAL '${timeframe} days'`,
      [userId]
    );

    return parseInt(result.rows[0].count) >= maxBonusClaims;
  }

  /**
   * Check multi-account
   */
  private async checkMultiAccount(userId: number, condition: any): Promise<boolean> {
    // Check for users with same IP, device, or payment method
    const user = await pool.query(
      'SELECT last_login_ip FROM users WHERE id = $1',
      [userId]
    );

    if (!user.rows[0]?.last_login_ip) {
      return false;
    }

    const sameIpUsers = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE last_login_ip = $1 AND id != $2',
      [user.rows[0].last_login_ip, userId]
    );

    const maxAccountsPerIp = condition.max_accounts_per_ip || 1;
    return parseInt(sameIpUsers.rows[0].count) > maxAccountsPerIp;
  }

  /**
   * Log risk event
   */
  async logRiskEvent(
    userId: number,
    ruleId: number,
    eventType: string,
    riskLevel: string,
    details: any
  ): Promise<any> {
    const result = await pool.query(
      `INSERT INTO risk_events (user_id, rule_id, event_type, risk_level, details, resolved)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [userId, ruleId, eventType, riskLevel, JSON.stringify(details)]
    );

    // Update player risk score
    await this.updatePlayerRiskScore(userId, riskLevel);

    return result.rows[0];
  }

  /**
   * Execute risk action
   */
  private async executeRiskAction(userId: number, rule: any): Promise<void> {
    const actionConfig = rule.action_config ? JSON.parse(rule.action_config) : {};

    switch (rule.action) {
      case 'LOG':
        // Already logged in logRiskEvent
        break;

      case 'FLAG':
        // Flag user account for review
        await pool.query(
          "UPDATE users SET status = 'flagged', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [userId]
        );
        break;

      case 'LIMIT':
        // Apply limits (deposit limit, bet limit, etc.)
        const limitAmount = actionConfig.limit_amount || 100;
        await pool.query(
          `UPDATE users SET deposit_limit = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [limitAmount, userId]
        );
        break;

      case 'BLOCK':
        // Block user account
        await pool.query(
          "UPDATE users SET is_active = false, status = 'blocked', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [userId]
        );
        break;

      case 'REVIEW':
        // Mark for manual review
        await pool.query(
          "UPDATE users SET requires_review = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [userId]
        );
        break;
    }
  }

  /**
   * Update player risk score
   */
  private async updatePlayerRiskScore(userId: number, riskLevel: string): Promise<void> {
    const riskPoints: any = {
      'LOW': 1,
      'MEDIUM': 3,
      'HIGH': 5,
      'CRITICAL': 10
    };

    const points = riskPoints[riskLevel] || 0;

    await pool.query(
      `INSERT INTO player_risk_scores (user_id, risk_score, last_updated)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET risk_score = player_risk_scores.risk_score + $2, last_updated = CURRENT_TIMESTAMP`,
      [userId, points]
    );
  }

  /**
   * Get risk events for user
   */
  async getUserRiskEvents(userId: number, resolved?: boolean, limit: number = 50): Promise<any[]> {
    let query = `
      SELECT re.*, rr.name as rule_name, rr.description as rule_description
      FROM risk_events re
      JOIN risk_rules rr ON re.rule_id = rr.id
      WHERE re.user_id = $1
    `;
    const params: any[] = [userId];

    if (resolved !== undefined) {
      query += ' AND re.resolved = $2';
      params.push(resolved);
    }

    query += ' ORDER BY re.created_at DESC LIMIT $' + (resolved !== undefined ? '3' : '2');
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get player risk score
   */
  async getPlayerRiskScore(userId: number): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM player_risk_scores WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Resolve risk event
   */
  async resolveRiskEvent(eventId: number, resolution: string): Promise<any> {
    const result = await pool.query(
      `UPDATE risk_events
       SET resolved = true, action_taken = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [resolution, eventId]
    );
    return result.rows[0];
  }

  /**
   * Get high-risk players (Admin)
   */
  async getHighRiskPlayers(minScore: number = 10, limit: number = 100): Promise<any[]> {
    const result = await pool.query(
      `SELECT prs.*, u.username, u.email, u.status
       FROM player_risk_scores prs
       JOIN users u ON prs.user_id = u.id
       WHERE prs.risk_score >= $1
       ORDER BY prs.risk_score DESC
       LIMIT $2`,
      [minScore, limit]
    );
    return result.rows;
  }
}

export default new RiskManagementService();
