/**
 * Jest Setup File
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRE = '1h';
process.env.PORT = '5001'; // Different port for testing

// Mock console methods to reduce test output noise (optional)
global.console = {
  ...console,
  log: jest.fn(), // Mock console.log
  debug: jest.fn(), // Mock console.debug
  info: jest.fn(), // Mock console.info
  warn: jest.fn(), // Mock console.warn
  // Keep error for debugging test failures
  error: console.error,
};

// Global test utilities
global.testUtils = {
  // Generate a random test email
  randomEmail: () => `test${Date.now()}${Math.random()}@test.com`,

  // Generate a random username
  randomUsername: () => `user${Date.now()}${Math.floor(Math.random() * 1000)}`,

  // Wait utility
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
  await new Promise(resolve => setTimeout(resolve, 500));
});
