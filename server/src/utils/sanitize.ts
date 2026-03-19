/**
 * Output sanitization utilities
 * Prevents sensitive data leakage in API responses
 */

// Keys that should never appear in API responses
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'hashedPassword',
  'hashed_password',
  'secret',
  'apiSecret',
  'api_secret',
  'privateKey',
  'private_key',
  'encryptionKey',
  'encryption_key',
  'masterKey',
  'master_key',
  'salt',
  'iv',
  'nonce',
  'authTag',
  'auth_tag',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'token',
  'jwt',
  'sessionId',
  'session_id',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
  'ssn',
  'socialSecurityNumber',
  'social_security_number',
  'bankAccount',
  'bank_account',
  'routingNumber',
  'routing_number',
  'pin',
  'otp',
  'twoFactorSecret',
  'two_factor_secret',
  'totpSecret',
  'totp_secret',
  'recoveryCode',
  'recovery_code',
  'backupCode',
  'backup_code',
  'resetToken',
  'reset_token',
  'verificationToken',
  'verification_token',
  'invitationToken',
  'invitation_token',
  'encryptedContent',
  'encrypted_content',
  'encryptedData',
  'encrypted_data',
]);

// Keys that should be partially masked (show last 4 chars)
const MASK_PARTIAL_KEYS = new Set([
  'email',
  'phone',
  'phoneNumber',
  'phone_number',
  'apiKey',
  'api_key',
]);

// Pattern to detect potential sensitive data
const SENSITIVE_PATTERNS = [
  /^sk_[a-zA-Z0-9]+$/,        // Stripe-like secret keys
  /^pk_[a-zA-Z0-9]+$/,        // Stripe-like public keys
  /^Bearer\s+.+$/i,           // Bearer tokens
  /^Basic\s+.+$/i,            // Basic auth
  /^[A-Za-z0-9+/=]{40,}$/,    // Base64 encoded long strings (potential secrets)
  /-----BEGIN.*PRIVATE KEY-----/i,  // PEM private keys
  /^ghp_[a-zA-Z0-9]{36}$/,    // GitHub personal access tokens
  /^gho_[a-zA-Z0-9]{36}$/,    // GitHub OAuth tokens
  /^xox[baprs]-[a-zA-Z0-9-]+$/,  // Slack tokens
];

export interface SanitizeOptions {
  /** Remove sensitive keys entirely (default: true) */
  removeSensitiveKeys?: boolean;
  /** Mask partial keys like email (default: false for privacy) */
  maskPartialKeys?: boolean;
  /** Check values for sensitive patterns (default: true) */
  checkPatterns?: boolean;
  /** Custom keys to remove */
  additionalSensitiveKeys?: string[];
  /** Custom keys to mask */
  additionalMaskKeys?: string[];
  /** Max depth to traverse (default: 10) */
  maxDepth?: number;
  /** Replacement text for removed values */
  replacementText?: string;
}

const DEFAULT_OPTIONS: SanitizeOptions = {
  removeSensitiveKeys: true,
  maskPartialKeys: false,
  checkPatterns: true,
  maxDepth: 10,
  replacementText: '[REDACTED]',
};

/**
 * Mask a string value showing only last N characters
 */
export function maskValue(value: string, visibleChars: number = 4): string {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= visibleChars) return '*'.repeat(value.length);
  return '*'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
}

/**
 * Mask an email address (show first char and domain)
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return email;
  const [local, domain] = email.split('@');
  if (!local || !domain) return maskValue(email);
  const maskedLocal = local.length > 1 
    ? local[0] + '*'.repeat(local.length - 1)
    : '*';
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask a phone number (show last 4 digits)
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '*'.repeat(phone.length);
  return '*'.repeat(phone.length - 4) + digits.slice(-4);
}

/**
 * Check if a key name is sensitive
 */
function isSensitiveKey(key: string, additionalKeys?: string[]): boolean {
  const lowerKey = key.toLowerCase();
  
  // Check built-in sensitive keys
  if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(lowerKey)) {
    return true;
  }
  
  // Check additional keys
  if (additionalKeys?.some(k => k.toLowerCase() === lowerKey)) {
    return true;
  }
  
  // Check for common sensitive patterns in key names
  if (
    lowerKey.includes('password') ||
    lowerKey.includes('secret') ||
    lowerKey.includes('private') ||
    lowerKey.includes('credential') ||
    lowerKey.includes('auth_token') ||
    lowerKey.includes('apikey') ||
    lowerKey.includes('_key') && lowerKey.includes('encrypt')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Check if a key should be partially masked
 */
function shouldMask(key: string, additionalKeys?: string[]): boolean {
  const lowerKey = key.toLowerCase();
  return MASK_PARTIAL_KEYS.has(key) || 
         MASK_PARTIAL_KEYS.has(lowerKey) ||
         additionalKeys?.some(k => k.toLowerCase() === lowerKey) ||
         false;
}

/**
 * Check if a value matches sensitive patterns
 */
function matchesSensitivePattern(value: string): boolean {
  if (typeof value !== 'string') return false;
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Deep sanitize an object, removing or masking sensitive data
 */
export function sanitize<T>(data: T, options: SanitizeOptions = {}): T {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  function sanitizeRecursive(obj: unknown, depth: number): unknown {
    // Prevent infinite recursion
    if (depth > (opts.maxDepth || 10)) {
      return obj;
    }
    
    // Handle null/undefined
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    // Handle primitives
    if (typeof obj !== 'object') {
      // Check string values for sensitive patterns
      if (typeof obj === 'string' && opts.checkPatterns && matchesSensitivePattern(obj)) {
        return opts.replacementText;
      }
      return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeRecursive(item, depth + 1));
    }
    
    // Handle Date objects
    if (obj instanceof Date) {
      return obj;
    }
    
    // Handle plain objects
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if key is sensitive - remove entirely
      if (opts.removeSensitiveKeys && isSensitiveKey(key, opts.additionalSensitiveKeys)) {
        // Skip this key entirely (don't include in result)
        continue;
      }
      
      // Check if key should be masked
      if (opts.maskPartialKeys && shouldMask(key, opts.additionalMaskKeys)) {
        if (typeof value === 'string') {
          if (key.toLowerCase().includes('email')) {
            result[key] = maskEmail(value);
          } else if (key.toLowerCase().includes('phone')) {
            result[key] = maskPhone(value);
          } else {
            result[key] = maskValue(value);
          }
          continue;
        }
      }
      
      // Recursively sanitize nested objects
      result[key] = sanitizeRecursive(value, depth + 1);
    }
    
    return result;
  }
  
  return sanitizeRecursive(data, 0) as T;
}

