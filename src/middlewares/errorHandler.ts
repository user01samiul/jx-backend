import { Request, Response, NextFunction } from "express";
import { HealthMonitorService } from "../services/health/health-monitor.service";
import { isCloudflareRequest, getCloudflareIP } from "../configs/cloudflare.config";

interface AppError extends Error {
  statusCode?: number;
  status?: string;
}

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err && (err.statusCode || err.status) ? (err.statusCode || err.status) : 500;
  
  // Track errors for health monitoring
  HealthMonitorService.incrementErrorCount();
  
  // Track critical errors with detailed information
  const errorId = HealthMonitorService.trackCriticalError(err, {
    path: req.path,
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  // Log error with Cloudflare context if applicable
  const isCloudflare = isCloudflareRequest(req.headers);
  const clientIP = getCloudflareIP(req.headers);
  
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
  const errorResponse: any = {
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

export default errorHandler;