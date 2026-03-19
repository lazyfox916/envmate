import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { errorResponse } from '../utils/response';

/**
 * Enhanced Error Handling Middleware
 * Provides secure error handling that doesn't leak sensitive information in production
 */

/**
 * Custom application error class
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error types
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true, 'FORBIDDEN');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, true, 'BAD_REQUEST');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, true, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMITED');
  }
}

export class ValidationError extends AppError {
  errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed', 400, true, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Sanitize error message for safe output
 * Removes potentially sensitive information
 */
const sanitizeErrorMessage = (message: string): string => {
  // Remove file paths
  let sanitized = message.replace(/\/[^\s]+\.(ts|js)/g, '[path]');
  
  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');
  
  // Remove potential SQL fragments
  sanitized = sanitized.replace(/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE/gi, '[sql]');
  
  // Remove potential secrets (long alphanumeric strings)
  sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[redacted]');
  
  return sanitized;
};

/**
 * Log error securely (don't log sensitive data)
 */
const logError = (error: Error, req: Request): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const logData: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    errorName: error.name,
    errorMessage: error.message,
  };
  
  // Add stack trace only in development
  if (!isProduction) {
    logData.stack = error.stack;
  }
  
  // Add user ID if available (but not other user data)
  if (req.userId) {
    logData.userId = req.userId;
  }
  
  console.error('Application Error:', JSON.stringify(logData));
};

/**
 * Handle Zod validation errors
 */
const handleZodError = (error: ZodError): ValidationError => {
  const errors = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  return new ValidationError(errors);
};

/**
 * Handle database errors
 */
const handleDatabaseError = (error: any): AppError => {
  // Sequelize unique constraint violation
  if (error.name === 'SequelizeUniqueConstraintError') {
    return new ConflictError('Resource already exists');
  }
  
  // Sequelize validation error
  if (error.name === 'SequelizeValidationError') {
    const errors = error.errors?.map((e: any) => ({
      field: e.path,
      message: e.message,
    })) || [];
    return new ValidationError(errors);
  }
  
  // Sequelize foreign key constraint
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new BadRequestError('Referenced resource does not exist');
  }
  
  // Sequelize connection error
  if (error.name === 'SequelizeConnectionError') {
    console.error('Database connection error:', error.message);
    return new AppError('Service temporarily unavailable', 503, false);
  }
  
  // Generic database error
  return new AppError('Database error', 500, false);
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token expired');
  }
  return new UnauthorizedError('Authentication failed');
};

/**
 * Main error handling middleware
 */
export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Log the error
  logError(error, req);
  
  // Transform known error types
  let appError: AppError;
  
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = handleZodError(error);
  } else if (error.name?.startsWith('Sequelize')) {
    appError = handleDatabaseError(error);
  } else if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
    appError = handleJWTError(error);
  } else {
    // Unknown error - don't expose details in production
    appError = new AppError(
      isProduction ? 'Internal server error' : error.message,
      500,
      false
    );
  }
  
  // Build response
  const response: Record<string, unknown> = {
    success: false,
    error: isProduction ? sanitizeErrorMessage(appError.message) : appError.message,
    code: appError.code,
  };
  
  // Add validation errors if present
  if (appError instanceof ValidationError) {
    response.errors = appError.errors;
  }
  
  // Add request ID for tracking
  response.requestId = req.requestId;
  
  // Add stack trace in development only
  if (!isProduction && error.stack) {
    response.stack = error.stack;
  }
  
  res.status(appError.statusCode).json(response);
};

/**
 * Async error wrapper - wraps async route handlers to catch errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json(errorResponse(
    'Route not found',
    { path: req.path, method: req.method }
  ));
};

export default errorHandler;
