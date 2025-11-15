"use strict";
// =====================================================
// RETRY SERVICE - HANDLES TEMPORARY FAILURES
// =====================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryService = void 0;
class RetryService {
    static defaultOptions = {
        maxAttempts: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 30000, // 30 seconds
        backoffMultiplier: 2,
        jitter: true,
        retryCondition: (error) => {
            // Retry on network errors, 5xx errors, and rate limiting
            return error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'ENOTFOUND' ||
                error.status === 429 ||
                error.status >= 500;
        }
    };
    /**
     * Execute a function with retry logic
     */
    static async execute(fn, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const startTime = Date.now();
        let lastError;
        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            try {
                const result = await fn();
                return {
                    success: true,
                    data: result,
                    attempts: attempt,
                    totalTime: Date.now() - startTime
                };
            }
            catch (error) {
                lastError = error;
                // Check if we should retry
                if (attempt === config.maxAttempts ||
                    (config.retryCondition && !config.retryCondition(error))) {
                    break;
                }
                // Calculate delay with exponential backoff and jitter
                const delay = this.calculateDelay(attempt, config);
                console.log(`[RETRY] Attempt ${attempt} failed, retrying in ${delay}ms. Error:`, error.message);
                await this.sleep(delay);
            }
        }
        return {
            success: false,
            error: lastError,
            attempts: config.maxAttempts,
            totalTime: Date.now() - startTime
        };
    }
    /**
     * Execute HTTP request with retry logic
     */
    static async executeHttpRequest(requestFn, options = {}) {
        const httpOptions = {
            ...options,
            retryCondition: (error) => {
                // Retry on specific HTTP errors
                const status = error.status || error.statusCode;
                return status === 429 || // Rate limited
                    status === 502 || // Bad Gateway
                    status === 503 || // Service Unavailable
                    status === 504 || // Gateway Timeout
                    status >= 500; // Server errors
            }
        };
        return this.execute(requestFn, httpOptions);
    }
    /**
     * Execute with Cloudflare-specific retry logic
     */
    static async executeWithCloudflareRetry(fn, options = {}) {
        const cloudflareOptions = {
            ...options,
            maxAttempts: options.maxAttempts || 5,
            baseDelay: options.baseDelay || 2000, // 2 seconds for Cloudflare
            maxDelay: options.maxDelay || 60000, // 1 minute max
            retryCondition: (error) => {
                // Cloudflare-specific retry conditions
                const status = error.status || error.statusCode;
                const message = error.message?.toLowerCase() || '';
                return status === 429 || // Rate limited
                    status === 503 || // Service Unavailable
                    status === 502 || // Bad Gateway
                    status === 504 || // Gateway Timeout
                    message.includes('cloudflare') ||
                    message.includes('too many requests') ||
                    message.includes('rate limit') ||
                    status >= 500;
            }
        };
        return this.execute(fn, cloudflareOptions);
    }
    /**
     * Calculate delay with exponential backoff and jitter
     */
    static calculateDelay(attempt, options) {
        let delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
        // Cap at max delay
        delay = Math.min(delay, options.maxDelay);
        // Add jitter to prevent thundering herd
        if (options.jitter) {
            const jitter = Math.random() * 0.1 * delay; // 10% jitter
            delay += jitter;
        }
        return Math.floor(delay);
    }
    /**
     * Sleep for specified milliseconds
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Create a retry wrapper for async functions
     */
    static createRetryWrapper(fn, options = {}) {
        return async (...args) => {
            const result = await this.execute(() => fn(...args), options);
            if (!result.success) {
                throw result.error;
            }
            return result.data;
        };
    }
    /**
     * Batch retry for multiple operations
     */
    static async executeBatch(operations, options = {}) {
        const results = await Promise.allSettled(operations.map(op => this.execute(op, options)));
        return results.map(result => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            else {
                return {
                    success: false,
                    error: result.reason,
                    attempts: 0,
                    totalTime: 0
                };
            }
        });
    }
    /**
     * Get retry statistics
     */
    static getRetryStats() {
        // This would be implemented with actual tracking
        return {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0
        };
    }
}
exports.RetryService = RetryService;
