import pool from "../../db/postgres";

export interface GGRFilterSettings {
  filter_percent: number;
  tolerance: number;
}

export interface GGRAuditLog {
  id?: number;
  real_ggr: number;
  reported_ggr: number;
  filter_percent: number;
  tolerance: number;
  report_data: any;
  timestamp?: Date;
}

export const getSettings = async (): Promise<GGRFilterSettings> => {
  const result = await pool.query("SELECT filter_percent, tolerance FROM ggr_filter_settings ORDER BY id DESC LIMIT 1");
  if (result.rows.length === 0) return { filter_percent: 0.5, tolerance: 0.05 };
  return result.rows[0];
};

export const updateSettings = async (filter_percent: number, tolerance: number): Promise<GGRFilterSettings> => {
  await pool.query(
    `UPDATE ggr_filter_settings SET filter_percent = $1, tolerance = $2, updated_at = NOW() WHERE id = (SELECT id FROM ggr_filter_settings ORDER BY id DESC LIMIT 1)`,
    [filter_percent, tolerance]
  );
  return getSettings();
};

function applyTolerance(value: number, tolerance: number): number {
  const delta = value * tolerance;
  return value + (Math.random() * 2 - 1) * delta;
}

export const filterGGR = async (real_ggr: number): Promise<{ reported_ggr: number, settings: GGRFilterSettings }> => {
  const settings = await getSettings();
  let reported_ggr = real_ggr * settings.filter_percent;
  reported_ggr = applyTolerance(reported_ggr, settings.tolerance);
  return { reported_ggr, settings };
};

export const logGGRReport = async (log: GGRAuditLog): Promise<void> => {
  await pool.query(
    `INSERT INTO ggr_audit_log (real_ggr, reported_ggr, filter_percent, tolerance, report_data) VALUES ($1, $2, $3, $4, $5)`,
    [log.real_ggr, log.reported_ggr, log.filter_percent, log.tolerance, JSON.stringify(log.report_data)]
  );
};

export const getAuditLogs = async (limit = 50, offset = 0): Promise<GGRAuditLog[]> => {
  const result = await pool.query(
    `SELECT * FROM ggr_audit_log ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
};

export const getGGRReportSummary = async (startDate?: string, endDate?: string) => {
  let where = '';
  const params: any[] = [];
  if (startDate) {
    params.push(startDate);
    where += (where ? ' AND ' : 'WHERE ') + `timestamp >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    where += (where ? ' AND ' : 'WHERE ') + `timestamp <= $${params.length}`;
  }
  const result = await pool.query(
    `SELECT 
      COUNT(*) as count,
      COALESCE(SUM(real_ggr),0) as total_real_ggr,
      COALESCE(SUM(reported_ggr),0) as total_reported_ggr,
      COALESCE(AVG(filter_percent),0) as avg_filter_percent,
      COALESCE(AVG(tolerance),0) as avg_tolerance
    FROM ggr_audit_log
    ${where}
    `,
    params
  );
  return result.rows[0];
}; 