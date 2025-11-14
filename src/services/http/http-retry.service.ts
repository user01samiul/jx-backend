import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export class HttpRetryService {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    retryableStatusCodes: [429, 500, 502, 503, 504],
    retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED']
  };

  /**
   * Make an HTTP request with automatic retry on failures
   */
  static async request<T = any>(
    config: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<AxiosResponse<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...retryConfig };
    
    return this.retryWithBackoff(
      () => axios.request<T>(config),
      finalConfig
    );
  }

  /**
   * Make a GET request with retry
   */
  static async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url }, retryConfig);
  }

  /**
   * Make a POST request with retry
   */
  static async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    retryConfig?: Partial<RetryConfig>
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data }, retryConfig);
  }

  /**
   * Exponential backoff retry function
   */
  private static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
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
  private static shouldRetry(error: any, config: RetryConfig, retryCount: number): boolean {
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
  private static calculateDelay(retryCount: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, config.maxDelay);
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retryable axios instance
   */
  static createRetryableInstance(config?: Partial<RetryConfig>): typeof axios {
    const retryConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    const instance = axios.create();
    
    // Add request interceptor for logging
    instance.interceptors.request.use(
      (config) => {
        console.log(`[HTTP_RETRY] Making request to: ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for retry logic
    instance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        if (this.shouldRetry(error, retryConfig, 0)) {
          console.log(`[HTTP_RETRY] Response error, will retry: ${error?.response?.status || error?.code}`);
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }
} 