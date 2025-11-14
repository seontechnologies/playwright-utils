/**
 * @fileoverview Network error monitoring fixture for Playwright tests.
 *
 * Automatically monitors all network responses during test execution and fails
 * the test if any HTTP 4xx/5xx errors are detected (with configurable exclusions).
 *
 * This fixture is auto-enabled for all tests that use merged-fixtures.ts.
 * Inspired by Checkly's network monitoring pattern with SEON-specific enhancements.
 *
 * @see https://github.com/checkly/checkly-playwright-examples/tree/main/network-monitoring
 */

import { test as base } from '@playwright/test'
import type { Page, Response, TestInfo } from '@playwright/test'
import { log } from '../log/log'

/**
 * Global state to track how many tests have failed per error pattern.
 * This prevents domino effect where same backend issue fails hundreds of tests.
 *
 * Key format: `${status}:${basePath}` (e.g., "500:/api/v2/case-management")
 * Value: number of tests that have already failed with this error pattern
 */
const errorPatternFailureCount = new Map<string, number>()

type ErrorRequest = {
  url: string
  status: number
  method: string
  timestamp: string
}

type NetworkErrorMonitorFixture = {
  /** Automatically monitors network responses for errors */
  networkErrorMonitor: void
}

type NetworkErrorMonitorConfig = {
  /** Regex patterns for URLs to exclude from error monitoring */
  excludePatterns?: RegExp[]
  /**
   * Maximum number of tests that can fail per unique error pattern.
   * Once this limit is reached, subsequent tests just log the error without failing.
   * Default: Infinity (all tests fail)
   * @example maxTestsPerError: 1 // Only first test fails, rest just log
   */
  maxTestsPerError?: number
}

/**
 * Check if a URL should be excluded from error monitoring
 */
function shouldExcludeUrl(url: string, excludePatterns: RegExp[]): boolean {
  return excludePatterns.some((pattern) => pattern.test(url))
}

/**
 * Handle and deduplicate error responses
 */
function handleErrorResponse(
  status: number,
  url: string,
  method: string,
  errorData: ErrorRequest[],
  seenErrors: Set<string>,
  excludePatterns: RegExp[]
): void {
  // Only capture client (4xx) and server (5xx) errors
  if (status < 400 || shouldExcludeUrl(url, excludePatterns)) {
    return
  }

  // Deduplicate errors by method + status + URL combination
  const errorKey = `${method}:${status}:${url}`
  if (seenErrors.has(errorKey)) {
    return
  }

  seenErrors.add(errorKey)
  errorData.push({
    url,
    status,
    method,
    timestamp: new Date().toISOString()
  })
}

/**
 * Extract base path from URL for error pattern grouping.
 * Groups similar API failures together (e.g., all /api/v2/case-management/* failures).
 *
 * @example
 * "https://api.example.com/api/v2/case-management/cases/123" → "/api/v2/case-management"
 * "https://api.example.com/api/v2/ai/text-to-filter" → "/api/v2/ai"
 */
function extractBasePath(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathSegments = urlObj.pathname.split('/').filter(Boolean)
    // Take first 3 path segments for grouping (e.g., /api/v2/case-management)
    return '/' + pathSegments.slice(0, 3).join('/')
  } catch {
    return url
  }
}

/**
 * Create error pattern key for tracking failures across tests.
 *
 * @example
 * GET 500 /api/v2/case-management/cases/123 → "500:/api/v2/case-management"
 */
function createErrorPatternKey(error: ErrorRequest): string {
  const basePath = extractBasePath(error.url)
  return `${error.status}:${basePath}`
}

/**
 * Check if we've already failed enough tests for this error pattern.
 * Prevents domino effect where same backend issue fails hundreds of tests.
 *
 * Returns true ONLY if ALL error patterns in this test have already hit the limit.
 * If even one pattern is new (or below limit), returns false to fail the test.
 *
 * @example
 * Test encounters 3 errors:
 * - 500:/api/v2/cases (count: 1, limit: 1) → at limit
 * - 404:/api/v2/users (count: 0, limit: 1) → NEW pattern
 * - 503:/api/v2/metrics (count: 0, limit: 1) → NEW pattern
 * Result: false (test should fail because 2 patterns are new)
 */
