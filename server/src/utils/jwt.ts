import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

type StringValue = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN: StringValue = (process.env.JWT_EXPIRES_IN || '15m') as StringValue;
const JWT_REFRESH_EXPIRES_IN: StringValue = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue;

/**
 * Token payload interface
 */
export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

/**
 * Decoded token interface
 */
export interface DecodedToken extends JwtPayload, TokenPayload {}

/**
 * Token pair returned after login
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate an access token
 */
export const generateAccessToken = (userId: string, email: string): string => {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'access',
  };

  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * Generate a refresh token
 */
export const generateRefreshToken = (userId: string, email: string): string => {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'refresh',
  };

  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (userId: string, email: string): TokenPair => {
  return {
    accessToken: generateAccessToken(userId, email),
    refreshToken: generateRefreshToken(userId, email),
    expiresIn: parseExpiresIn(JWT_EXPIRES_IN),
  };
};

/**
 * Verify and decode a token
 */
export const verifyToken = (token: string): DecodedToken | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Decode a token without verification (useful for getting payload from expired tokens)
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Generate a cryptographically secure random token
 * Used for email verification, password reset, etc.
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for storage (one-way hash)
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Parse expires in string to milliseconds
 */
const parseExpiresIn = (expiresIn: string): number => {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000; // Default 15 minutes
  }
};

/**
 * Get token expiration date
 */
export const getTokenExpiration = (expiresIn: string = JWT_EXPIRES_IN): Date => {
  const ms = parseExpiresIn(expiresIn);
  return new Date(Date.now() + ms);
};
