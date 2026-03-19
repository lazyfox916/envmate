/**
 * Unit Tests for Password Utilities
 * Tests hashing, comparison, and validation
 */

import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from '../../src/utils/password';

describe('Password Utilities', () => {
  // ===========================================
  // Password Hashing Tests
  // ===========================================

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePass123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate bcrypt format hash', async () => {
      const hash = await hashPassword('test123');
      // bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    });

    it('should hash empty string', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
    });

    it('should hash long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hash = await hashPassword(longPassword);
      expect(hash).toBeDefined();
    });

    it('should hash unicode passwords', async () => {
      const unicodePassword = '密码🔐مرحبا123!';
      const hash = await hashPassword(unicodePassword);
      expect(hash).toBeDefined();
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      const result = await comparePassword('WrongPass123!', hash);

      expect(result).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      
      const result1 = await comparePassword('securepass123!', hash);
      const result2 = await comparePassword('SECUREPASS123!', hash);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should return false for similar passwords', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      
      const result = await comparePassword('SecurePass123', hash); // missing !
      expect(result).toBe(false);
    });

    it('should handle empty password comparison', async () => {
      const hash = await hashPassword('');
      const result = await comparePassword('', hash);
      expect(result).toBe(true);
    });

    it('should return false for empty password against non-empty hash', async () => {
      const hash = await hashPassword('password123');
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });

    it('should handle unicode passwords', async () => {
      const password = '密码🔐123!';
      const hash = await hashPassword(password);
      
      const correct = await comparePassword(password, hash);
      const wrong = await comparePassword('密码🔐123', hash);

      expect(correct).toBe(true);
      expect(wrong).toBe(false);
    });
  });

  // ===========================================
  // Password Validation Tests
  // ===========================================

  describe('validatePasswordStrength', () => {
    it('should accept valid strong password', () => {
      const result = validatePasswordStrength('SecurePass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Abc12!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('securepass123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least 1 uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('SECUREPASS123!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least 1 lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('SecurePassWord!');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least 1 number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('SecurePass123');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least 1 special character');
    });

    it('should return multiple errors for very weak password', () => {
      const result = validatePasswordStrength('abc');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', ',', '.', '?', '"', ':', '{', '}', '|', '<', '>'];
      
      for (const char of specialChars) {
        const password = `SecurePa1${char}`;
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
      }
    });

    it('should accept password with exactly 8 characters', () => {
      const result = validatePasswordStrength('Abcd12!@');
      
      expect(result.isValid).toBe(true);
    });

    it('should accept very long passwords', () => {
      const result = validatePasswordStrength('SecurePass123!' + 'a'.repeat(100));
      
      expect(result.isValid).toBe(true);
    });

    it('should handle empty string', () => {
      const result = validatePasswordStrength('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ===========================================
  // Timing Tests
  // ===========================================

  describe('timing safety', () => {
    it('should take similar time for valid and invalid comparisons', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      // Warm up
      await comparePassword(password, hash);
      await comparePassword('wrong', hash);

      // Time valid comparison
      const startValid = Date.now();
      for (let i = 0; i < 10; i++) {
        await comparePassword(password, hash);
      }
      const validTime = Date.now() - startValid;

      // Time invalid comparison
      const startInvalid = Date.now();
      for (let i = 0; i < 10; i++) {
        await comparePassword('WrongPassword!', hash);
      }
      const invalidTime = Date.now() - startInvalid;

      // Times should be within 50% of each other (bcrypt is timing-safe)
      const ratio = Math.max(validTime, invalidTime) / Math.min(validTime, invalidTime);
      expect(ratio).toBeLessThan(2);
    });
  });
});
