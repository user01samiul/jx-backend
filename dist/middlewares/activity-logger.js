"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAfterSuccess = exports.autoLogActivity = exports.logActivity = void 0;
const postgres_1 = __importDefault(require("../db/postgres"));
/**
 * Log an activity to the admin_activities table
 */
const logActivity = async (req, action, details = {}) => {
    try {
        const user = req.user;
        if (!user || !user.userId) {
            console.warn('[ActivityLogger] No user found in request, skipping log');
            return;
        }
        const adminId = user.userId;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        // Add request metadata to details
        const enrichedDetails = Object.assign(Object.assign({}, details), { endpoint: req.path, method: req.method, timestamp: new Date().toISOString() });
        await postgres_1.default.query(`INSERT INTO admin_activities (admin_id, action, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`, [adminId, action, JSON.stringify(enrichedDetails), ipAddress, userAgent]);
        console.log(`[ActivityLogger] Logged: ${action} by user ${adminId}`);
    }
    catch (error) {
        console.error('[ActivityLogger] Error logging activity:', error);
        // Don't throw - logging shouldn't break the main flow
    }
};
exports.logActivity = logActivity;
/**
 * Middleware to automatically log endpoint access
 * Use this for important admin endpoints
 */
const autoLogActivity = (action, getDetails) => {
    return async (req, res, next) => {
        try {
            const details = getDetails ? getDetails(req) : {};
            await (0, exports.logActivity)(req, action, details);
        }
        catch (error) {
            console.error('[ActivityLogger] Auto-log error:', error);
        }
        next();
    };
};
exports.autoLogActivity = autoLogActivity;
/**
 * Helper to log after successful response
 */
const logAfterSuccess = (req, res, action, details = {}) => {
    // Log asynchronously without blocking response
    setImmediate(async () => {
        try {
            await (0, exports.logActivity)(req, action, details);
        }
        catch (error) {
            console.error('[ActivityLogger] Post-response log error:', error);
        }
    });
};
exports.logAfterSuccess = logAfterSuccess;
exports.default = {
    logActivity: exports.logActivity,
    autoLogActivity: exports.autoLogActivity,
    logAfterSuccess: exports.logAfterSuccess,
};
