/**
 * Jest Global Teardown
 * Runs once after all tests complete
 */

export default async function globalTeardown(): Promise<void> {
  console.log('\n🧹 Cleaning up test environment...\n');
  
  // Close any remaining connections
  // The actual cleanup is handled in setup.ts afterAll
  
  console.log('✅ Test cleanup complete\n');
}
