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
 * Process collected network errors and determine action
 */
async function processNetworkErrors(
  errorData: ErrorRequest[],
  testInfo: TestInfo
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

  // Test passed but network errors detected - return error to throw
  return new Error(
    `Network errors detected: ${errorData.length} request(s) failed.\n` +
      'Check the attached network-errors.json for details.\n\n' +
      `Failed requests:\n${errorSummary}`
  )
}

/**
 * Creates a network error monitoring fixture with configurable exclusion patterns.
 *
 * @param config - Configuration options
 * @param config.excludePatterns - Regex patterns for URLs to exclude from monitoring
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
 *     ]
 *   })
 * );
 * ```
 */
export function createNetworkErrorMonitorFixture(
  config: NetworkErrorMonitorConfig = {}
) {
  const { excludePatterns = [] } = config

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
            log.errorSync(`Error in network monitor: ${String(error)}`)
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
          networkError = await processNetworkErrors(errorData, testInfo)
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
