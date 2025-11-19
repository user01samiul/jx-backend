"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGGRReportSummary = exports.getAuditLogs = exports.logGGRReport = exports.filterGGR = exports.updateSettings = exports.getSettings = void 0;
const postgres_1 = __importDefault(require("../../db/postgres"));
const getSettings = async () => {
    const result = await postgres_1.default.query("SELECT filter_percent, tolerance FROM ggr_filter_settings ORDER BY id DESC LIMIT 1");
    if (result.rows.length === 0)
        return { filter_percent: 0.5, tolerance: 0.05 };
    return result.rows[0];
};
exports.getSettings = getSettings;
const updateSettings = async (filter_percent, tolerance) => {
    await postgres_1.default.query(`UPDATE ggr_filter_settings SET filter_percent = $1, tolerance = $2, updated_at = NOW() WHERE id = (SELECT id FROM ggr_filter_settings ORDER BY id DESC LIMIT 1)`, [filter_percent, tolerance]);
    return (0, exports.getSettings)();
};
exports.updateSettings = updateSettings;
function applyTolerance(value, tolerance) {
    const delta = value * tolerance;
    return value + (Math.random() * 2 - 1) * delta;
}
const filterGGR = async (real_ggr) => {
    const settings = await (0, exports.getSettings)();
    let reported_ggr = real_ggr * settings.filter_percent;
    reported_ggr = applyTolerance(reported_ggr, settings.tolerance);
    return { reported_ggr, settings };
};
exports.filterGGR = filterGGR;
const logGGRReport = async (log) => {
    await postgres_1.default.query(`INSERT INTO ggr_audit_log (real_ggr, reported_ggr, filter_percent, tolerance, report_data) VALUES ($1, $2, $3, $4, $5)`, [log.real_ggr, log.reported_ggr, log.filter_percent, log.tolerance, JSON.stringify(log.report_data)]);
};
exports.logGGRReport = logGGRReport;
const getAuditLogs = async (limit = 50, offset = 0) => {
    const result = await postgres_1.default.query(`SELECT * FROM ggr_audit_log ORDER BY timestamp DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    return result.rows;
};
exports.getAuditLogs = getAuditLogs;
const getGGRReportSummary = async (startDate, endDate) => {
    let where = '';
    const params = [];
    if (startDate) {
        params.push(startDate);
        where += (where ? ' AND ' : 'WHERE ') + `timestamp >= $${params.length}`;
    }
    if (endDate) {
        params.push(endDate);
        where += (where ? ' AND ' : 'WHERE ') + `timestamp <= $${params.length}`;
    }
    const result = await postgres_1.default.query(`SELECT 
      COUNT(*) as count,
      COALESCE(SUM(real_ggr),0) as total_real_ggr,
      COALESCE(SUM(reported_ggr),0) as total_reported_ggr,
      COALESCE(AVG(filter_percent),0) as avg_filter_percent,
      COALESCE(AVG(tolerance),0) as avg_tolerance
    FROM ggr_audit_log
    ${where}
    `, params);
    return result.rows[0];
};
exports.getGGRReportSummary = getGGRReportSummary;