/**
 * Sanitize user object for API response
 */
export function sanitizeUser(user: Record<string, unknown>): Record<string, unknown> {
  // Remove sensitive fields explicitly
  const { 
    passwordHash, 
    password_hash,
    password,
    refreshToken,
    refresh_token,
    twoFactorSecret,
    two_factor_secret,
    totpSecret,
    salt,
    ...safeUser 
  } = user;
  
  return sanitize(safeUser);
}

/**
 * Sanitize team object for API response
 */
export function sanitizeTeam(team: Record<string, unknown>): Record<string, unknown> {
  return sanitize(team, {
    additionalSensitiveKeys: ['inviteCode', 'invite_code'],
  });
}

/**
 * Sanitize project object for API response
 */
export function sanitizeProject(project: Record<string, unknown>): Record<string, unknown> {
  return sanitize(project);
}

/**
 * Sanitize environment variable data (values should always be encrypted)
 */
export function sanitizeEnvData(envData: Record<string, unknown>): Record<string, unknown> {
  return sanitize(envData, {
    additionalSensitiveKeys: ['value', 'decryptedValue', 'plainValue'],
  });
}

/**
 * Create a sanitized error response
 */
export function sanitizeError(error: Error | unknown): { message: string; code?: string } {
  if (error instanceof Error) {
    // Don't expose stack traces or internal details
    return {
      message: sanitizeErrorMessage(error.message),
      code: (error as Error & { code?: string }).code,
    };
  }
  
  return {
    message: 'An unexpected error occurred',
  };
}

/**
 * Sanitize error messages to remove sensitive info
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return 'An error occurred';
  }
  
  // Remove file paths
  let sanitized = message.replace(/\/[^\s:]+\.(js|ts|json)/g, '[file]');
  
  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');
  
  // Remove database connection strings
  sanitized = sanitized.replace(/postgres:\/\/[^\s]+/gi, '[database]');
  sanitized = sanitized.replace(/mysql:\/\/[^\s]+/gi, '[database]');
  sanitized = sanitized.replace(/mongodb:\/\/[^\s]+/gi, '[database]');
  sanitized = sanitized.replace(/redis:\/\/[^\s]+/gi, '[database]');
  
  // Remove potential credentials
  sanitized = sanitized.replace(/password[=:]["']?[^\s"']+["']?/gi, 'password=[REDACTED]');
  sanitized = sanitized.replace(/secret[=:]["']?[^\s"']+["']?/gi, 'secret=[REDACTED]');
  sanitized = sanitized.replace(/key[=:]["']?[^\s"']+["']?/gi, 'key=[REDACTED]');
  sanitized = sanitized.replace(/token[=:]["']?[^\s"']+["']?/gi, 'token=[REDACTED]');
  
  return sanitized;
}

/**
 * Middleware to sanitize response JSON
 */
export function sanitizeResponseMiddleware() {
  return function(
    _req: unknown,
    res: { json: (body: unknown) => unknown },
    next: () => void
  ): void {
    const originalJson = res.json.bind(res);
    
    res.json = function(body: unknown): unknown {
      const sanitizedBody = sanitize(body);
      return originalJson(sanitizedBody);
    };
    
    next();
  };
}

/**
 * Helper to ensure only safe fields are returned for a model
 */
export function pickSafeFields<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  
  return result;
}

/**
 * Create a whitelist-based sanitizer for specific model types
 */
export function createModelSanitizer<T extends Record<string, unknown>>(
  allowedFields: (keyof T)[]
): (obj: T) => Partial<T> {
  return (obj: T) => pickSafeFields(obj, allowedFields);
}

export default {
  sanitize,
  sanitizeUser,
  sanitizeTeam,
  sanitizeProject,
  sanitizeEnvData,
  sanitizeError,
  sanitizeErrorMessage,
  sanitizeResponseMiddleware,
  maskValue,
  maskEmail,
  maskPhone,
  pickSafeFields,
  createModelSanitizer,
};