function shouldSkipFailureForErrorPattern(
  errorData: ErrorRequest[],
  maxTestsPerError: number
): boolean {
  if (!isFinite(maxTestsPerError)) {
    return false // No limit, fail all tests
  }

  // Check if ALL error patterns have already hit the limit
  // Only skip if there are no new patterns that should still fail
  for (const error of errorData) {
    const patternKey = createErrorPatternKey(error)
    const currentCount = errorPatternFailureCount.get(patternKey) || 0

    if (currentCount < maxTestsPerError) {
      return false // Found a pattern that hasn't hit limit yet - should fail
    }
  }

  return true // All patterns have hit the limit - skip failing
}

/**
 * Increment failure count for error patterns that contributed to test failure.
 * Only increments patterns that were below the limit (new patterns).
 * Patterns already at limit are not incremented to avoid overcounting.
 *
 * @example
 * Test encounters 3 errors with maxTestsPerError: 1
 * - 500:/api/v2/old (count: 1, limit: 1) → at limit, DON'T increment
 * - 404:/api/v2/new (count: 0, limit: 1) → new pattern, increment to 1
 * - 503:/api/v2/other (count: 0, limit: 1) → new pattern, increment to 1
 */
function incrementErrorPatternCounts(
  errorData: ErrorRequest[],
  maxTestsPerError: number
): void {
  for (const error of errorData) {
    const patternKey = createErrorPatternKey(error)
    const currentCount = errorPatternFailureCount.get(patternKey) || 0

    // Only increment if this pattern contributed to the test failing
    // (i.e., it was below the limit and thus caused the failure)
    if (currentCount < maxTestsPerError) {
      errorPatternFailureCount.set(patternKey, currentCount + 1)
    }
  }
}

/**
 * Process collected network errors and determine action
 */
async function processNetworkErrors(
  errorData: ErrorRequest[],
  testInfo: TestInfo,
  maxTestsPerError: number
): Promise<Error | null> {
  if (errorData.length === 0) {
    return null
  }

  // Attach structured JSON artifact to test report
  await testInfo.attach('network-errors.json', {
    body: JSON.stringify(errorData, null, 2),
    contentType: 'application/json'
  })

  const errorSummary = errorData
    .map((e) => `  ${e.method} ${e.status} ${e.url}`)
    .join('\n')

  // Only throw if test hasn't already reached a final status
  // Respect skipped/interrupted tests to preserve their intent (e.g., feature flag checks)
  const testAlreadyDecided =
    testInfo.status === 'failed' ||
    testInfo.status === 'timedOut' ||
    testInfo.status === 'skipped' ||
    testInfo.status === 'interrupted'

  if (testAlreadyDecided) {
    // Test already has a final status - just add network errors as additional context
    log.errorSync(
      `\n⚠️  Network errors also detected (${errorData.length} request(s)):\n${errorSummary}`
    )
    return null
  }

  // Check if we should skip failing this test (maxTestsPerError limit reached)
  const shouldSkip = shouldSkipFailureForErrorPattern(
    errorData,
    maxTestsPerError
  )

  if (shouldSkip) {
    // Already failed enough tests for this error pattern - just log
    log.errorSync(
      `\n⚠️  Network errors detected but not failing test (maxTestsPerError limit reached):\n${errorSummary}`
    )
    return null
  }

  // This test will fail - increment failure counts for error patterns that caused it
  incrementErrorPatternCounts(errorData, maxTestsPerError)

  // Test passed but network errors detected - return error to throw
  return new Error(
    `Network errors detected: ${errorData.length} request(s) failed.\n` +
      'Check the attached network-errors.json for details.\n\n' +
      `Failed requests:\n${errorSummary}`
  )
}

