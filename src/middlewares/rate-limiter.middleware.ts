import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { getCloudflareConfig } from '../configs/cloudflare.config';

// Circuit breaker state
interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  threshold: number;
  timeout: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    threshold: 5, // Number of failures before opening circuit
    timeout: 30000 // 30 seconds timeout
  };

  isOpen(): boolean {
    if (!this.state.isOpen) return false;
    
    // Check if timeout has passed
    if (Date.now() - this.state.lastFailureTime > this.state.timeout) {
      this.state.isOpen = false;
      this.state.failureCount = 0;
      return false;
    }
    
    return true;
  }

  recordFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    
    if (this.state.failureCount >= this.state.threshold) {
      this.state.isOpen = true;
      console.log('[CIRCUIT_BREAKER] Circuit opened due to too many failures');
    }
  }

  recordSuccess(): void {
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
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  skip?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: options.skip,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use Cloudflare's CF-Connecting-IP if available, otherwise fallback to req.ip
      return req.headers['cf-connecting-ip'] as string || req.ip || 'unknown';
    }),
    handler: (req: Request, res: Response) => {
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

// Circuit breaker middleware
export const circuitBreakerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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

// Error tracking middleware for circuit breaker
export const errorTrackingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode >= 500) {
      globalCircuitBreaker.recordFailure();
    } else if (res.statusCode < 400) {
      globalCircuitBreaker.recordSuccess();
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Cloudflare-specific headers middleware
export const cloudflareHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
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

// Health check endpoint for circuit breaker status
export const getCircuitBreakerStatus = () => {
  return globalCircuitBreaker.getStatus();
};

// Predefined rate limiters using environment configuration
const cloudflareConfig = getCloudflareConfig();

export const standardRateLimiter = createRateLimiter({
  windowMs: cloudflareConfig.rateLimiting.standard.windowMs,
  max: cloudflareConfig.rateLimiting.standard.max,
  message: cloudflareConfig.rateLimiting.standard.message
});

export const strictRateLimiter = createRateLimiter({
  windowMs: cloudflareConfig.rateLimiting.strict.windowMs,
  max: cloudflareConfig.rateLimiting.strict.max,
  message: cloudflareConfig.rateLimiting.strict.message
});

export const providerRateLimiter = createRateLimiter({
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
export const loginRateLimiter = createRateLimiter({
  windowMs: cloudflareConfig.rateLimiting.auth.windowMs,
  max: cloudflareConfig.rateLimiting.auth.max,
  message: cloudflareConfig.rateLimiting.auth.message
});

// Rate limiter for auth endpoints with intelligent limiting
export const authRateLimiter = createRateLimiter({
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