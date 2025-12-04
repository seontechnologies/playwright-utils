import { test as base, expect } from '@playwright/test'
import { createNetworkErrorMonitorFixture } from '../../../src/network-error-monitor/fixtures'

/**
 * Tests for maxTestsPerError (domino effect prevention) functionality
 *
 * These tests verify that the network error monitor can limit how many tests
 * fail for the same error pattern, preventing a single backend failure from
 * causing hundreds of test failures.
 *
 * Test Strategy:
 * - Use maxTestsPerError: 1 configuration
 * - Trigger same error patterns across multiple tests
 * - Verify only first test fails, subsequent tests pass with warnings
 *
 * Note on test.fail():
 * Tests marked with test.fail() are EXPECTED to fail due to network errors.
 * - If these tests FAIL as expected → Playwright treats them as PASSING ✅
 * - If these tests PASS unexpectedly → Indicates a bug in the network monitor ❌
 * This pattern allows us to test that the network monitor correctly detects
 * and fails tests when it should, while keeping the test suite green.
 */

// Create test with maxTestsPerError: 1 to prevent domino effect
// Note: excludePatterns is required when using maxTestsPerError (type constraint)
const testWithLimit = base.extend(
  createNetworkErrorMonitorFixture({
    excludePatterns: [], // Required when using maxTestsPerError
    maxTestsPerError: 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
)

base.describe.configure({ mode: 'serial', retries: 0 })

base.describe('Network Error Monitor - Domino Effect Prevention', () => {
  base.describe('Basic maxTestsPerError behavior', () => {
    // These tests will run sequentially in the same worker
    // First test encountering an error pattern should fail
    // Second test encountering same pattern should pass

    testWithLimit.fail(
      'first test with 404 error should fail',
      async ({ page }) => {
        // Trigger a 404 error
        await page.route('**/test-endpoint-404', (route) =>
          route.fulfill({ status: 404, body: 'Not Found' })
        )

        await page.goto('data:text/html,<h1>Test</h1>')

        // Trigger the 404
        await page.evaluate(async () => {
          await fetch('http://localhost:3000/test-endpoint-404')
        })

        // This test should fail due to 404 error
        // Marked with test.fail() so Playwright expects failure
        expect(true).toBe(true)
      }
    )

    testWithLimit(
      'second test with same 404 error should pass (limit reached)',
      async ({ page }) => {
        // Trigger the SAME 404 error pattern
        await page.route('**/test-endpoint-404', (route) =>
          route.fulfill({ status: 404, body: 'Not Found' })
        )

        await page.goto('data:text/html,<h1>Test 2</h1>')

        // Trigger the same 404
        await page.evaluate(async () => {
          await fetch('http://localhost:3000/test-endpoint-404')
        })

        // This test should PASS because limit was reached in previous test
        expect(true).toBe(true)
      }
    )
  })

  base.describe('Error pattern grouping', () => {
    testWithLimit.fail(
      'should group errors by status + base path (first occurrence)',
      async ({ page }) => {
        // Trigger error on /api/v2/users/profile endpoint
        await page.route('**/api/v2/users/profile', (route) =>
          route.fulfill({ status: 500, body: 'Internal Server Error' })
        )

        await page.goto('data:text/html,<h1>Test</h1>')

        await page.evaluate(async () => {
          await fetch('http://localhost:3000/api/v2/users/profile')
        })

        // Should fail (first test with this pattern)
        expect(true).toBe(true)
      }
    )

    testWithLimit(
      'should group errors by status + base path (different endpoint, same base)',
      async ({ page }) => {
        // Trigger error on DIFFERENT endpoint but SAME base path (/api/v2/users)
        await page.route('**/api/v2/users/settings', (route) =>
          route.fulfill({ status: 500, body: 'Internal Server Error' })
        )

        await page.goto('data:text/html,<h1>Test</h1>')

        await page.evaluate(async () => {
          await fetch('http://localhost:3000/api/v2/users/settings')
        })

        // Should PASS because same pattern (500:/api/v2/users) already failed
        expect(true).toBe(true)
      }
    )
  })

  base.describe(
    'Multiple error patterns in single test (bug fix verification)',
    () => {
      testWithLimit.fail(
        'setup: trigger first error pattern to reach limit',
        async ({ page }) => {
          await page.route('**/api/v2/old-error', (route) =>
            route.fulfill({ status: 500, body: 'Old Error' })
          )

          await page.goto('data:text/html,<h1>Setup</h1>')

          await page.evaluate(async () => {
            await fetch('http://localhost:3000/api/v2/old-error')
          })

          // This test should fail (first occurrence of 500:/api/v2/old-error)
          expect(true).toBe(true)
        }
      )

      testWithLimit.fail(
        'should fail when encountering mix of old (at limit) and new patterns',
        async ({ page }) => {
          // Trigger TWO errors:
          // 1. Old pattern that already hit limit (should skip)
          // 2. New pattern that hasn't failed yet (should fail)

          await page.route('**/api/v2/old-error', (route) =>
            route.fulfill({ status: 500, body: 'Old Error' })
          )

          await page.route('**/api/v2/new-error', (route) =>
            route.fulfill({ status: 404, body: 'New Error' })
          )

          await page.goto('data:text/html,<h1>Multi Error</h1>')

          await page.evaluate(async () => {
            await fetch('http://localhost:3000/api/v2/old-error')
            await fetch('http://localhost:3000/api/v2/new-error')
          })

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
      async ({ page }) => {
        await page.route('**/api/v2/multi-status/endpoint', (route) =>
          route.fulfill({ status: 500, body: 'Server Error' })
        )

        await page.goto('data:text/html,<h1>Test</h1>')

        await page.evaluate(async () => {
          await fetch('http://localhost:3000/api/v2/multi-status/endpoint')
        })

        // Should fail (first occurrence of 500:/api/v2/multi-status)
        expect(true).toBe(true)
      }
    )

    testWithLimit.fail(
      'should treat different status codes as different patterns (404)',
      async ({ page }) => {
        // Same endpoint, different status code
        await page.route('**/api/v2/multi-status/endpoint', (route) =>
          route.fulfill({ status: 404, body: 'Not Found' })
        )

        await page.goto('data:text/html,<h1>Test</h1>')

        await page.evaluate(async () => {
          await fetch('http://localhost:3000/api/v2/multi-status/endpoint')
        })

        // Should FAIL (different pattern: 404:/api/v2/multi-status)
        // Even though same endpoint, different status = different pattern
        expect(true).toBe(true)
      }
    )
  })
})

base.describe('Network Error Monitor - No Limit (default behavior)', () => {
  // Test without maxTestsPerError to verify default behavior
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testNoLimit = base.extend(createNetworkErrorMonitorFixture() as any)

  testNoLimit.fail(
    'should fail all tests when maxTestsPerError is not set',
    async ({ page }) => {
      await page.route('**/test-unlimited-errors', (route) =>
        route.fulfill({ status: 500, body: 'Error' })
      )

      await page.goto('data:text/html,<h1>Test</h1>')

      await page.evaluate(async () => {
        await fetch('http://localhost:3000/test-unlimited-errors')
      })

      // Should fail (default behavior - no limit)
      expect(true).toBe(true)
    }
  )

  testNoLimit.fail(
    'should fail all tests when maxTestsPerError is not set (second test)',
    async ({ page }) => {
      await page.route('**/test-unlimited-errors', (route) =>
        route.fulfill({ status: 500, body: 'Error' })
      )

      await page.goto('data:text/html,<h1>Test 2</h1>')

      await page.evaluate(async () => {
        await fetch('http://localhost:3000/test-unlimited-errors')
      })

      // Should ALSO fail (default behavior - no limit)
      expect(true).toBe(true)
    }
  )
})
