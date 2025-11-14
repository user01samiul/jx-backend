// =====================================================
// CLOUDFLARE CONFIGURATION - OPTIMIZED SETTINGS
// =====================================================

import { env } from './env';

export interface CloudflareConfig {
  // Rate limiting settings
  rateLimiting: {
    standard: {
      windowMs: number;
      max: number;
      message: string;
    };
    strict: {
      windowMs: number;
      max: number;
      message: string;
    };
    provider: {
      windowMs: number;
      max: number;
      message: string;
    };
    auth: {
      windowMs: number;
      max: number;
      message: string;
    };
  };
  
  // Circuit breaker settings
  circuitBreaker: {
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
  
  // Retry settings
  retry: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
  };
  
  // Headers and caching
  headers: {
    cacheControl: string;
    cfCacheStatus: string;
    securityHeaders: Record<string, string>;
  };
  
  // Monitoring settings
  monitoring: {
    healthCheckInterval: number;
    logInterval: number;
    alertThresholds: {
      errorRate: number;
      rateLimitRate: number;
      responseTime: number;
    };
  };
}

export const cloudflareConfig: CloudflareConfig = {
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
export const getCloudflareConfig = (): CloudflareConfig => {
  return {
    ...cloudflareConfig,
    rateLimiting: {
      standard: {
        windowMs: env.RATE_LIMIT_STANDARD_WINDOW_MS,
        max: env.RATE_LIMIT_STANDARD_MAX,
        message: 'Standard rate limit exceeded. Please try again later.'
      },
      strict: {
        windowMs: env.RATE_LIMIT_STRICT_WINDOW_MS,
        max: env.RATE_LIMIT_STRICT_MAX,
        message: 'Strict rate limit exceeded. Please slow down your requests.'
      },
      provider: {
        windowMs: env.RATE_LIMIT_PROVIDER_WINDOW_MS,
        max: env.RATE_LIMIT_PROVIDER_MAX,
        message: 'Provider rate limit exceeded. Please try again later.'
      },
      auth: {
        windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
        max: env.RATE_LIMIT_AUTH_MAX,
        message: 'Too many authentication attempts. Please try again later.'
      }
    },
    circuitBreaker: {
      ...cloudflareConfig.circuitBreaker,
      threshold: parseInt(process.env.CF_CIRCUIT_BREAKER_THRESHOLD || '5')
    }
  };
};

// Cloudflare-specific utility functions
export const isCloudflareRequest = (headers: any): boolean => {
  return !!(headers['cf-ray'] || headers['cf-connecting-ip'] || headers['cf-visitor']);
};

export const getCloudflareIP = (headers: any): string => {
  return headers['cf-connecting-ip'] || headers['x-forwarded-for'] || 'unknown';
};

export const getCloudflareRay = (headers: any): string => {
  return headers['cf-ray'] || 'unknown';
};

export const shouldRetryOnError = (error: any): boolean => {
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