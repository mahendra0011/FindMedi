// Jest setup file to mock problematic modules
jest.mock('clamav.js', () => {
  return jest.fn().mockImplementation(() => ({
    scanBuffer: jest.fn((buffer, callback) => {
      // Simulate clean file
      setImmediate(() => callback(null, null, null));
    }),
  }));
});

// Suppress console.error during tests unless explicitly testing error logging
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('ClamAV')) return;
    originalConsoleError.apply(console, args);
  });
});

afterAll(() => {
  console.error = originalConsoleError;
});