/**
 * Creates a network error monitoring fixture with configurable exclusion patterns and fail-fast behavior.
 *
 * @param config - Configuration options
 * @param config.excludePatterns - Regex patterns for URLs to exclude from monitoring
 * @param config.maxTestsPerError - Maximum tests that can fail per error pattern (prevents domino effect). Default: Infinity
 * @returns Fixture configuration object
 *
 * @example
 * ```typescript
 * // With custom exclusions
 * import { test as base } from '@playwright/test';
 * import { createNetworkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures';
 *
 * export const test = base.extend(
 *   createNetworkErrorMonitorFixture({
 *     excludePatterns: [
 *       /sentry\.io\/api/,
 *       /analytics/,
 *     ],
 *     maxTestsPerError: 1  // Only first test fails per error pattern, rest just log
 *   })
 * );
 * ```
 */
export function createNetworkErrorMonitorFixture(
  config: NetworkErrorMonitorConfig = {}
) {
  const { excludePatterns = [], maxTestsPerError = Infinity } = config

  return {
    networkErrorMonitor: [
      async (
        { page }: { page: Page },
        use: (r?: void) => Promise<void>,
        testInfo: TestInfo
      ) => {
        // Check if this test opts out of network monitoring
        const shouldSkip = testInfo.annotations.some(
          (a) => a.type === 'skipNetworkMonitoring'
        )

        if (shouldSkip) {
          await use()
          return
        }

        const errorData: ErrorRequest[] = []
        const seenErrors = new Set<string>()
        const trackedPages = new Set<Page>()

        const responseHandler = async (response: Response) => {
          try {
            handleErrorResponse(
              response.status(),
              response.url(),
              response.request().method(),
              errorData,
              seenErrors,
              excludePatterns
            )
          } catch (error) {
            // Log the error but don't fail the test for monitoring issues
            log.errorSync(
              `Network monitor internal error [${response.url()}]: ${String(error)}`
            )
          }
        }

        // Attach response handler to a page
        const attachToPage = (pageInstance: Page) => {
          if (trackedPages.has(pageInstance)) {
            return
          }
          trackedPages.add(pageInstance)
          pageInstance.on('response', responseHandler)
        }

        // Monitor the initial page
        attachToPage(page)

        // Monitor any new pages created in this context (popups, new tabs)
        const context = page.context()
        const pageHandler = (newPage: Page) => {
          attachToPage(newPage)
        }
        context.on('page', pageHandler)

        // Run the test with try/finally to ensure error checking always runs
        // even if the test fails early (regression fix from old afterEach behavior)
        let networkError: Error | null = null

        try {
          await use()
        } finally {
          // Remove listeners from all tracked pages to prevent memory leaks
          for (const trackedPage of trackedPages) {
            trackedPage.off('response', responseHandler)
          }
          context.off('page', pageHandler)
          // Process network errors and determine if we should throw
          networkError = await processNetworkErrors(
            errorData,
            testInfo,
            maxTestsPerError
          )
        }

        // Throw network error outside finally block (ESLint no-unsafe-finally)
        if (networkError) {
          throw networkError
        }
      },
      {
        // Auto-enable this fixture for all tests
        auto: true
      }
    ]
  }
}

/**
 * Default network error monitoring fixture with no exclusions.
 *
 * Features:
 * - Automatic activation (auto: true) - no test changes required
 * - Captures all HTTP 4xx/5xx responses during test execution
 * - Deduplicates errors (same status + URL reported once)
 * - Attaches structured JSON artifact to test report on failure
 * - Fails test with clear error message if network errors detected
 * - Uses try/finally to ensure error checking runs even if test fails early
 *
 * @example
 * ```typescript
 * import { test } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures';
 *
 * // Normal test - network monitoring happens automatically
 * test('my test', async ({ page }) => {
 *   await page.goto('/dashboard');
 * });
 *
 * // Opt out for tests that expect 4xx/5xx errors (e.g., validation testing)
 * test('validation returns 400',
 *   { annotation: [{ type: 'skipNetworkMonitoring' }] },
 *   async ({ page }) => {
 *     // Test can now expect 400/500 responses without failing
 *   }
 * );
 * ```
 */
// Type cast required due to Playwright's complex fixture type inference with factory functions
export const test = base.extend<NetworkErrorMonitorFixture>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createNetworkErrorMonitorFixture() as any
)

export { expect } from '@playwright/test'
