import pool from "../../db/postgres";

// =====================================================
// RTP SETTINGS MANAGEMENT - CONNECTED TO rtp_settings TABLE
// =====================================================

/**
 * Get RTP Settings from rtp_settings table
 * Returns actual data from database instead of mock data
 */
export const getRTPSettingsFromDatabase = async () => {
  try {
    // Get latest RTP settings
    const settingsQuery = `
      SELECT
        id,
        target_profit_percent,
        effective_rtp,
        updated_at,
        adjustment_mode,
        global_rtp,
        auto_adjustment_enabled,
        adjustment_threshold,
        max_rtp,
        min_rtp,
        provider_settings,
        category_settings,
        settings_metadata,
        global_override_enabled
      FROM rtp_settings
      ORDER BY id DESC
      LIMIT 1
    `;

    const settingsResult = await pool.query(settingsQuery);

    if (settingsResult.rows.length === 0) {
      // Return default settings if none exist
      return {
        id: null,
        default_rtp: 80.0,
        global_rtp: 80.0,
        target_profit: 20.0,
        effective_rtp: 80.0,
        auto_adjustment_enabled: false,
        adjustment_threshold: 5.0,
        max_rtp: 99.0,
        min_rtp: 50.0,
        adjustment_mode: 'manual',
        global_override_enabled: false,
        provider_settings: {},
        category_settings: {},
        settings_metadata: {},
        rtp_ranges: {},
        rtp_categories: {}
      };
    }

    const settings = settingsResult.rows[0];

    return {
      id: settings.id,
      default_rtp: parseFloat(settings.effective_rtp || 80),
      global_rtp: parseFloat(settings.global_rtp || 80),
      target_profit: parseFloat(settings.target_profit_percent || 20),
      effective_rtp: parseFloat(settings.effective_rtp || 80),
      auto_adjustment_enabled: settings.auto_adjustment_enabled || false,
      adjustment_threshold: parseFloat(settings.adjustment_threshold || 5),
      max_rtp: parseFloat(settings.max_rtp || 99),
      min_rtp: parseFloat(settings.min_rtp || 50),
      adjustment_mode: settings.adjustment_mode || 'manual',
      global_override_enabled: settings.global_override_enabled || false,
      provider_settings: settings.provider_settings || {},
      category_settings: settings.category_settings || {},
      settings_metadata: settings.settings_metadata || {},
      // Legacy format for backward compatibility
      rtp_ranges: settings.provider_settings || {},
      rtp_categories: settings.category_settings || {},
      updated_at: settings.updated_at
    };
  } catch (error) {
    console.error('[RTP_SERVICE] Error getting RTP settings from database:', error);
    throw error;
  }
};

/**
 * Update RTP Settings in rtp_settings table
 */
