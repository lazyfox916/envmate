import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { verifyToken, DecodedToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import { User } from '../models';

/**
 * Extend Express Request to include authenticated user
 */
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
      userId?: string;
    }
  }
}

/**
 * Authentication middleware
 * Validates JWT token from Authorization header or cookies
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header or cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json(errorResponse('Invalid or expired token'));
      return;
    }

    // Ensure it's an access token
    if (decoded.type !== 'access') {
      res.status(401).json(errorResponse('Invalid token type'));
      return;
    }

    // Verify user exists and is not deleted
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      res.status(401).json(errorResponse('User not found'));
      return;
    }

    // Check if account is locked
    if (user.locked_until && new Date() < user.locked_until) {
      res.status(403).json(errorResponse('Account is locked'));
      return;
    }

    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json(errorResponse('Authentication error'));
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require authentication
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.type === 'access') {
        req.user = decoded;
        req.userId = decoded.userId;
      }
    }

    next();
  } catch {
    // Ignore errors, just continue without auth
    next();
  }
};

/**
 * Require email verification middleware
 * Must be used after authenticate middleware
 */
export const requireVerifiedEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.userId) {
    res.status(401).json(errorResponse('Authentication required'));
    return;
  }

  const user = await User.findByPk(req.userId);
  if (!user) {
    res.status(401).json(errorResponse('User not found'));
    return;
  }

  if (!user.email_verified) {
    res.status(403).json(errorResponse('Email verification required'));
    return;
  }

  next();
};

/**
 * Validation middleware factory
 * Validates request body against a Zod schema
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(errorResponse('Validation failed', undefined, errors));
        return;
      }
      res.status(400).json(errorResponse('Invalid request data'));
    }
  };
};

/**
 * CSRF protection middleware for cookie-based auth
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF check for read-only methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // If using cookie auth, require CSRF token
  if (req.cookies?.accessToken) {
    const csrfToken = req.headers['x-csrf-token'];
    const storedCsrfToken = req.cookies?.csrfToken;

    if (!csrfToken || csrfToken !== storedCsrfToken) {
      res.status(403).json(errorResponse('Invalid CSRF token'));
      return;
    }
  }

  next();
};

/**
 * Validation middleware for request body
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(errorResponse('Validation failed', undefined, errors));
        return;
      }
      res.status(400).json(errorResponse('Invalid request data'));
    }
  };
};

/**
 * Validation middleware for query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query) as any;
      // Don't overwrite req.query (may be getter-only). Attach parsed values to req.parsedQuery
      (req as any).parsedQuery = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(errorResponse('Invalid query parameters', undefined, errors));
        return;
      }
      console.error('Query validation error:', error);
      const errMsg = error && (error as Error).message ? (error as Error).message : 'Invalid query parameters';
      res.status(400).json(errorResponse('Invalid query parameters', undefined, [{ field: '', message: errMsg }]));
    }
  };
};

/**
 * Validation middleware for URL parameters
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json(errorResponse('Invalid URL parameters', undefined, errors));
        return;
      }
      res.status(400).json(errorResponse('Invalid URL parameters'));
    }
  };
};
