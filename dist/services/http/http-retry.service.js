"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpRetryService = void 0;
const axios_1 = __importDefault(require("axios"));
class HttpRetryService {
    static DEFAULT_CONFIG = {
        maxRetries: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 10000, // 10 seconds
        retryableStatusCodes: [429, 500, 502, 503, 504],
        retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED']
    };
    /**
     * Make an HTTP request with automatic retry on failures
     */
    static async request(config, retryConfig) {
        const finalConfig = { ...this.DEFAULT_CONFIG, ...retryConfig };
        return this.retryWithBackoff(() => axios_1.default.request(config), finalConfig);
    }
    /**
     * Make a GET request with retry
     */
    static async get(url, config, retryConfig) {
        return this.request({ ...config, method: 'GET', url }, retryConfig);
    }
    /**
     * Make a POST request with retry
     */
    static async post(url, data, config, retryConfig) {
        return this.request({ ...config, method: 'POST', url, data }, retryConfig);
    }
    /**
     * Exponential backoff retry function
     */
    static async retryWithBackoff(operation, config, retryCount = 0) {
        try {
            return await operation();
        }
        catch (error) {
            const shouldRetry = this.shouldRetry(error, config, retryCount);
            if (!shouldRetry) {
                throw error;
            }
            const delay = this.calculateDelay(retryCount, config);
            console.log(`[HTTP_RETRY] Attempt ${retryCount + 1}/${config.maxRetries + 1} failed, retrying in ${delay}ms`, {
                status: error?.response?.status,
                message: error?.message,
                url: error?.config?.url
            });
            await this.sleep(delay);
            return this.retryWithBackoff(operation, config, retryCount + 1);
        }
    }
    /**
     * Determine if the error should trigger a retry
     */
    static shouldRetry(error, config, retryCount) {
        if (retryCount >= config.maxRetries) {
            return false;
        }
        // Check for retryable HTTP status codes
        if (error?.response?.status && config.retryableStatusCodes.includes(error.response.status)) {
            return true;
        }
        // Check for retryable network errors
        if (error?.code && config.retryableErrors.includes(error.code)) {
            return true;
        }
        // Check for timeout errors
        if (error?.message && error.message.includes('timeout')) {
            return true;
        }
        return false;
    }
    /**
     * Calculate delay with exponential backoff and jitter
     */
    static calculateDelay(retryCount, config) {
        const exponentialDelay = config.baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
        return Math.min(exponentialDelay + jitter, config.maxDelay);
    }
    /**
     * Sleep utility
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Create a retryable axios instance
     */
    static createRetryableInstance(config) {
        const retryConfig = { ...this.DEFAULT_CONFIG, ...config };
        const instance = axios_1.default.create();
        // Add request interceptor for logging
        instance.interceptors.request.use((config) => {
            console.log(`[HTTP_RETRY] Making request to: ${config.url}`);
            return config;
        }, (error) => {
            return Promise.reject(error);
        });
        // Add response interceptor for retry logic
        instance.interceptors.response.use((response) => {
            return response;
        }, async (error) => {
            if (this.shouldRetry(error, retryConfig, 0)) {
                console.log(`[HTTP_RETRY] Response error, will retry: ${error?.response?.status || error?.code}`);
            }
            return Promise.reject(error);
        });
        return instance;
    }
}
exports.HttpRetryService = HttpRetryService;
