import crypto from 'crypto';

/**
 * Encryption Service
 * Implements AES-256-GCM encryption for secure data storage
 */

// Get encryption key from environment (must be 32 bytes for AES-256)
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // If key is hex-encoded (64 chars = 32 bytes)
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // If key is raw string, derive a proper key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encryption result containing all components needed for decryption
 */
export interface EncryptedData {
  encryptedData: string;  // Base64 encoded encrypted data
  iv: string;             // Base64 encoded initialization vector
  authTag: string;        // Base64 encoded authentication tag
}

/**
 * Encryption Service with static methods for AES-256-GCM encryption
 */
export class EncryptionService {
  /**
   * Encrypt a string value using AES-256-GCM
   * @param plaintext - The text to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  static encrypt(plaintext: string): EncryptedData {
    const key = getEncryptionKey();
    
    // Generate a unique IV for each encryption (12 bytes recommended for GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt data that was encrypted with AES-256-GCM
   * @param data - The encrypted data with IV and auth tag
   * @returns Decrypted plaintext
   */
  static decrypt(data: EncryptedData): string {
    const key = getEncryptionKey();
    
    // Decode from base64
    const iv = Buffer.from(data.iv, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(data.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Encrypt multiple values at once
   * @param values - Object with key-value pairs to encrypt
   * @returns Object with same keys but encrypted values
   */
  static encryptMany(values: Record<string, string>): Record<string, EncryptedData> {
    const result: Record<string, EncryptedData> = {};
    
    for (const [key, value] of Object.entries(values)) {
      result[key] = this.encrypt(value);
    }
    
    return result;
  }

  /**
   * Decrypt multiple values at once
   * @param encryptedValues - Object with encrypted values
   * @returns Object with same keys but decrypted values
   */
  static decryptMany(encryptedValues: Record<string, EncryptedData>): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(encryptedValues)) {
      result[key] = this.decrypt(value);
    }
    
    return result;
  }

  /**
   * Generate a secure random encryption key
   * @returns Hex-encoded 32-byte key
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify that the encryption key is properly configured
   */
  static verifyEncryptionSetup(): boolean {
    try {
      const testData = 'test-encryption-verification';
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      return decrypted === testData;
    } catch {
      return false;
    }
  }
}

export default EncryptionService;
