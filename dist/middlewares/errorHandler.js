"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const health_monitor_service_1 = require("../services/health/health-monitor.service");
const cloudflare_config_1 = require("../configs/cloudflare.config");
const errorHandler = (err, req, res, next) => {
    const statusCode = err && (err.statusCode || err.status) ? (err.statusCode || err.status) : 500;
    // Track errors for health monitoring
    health_monitor_service_1.HealthMonitorService.incrementErrorCount();
    // Track critical errors with detailed information
    const errorId = health_monitor_service_1.HealthMonitorService.trackCriticalError(err, {
        path: req.path,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params
    });
    // Log error with Cloudflare context if applicable
    const isCloudflare = (0, cloudflare_config_1.isCloudflareRequest)(req.headers);
    const clientIP = (0, cloudflare_config_1.getCloudflareIP)(req.headers);
    console.error('[ErrorHandler]', {
        errorId,
        error: err && err.message ? err.message : 'Unknown error',
        statusCode,
        path: req.path,
        method: req.method,
        isCloudflare,
        clientIP,
        timestamp: new Date().toISOString()
    });
    // Add Cloudflare-specific headers for error responses
    if (isCloudflare) {
        res.set({
            'CF-Cache-Status': 'DYNAMIC',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
    }
    // Enhanced error response
    const errorResponse = {
        status: 'ERROR',
        error_code: err.error_code || 'INTERNAL_ERROR',
        error_message: err && err.message ? err.message : 'Something went wrong',
        error_id: errorId,
        timestamp: new Date().toISOString()
    };
    // Add retry information for rate limiting errors
    if (statusCode === 429) {
        errorResponse.retry_after = 60; // 1 minute
        errorResponse.error_code = 'RATE_LIMIT_EXCEEDED';
    }
    // Add request ID for tracking if available
    if (req.headers['cf-ray']) {
        errorResponse.request_id = req.headers['cf-ray'];
    }
    res.status(statusCode).json(errorResponse);
};
exports.default = errorHandler;
