/**
 * Jest Global Setup
 * Runs once before all tests
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

export default async function globalSetup(): Promise<void> {
  // Load test environment variables
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

  console.log('\n🧪 Setting up test environment...\n');

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok';

  // Use test database
  process.env.DB_NAME = process.env.DB_NAME || 'envmate_test';

  try {
    // Run migrations on test database
    console.log('📦 Running database migrations...');
    execSync('npm run db:migrate', {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' },
    });
    console.log('✅ Migrations complete\n');
  } catch (error) {
    console.warn('⚠️ Migration warning (may already be applied):', (error as Error).message);
  }
}
