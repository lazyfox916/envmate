/**
 * Unit Tests for Encryption Service
 * Tests AES-256-GCM encryption and decryption
 */

import { EncryptionService, EncryptedData } from '../../src/services/EncryptionService';

describe('EncryptionService', () => {
  // Ensure encryption key is set for tests
  beforeAll(() => {
    // Use a test encryption key (64 hex chars = 32 bytes)
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  // ===========================================
  // Basic Encryption/Decryption Tests
  // ===========================================

  describe('encrypt', () => {
    it('should encrypt a string and return encrypted data', () => {
      const plaintext = 'sensitive data';
      const result = EncryptionService.encrypt(plaintext);

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');

      // Encrypted data should be base64 encoded
      expect(result.encryptedData).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(result.iv).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(result.authTag).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'same text';
      const result1 = EncryptionService.encrypt(plaintext);
      const result2 = EncryptionService.encrypt(plaintext);

      expect(result1.encryptedData).not.toBe(result2.encryptedData);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should encrypt empty string', () => {
      const result = EncryptionService.encrypt('');
      expect(result).toHaveProperty('encryptedData');
    });

    it('should encrypt special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'"<>,.?/~`\\n\\t';
      const result = EncryptionService.encrypt(specialChars);
      expect(result).toHaveProperty('encryptedData');
    });

    it('should encrypt unicode characters', () => {
      const unicode = '你好世界 🔐 مرحبا';
      const result = EncryptionService.encrypt(unicode);
      expect(result).toHaveProperty('encryptedData');
    });

    it('should encrypt long strings', () => {
      const longString = 'x'.repeat(10000);
      const result = EncryptionService.encrypt(longString);
      expect(result).toHaveProperty('encryptedData');
    });
  });

  describe('decrypt', () => {
    it('should decrypt to original plaintext', () => {
      const plaintext = 'secret message';
      const encrypted = EncryptionService.encrypt(plaintext);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt empty string', () => {
      const plaintext = '';
      const encrypted = EncryptionService.encrypt(plaintext);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt special characters correctly', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'"<>,.?/~`\n\t';
      const encrypted = EncryptionService.encrypt(plaintext);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt unicode characters correctly', () => {
      const plaintext = '你好世界 🔐 مرحبا';
      const encrypted = EncryptionService.encrypt(plaintext);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long strings', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = EncryptionService.encrypt(plaintext);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  // ===========================================
  // Security Tests
  // ===========================================

  describe('security', () => {
    it('should fail to decrypt with tampered ciphertext', () => {
      const encrypted = EncryptionService.encrypt('secret');
      
      // Tamper with the encrypted data
      const tamperedData: EncryptedData = {
        ...encrypted,
        encryptedData: 'dGFtcGVyZWQ=', // base64 of 'tampered'
      };

      expect(() => {
        EncryptionService.decrypt(tamperedData);
      }).toThrow();
    });

    it('should fail to decrypt with tampered IV', () => {
      const encrypted = EncryptionService.encrypt('secret');
      
      // Tamper with the IV
      const tamperedData: EncryptedData = {
        ...encrypted,
        iv: Buffer.from('tampered-iv!').toString('base64'),
      };

      expect(() => {
        EncryptionService.decrypt(tamperedData);
      }).toThrow();
    });

    it('should fail to decrypt with tampered auth tag', () => {
      const encrypted = EncryptionService.encrypt('secret');
      
      // Tamper with the auth tag
      const tamperedData: EncryptedData = {
        ...encrypted,
        authTag: Buffer.from('tampered-tag-16!').toString('base64'),
      };

      expect(() => {
        EncryptionService.decrypt(tamperedData);
      }).toThrow();
    });

    it('should fail to decrypt with wrong key', () => {
      // Encrypt with current key
      const encrypted = EncryptionService.encrypt('secret');
      
      // Change the key
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);
      
      expect(() => {
        EncryptionService.decrypt(encrypted);
      }).toThrow();
      
      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('encrypted data should not contain plaintext', () => {
      const plaintext = 'very secret password 12345';
      const encrypted = EncryptionService.encrypt(plaintext);
      
      // Decode and check it doesn't contain plaintext
      const decodedCiphertext = Buffer.from(encrypted.encryptedData, 'base64').toString();
      expect(decodedCiphertext).not.toContain(plaintext);
    });
  });

  // ===========================================
  // Batch Operations Tests
  // ===========================================

  describe('encryptMany', () => {
    it('should encrypt multiple values', () => {
      const values = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };

      const encrypted = EncryptionService.encryptMany(values);

      expect(Object.keys(encrypted)).toEqual(['key1', 'key2', 'key3']);
      expect(encrypted.key1).toHaveProperty('encryptedData');
      expect(encrypted.key2).toHaveProperty('encryptedData');
      expect(encrypted.key3).toHaveProperty('encryptedData');
    });

    it('should encrypt each value independently', () => {
      const values = {
        key1: 'same',
        key2: 'same',
      };

      const encrypted = EncryptionService.encryptMany(values);

      // Same values should have different ciphertext (different IVs)
      expect(encrypted.key1.encryptedData).not.toBe(encrypted.key2.encryptedData);
    });

    it('should handle empty object', () => {
      const encrypted = EncryptionService.encryptMany({});
      expect(encrypted).toEqual({});
    });
  });

  describe('decryptMany', () => {
    it('should decrypt multiple values', () => {
      const original = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };

      const encrypted = EncryptionService.encryptMany(original);
      const decrypted = EncryptionService.decryptMany(encrypted);

      expect(decrypted).toEqual(original);
    });

    it('should handle empty object', () => {
      const decrypted = EncryptionService.decryptMany({});
      expect(decrypted).toEqual({});
    });
  });

  // ===========================================
  // Utility Methods Tests
  // ===========================================

  describe('generateEncryptionKey', () => {
    it('should generate 64-character hex key', () => {
      const key = EncryptionService.generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(EncryptionService.generateEncryptionKey());
      }
      expect(keys.size).toBe(100);
    });
  });

  describe('verifyEncryptionSetup', () => {
    it('should return true when encryption is properly configured', () => {
      expect(EncryptionService.verifyEncryptionSetup()).toBe(true);
    });

    it('should return false when encryption key is invalid', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = '';
      
      expect(EncryptionService.verifyEncryptionSetup()).toBe(false);
      
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  // ===========================================
  // Edge Cases
  // ===========================================

  describe('edge cases', () => {
    it('should handle JSON data', () => {
      const jsonData = JSON.stringify({ user: 'test', password: 'secret' });
      const encrypted = EncryptionService.encrypt(jsonData);
      const decrypted = EncryptionService.decrypt(encrypted);
      
      expect(JSON.parse(decrypted)).toEqual({ user: 'test', password: 'secret' });
    });

    it('should handle newlines and whitespace', () => {
      const text = 'line1\nline2\r\nline3\t\ttabbed';
      const encrypted = EncryptionService.encrypt(text);
      const decrypted = EncryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(text);
    });

    it('should handle .env file format', () => {
      const envContent = `
        DATABASE_URL=postgres://user:pass@localhost/db
        API_KEY="sk-1234567890"
        SECRET='single quoted value'
        # This is a comment
        MULTILINE="line1\\nline2"
      `;
      
      const encrypted = EncryptionService.encrypt(envContent);
      const decrypted = EncryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(envContent);
    });
  });
});
