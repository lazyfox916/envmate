import { Op } from 'sequelize';
import { User } from '../models';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateTokenPair,
  generateSecureToken,
  hashToken,
  verifyToken,
  TokenPair,
} from '../utils/jwt';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '../validators/auth';

// Account lockout configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

/**
 * Auth service result type
 */
export interface AuthResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * User safe response (without sensitive fields)
 */
export interface SafeUser {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  created_at: Date;
  last_login_at: Date | null;
}

/**
 * Convert User model to safe user response
 */
const toSafeUser = (user: User): SafeUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  email_verified: user.email_verified,
  created_at: user.created_at,
  last_login_at: user.last_login_at,
});

/**
 * Register a new user
 */
export const register = async (
  input: RegisterInput
): Promise<AuthResult<{ user: SafeUser; tokens: TokenPair; verificationToken: string }>> => {
  const { email, password, name } = input;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return { success: false, error: 'Email already registered' };
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Generate email verification token
  const verificationToken = generateSecureToken();
  const hashedVerificationToken = hashToken(verificationToken);

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    password_hash,
    name,
    email_verification_token: hashedVerificationToken,
    email_verification_expires: new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    ),
  });

  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);

  return {
    success: true,
    data: {
      user: toSafeUser(user),
      tokens,
      verificationToken, // Send this via email in production
    },
  };
};

/**
 * Login user
 */
export const login = async (
  input: LoginInput
): Promise<AuthResult<{ user: SafeUser; tokens: TokenPair }>> => {
  const { email, password } = input;

  // Find user
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Check if account is locked
  if (user.locked_until && new Date() < user.locked_until) {
    const remainingMinutes = Math.ceil(
      (user.locked_until.getTime() - Date.now()) / (60 * 1000)
    );
    return {
      success: false,
      error: `Account is locked. Try again in ${remainingMinutes} minutes`,
    };
  }

  // Verify password
  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    // Increment failed attempts
    const failedAttempts = user.failed_login_attempts + 1;
    const updateData: Partial<User> = {
      failed_login_attempts: failedAttempts,
    };

    // Lock account if max attempts reached
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.locked_until = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
      );
    }

    await user.update(updateData);

    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      return {
        success: false,
        error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes`,
      };
    }

    return { success: false, error: 'Invalid email or password' };
  }

  // Reset failed attempts and update last login
  await user.update({
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: new Date(),
  });

  // Generate tokens
  const tokens = generateTokenPair(user.id, user.email);

  return {
    success: true,
    data: {
      user: toSafeUser(user),
      tokens,
    },
  };
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  token: string
): Promise<AuthResult<{ tokens: TokenPair }>> => {
  // Verify refresh token
  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== 'refresh') {
    return { success: false, error: 'Invalid refresh token' };
  }

  // Find user
  const user = await User.findByPk(decoded.userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Generate new tokens
  const tokens = generateTokenPair(user.id, user.email);

  return {
    success: true,
    data: { tokens },
  };
};

/**
 * Verify email
 */
export const verifyEmail = async (token: string): Promise<AuthResult<{ user: SafeUser }>> => {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    where: {
      email_verification_token: hashedToken,
      email_verification_expires: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    return { success: false, error: 'Invalid or expired verification token' };
  }

  await user.update({
    email_verified: true,
    email_verification_token: null,
    email_verification_expires: null,
  });

  return {
    success: true,
    data: { user: toSafeUser(user) },
  };
};

/**
 * Resend verification email
 */
export const resendVerification = async (
  email: string
): Promise<AuthResult<{ verificationToken: string }>> => {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    // Return success even if user not found (security: prevent email enumeration)
    return { success: true, data: { verificationToken: '' } };
  }

  if (user.email_verified) {
    return { success: false, error: 'Email is already verified' };
  }

  // Generate new verification token
  const verificationToken = generateSecureToken();
  const hashedToken = hashToken(verificationToken);

  await user.update({
    email_verification_token: hashedToken,
    email_verification_expires: new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    ),
  });

  return {
    success: true,
    data: { verificationToken }, // Send via email in production
  };
};

/**
 * Request password reset
 */
export const forgotPassword = async (
  input: ForgotPasswordInput
): Promise<AuthResult<{ resetToken: string }>> => {
  const { email } = input;

  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    // Return success even if user not found (security: prevent email enumeration)
    return { success: true, data: { resetToken: '' } };
  }

  // Generate reset token
  const resetToken = generateSecureToken();
  const hashedToken = hashToken(resetToken);

  await user.update({
    password_reset_token: hashedToken,
    password_reset_expires: new Date(
      Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000
    ),
  });

  return {
    success: true,
    data: { resetToken }, // Send via email in production
  };
};

/**
 * Reset password
 */
export const resetPassword = async (input: ResetPasswordInput): Promise<AuthResult> => {
  const { token, password } = input;
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    where: {
      password_reset_token: hashedToken,
      password_reset_expires: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    return { success: false, error: 'Invalid or expired reset token' };
  }

  // Hash new password
  const password_hash = await hashPassword(password);

  await user.update({
    password_hash,
    password_reset_token: null,
    password_reset_expires: null,
    failed_login_attempts: 0,
    locked_until: null,
  });

  return { success: true };
};

/**
 * Change password (for authenticated users)
 */
export const changePassword = async (
  userId: string,
  input: ChangePasswordInput
): Promise<AuthResult> => {
  const { currentPassword, newPassword } = input;

  const user = await User.findByPk(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.password_hash);
  if (!isValid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Hash new password
  const password_hash = await hashPassword(newPassword);

  await user.update({ password_hash });

  return { success: true };
};

/**
 * Get user by ID (for /me endpoint)
 */
export const getUserById = async (userId: string): Promise<AuthResult<{ user: SafeUser }>> => {
  const user = await User.findByPk(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  return {
    success: true,
    data: { user: toSafeUser(user) },
  };
};
