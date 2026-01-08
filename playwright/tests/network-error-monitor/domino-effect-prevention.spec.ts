import { test as base, expect } from '@playwright/test'
import { createNetworkErrorMonitorFixture } from '../../../src/network-error-monitor/fixtures'
import { test as interceptTest } from '../../../src/intercept-network-call/fixtures'

/**
 * Tests for maxTestsPerError (domino effect prevention) functionality
 *
 * PLAYWRIGHT-UTILS VERSION - Using interceptNetworkCall utility
 * Compare this with domino-effect-prevention-vanilla.spec.ts to see the difference
 *
 * These tests verify that the network error monitor can limit how many tests
 * fail for the same error pattern, preventing a single backend failure from
 * causing hundreds of test failures.
 *
 * Test Strategy:
 * - Use maxTestsPerError: 1 configuration
 * - Trigger same error patterns across multiple tests
 * - Verify only first test fails, subsequent tests pass with warnings
 * - Uses interceptNetworkCall from playwright-utils for cleaner network mocking
 *
 * IMPORTANT: This file uses unique endpoint prefixes (/pw-*) to avoid
 * cross-contamination with domino-effect-prevention-vanilla.spec.ts
 * when both run in the same Playwright worker.
 *
 * Note on test.fail():
 * Tests marked with test.fail() are EXPECTED to fail due to network errors.
 * - If these tests FAIL as expected → Playwright treats them as PASSING ✅
 * - If these tests PASS unexpectedly → Indicates a bug in the network monitor ❌
 * This pattern allows us to test that the network monitor correctly detects
 * and fails tests when it should, while keeping the test suite green.
 */

