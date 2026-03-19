import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID Middleware
 * Adds a unique request ID to each request for debugging and logging
 */

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

/**
 * Add unique request ID to each request
 * Uses X-Request-ID header if provided, otherwise generates new UUID
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  // Attach to request object
  req.requestId = requestId;
  req.startTime = Date.now();
  
  // Set response header for client tracking
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

/**
 * Log request completion with timing
 */
export const requestTimingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };
    
    // Log based on status code
    if (res.statusCode >= 500) {
      console.error('Request error:', JSON.stringify(logData));
    } else if (res.statusCode >= 400) {
      console.warn('Request warning:', JSON.stringify(logData));
    } else if (process.env.NODE_ENV !== 'production') {
      // Only log successful requests in development
      console.log('Request completed:', JSON.stringify(logData));
    }
  });
  
  next();
};

export default requestIdMiddleware;
