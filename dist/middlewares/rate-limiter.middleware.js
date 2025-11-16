"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.loginRateLimiter = exports.providerRateLimiter = exports.strictRateLimiter = exports.standardRateLimiter = exports.getCircuitBreakerStatus = exports.cloudflareHeadersMiddleware = exports.errorTrackingMiddleware = exports.circuitBreakerMiddleware = exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cloudflare_config_1 = require("../configs/cloudflare.config");
class CircuitBreaker {
    constructor() {
        this.state = {
            isOpen: false,
            failureCount: 0,
            lastFailureTime: 0,
            threshold: 5, // Number of failures before opening circuit
            timeout: 30000 // 30 seconds timeout
        };
    }
    isOpen() {
        if (!this.state.isOpen)
            return false;
        // Check if timeout has passed
        if (Date.now() - this.state.lastFailureTime > this.state.timeout) {
            this.state.isOpen = false;
            this.state.failureCount = 0;
            return false;
        }
        return true;
    }
    recordFailure() {
        this.state.failureCount++;
        this.state.lastFailureTime = Date.now();
        if (this.state.failureCount >= this.state.threshold) {
            this.state.isOpen = true;
            console.log('[CIRCUIT_BREAKER] Circuit opened due to too many failures');
        }
    }
    recordSuccess() {
        this.state.failureCount = 0;
        this.state.isOpen = false;
    }
    getStatus() {
        return {
            isOpen: this.state.isOpen,
            failureCount: this.state.failureCount,
            lastFailureTime: this.state.lastFailureTime,
            threshold: this.state.threshold,
            timeout: this.state.timeout
        };
    }
}
// Global circuit breaker instance
const globalCircuitBreaker = new CircuitBreaker();
// Enhanced rate limiter for Cloudflare compatibility
const createRateLimiter = (options) => {
    return (0, express_rate_limit_1.default)({
        windowMs: options.windowMs,
        max: options.max,
        standardHeaders: true,
        legacyHeaders: false,
        skip: options.skip,
        keyGenerator: options.keyGenerator || ((req) => {
            // Use Cloudflare's CF-Connecting-IP if available, otherwise fallback to req.ip
            return req.headers['cf-connecting-ip'] || req.ip || 'unknown';
        }),
        handler: (req, res) => {
            console.log(`[RATE_LIMIT] Rate limit exceeded for: ${req.path} from IP: ${req.ip}`);
            // Add Cloudflare-specific headers
            res.set({
                'CF-Cache-Status': 'DYNAMIC',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.status(429).json({
                status: 'ERROR',
                error_code: 'RATE_LIMIT_EXCEEDED',
                error_message: options.message || 'Too many requests, please try again later.',
                retry_after: Math.ceil(options.windowMs / 1000)
            });
        }
    });
};
exports.createRateLimiter = createRateLimiter;
// Circuit breaker middleware
const circuitBreakerMiddleware = (req, res, next) => {
    if (globalCircuitBreaker.isOpen()) {
        console.log('[CIRCUIT_BREAKER] Circuit is open, rejecting request');
        res.set({
            'CF-Cache-Status': 'DYNAMIC',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.status(503).json({
            status: 'ERROR',
            error_code: 'SERVICE_UNAVAILABLE',
            error_message: 'Service temporarily unavailable, please try again later.',
            retry_after: 30
        });
        return;
    }
    next();
};
exports.circuitBreakerMiddleware = circuitBreakerMiddleware;
// Error tracking middleware for circuit breaker
const errorTrackingMiddleware = (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
        if (res.statusCode >= 500) {
            globalCircuitBreaker.recordFailure();
        }
        else if (res.statusCode < 400) {
            globalCircuitBreaker.recordSuccess();
        }
        return originalSend.call(this, data);
    };
    next();
};
exports.errorTrackingMiddleware = errorTrackingMiddleware;
// Cloudflare-specific headers middleware
const cloudflareHeadersMiddleware = (req, res, next) => {
    // Add Cloudflare-specific headers
    res.set({
        'CF-Cache-Status': 'DYNAMIC',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    });
    // Log Cloudflare headers for debugging
    if (req.headers['cf-ray'] || req.headers['cf-connecting-ip']) {
        console.log(`[CLOUDFLARE] Request from Cloudflare - Ray: ${req.headers['cf-ray']}, IP: ${req.headers['cf-connecting-ip']}`);
    }
    next();
};
exports.cloudflareHeadersMiddleware = cloudflareHeadersMiddleware;
// Health check endpoint for circuit breaker status
const getCircuitBreakerStatus = () => {
    return globalCircuitBreaker.getStatus();
};
exports.getCircuitBreakerStatus = getCircuitBreakerStatus;
// Predefined rate limiters using environment configuration
const cloudflareConfig = (0, cloudflare_config_1.getCloudflareConfig)();
exports.standardRateLimiter = (0, exports.createRateLimiter)({
    windowMs: cloudflareConfig.rateLimiting.standard.windowMs,
    max: cloudflareConfig.rateLimiting.standard.max,
    message: cloudflareConfig.rateLimiting.standard.message
});
exports.strictRateLimiter = (0, exports.createRateLimiter)({
    windowMs: cloudflareConfig.rateLimiting.strict.windowMs,
    max: cloudflareConfig.rateLimiting.strict.max,
    message: cloudflareConfig.rateLimiting.strict.message
});
exports.providerRateLimiter = (0, exports.createRateLimiter)({
    windowMs: cloudflareConfig.rateLimiting.provider.windowMs,
    max: cloudflareConfig.rateLimiting.provider.max,
    skip: (req) => {
        return req.path.startsWith('/innova') ||
            req.path.startsWith('/innova') ||
            req.path.startsWith('/api/provider-callback');
    },
    message: cloudflareConfig.rateLimiting.provider.message
});
// Rate limiter specifically for login attempts
exports.loginRateLimiter = (0, exports.createRateLimiter)({
    windowMs: cloudflareConfig.rateLimiting.auth.windowMs,
    max: cloudflareConfig.rateLimiting.auth.max,
    message: cloudflareConfig.rateLimiting.auth.message
});
// Rate limiter for auth endpoints with intelligent limiting
exports.authRateLimiter = (0, exports.createRateLimiter)({
    windowMs: cloudflareConfig.rateLimiting.auth.windowMs,
    max: cloudflareConfig.rateLimiting.auth.max,
    skip: (req) => {
        // Skip rate limiting for frequently called endpoints during normal gameplay
        return req.path === '/refresh' ||
            req.path === '/captcha' ||
            req.path === '/user-roles';
    },
    message: cloudflareConfig.rateLimiting.auth.message
});
