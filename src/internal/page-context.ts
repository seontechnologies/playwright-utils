/**
 * Page Context Management for Schema Validation UI
 *
 * This module provides a way to capture and retrieve the Playwright page context
 * for use in standalone functions that need UI display capabilities.
 *
 * Similar to captureTestContext, this allows the plain validateSchema function
 * to display validation results in the Playwright UI.
 *
 * @note Test Isolation: Playwright runs parallel tests in separate worker processes,
 * so global state is isolated per-worker. Serial tests in the same worker are handled
 * by the fixtures which call clearPageContext() after each test. For manual usage
 * outside of fixtures, ensure you're in an isolated test context.
 */

import type { Page } from '@playwright/test'

/** Current page context - captured per test */
let currentPage: Page | null = null

/**
 * Capture the current page context for use by standalone functions.
 * Call this in your beforeEach hook alongside captureTestContext.
 *
 * @example
 * ```ts
 * import { test } from '@playwright/test'
 * import { captureTestContext, capturePageContext } from '@seontechnologies/playwright-utils'
 *
 * test.beforeEach(async ({ page }, testInfo) => {
 *   captureTestContext(testInfo)
 *   capturePageContext(page)
 * })
 * ```
 */
export function capturePageContext(page: Page): void {
  currentPage = page
}

/**
 * Get the currently captured page context.
 * Returns null if no page has been captured or if the page has been closed.
 */
export function getPageContext(): Page | null {
  // Defensive check: clear stale reference if page was closed
  if (currentPage && currentPage.isClosed()) {
    currentPage = null
  }
  return currentPage
}

/**
 * Clear the page context. Called automatically between tests
 * but can be called manually if needed.
 */
export function clearPageContext(): void {
  currentPage = null
}
