/**
 * Unit Tests for JWT Utilities
 * Tests token generation, verification, and decoding
 */

import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  getTokenExpiration,
} from '../../src/utils/jwt';

describe('JWT Utilities', () => {
  const testUserId = 'user-123-uuid';
  const testEmail = 'test@example.com';

  // ===========================================
  // Access Token Tests
  // ===========================================

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(testUserId, testEmail);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include correct payload', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
      expect(decoded?.type).toBe('access');
    });

    it('should include expiration time', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyToken(token);

      expect(decoded?.exp).toBeDefined();
      expect(typeof decoded?.exp).toBe('number');
      expect(decoded!.exp!).toBeGreaterThan(Date.now() / 1000);
    });

    it('should generate unique tokens for same user (with time delay)', async () => {
      const token1 = generateAccessToken(testUserId, testEmail);
      // Wait a bit to ensure different iat
      await new Promise(resolve => setTimeout(resolve, 1100));
      const token2 = generateAccessToken(testUserId, testEmail);

      // Tokens should be different due to iat (issued at) time
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateRefreshToken(testUserId, testEmail);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include refresh type in payload', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      const decoded = verifyToken(token);

      expect(decoded?.type).toBe('refresh');
    });

    it('should have longer expiration than access token', () => {
      const accessToken = generateAccessToken(testUserId, testEmail);
      const refreshToken = generateRefreshToken(testUserId, testEmail);

      const decodedAccess = verifyToken(accessToken);
      const decodedRefresh = verifyToken(refreshToken);

      expect(decodedRefresh!.exp!).toBeGreaterThan(decodedAccess!.exp!);
    });
  });

  describe('generateTokenPair', () => {
    it('should return both access and refresh tokens', () => {
      const { accessToken, refreshToken, expiresIn } = generateTokenPair(testUserId, testEmail);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(expiresIn).toBeDefined();
      expect(typeof expiresIn).toBe('number');
    });

    it('should return valid access token', () => {
      const { accessToken } = generateTokenPair(testUserId, testEmail);
      const decoded = verifyToken(accessToken);

      expect(decoded?.type).toBe('access');
      expect(decoded?.userId).toBe(testUserId);
    });

    it('should return valid refresh token', () => {
      const { refreshToken } = generateTokenPair(testUserId, testEmail);
      const decoded = verifyToken(refreshToken);

      expect(decoded?.type).toBe('refresh');
      expect(decoded?.userId).toBe(testUserId);
    });

    it('should return expiration time in milliseconds', () => {
      const { expiresIn } = generateTokenPair(testUserId, testEmail);

      // expiresIn should be in milliseconds and represent reasonable duration
      expect(expiresIn).toBeGreaterThan(0);
      expect(expiresIn).toBeLessThan(24 * 60 * 60 * 1000); // Less than 24 hours for access token
    });
  });

  // ===========================================
  // Token Verification Tests
  // ===========================================

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('should return null for tampered token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      const decoded = verifyToken(tamperedToken);
      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      expect(verifyToken('')).toBeNull();
      expect(verifyToken('not-a-jwt')).toBeNull();
      expect(verifyToken('a.b')).toBeNull();
    });

    it('should verify refresh token', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.type).toBe('refresh');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
    });

    it('should decode tampered token (no signature check)', () => {
      const token = generateAccessToken(testUserId, testEmail);
      // Just modify signature portion
      const parts = token.split('.');
      parts[2] = 'tampered_signature';
      const tamperedToken = parts.join('.');
      
      const decoded = decodeToken(tamperedToken);
      // Should still decode the payload
      expect(decoded?.userId).toBe(testUserId);
    });

    it('should return null for malformed token', () => {
      expect(decodeToken('')).toBeNull();
      expect(decodeToken('not-a-jwt')).toBeNull();
    });
  });

  // ===========================================
  // Token Expiration Tests
  // ===========================================

  describe('getTokenExpiration', () => {
    it('should return future date for default expiration', () => {
      const expiration = getTokenExpiration();
      expect(expiration.getTime()).toBeGreaterThan(Date.now());
    });

    it('should parse seconds correctly', () => {
      const now = Date.now();
      const expiration = getTokenExpiration('30s');
      const expected = now + 30 * 1000;
      
      expect(expiration.getTime()).toBeGreaterThanOrEqual(expected - 100);
      expect(expiration.getTime()).toBeLessThanOrEqual(expected + 100);
    });

    it('should parse minutes correctly', () => {
      const now = Date.now();
      const expiration = getTokenExpiration('15m');
      const expected = now + 15 * 60 * 1000;
      
      expect(expiration.getTime()).toBeGreaterThanOrEqual(expected - 100);
      expect(expiration.getTime()).toBeLessThanOrEqual(expected + 100);
    });

    it('should parse hours correctly', () => {
      const now = Date.now();
      const expiration = getTokenExpiration('2h');
      const expected = now + 2 * 60 * 60 * 1000;
      
      expect(expiration.getTime()).toBeGreaterThanOrEqual(expected - 100);
      expect(expiration.getTime()).toBeLessThanOrEqual(expected + 100);
    });

    it('should parse days correctly', () => {
      const now = Date.now();
      const expiration = getTokenExpiration('7d');
      const expected = now + 7 * 24 * 60 * 60 * 1000;
      
      expect(expiration.getTime()).toBeGreaterThanOrEqual(expected - 100);
      expect(expiration.getTime()).toBeLessThanOrEqual(expected + 100);
    });
  });

  // ===========================================
  // Security Tests
  // ===========================================

  describe('security', () => {
    it('should not expose secret in token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const base64Payload = token.split('.')[1];
      const payload = Buffer.from(base64Payload, 'base64').toString();
      
      expect(payload.toLowerCase()).not.toContain('secret');
    });

    it('should include all necessary claims', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyToken(token);

      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('type');
      expect(decoded).toHaveProperty('iat'); // issued at
      expect(decoded).toHaveProperty('exp'); // expires at
    });

    it('should have different signatures for different users', () => {
      const token1 = generateAccessToken('user1', 'user1@example.com');
      const token2 = generateAccessToken('user2', 'user2@example.com');
      
      const sig1 = token1.split('.')[2];
      const sig2 = token2.split('.')[2];
      
      expect(sig1).not.toBe(sig2);
    });
  });
});