export const updateRTPSettingsInDatabase = async (rtpData: any) => {
  try {
    console.log('[RTP_SERVICE] Updating RTP settings:', JSON.stringify(rtpData, null, 2));

    // Extract all possible fields from the request
    const {
      global,
      provider_settings,
      category_settings,
      settings_metadata,
      // Legacy fields for backward compatibility
      default_rtp,
      global_rtp,
      target_profit,
      rtp_ranges,
      rtp_categories
    } = rtpData;

    // Determine final values (prioritize new structure over legacy)
    const effectiveRtp = global?.default_rtp || global?.global_rtp || default_rtp || global_rtp || 80;
    const targetProfit = global?.target_profit || target_profit || 20;
    const autoAdjustmentEnabled = global?.auto_adjustment_enabled ?? false;
    const adjustmentThreshold = global?.adjustment_threshold || 5.0;
    const maxRtp = global?.max_rtp || 99.0;
    const minRtp = global?.min_rtp || 50.0;
    const globalOverrideEnabled = global?.isEnabled ?? false;

    // Merge provider and category settings
    const finalProviderSettings = provider_settings || rtp_ranges || {};
    const finalCategorySettings = category_settings || rtp_categories || {};

    // Update query
    const updateQuery = `
      UPDATE rtp_settings
      SET
        target_profit_percent = $1,
        effective_rtp = $2,
        global_rtp = $3,
        auto_adjustment_enabled = $4,
        adjustment_threshold = $5,
        max_rtp = $6,
        min_rtp = $7,
        provider_settings = $8::jsonb,
        category_settings = $9::jsonb,
        settings_metadata = $10::jsonb,
        global_override_enabled = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM rtp_settings ORDER BY id DESC LIMIT 1)
      RETURNING *
    `;

    const values = [
      targetProfit,
      effectiveRtp,
      effectiveRtp, // global_rtp same as effective_rtp
      autoAdjustmentEnabled,
      adjustmentThreshold,
      maxRtp,
      minRtp,
      JSON.stringify(finalProviderSettings),
      JSON.stringify(finalCategorySettings),
      JSON.stringify(settings_metadata || {}),
      globalOverrideEnabled
    ];

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      // If no rows exist, insert new settings
      const insertQuery = `
        INSERT INTO rtp_settings (
          target_profit_percent,
          effective_rtp,
          global_rtp,
          auto_adjustment_enabled,
          adjustment_threshold,
          max_rtp,
          min_rtp,
          provider_settings,
          category_settings,
          settings_metadata,
          global_override_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const insertResult = await pool.query(insertQuery, values);
      return insertResult.rows[0];
    }

    console.log('[RTP_SERVICE] RTP settings updated successfully');
    return result.rows[0];
  } catch (error) {
    console.error('[RTP_SERVICE] Error updating RTP settings:', error);
    throw error;
  }
};

export const getRTPAnalyticsService = async (filters: any = {}) => {
  const { start_date, end_date, game_id, provider, category } = filters;

  let whereConditions = [];
  let values = [];
  let paramCount = 1;

  if (start_date && end_date) {
    whereConditions.push(`b.placed_at BETWEEN $${paramCount} AND $${paramCount + 1}`);
    values.push(start_date, end_date);
    paramCount += 2;
  }

  if (game_id) {
    whereConditions.push(`b.game_id = $${paramCount}`);
    values.push(game_id);
    paramCount++;
  }

  if (provider) {
    whereConditions.push(`g.provider = $${paramCount}`);
    values.push(provider);
    paramCount++;
  }

  if (category) {
    whereConditions.push(`g.category = $${paramCount}`);
    values.push(category);
    paramCount++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get real bet statistics
  const betsStatsQuery = `
    SELECT
      COUNT(b.id) as total_bets,
      COALESCE(SUM(b.bet_amount), 0) as total_wagered,
      COALESCE(SUM(b.win_amount), 0) as total_won_original,
      COALESCE(SUM(b.bet_amount) - SUM(b.win_amount), 0) as gross_profit,
      ROUND((SUM(b.bet_amount) - SUM(b.win_amount)) / NULLIF(SUM(b.bet_amount), 0) * 100, 2) as gross_profit_margin,
      ROUND(SUM(b.win_amount) / NULLIF(SUM(b.bet_amount), 0) * 100, 2) as actual_rtp_percent
    FROM bets b
    LEFT JOIN games g ON b.game_id = g.id
    ${whereClause}
  `;

  const betsStatsResult = await pool.query(betsStatsQuery, values);
  const betsStats = betsStatsResult.rows[0];

  // Get profit tracking statistics separately
  const profitTrackingQuery = `
    SELECT
      COUNT(pt.id) as total_adjustments,
      COALESCE(SUM(pt.profit_reduction), 0) as total_profit_reduction,
      COALESCE(SUM(pt.adjusted_amount), 0) as total_adjusted_amount,
      COALESCE(SUM(pt.original_amount), 0) as total_original_amount,
      ROUND(AVG(pt.effective_rtp), 2) as avg_effective_rtp,
      ROUND(AVG(pt.provider_rtp), 2) as avg_provider_rtp
    FROM profit_tracking pt
    WHERE 1=1
    ${filters.startDate ? 'AND pt.created_at >= $' + (values.length + 1) : ''}
    ${filters.endDate ? 'AND pt.created_at <= $' + (values.length + (filters.startDate ? 2 : 1)) : ''}
  `;

  const ptValues = [...values];
  if (filters.startDate) ptValues.push(filters.startDate);
  if (filters.endDate) ptValues.push(filters.endDate);

  const profitTrackingResult = await pool.query(profitTrackingQuery, ptValues);
  const profitTracking = profitTrackingResult.rows[0];

  // Combine both statistics
  const profitStats = {
    total_bets: betsStats.total_bets,
    total_wagered: betsStats.total_wagered,
    total_won_original: betsStats.total_won_original,
    total_won_adjusted: profitTracking.total_adjusted_amount || betsStats.total_won_original,
    total_profit_from_reduction: profitTracking.total_profit_reduction,
    total_actual_profit: betsStats.gross_profit,
    actual_profit_margin: betsStats.gross_profit_margin,
    actual_rtp_percent: betsStats.actual_rtp_percent,
    avg_effective_rtp: profitTracking.avg_effective_rtp,
    avg_provider_rtp: profitTracking.avg_provider_rtp,
    total_adjustments: profitTracking.total_adjustments
  };

  // Get current RTP settings
  const rtpSettingsQuery = `
    SELECT effective_rtp, target_profit_percent
    FROM rtp_settings
    ORDER BY id DESC
    LIMIT 1
  `;
  const rtpSettingsResult = await pool.query(rtpSettingsQuery);
  const rtpSettings = rtpSettingsResult.rows[0] || { effective_rtp: 80, target_profit_percent: 20 };

  // Get RTP statistics from games table
  const rtpStatsQuery = `
    SELECT 
      AVG(rtp_percentage) as average_rtp,
      MIN(rtp_percentage) as min_rtp,
      MAX(rtp_percentage) as max_rtp,
      COUNT(*) as total_games,
      COUNT(CASE WHEN rtp_percentage >= 96 THEN 1 END) as high_rtp_games,
      COUNT(CASE WHEN rtp_percentage < 94 THEN 1 END) as low_rtp_games
    FROM games 
    ${whereClause}
  `;

  const rtpStatsResult = await pool.query(rtpStatsQuery, values);
  const rtpStats = rtpStatsResult.rows[0];

  // Get RTP by category
  const rtpByCategoryQuery = `
    SELECT 
      category,
      AVG(rtp_percentage) as avg_rtp,
      COUNT(*) as game_count
    FROM games 
    ${whereClause}
    GROUP BY category 
    ORDER BY avg_rtp DESC
  `;

  const rtpByCategoryResult = await pool.query(rtpByCategoryQuery, values);

  // Get RTP by provider
  const rtpByProviderQuery = `
    SELECT 
      provider,
      AVG(rtp_percentage) as avg_rtp,
      COUNT(*) as game_count
    FROM games 
    ${whereClause}
    GROUP BY provider 
    ORDER BY avg_rtp DESC
  `;

  const rtpByProviderResult = await pool.query(rtpByProviderQuery, values);

  // Get recent RTP changes
  const recentChangesQuery = `
    SELECT 
      g.id,
      g.name,
      g.provider,
      g.category,
      g.rtp_percentage,
      g.updated_at
    FROM games g
    ${whereClause}
    ORDER BY g.updated_at DESC
    LIMIT 10
  `;

  const recentChangesResult = await pool.query(recentChangesQuery, values);

  return {
    // REAL DATA from profit_tracking and bets
    profit_control: {
      total_bets: parseInt(profitStats.total_bets || 0),
      total_wagered: parseFloat(profitStats.total_wagered || 0).toFixed(2),
      total_won_original: parseFloat(profitStats.total_won_original || 0).toFixed(2),
      total_won_adjusted: parseFloat(profitStats.total_won_adjusted || 0).toFixed(2),
      total_profit_from_reduction: parseFloat(profitStats.total_profit_from_reduction || 0).toFixed(2),
      total_actual_profit: parseFloat(profitStats.total_actual_profit || 0).toFixed(2),
      actual_profit_margin: parseFloat(profitStats.actual_profit_margin || 0).toFixed(2),
      actual_rtp_percent: parseFloat(profitStats.actual_rtp_percent || 0).toFixed(2),
      avg_effective_rtp: parseFloat(profitStats.avg_effective_rtp || rtpSettings.effective_rtp).toFixed(2),
      avg_provider_rtp: parseFloat(profitStats.avg_provider_rtp || 96).toFixed(2),
      target_rtp: parseFloat(rtpSettings.effective_rtp || 80).toFixed(2),
      target_profit: parseFloat(rtpSettings.target_profit_percent || 20).toFixed(2)
    },
    summary: {
      average_rtp: parseFloat(rtpStats.average_rtp || 0).toFixed(2),
      min_rtp: parseFloat(rtpStats.min_rtp || 0).toFixed(2),
      max_rtp: parseFloat(rtpStats.max_rtp || 0).toFixed(2),
      total_games: parseInt(rtpStats.total_games || 0),
      high_rtp_games: parseInt(rtpStats.high_rtp_games || 0),
      low_rtp_games: parseInt(rtpStats.low_rtp_games || 0)
    },
    by_category: rtpByCategoryResult.rows,
    by_provider: rtpByProviderResult.rows,
    recent_changes: recentChangesResult.rows
  };
};

export const updateRTPSettingsService = async (rtpData: any) => {
  const { default_rtp, rtp_ranges, rtp_categories } = rtpData;

  // Update gaming settings in system_settings
  const updateQuery = `
    UPDATE system_settings 
    SET gaming_settings = jsonb_set(
      COALESCE(gaming_settings, '{}'::jsonb),
      '{default_rtp}', $1::jsonb
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING gaming_settings
  `;

  const result = await pool.query(updateQuery, [JSON.stringify(default_rtp)]);
  
  return {
    default_rtp,
    rtp_ranges,
    rtp_categories,
    updated_at: new Date()
  };
};

export const bulkUpdateRTPService = async (updateData: any) => {
  const { game_ids, rtp_percentage, category, provider } = updateData;

  let whereConditions = [];
  let values = [rtp_percentage];
  let paramCount = 2;

  if (game_ids && game_ids.length > 0) {
    whereConditions.push(`id = ANY($${paramCount})`);
    values.push(game_ids);
    paramCount++;
  }

  if (category) {
    whereConditions.push(`category = $${paramCount}`);
    values.push(category);
    paramCount++;
  }

  if (provider) {
    whereConditions.push(`provider = $${paramCount}`);
    values.push(provider);
    paramCount++;
  }

  if (whereConditions.length === 0) {
    throw new Error("At least one filter condition is required");
  }

  const updateQuery = `
    UPDATE games 
    SET rtp_percentage = $1, updated_at = CURRENT_TIMESTAMP
    WHERE ${whereConditions.join(' AND ')}
    RETURNING id, name, rtp_percentage, updated_at
  `;

  const result = await pool.query(updateQuery, values);

  return {
    updated_count: result.rowCount || 0,
    updated_games: result.rows,
    rtp_percentage,
    filters: { game_ids, category, provider }
  };
};

export const generateRTPReportService = async (reportData: any) => {
  const { start_date, end_date, format = 'json' } = reportData;

  let whereConditions = [];
  let values = [];
  let paramCount = 1;

  if (start_date && end_date) {
    whereConditions.push(`created_at BETWEEN $${paramCount} AND $${paramCount + 1}`);
    values.push(start_date, end_date);
    paramCount += 2;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Comprehensive RTP report query
  const reportQuery = `
    SELECT 
      g.id,
      g.name,
      g.provider,
      g.category,
      g.rtp_percentage,
      g.volatility,
      g.min_bet,
      g.max_bet,
      g.is_active,
      g.created_at,
      g.updated_at,
      CASE 
        WHEN g.rtp_percentage >= 96 THEN 'High'
        WHEN g.rtp_percentage >= 94 THEN 'Medium'
        ELSE 'Low'
      END as rtp_level
    FROM games g
    ${whereClause}
    ORDER BY g.rtp_percentage DESC, g.name
  `;

  const result = await pool.query(reportQuery, values);

  if (format === 'csv') {
    // Generate CSV format
    const headers = [
      'ID', 'Name', 'Provider', 'Category', 'RTP %', 'Volatility', 
      'Min Bet', 'Max Bet', 'Active', 'RTP Level', 'Created At', 'Updated At'
    ].join(',');

    const rows = result.rows.map(row => [
      row.id,
      `"${row.name}"`,
      `"${row.provider}"`,
      `"${row.category}"`,
      row.rtp_percentage,
      `"${row.volatility}"`,
      row.min_bet,
      row.max_bet,
      row.is_active ? 'Yes' : 'No',
      `"${row.rtp_level}"`,
      `"${row.created_at}"`,
      `"${row.updated_at}"`
    ].join(','));

    return `${headers}\n${rows.join('\n')}`;
  }

  // Return JSON format
  return {
    report_date: new Date(),
    filters: { start_date, end_date },
    summary: {
      total_games: result.rowCount,
      average_rtp: result.rows.reduce((sum, row) => sum + parseFloat(row.rtp_percentage || 0), 0) / result.rowCount,
      high_rtp_count: result.rows.filter(row => row.rtp_level === 'High').length,
      medium_rtp_count: result.rows.filter(row => row.rtp_level === 'Medium').length,
      low_rtp_count: result.rows.filter(row => row.rtp_level === 'Low').length
    },
    games: result.rows
  };
};

// =====================================================
// RTP COMPLIANCE MONITORING
// =====================================================

export const getRTPComplianceService = async () => {
  // Check for games with RTP outside acceptable ranges
  const complianceQuery = `
    SELECT 
      id,
      name,
      provider,
      category,
      rtp_percentage,
      CASE 
        WHEN rtp_percentage < 90 THEN 'Critical'
        WHEN rtp_percentage < 94 THEN 'Warning'
        WHEN rtp_percentage > 98 THEN 'High'
        ELSE 'Normal'
      END as compliance_status
    FROM games 
    WHERE rtp_percentage < 90 OR rtp_percentage > 98
    ORDER BY rtp_percentage ASC
  `;

  const result = await pool.query(complianceQuery);

  const complianceSummary = {
    critical: result.rows.filter(row => row.compliance_status === 'Critical').length,
    warning: result.rows.filter(row => row.compliance_status === 'Warning').length,
    high: result.rows.filter(row => row.compliance_status === 'High').length,
    total_issues: result.rowCount
  };

  return {
    summary: complianceSummary,
    issues: result.rows
  };
};

// =====================================================
// RTP TREND ANALYSIS
// =====================================================

export const getRTPTrendsService = async (days: number = 30) => {
  const trendQuery = `
    SELECT 
      DATE(updated_at) as date,
      AVG(rtp_percentage) as avg_rtp,
      COUNT(*) as games_updated
    FROM games 
    WHERE updated_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY DATE(updated_at)
    ORDER BY date DESC
  `;

  const result = await pool.query(trendQuery);

  return {
    period_days: days,
    trends: result.rows,
    summary: {
      total_updates: result.rows.reduce((sum, row) => sum + parseInt(row.games_updated), 0),
      average_rtp_change: result.rows.length > 0 ? 
        result.rows.reduce((sum, row) => sum + parseFloat(row.avg_rtp), 0) / result.rows.length : 0
    }
  };
}; 