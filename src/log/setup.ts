/**
 * Simplified test context setup for log organization
 *
 * This provides an easy way to capture test context for log organization
 * at the global config level instead of in individual test files.
 */
import type { TestInfo } from '@playwright/test'
import { captureTestContext } from './log-organizer'

/**
 * Setup function to enable log organization by test at the global level.
 * This should be called in the Playwright configuration file.
 *
 * @returns A Playwright project configuration that enables test context capture
 */
export function setupTestContextCapture() {
  // Return a Playwright project configuration that captures test context
  return {
    name: 'playwright-utils:test-context-capture',
    testMatch: /.*/, // Match all tests
    testIgnore: [], // Don't ignore any tests
    use: {
      // Use Playwright fixture mechanism to capture test context
      // This runs automatically for each test without needing beforeEach
      _captureTestContext: [
        async ({}, use: () => Promise<void>, testInfo: TestInfo) => {
          captureTestContext(testInfo)
          await use()
        },
        { auto: true } // Auto-use ensures it runs for every test without being explicitly requested
      ]
    }
  }
}
