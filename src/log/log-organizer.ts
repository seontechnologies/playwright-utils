/**
 * Log Organizer - Extends Playwright's test object to organize logs by test file and name.
 *
 * This module provides integration with Playwright's test infrastructure to automatically
 * capture test metadata for organized logging. When tests import the test object from this module,
 * logs will be organized by test file and test name in separate folders.
 *
 * Usage:
 * - Import { test, expect } from 'playwright-utils' to get organized logs
 * - Configure with log.configure({ fileLogging: { organizeByTest: { enabled: true } } })
 */
import { setTestContextInfo } from './config'
import type { TestInfo } from '@playwright/test'
import { test as base } from '@playwright/test'
import * as path from 'path'

/**
 * Sets the test context information for logging purposes
 * This is a key function that captures test metadata from Playwright
 */
const setContext = (testInfo: TestInfo): void => {
  // Always capture worker index regardless of other settings

  // Use file path relative to project root for better organization
  const projectRoot = process.cwd()
  let testFile = testInfo.file

  // Make sure we have an absolute path that's normalized
  if (testFile && !path.isAbsolute(testFile)) {
    testFile = path.resolve(projectRoot, testFile)
  }

  // Always capture worker index and basic test info
  // This is important for logs even when not organizing by test
  setTestContextInfo({
    testFile: testFile,
    testName: testInfo.title,
    workerIndex: testInfo.workerIndex
  })
}

/**
 * Instead of using hooks in configuration files (which Playwright doesn't allow),
 * we'll create a utility that can be explicitly imported and used in test files.
 */

/**
 * A utility function to capture test context when using the standard Playwright test object
 * This should be imported in test files that use @playwright/test directly but still
 * want organized logs
 *
 * Example usage:
 * ```ts
 * import { test } from '@playwright/test';
 * import { captureTestContext } from '../../src';
 *
 * test.beforeEach(async ({}, testInfo) => {
 *   captureTestContext(testInfo);
 * });
 * ```
 */
export function captureTestContext(testInfo: TestInfo): void {
  setContext(testInfo)
}

// Extend the base test with fixtures that capture context
export const test = base.extend({
  // Override the base test with our own automatic fixture that captures context
  // @ts-expect-error: Custom fixture with auto option
  _testContextCapture: [
    async ({}, use: () => Promise<void>) => {
      // This fixture does nothing except ensure it runs for every test
      await use()
    },
    { auto: true } // Auto fixture that will run for every test
  ],

  // Keep the page fixture for better backwards compatibility and redundancy
  page: async ({ page }, use, testInfo) => {
    // Set context before using the page
    setContext(testInfo)
    // Allow test to use the page
    await use(page)
  },

  // Add hooks for before/after each test to ensure context is captured
  _logContextHooks: [
    async ({}, use: () => Promise<void>, testInfo: TestInfo) => {
      // Before test: Set the context
      setContext(testInfo)

      // Use the fixture
      await use()

      // After test: The context remains for post-test logs
    },
    { auto: true }
  ]
})

export { expect } from '@playwright/test'