// Merge fixtures: interceptNetworkCall + network error monitor
// Create test with maxTestsPerError: 1 to prevent domino effect
// Note: excludePatterns is required when using maxTestsPerError (type constraint)
const testWithLimit = interceptTest.extend(
  createNetworkErrorMonitorFixture({
    excludePatterns: [], // Required when using maxTestsPerError
    maxTestsPerError: 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
)

base.describe.configure({ mode: 'serial', retries: 0 })

base.describe(
  'Network Error Monitor - Domino Effect Prevention (Playwright-Utils)',
  () => {
    base.describe('Basic maxTestsPerError behavior', () => {
      // These tests will run sequentially in the same worker
      // First test encountering an error pattern should fail
      // Second test encountering same pattern should pass

      testWithLimit.fail(
        'first test with 404 error should fail',
        async ({ page, interceptNetworkCall }) => {
          // PLAYWRIGHT-UTILS: Using interceptNetworkCall fixture
          // Set up interception BEFORE triggering the request
          const response = interceptNetworkCall({
            url: '**/pw-test-endpoint-404',
            fulfillResponse: { status: 404, body: 'Not Found' }
          })

          await page.goto('data:text/html,<h1>Test</h1>')

          // Trigger the 404 and await the intercepted response
          await page.evaluate(async () => {
            await fetch('http://localhost:3000/pw-test-endpoint-404')
          })
          await response

          // This test should fail due to 404 error
          // Marked with test.fail() so Playwright expects failure
          expect(true).toBe(true)
        }
      )

      testWithLimit(
        'second test with same 404 error should pass (limit reached)',
        async ({ page, interceptNetworkCall }) => {
          // Same error pattern - set up interception first
          const response = interceptNetworkCall({
            url: '**/pw-test-endpoint-404',
            fulfillResponse: { status: 404, body: 'Not Found' }
          })

          await page.goto('data:text/html,<h1>Test 2</h1>')

          // Trigger the same 404 and await response
          await page.evaluate(async () => {
            await fetch('http://localhost:3000/pw-test-endpoint-404')
          })
          await response

          // This test should PASS because limit was reached in previous test
          expect(true).toBe(true)
        }
      )
    })

    base.describe('Error pattern grouping', () => {
      testWithLimit.fail(
        'should group errors by status + base path (first occurrence)',
        async ({ page, interceptNetworkCall }) => {
          // Set up interception before triggering
          const response = interceptNetworkCall({
            url: '**/api/v2/pw-users/profile',
            fulfillResponse: { status: 500, body: 'Internal Server Error' }
          })

          await page.goto('data:text/html,<h1>Test</h1>')

          await page.evaluate(async () => {
            await fetch('http://localhost:3000/api/v2/pw-users/profile')
          })
          await response

          // Should fail (first test with this pattern)
          expect(true).toBe(true)
        }
      )

      testWithLimit(
        'should group errors by status + base path (different endpoint, same base)',
        async ({ page, interceptNetworkCall }) => {
          // Different endpoint - set up interception first
          const response = interceptNetworkCall({
            url: '**/api/v2/pw-users/settings',
            fulfillResponse: { status: 500, body: 'Internal Server Error' }
          })

          await page.goto('data:text/html,<h1>Test</h1>')

          await page.evaluate(async () => {
            await fetch('http://localhost:3000/api/v2/pw-users/settings')
          })
          await response

          // Should PASS because same pattern (500:/api/v2/pw-users) already failed
          expect(true).toBe(true)
        }
      )
    })

    base.describe(
      'Multiple error patterns in single test (bug fix verification)',
      () => {
        testWithLimit.fail(
          'setup: trigger first error pattern to reach limit',
          async ({ page, interceptNetworkCall }) => {
            const response = interceptNetworkCall({
              url: '**/api/v2/pw-old-error',
              fulfillResponse: { status: 500, body: 'Old Error' }
            })

            await page.goto('data:text/html,<h1>Setup</h1>')

            await page.evaluate(async () => {
              await fetch('http://localhost:3000/api/v2/pw-old-error')
            })
            await response

            // This test should fail (first occurrence of 500:/api/v2/pw-old-error)
            expect(true).toBe(true)
          }
        )

        testWithLimit.fail(
          'should fail when encountering mix of old (at limit) and new patterns',
          async ({ page, interceptNetworkCall }) => {
            // Multiple intercepts - set up both before triggering
            const oldErrorResponse = interceptNetworkCall({
              url: '**/api/v2/pw-old-error',
              fulfillResponse: { status: 500, body: 'Old Error' }
            })

            const newErrorResponse = interceptNetworkCall({
              url: '**/api/v2/pw-new-error',
              fulfillResponse: { status: 404, body: 'New Error' }
            })

            await page.goto('data:text/html,<h1>Multi Error</h1>')

            await page.evaluate(async () => {
              await fetch('http://localhost:3000/api/v2/pw-old-error')
              await fetch('http://localhost:3000/api/v2/pw-new-error')
            })
            await oldErrorResponse
            await newErrorResponse

            // This test SHOULD FAIL because new-error pattern is new
            // Even though old-error already hit limit
            expect(true).toBe(true)
          }
        )
      }
    )

    base.describe('Different error status codes are different patterns', () => {
      testWithLimit.fail(
        'should treat different status codes as different patterns (500)',
        async ({ page, interceptNetworkCall }) => {
          const response = interceptNetworkCall({
            url: '**/api/v2/pw-multi-status/endpoint',
            fulfillResponse: { status: 500, body: 'Server Error' }
          })

          await page.goto('data:text/html,<h1>Test</h1>')

          await page.evaluate(async () => {
            await fetch('http://localhost:3000/api/v2/pw-multi-status/endpoint')
          })
          await response

          // Should fail (first occurrence of 500:/api/v2/pw-multi-status)
          expect(true).toBe(true)
        }
      )

      testWithLimit.fail(
        'should treat different status codes as different patterns (404)',
        async ({ page, interceptNetworkCall }) => {
          // Same endpoint, different status code
          const response = interceptNetworkCall({
            url: '**/api/v2/pw-multi-status/endpoint',
            fulfillResponse: { status: 404, body: 'Not Found' }
          })

          await page.goto('data:text/html,<h1>Test</h1>')

          await page.evaluate(async () => {
            await fetch('http://localhost:3000/api/v2/pw-multi-status/endpoint')
          })
          await response

          // Should FAIL (different pattern: 404:/api/v2/pw-multi-status)
          // Even though same endpoint, different status = different pattern
          expect(true).toBe(true)
        }
      )
    })
  }
)

base.describe(
  'Network Error Monitor - No Limit (default behavior, Playwright-Utils)',
  () => {
    // Test without maxTestsPerError to verify default behavior
    // Merge with interceptTest fixture
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testNoLimit = interceptTest.extend(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createNetworkErrorMonitorFixture() as any
    )

    testNoLimit.fail(
      'should fail all tests when maxTestsPerError is not set',
      async ({ page, interceptNetworkCall }) => {
        // Set up interception before triggering
        const response = interceptNetworkCall({
          url: '**/pw-test-unlimited-errors',
          fulfillResponse: { status: 500, body: 'Error' }
        })

        await page.goto('data:text/html,<h1>Test</h1>')

        await page.evaluate(async () => {
          await fetch('http://localhost:3000/pw-test-unlimited-errors')
        })
        await response

        // Should fail (default behavior - no limit)
        expect(true).toBe(true)
      }
    )

    testNoLimit.fail(
      'should fail all tests when maxTestsPerError is not set (second test)',
      async ({ page, interceptNetworkCall }) => {
        const response = interceptNetworkCall({
          url: '**/pw-test-unlimited-errors',
          fulfillResponse: { status: 500, body: 'Error' }
        })

        await page.goto('data:text/html,<h1>Test 2</h1>')

        await page.evaluate(async () => {
          await fetch('http://localhost:3000/pw-test-unlimited-errors')
        })
        await response

        // Should ALSO fail (default behavior - no limit)
        expect(true).toBe(true)
      }
    )
  }
)
