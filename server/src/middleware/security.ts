import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RateLimitError } from './errorHandler';

/**
 * Security Middleware
 * Comprehensive security configuration for the API
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// ===========================================
// Content Security Policy
// ===========================================

/**
 * CSP directives configuration
 */
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

/**
 * Configure Helmet with security headers
 * Returns middleware function
 */
export function configureHelmet() {
  return helmet({
    contentSecurityPolicy: isProduction ? { directives: cspDirectives } : false,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
  });
}

// ===========================================
// Cookie Security Configuration
// ===========================================

/**
 * Secure cookie options for production
 */
export const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('strict' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  ...(isProduction && { domain: process.env.COOKIE_DOMAIN }),
};

/**
 * Access token cookie options (shorter expiry)
 */
export const accessTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

/**
 * Refresh token cookie options (longer expiry)
 */
export const refreshTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Cookie clearing options
 */
export const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('strict' as const) : ('lax' as const),
  path: '/',
};

// ===========================================
// IP-Based Rate Limiting
// ===========================================

/**
 * Get client IP address (handles proxies)
 */
const getClientIP = (req: Request): string => {
  // Trust X-Forwarded-For header if behind a proxy
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = (forwardedFor as string).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * General API rate limiter
 * More permissive for normal operations
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // 100 requests per 15 min in production
  message: { 
    success: false, 
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: (req) => {
    // Skip rate limiting for health checks and in test mode
    return isTest || req.path === '/api/v1/health' || req.path === '/api/health';
  },
  validate: !isTest, // Disable validation in test environment
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 5 : 100, // 5 attempts per 15 min in production
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  skip: () => isTest, // Skip in test mode
  validate: !isTest, // Disable validation in test environment
});

/**
 * Rate limiter for password reset requests
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 3 : 100, // 3 attempts per hour in production
  message: {
    success: false,
    error: 'Too many password reset attempts, please try again later',
    code: 'RESET_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: () => isTest,
  validate: !isTest,
});

/**
 * Rate limiter for email verification requests
 */
export const emailVerificationRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isProduction ? 3 : 100, // 3 attempts per 10 min in production
  message: {
    success: false,
    error: 'Too many verification requests, please try again later',
    code: 'VERIFY_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: () => isTest,
  validate: !isTest,
});

/**
 * Rate limiter for sensitive operations
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 10 : 1000, // 10 per hour in production
  message: {
    success: false,
    error: 'Too many requests for this operation, please try again later',
    code: 'SENSITIVE_RATE_LIMITED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIP,
  skip: () => isTest,
  validate: !isTest,
});

// ===========================================
// Brute Force Protection
// ===========================================

/**
 * Track failed login attempts per IP/user combination
 */
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();

/**
 * Cleanup interval (10 minutes)
 */
const cleanupInterval = 10 * 60 * 1000;

// Periodic cleanup of old entries
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  
  for (const [key, value] of failedAttempts.entries()) {
    if (now - value.firstAttempt > maxAge) {
      failedAttempts.delete(key);
    }
  }
}, cleanupInterval);

/**
 * Check and track brute force attempts
 * @param identifier - Unique identifier (IP + optional email)
 * @param maxAttempts - Maximum allowed attempts
 * @param windowMs - Time window in milliseconds
 * @returns Whether the request should be blocked
 */
export const checkBruteForce = (
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean => {
  const now = Date.now();
  const record = failedAttempts.get(identifier);
  
  if (!record) {
    return false;
  }
  
  // Reset if outside window
  if (now - record.firstAttempt > windowMs) {
    failedAttempts.delete(identifier);
    return false;
  }
  
  return record.count >= maxAttempts;
};

/**
 * Record a failed attempt
 */
export const recordFailedAttempt = (identifier: string): void => {
  const now = Date.now();
  const record = failedAttempts.get(identifier);
  
  if (record) {
    record.count++;
  } else {
    failedAttempts.set(identifier, { count: 1, firstAttempt: now });
  }
};

/**
 * Clear failed attempts (on successful login)
 */
export const clearFailedAttempts = (identifier: string): void => {
  failedAttempts.delete(identifier);
};

/**
 * Brute force protection middleware
 */
export const bruteForceProtection = (
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIP(req);
    const email = req.body?.email || '';
    const identifier = `${ip}:${email}`;
    
    if (checkBruteForce(identifier, maxAttempts, windowMs)) {
      res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please try again later.',
        code: 'BRUTE_FORCE_BLOCKED',
      });
      return;
    }
    
    next();
  };
};

// ===========================================
// Additional Security Middleware
// ===========================================

/**
 * Prevent parameter pollution
 */
export const preventParameterPollution = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // For query parameters that should be single values, take the first one
  const singleParams = ['page', 'limit', 'sort', 'order'];
  
  for (const param of singleParams) {
    if (Array.isArray(req.query[param])) {
      req.query[param] = req.query[param][0] as string;
    }
  }
  
  next();
};

/**
 * Prevent clickjacking with X-Frame-Options
 */
export const noFrames = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

/**
 * Add security headers for API responses
 */
export const apiSecurityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};

export default {
  configureHelmet,
  cookieOptions,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  clearCookieOptions,
  generalRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter,
  emailVerificationRateLimiter,
  sensitiveRateLimiter,
  checkBruteForce,
  recordFailedAttempt,
  clearFailedAttempts,
  bruteForceProtection,
  preventParameterPollution,
  noFrames,
  apiSecurityHeaders,
};
