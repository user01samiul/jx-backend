"use strict";
// =====================================================
// HEALTH MONITOR SERVICE - SYSTEM HEALTH TRACKING
// =====================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitorService = void 0;
class HealthMonitorService {
    /**
     * Start health monitoring
     */
    static startMonitoring() {
        if (this.isMonitoring) {
            console.log('[HEALTH_MONITOR] Monitoring already started');
            return;
        }
        console.log('[HEALTH_MONITOR] Starting health monitoring...');
        this.isMonitoring = true;
        // Update metrics every 30 seconds
        setInterval(() => {
            this.updateMetrics();
        }, 30000);
        // Log health status every 5 minutes
        setInterval(() => {
            this.logHealthStatus();
        }, 5 * 60 * 1000);
    }
    /**
     * Update health metrics
     */
    static updateMetrics() {
        this.metrics.uptime = Date.now() - this.startTime;
        this.metrics.memoryUsage = process.memoryUsage();
        this.metrics.lastHealthCheck = new Date();
        // Update CPU usage (simplified)
        const startUsage = process.cpuUsage();
        setTimeout(() => {
            const endUsage = process.cpuUsage(startUsage);
            this.metrics.cpuUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        }, 100);
    }
    /**
     * Increment request counter
     */
    static incrementRequestCount() {
        this.metrics.requestCount++;
    }
    /**
     * Increment error counter
     */
    static incrementErrorCount() {
        this.metrics.errorCount++;
    }
    /**
     * Increment rate limit counter
     */
    static incrementRateLimitCount() {
        this.metrics.rateLimitCount++;
    }
    /**
     * Increment Cloudflare request counter
     */
    static incrementCloudflareRequests() {
        this.metrics.cloudflareRequests++;
    }
    /**
     * Update circuit breaker status
     */
    static updateCircuitBreakerStatus(status) {
        this.metrics.circuitBreakerStatus = status;
    }
    /**
     * Track critical errors with detailed information
     */
    static trackCriticalError(error, context = {}) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            error: error.message || 'Unknown error',
            code: error.code,
            constraint: error.constraint,
            stack: error.stack,
            context,
            errorId: this.generateErrorId()
        };
        console.error('[CRITICAL_ERROR]', errorInfo);
        // Increment error count
        this.incrementErrorCount();
        // Store error for monitoring
        this.criticalErrors.push(errorInfo);
        // Keep only last 100 errors
        if (this.criticalErrors.length > 100) {
            this.criticalErrors = this.criticalErrors.slice(-100);
        }
        return errorInfo.errorId;
    }
    /**
     * Generate unique error ID
     */
    static generateErrorId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 4);
        return `GS${timestamp}${random}`;
    }
    /**
     * Get critical errors
     */
    static getCriticalErrors() {
        return this.criticalErrors;
    }
    /**
     * Clear critical errors
     */
    static clearCriticalErrors() {
        this.criticalErrors = [];
    }
    /**
     * Get current health status
     */
    static getHealthStatus() {
        const checks = this.performHealthChecks();
        const status = this.determineOverallStatus(checks);
        return {
            status,
            timestamp: new Date(),
            metrics: Object.assign({}, this.metrics),
            checks
        };
    }
    /**
     * Perform individual health checks
     */
    static performHealthChecks() {
        var _a;
        const memoryUsage = this.metrics.memoryUsage;
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        return {
            database: this.checkDatabaseHealth(),
            memory: memoryUsagePercent < 90, // Healthy if less than 90% memory usage
            cpu: this.metrics.cpuUsage < 80, // Healthy if CPU usage less than 80%
            rateLimiting: this.metrics.rateLimitCount < 100, // Healthy if rate limit count is reasonable
            circuitBreaker: !((_a = this.metrics.circuitBreakerStatus) === null || _a === void 0 ? void 0 : _a.isOpen)
        };
    }
    /**
     * Check database health
     */
    static checkDatabaseHealth() {
        // This would check actual database connectivity
        // For now, return true as a placeholder
        return true;
    }
    /**
     * Determine overall system status
     */
    static determineOverallStatus(checks) {
        const checkValues = Object.values(checks);
        const healthyChecks = checkValues.filter(Boolean).length;
        const totalChecks = checkValues.length;
        if (healthyChecks === totalChecks) {
            return 'healthy';
        }
        else if (healthyChecks >= totalChecks * 0.7) { // 70% healthy
            return 'degraded';
        }
        else {
            return 'unhealthy';
        }
    }
    /**
     * Log health status
     */
    static logHealthStatus() {
        var _a;
        const status = this.getHealthStatus();
        const memoryUsage = this.metrics.memoryUsage;
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        console.log(`[HEALTH_MONITOR] System Status: ${status.status.toUpperCase()}`);
        console.log(`[HEALTH_MONITOR] Uptime: ${Math.floor(this.metrics.uptime / 1000 / 60)} minutes`);
        console.log(`[HEALTH_MONITOR] Memory Usage: ${memoryUsagePercent.toFixed(2)}%`);
        console.log(`[HEALTH_MONITOR] CPU Usage: ${this.metrics.cpuUsage.toFixed(2)}s`);
        console.log(`[HEALTH_MONITOR] Requests: ${this.metrics.requestCount}`);
        console.log(`[HEALTH_MONITOR] Errors: ${this.metrics.errorCount}`);
        console.log(`[HEALTH_MONITOR] Rate Limits: ${this.metrics.rateLimitCount}`);
        console.log(`[HEALTH_MONITOR] Cloudflare Requests: ${this.metrics.cloudflareRequests}`);
        console.log(`[HEALTH_MONITOR] Circuit Breaker: ${((_a = this.metrics.circuitBreakerStatus) === null || _a === void 0 ? void 0 : _a.isOpen) ? 'OPEN' : 'CLOSED'}`);
    }
    /**
     * Get detailed metrics
     */
    static getDetailedMetrics() {
        const memoryUsage = this.metrics.memoryUsage;
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        return Object.assign(Object.assign({}, this.metrics), { memoryUsagePercent: memoryUsagePercent.toFixed(2), uptimeFormatted: this.formatUptime(this.metrics.uptime), errorRate: this.metrics.requestCount > 0 ?
                ((this.metrics.errorCount / this.metrics.requestCount) * 100).toFixed(2) : '0.00', rateLimitRate: this.metrics.requestCount > 0 ?
                ((this.metrics.rateLimitCount / this.metrics.requestCount) * 100).toFixed(2) : '0.00' });
    }
    /**
     * Format uptime in human readable format
     */
    static formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        }
        else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        else {
            return `${seconds}s`;
        }
    }
    /**
     * Reset metrics (useful for testing)
     */
    static resetMetrics() {
        this.metrics = {
            uptime: 0,
            memoryUsage: process.memoryUsage(),
            cpuUsage: 0,
            activeConnections: 0,
            requestCount: 0,
            errorCount: 0,
            rateLimitCount: 0,
            cloudflareRequests: 0,
            circuitBreakerStatus: null,
            lastHealthCheck: new Date()
        };
        this.startTime = Date.now();
    }
    /**
     * Get Cloudflare-specific metrics
     */
    static getCloudflareMetrics() {
        return {
            totalRequests: this.metrics.cloudflareRequests,
            rateLimitCount: this.metrics.rateLimitCount,
            errorCount: this.metrics.errorCount,
            successRate: this.metrics.cloudflareRequests > 0 ?
                (((this.metrics.cloudflareRequests - this.metrics.errorCount) / this.metrics.cloudflareRequests) * 100).toFixed(2) : '100.00'
        };
    }
}
exports.HealthMonitorService = HealthMonitorService;
HealthMonitorService.metrics = {
    uptime: 0,
    memoryUsage: process.memoryUsage(),
    cpuUsage: 0,
    activeConnections: 0,
    requestCount: 0,
    errorCount: 0,
    rateLimitCount: 0,
    cloudflareRequests: 0,
    circuitBreakerStatus: null,
    lastHealthCheck: new Date()
};
HealthMonitorService.startTime = Date.now();
HealthMonitorService.isMonitoring = false;
HealthMonitorService.criticalErrors = [];
