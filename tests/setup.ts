/**
 * Jest global setup — mocks Prisma client so unit tests
 * never hit a real database.
 */

// Silence console.error in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  jest.spyOn(console, "error").mockImplementation(() => {});
}

// Global test timeout override via env
if (process.env.TEST_TIMEOUT) {
  jest.setTimeout(Number(process.env.TEST_TIMEOUT));
}
