/**
 * Simplified test context setup for log organization
 * 
 * This provides an easy way to capture test context for log organization
 * at the global config level instead of in individual test files.
 */
import { test } from '@playwright/test';
import { captureTestContext } from './log-organizer';

/**
 * Setup function to enable log organization by test at the global level.
 * This should be called in the Playwright configuration file.
 * 
 * @returns A Playwright project configuration that enables test context capture
 */
export function setupTestContextCapture() {
  // Setup global beforeEach hook to capture test context
  test.beforeEach(async ({}, testInfo) => {
    captureTestContext(testInfo);
  });
  
  // Return a Playwright project configuration that uses the global hook
  return {
    name: 'playwright-utils:test-context-capture',
    testMatch: /.*/,  // Match all tests
    testIgnore: [],   // Don't ignore any tests
    use: {}           // No additional use options needed
  };
}
