/**
 * Global hooks for log organization
 *
 * This file provides a global hook that users can add to their Playwright config
 * to enable test context capture for log organization without changes to test files.
 */
import { test, TestInfo } from '@playwright/test'
import { captureTestContext } from './log-organizer'

// Create global beforeEach hook to capture test context automatically
test.beforeEach(async ({}, testInfo: TestInfo) => {
  captureTestContext(testInfo)
})

/**
 * Project-level hook that enables automatic test context capture
 * Add this to your Playwright config to enable log organization by test
 */
export const testContextHooks = {
  project: {
    name: 'set-test-context',
    testMatch: /.*/, // Match all tests
    testIgnore: [], // Don't ignore any tests
    dependencies: [] // No dependencies
  }
}
