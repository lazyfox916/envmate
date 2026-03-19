/**
 * Jest Test Setup
 * Runs before each test file
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-bytes-ok';
process.env.DB_NAME = process.env.DB_NAME || 'envmate_test';

// Suppress console logs in tests unless explicitly needed
if (process.env.TEST_VERBOSE !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Keep warn and error for debugging
    warn: console.warn,
    error: console.error,
  };
}

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clean up after all tests in this file
afterAll(async () => {
  // Give time for any pending operations
  await new Promise(resolve => setTimeout(resolve, 100));
});
