/**
 * Page Context Management for Schema Validation UI
 *
 * This module provides a way to capture and retrieve the Playwright page context
 * for use in standalone functions that need UI display capabilities.
 *
 * Similar to captureTestContext, this allows the plain validateSchema function
 * to display validation results in the Playwright UI.
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
 * Returns null if no page has been captured.
 */
export function getPageContext(): Page | null {
  return currentPage
}

/**
 * Clear the page context. Called automatically between tests
 * but can be called manually if needed.
 */
export function clearPageContext(): void {
  currentPage = null
}
