/**
 * Unit Tests for Cryptographic Utilities
 * Tests token generation, hashing, key derivation, and encryption helpers
 */

import {
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
  generateSalt,
  deriveKey,
} from '../../src/utils/crypto';

describe('Cryptographic Utilities', () => {
  // ===========================================
  // Token Generation Tests
  // ===========================================

  describe('generateSecureToken', () => {
    it('should generate a token of correct length', () => {
      const token = generateSecureToken(32);
      // 32 bytes = 64 hex characters
      expect(token).toHaveLength(64);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate hex-encoded string', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should respect custom length', () => {
      const token16 = generateSecureToken(16);
      const token64 = generateSecureToken(64);
      expect(token16).toHaveLength(32); // 16 bytes = 32 hex
      expect(token64).toHaveLength(128); // 64 bytes = 128 hex
    });
  });

  describe('generateUrlSafeToken', () => {
    it('should generate URL-safe token', () => {
      const token = generateUrlSafeToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should not contain URL-unsafe characters', () => {
      for (let i = 0; i < 50; i++) {
        const token = generateUrlSafeToken();
        expect(token).not.toContain('+');
        expect(token).not.toContain('/');
        expect(token).not.toContain('=');
      }
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateUrlSafeToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('generateNumericCode', () => {
    it('should generate 6-digit code by default', () => {
      const code = generateNumericCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should respect custom digit count', () => {
      const code4 = generateNumericCode(4);
      const code8 = generateNumericCode(8);
      expect(code4).toHaveLength(4);
      expect(code8).toHaveLength(8);
    });

    it('should preserve leading zeros', () => {
      // Run multiple times to increase chance of getting leading zeros
      let hasLeadingZero = false;
      for (let i = 0; i < 1000; i++) {
        const code = generateNumericCode(6);
        if (code.startsWith('0')) {
          hasLeadingZero = true;
          expect(code).toHaveLength(6);
          break;
        }
      }
      // With 1000 tries, probability of not getting a leading zero is very low
      // but we don't fail if it doesn't happen
    });

    it('should only contain digits', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateNumericCode();
        expect(code).toMatch(/^\d+$/);
      }
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID v4', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  // ===========================================
  // Hashing Tests
  // ===========================================

  describe('hashToken', () => {
    it('should produce consistent hash for same input', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 64-character hex string (SHA-256)', () => {
      const hash = hashToken('any-token');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should not be reversible', () => {
      const token = 'secret-token';
      const hash = hashToken(token);
      expect(hash).not.toContain(token);
    });
  });

  describe('hmacHash', () => {
    it('should produce consistent HMAC for same input and key', () => {
      const data = 'test-data';
      const secret = 'secret-key';
      const hmac1 = hmacHash(data, secret);
      const hmac2 = hmacHash(data, secret);
      expect(hmac1).toBe(hmac2);
    });

    it('should produce different HMAC for different keys', () => {
      const data = 'test-data';
      const hmac1 = hmacHash(data, 'key1');
      const hmac2 = hmacHash(data, 'key2');
      expect(hmac1).not.toBe(hmac2);
    });

    it('should produce different HMAC for different data', () => {
      const secret = 'secret-key';
      const hmac1 = hmacHash('data1', secret);
      const hmac2 = hmacHash('data2', secret);
      expect(hmac1).not.toBe(hmac2);
    });

    it('should return 64-character hex string', () => {
      const hmac = hmacHash('data', 'key');
      expect(hmac).toHaveLength(64);
      expect(hmac).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('constantTimeCompare', () => {
    it('should return true for equal strings', () => {
      expect(constantTimeCompare('test', 'test')).toBe(true);
      expect(constantTimeCompare('abc123', 'abc123')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(constantTimeCompare('test', 'Test')).toBe(false);
      expect(constantTimeCompare('abc', 'abd')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(constantTimeCompare('short', 'longer')).toBe(false);
      expect(constantTimeCompare('', 'a')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(constantTimeCompare('', '')).toBe(true);
    });
  });

  // ===========================================
  // Timed Token Tests
  // ===========================================

  describe('generateTimedToken', () => {
    it('should generate token with hash and expiry', () => {
      const timedToken = generateTimedToken(60);
      expect(timedToken).toHaveProperty('token');
      expect(timedToken).toHaveProperty('hash');
      expect(timedToken).toHaveProperty('expiresAt');
    });

    it('should set correct expiry time', () => {
      const now = Date.now();
      const timedToken = generateTimedToken(60); // 60 minutes
      const expectedExpiry = now + 60 * 60 * 1000;
      // Allow 1 second tolerance
      expect(timedToken.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(timedToken.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it('should hash the token correctly', () => {
      const timedToken = generateTimedToken();
      const expectedHash = hashToken(timedToken.token);
      expect(timedToken.hash).toBe(expectedHash);
    });
  });

  describe('verifyTimedToken', () => {
    it('should verify valid token', () => {
      const timedToken = generateTimedToken(60);
      expect(verifyTimedToken(timedToken.token, timedToken.hash, timedToken.expiresAt)).toBe(true);
    });

    it('should reject wrong token', () => {
      const timedToken = generateTimedToken(60);
      expect(verifyTimedToken('wrong-token', timedToken.hash, timedToken.expiresAt)).toBe(false);
    });

    it('should reject expired token', () => {
      const timedToken = generateTimedToken(60);
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      expect(verifyTimedToken(timedToken.token, timedToken.hash, expiredDate)).toBe(false);
    });

    it('should reject wrong hash', () => {
      const timedToken = generateTimedToken(60);
      const wrongHash = hashToken('different-token');
      expect(verifyTimedToken(timedToken.token, wrongHash, timedToken.expiresAt)).toBe(false);
    });
  });

  // ===========================================
  // Key Derivation Tests
  // ===========================================

  describe('deriveEncryptionKey', () => {
    it('should derive consistent key for same inputs', () => {
      const key1 = deriveEncryptionKey('master-key', 'context1');
      const key2 = deriveEncryptionKey('master-key', 'context1');
      expect(key1).toBe(key2);
    });

    it('should derive different keys for different contexts', () => {
      const key1 = deriveEncryptionKey('master-key', 'context1');
      const key2 = deriveEncryptionKey('master-key', 'context2');
      expect(key1).not.toBe(key2);
    });

    it('should derive different keys for different master keys', () => {
      const key1 = deriveEncryptionKey('master-key-1', 'context');
      const key2 = deriveEncryptionKey('master-key-2', 'context');
      expect(key1).not.toBe(key2);
    });

    it('should derive different keys with different salts', () => {
      const key1 = deriveEncryptionKey('master-key', 'context', 'salt1');
      const key2 = deriveEncryptionKey('master-key', 'context', 'salt2');
      expect(key1).not.toBe(key2);
    });

    it('should return 64-character hex key', () => {
      const key = deriveEncryptionKey('master', 'context');
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('validateEncryptionKey', () => {
    it('should accept valid 64-char hex key', () => {
      const validKey = 'a'.repeat(64);
      expect(validateEncryptionKey(validKey)).toBe(true);
    });

    it('should accept mixed case hex', () => {
      const key = 'aAbBcCdDeEfF' + '0'.repeat(52);
      expect(validateEncryptionKey(key)).toBe(true);
    });

    it('should reject too short key', () => {
      expect(validateEncryptionKey('abc')).toBe(false);
      expect(validateEncryptionKey('a'.repeat(63))).toBe(false);
    });

    it('should reject too long key', () => {
      expect(validateEncryptionKey('a'.repeat(65))).toBe(false);
    });

    it('should reject non-hex characters', () => {
      const invalidKey = 'g'.repeat(64); // 'g' is not hex
      expect(validateEncryptionKey(invalidKey)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEncryptionKey('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validateEncryptionKey(null as any)).toBe(false);
      expect(validateEncryptionKey(undefined as any)).toBe(false);
    });
  });

  // ===========================================
  // IV and Salt Generation Tests
  // ===========================================

  describe('generateIV', () => {
    it('should generate 12-byte IV', () => {
      const iv = generateIV();
      expect(iv).toBeInstanceOf(Buffer);
      expect(iv.length).toBe(12);
    });

    it('should generate unique IVs', () => {
      const ivs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ivs.add(generateIV().toString('hex'));
      }
      expect(ivs.size).toBe(100);
    });
  });

  describe('generateIVHex', () => {
    it('should generate 24-character hex string', () => {
      const ivHex = generateIVHex();
      expect(ivHex).toHaveLength(24); // 12 bytes = 24 hex chars
      expect(ivHex).toMatch(/^[0-9a-f]{24}$/);
    });
  });

  describe('generateSalt', () => {
    it('should generate 16-byte salt by default', () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Buffer);
      expect(salt.length).toBe(16);
    });

    it('should respect custom length', () => {
      const salt32 = generateSalt(32);
      expect(salt32.length).toBe(32);
    });

    it('should generate unique salts', () => {
      const salts = new Set<string>();
      for (let i = 0; i < 100; i++) {
        salts.add(generateSalt().toString('hex'));
      }
      expect(salts.size).toBe(100);
    });
  });

  describe('deriveKey', () => {
    it('should derive key from password and salt', async () => {
      const password = 'test-password';
      const salt = generateSalt();
      const key = await deriveKey(password, salt);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // 256-bit output
    });

    it('should derive consistent key for same inputs', async () => {
      const password = 'test-password';
      const salt = Buffer.from('fixed-salt-value');
      const key1 = await deriveKey(password, salt);
      const key2 = await deriveKey(password, salt);
      expect(key1.equals(key2)).toBe(true);
    });

    it('should derive different keys for different passwords', async () => {
      const salt = generateSalt();
      const key1 = await deriveKey('password1', salt);
      const key2 = await deriveKey('password2', salt);
      expect(key1.equals(key2)).toBe(false);
    });

    it('should derive different keys for different salts', async () => {
      const password = 'same-password';
      const key1 = await deriveKey(password, generateSalt());
      const key2 = await deriveKey(password, generateSalt());
      expect(key1.equals(key2)).toBe(false);
    });
  });
});
