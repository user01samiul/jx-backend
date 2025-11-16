"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logIPActivity = logIPActivity;
exports.trackIP = trackIP;
exports.checkBlockedIP = checkBlockedIP;
exports.checkGeoRestriction = checkGeoRestriction;
exports.getClientIP = getClientIP;
const postgres_1 = __importDefault(require("../db/postgres"));
/**
 * Extract IP address from request
 */
function getClientIP(req) {
    // Check X-Public-IP header (from frontend)
    const publicIP = req.headers['x-public-ip'];
    if (publicIP)
        return publicIP;
    // Check X-Forwarded-For (proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    // Check X-Real-IP (nginx)
    const realIP = req.headers['x-real-ip'];
    if (realIP)
        return realIP;
    // Fallback to remote address
    return req.ip || req.socket.remoteAddress || 'unknown';
}
/**
 * Log IP activity to database
 */
async function logIPActivity(options) {
    const { action, userId, sessionId } = options;
    if (!userId)
        return;
    try {
        await postgres_1.default.query(`INSERT INTO player_ip_history (
                user_id, ip_address, action, user_agent, session_id, risk_score, risk_level
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            userId,
            options.ip_address || 'unknown',
            action,
            options.user_agent || null,
            sessionId || null,
            0, // Default risk score
            'LOW' // Default risk level
        ]);
    }
    catch (error) {
        // Don't throw - IP tracking failure shouldn't break the app
        console.error('IP tracking error:', error);
    }
}
/**
 * Middleware to automatically track IP on specific routes
 */
function trackIP(action) {
    return async (req, res, next) => {
        var _a;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const ip = getClientIP(req);
        const userAgent = req.headers['user-agent'];
        // Store IP in request for later use
        req.clientIP = ip;
        // Log asynchronously (don't wait)
        if (userId) {
            logIPActivity({
                action,
                userId,
                ip_address: ip,
                user_agent: userAgent,
                sessionId: req.sessionId
            }).catch(err => {
                console.error('Failed to log IP activity:', err);
            });
        }
        next();
    };
}
/**
 * Middleware to check if IP is blocked
 */
async function checkBlockedIP(req, res, next) {
    const ip = getClientIP(req);
    try {
        const result = await postgres_1.default.query(`SELECT is_blocked FROM suspicious_ip_addresses WHERE ip_address = $1 AND is_blocked = TRUE`, [ip]);
        if (result.rows.length > 0) {
            res.status(403).json({
                success: false,
                message: 'Access denied. Your IP address has been blocked.',
                error_code: 'IP_BLOCKED'
            });
            return;
        }
        next();
    }
    catch (error) {
        // Don't block on error
        next();
    }
}
/**
 * Middleware to check country restrictions
 */
async function checkGeoRestriction(req, res, next) {
    const ip = getClientIP(req);
    try {
        // Get country from IP (you'd use a GeoIP service here)
        // For now, check if country code is in request headers
        const countryCode = req.headers['x-country-code'];
        if (countryCode) {
            const result = await postgres_1.default.query(`SELECT is_restricted, restriction_reason FROM countries
                 WHERE code = $1 AND is_restricted = TRUE`, [countryCode.toUpperCase()]);
            if (result.rows.length > 0) {
                res.status(451).json({
                    success: false,
                    message: 'Service not available in your country.',
                    reason: result.rows[0].restriction_reason,
                    error_code: 'GEO_RESTRICTED'
                });
                return;
            }
        }
        next();
    }
    catch (error) {
        // Don't block on error
        next();
    }
}
