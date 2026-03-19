import crypto from 'crypto';
import argon2 from 'argon2';

/**
 * Cryptographic Utilities
 * Provides secure key derivation, token generation, and hashing functions
 */

// ===========================================
// Argon2 Key Derivation
// ===========================================

/**
 * Argon2 configuration options
 * Using Argon2id (hybrid of Argon2i and Argon2d) for best security
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,     // 64 MB
  timeCost: 3,           // 3 iterations
  parallelism: 4,        // 4 parallel threads
  hashLength: 32,        // 256-bit output
};

/**
 * Derive a cryptographic key from a password using Argon2id
 * @param password - The password to derive key from
 * @param salt - Salt for key derivation (16+ bytes recommended)
 * @returns Derived key as Buffer
 */
export const deriveKey = async (
  password: string,
  salt: Buffer
): Promise<Buffer> => {
  const hash = await argon2.hash(password, {
    ...ARGON2_OPTIONS,
    salt,
    raw: true,
  });
  return hash;
};

/**
 * Derive a key and return it as hex string
 */
export const deriveKeyHex = async (
  password: string,
  salt: Buffer
): Promise<string> => {
  const key = await deriveKey(password, salt);
  return key.toString('hex');
};

/**
 * Generate a random salt for key derivation
 * @param length - Salt length in bytes (default 16)
 */
export const generateSalt = (length: number = 16): Buffer => {
  return crypto.randomBytes(length);
};

// ===========================================
// Secure Token Generation
// ===========================================

/**
 * Generate a cryptographically secure random token
 * @param length - Token length in bytes (default 32)
 * @returns Token as hex string (64 chars for 32 bytes)
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a URL-safe token using base64url encoding
 * @param length - Token length in bytes (default 32)
 * @returns URL-safe base64 encoded token
 */
export const generateUrlSafeToken = (length: number = 32): string => {
  return crypto.randomBytes(length)
    .toString('base64url')
    .replace(/[+/=]/g, ''); // Extra safety for URL usage
};

/**
 * Generate a short numeric code (for email verification, etc.)
 * @param digits - Number of digits (default 6)
 * @returns Numeric code as string with leading zeros preserved
 */
export const generateNumericCode = (digits: number = 6): string => {
  const max = Math.pow(10, digits);
  const randomValue = crypto.randomInt(0, max);
  return randomValue.toString().padStart(digits, '0');
};

/**
 * Generate a UUID v4 (cryptographically random)
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

// ===========================================
// Secure Hashing
// ===========================================

/**
 * Hash a token for secure storage (one-way hash)
 * Uses SHA-256, suitable for tokens that don't need to be reversed
 * @param token - Token to hash
 * @returns SHA-256 hash as hex string
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Hash data with HMAC-SHA256
 * @param data - Data to hash
 * @param secret - Secret key for HMAC
 * @returns HMAC as hex string
 */
export const hmacHash = (data: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Compare two strings in constant time (timing-safe comparison)
 * Prevents timing attacks when comparing tokens/hashes
 */
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// ===========================================
// Token Expiry Utilities
// ===========================================

/**
 * Token with embedded expiry information
 */
export interface TimedToken {
  token: string;
  hash: string;
  expiresAt: Date;
}

/**
 * Generate a timed token with expiry
 * @param expiryMinutes - Token validity in minutes
 * @returns Token, its hash (for storage), and expiry date
 */
export const generateTimedToken = (expiryMinutes: number = 60): TimedToken => {
  const token = generateSecureToken(32);
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  return { token, hash, expiresAt };
};

/**
 * Verify a timed token
 * @param token - The raw token to verify
 * @param storedHash - The hash stored in database
 * @param expiresAt - The expiry date from database
 * @returns Whether the token is valid and not expired
 */
export const verifyTimedToken = (
  token: string,
  storedHash: string,
  expiresAt: Date
): boolean => {
  // Check expiry first
  if (new Date() > expiresAt) {
    return false;
  }
  
  // Hash the provided token and compare
  const tokenHash = hashToken(token);
  return constantTimeCompare(tokenHash, storedHash);
};

// ===========================================
// Master Key Utilities
// ===========================================

/**
 * Derive an encryption key from master key and context
 * Uses HKDF-like approach for key derivation
 * @param masterKey - The master encryption key
 * @param context - Context string (e.g., "env-variables", "user-data")
 * @param salt - Optional salt for additional randomness
 * @returns Derived key as hex string
 */
export const deriveEncryptionKey = (
  masterKey: string,
  context: string,
  salt?: string
): string => {
  const info = `envmate:${context}:v1`;
  const actualSalt = salt || 'default-salt';
  
  // Use HMAC for key derivation (HKDF-expand style)
  const prk = crypto.createHmac('sha256', actualSalt)
    .update(masterKey)
    .digest();
  
  const okm = crypto.createHmac('sha256', prk)
    .update(info)
    .digest('hex');
  
  return okm;
};

/**
 * Validate encryption key format
 * @param key - Key to validate
 * @returns Whether key is valid (64 hex chars = 32 bytes)
 */
export const validateEncryptionKey = (key: string): boolean => {
  if (!key || key.length !== 64) {
    return false;
  }
  return /^[0-9a-fA-F]{64}$/.test(key);
};

// ===========================================
// Initialization Vector (IV) Generation
// ===========================================

/**
 * Generate a random IV for AES-GCM
 * @returns 12-byte IV as Buffer (recommended for GCM)
 */
export const generateIV = (): Buffer => {
  return crypto.randomBytes(12);
};

/**
 * Generate IV as hex string
 */
export const generateIVHex = (): string => {
  return generateIV().toString('hex');
};

export default {
  deriveKey,
  deriveKeyHex,
  generateSalt,
  generateSecureToken,
  generateUrlSafeToken,
  generateNumericCode,
  generateUUID,
  hashToken,
  hmacHash,
  constantTimeCompare,
  generateTimedToken,
  verifyTimedToken,
  deriveEncryptionKey,
  validateEncryptionKey,
  generateIV,
  generateIVHex,
};
