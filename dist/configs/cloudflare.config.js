"use strict";
// =====================================================
// CLOUDFLARE CONFIGURATION - OPTIMIZED SETTINGS
// =====================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRetryOnError = exports.getCloudflareRay = exports.getCloudflareIP = exports.isCloudflareRequest = exports.getCloudflareConfig = exports.cloudflareConfig = void 0;
const env_1 = require("./env");
exports.cloudflareConfig = {
    rateLimiting: {
        standard: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // 100 requests per 15 minutes
            message: 'Standard rate limit exceeded. Please try again later.'
        },
        strict: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 30, // 30 requests per minute
            message: 'Strict rate limit exceeded. Please slow down your requests.'
        },
        provider: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 1000, // 1000 requests per minute for providers
            message: 'Provider rate limit exceeded. Please try again later.'
        },
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // 5 login attempts per 15 minutes
            message: 'Too many authentication attempts. Please try again later.'
        }
    },
    circuitBreaker: {
        threshold: 5, // Number of failures before opening circuit
        timeout: 30000, // 30 seconds timeout
        resetTimeout: 60000 // 1 minute reset timeout
    },
    retry: {
        maxAttempts: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 30000, // 30 seconds
        backoffMultiplier: 2,
        jitter: true
    },
    headers: {
        cacheControl: 'no-cache, no-store, must-revalidate',
        cfCacheStatus: 'DYNAMIC',
        securityHeaders: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        }
    },
    monitoring: {
        healthCheckInterval: 30000, // 30 seconds
        logInterval: 5 * 60 * 1000, // 5 minutes
        alertThresholds: {
            errorRate: 5, // 5% error rate threshold
            rateLimitRate: 10, // 10% rate limit threshold
            responseTime: 5000 // 5 seconds response time threshold
        }
    }
};
// Environment-specific overrides with configurable rate limits
const getCloudflareConfig = () => {
    return {
        ...exports.cloudflareConfig,
        rateLimiting: {
            standard: {
                windowMs: env_1.env.RATE_LIMIT_STANDARD_WINDOW_MS,
                max: env_1.env.RATE_LIMIT_STANDARD_MAX,
                message: 'Standard rate limit exceeded. Please try again later.'
            },
            strict: {
                windowMs: env_1.env.RATE_LIMIT_STRICT_WINDOW_MS,
                max: env_1.env.RATE_LIMIT_STRICT_MAX,
                message: 'Strict rate limit exceeded. Please slow down your requests.'
            },
            provider: {
                windowMs: env_1.env.RATE_LIMIT_PROVIDER_WINDOW_MS,
                max: env_1.env.RATE_LIMIT_PROVIDER_MAX,
                message: 'Provider rate limit exceeded. Please try again later.'
            },
            auth: {
                windowMs: env_1.env.RATE_LIMIT_AUTH_WINDOW_MS,
                max: env_1.env.RATE_LIMIT_AUTH_MAX,
                message: 'Too many authentication attempts. Please try again later.'
            }
        },
        circuitBreaker: {
            ...exports.cloudflareConfig.circuitBreaker,
            threshold: parseInt(process.env.CF_CIRCUIT_BREAKER_THRESHOLD || '5')
        }
    };
};
exports.getCloudflareConfig = getCloudflareConfig;
// Cloudflare-specific utility functions
const isCloudflareRequest = (headers) => {
    return !!(headers['cf-ray'] || headers['cf-connecting-ip'] || headers['cf-visitor']);
};
exports.isCloudflareRequest = isCloudflareRequest;
const getCloudflareIP = (headers) => {
    return headers['cf-connecting-ip'] || headers['x-forwarded-for'] || 'unknown';
};
exports.getCloudflareIP = getCloudflareIP;
const getCloudflareRay = (headers) => {
    return headers['cf-ray'] || 'unknown';
};
exports.getCloudflareRay = getCloudflareRay;
const shouldRetryOnError = (error) => {
    const status = error.status || error.statusCode;
    const message = error.message?.toLowerCase() || '';
    return status === 429 || // Rate limited
        status === 502 || // Bad Gateway
        status === 503 || // Service Unavailable
        status === 504 || // Gateway Timeout
        message.includes('cloudflare') ||
        message.includes('too many requests') ||
        message.includes('rate limit') ||
        status >= 500;
};
exports.shouldRetryOnError = shouldRetryOnError;
