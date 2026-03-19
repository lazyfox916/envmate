import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { successResponse, errorResponse } from '../utils/response';
import { generateSecureToken } from '../utils/jwt';
import { authenticate, validate } from '../middleware/auth';
import * as AuthService from '../services/AuthService';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../validators/auth';

const router = Router();

// Rate limiters for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { success: false, error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: { success: false, error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

const ACCESS_TOKEN_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.register(req.body);

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      const { user, tokens, verificationToken } = result.data!;

      // Set cookies
      res.cookie('accessToken', tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
      });

      // Generate CSRF token for cookie auth
      const csrfToken = generateSecureToken(16);
      res.cookie('csrfToken', csrfToken, {
        ...COOKIE_OPTIONS,
        httpOnly: false, // Must be readable by JavaScript
      });

      res.status(201).json(
        successResponse({
          user,
          tokens,
          csrfToken,
          // In production, verificationToken would be sent via email
          ...(process.env.NODE_ENV !== 'production' && { verificationToken }),
        })
      );
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json(errorResponse('Registration failed'));
    }
  }
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.login(req.body);

      if (!result.success) {
        res.status(401).json(errorResponse(result.error!));
        return;
      }

      const { user, tokens } = result.data!;

      // Set cookies
      res.cookie('accessToken', tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
      });

      // Generate CSRF token
      const csrfToken = generateSecureToken(16);
      res.cookie('csrfToken', csrfToken, {
        ...COOKIE_OPTIONS,
        httpOnly: false,
      });

      res.json(successResponse({ user, tokens, csrfToken }));
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json(errorResponse('Login failed'));
    }
  }
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    // Clear cookies
    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.clearCookie('csrfToken', { ...COOKIE_OPTIONS, httpOnly: false });

    res.json(successResponse({ message: 'Logged out successfully' }));
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(errorResponse('Logout failed'));
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await AuthService.getUserById(req.userId!);

    if (!result.success) {
      res.status(404).json(errorResponse(result.error!));
      return;
    }

    res.json(successResponse(result.data));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(errorResponse('Failed to get user'));
  }
});

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  async (req: Request, res: Response) => {
    try {
      // Get refresh token from body or cookie
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        res.status(400).json(errorResponse('Refresh token required'));
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);

      if (!result.success) {
        // Clear cookies on invalid refresh token
        res.clearCookie('accessToken', COOKIE_OPTIONS);
        res.clearCookie('refreshToken', COOKIE_OPTIONS);
        res.clearCookie('csrfToken', { ...COOKIE_OPTIONS, httpOnly: false });

        res.status(401).json(errorResponse(result.error!));
        return;
      }

      const { tokens } = result.data!;

      // Set new cookies
      res.cookie('accessToken', tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
      });

      // Generate new CSRF token
      const csrfToken = generateSecureToken(16);
      res.cookie('csrfToken', csrfToken, {
        ...COOKIE_OPTIONS,
        httpOnly: false,
      });

      res.json(successResponse({ tokens, csrfToken }));
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json(errorResponse('Token refresh failed'));
    }
  }
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.verifyEmail(req.body.token);

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse({ message: 'Email verified successfully', ...result.data }));
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json(errorResponse('Email verification failed'));
    }
  }
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  strictAuthLimiter,
  validate(resendVerificationSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.resendVerification(req.body.email);

      // Always return success to prevent email enumeration
      res.json(
        successResponse({
          message: 'If that email exists, a verification email has been sent',
          // In development, return the token for testing
          ...(process.env.NODE_ENV !== 'production' && result.data?.verificationToken
            ? { verificationToken: result.data.verificationToken }
            : {}),
        })
      );
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json(errorResponse('Failed to resend verification'));
    }
  }
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  strictAuthLimiter,
  validate(forgotPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.forgotPassword(req.body);

      // Always return success to prevent email enumeration
      res.json(
        successResponse({
          message: 'If that email exists, a password reset link has been sent',
          // In development, return the token for testing
          ...(process.env.NODE_ENV !== 'production' && result.data?.resetToken
            ? { resetToken: result.data.resetToken }
            : {}),
        })
      );
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json(errorResponse('Failed to process request'));
    }
  }
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
router.post(
  '/reset-password',
  strictAuthLimiter,
  validate(resetPasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.resetPassword(req.body);

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse({ message: 'Password reset successfully' }));
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json(errorResponse('Password reset failed'));
    }
  }
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await AuthService.changePassword(req.userId!, req.body);

      if (!result.success) {
        res.status(400).json(errorResponse(result.error!));
        return;
      }

      res.json(successResponse({ message: 'Password changed successfully' }));
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json(errorResponse('Password change failed'));
    }
  }
);

export default router;
