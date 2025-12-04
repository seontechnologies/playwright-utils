import { expect, test } from '@playwright/support/merged-fixtures'

/**
 * Tests for Network Error Monitor fixture
 *
 * Note: merged-fixtures.ts already includes networkErrorMonitorFixture,
 * so all tests here automatically have network monitoring enabled.
 */

test.describe('Network Error Monitor - Basic Functionality', () => {
  test('should allow successful requests without failing', async ({ page }) => {
    const loadGetMovies = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'GET'
    )

    await page.goto('/')

    const response = await loadGetMovies
    const responseStatus = response.status()

    expect(responseStatus).toBeGreaterThanOrEqual(200)
    expect(responseStatus).toBeLessThan(400)
  })
})

test.describe('Network Error Monitor - Opt-out Mechanism', () => {
  test(
    'should not fail test when opt-out annotation is used',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      // This test verifies that the skipNetworkMonitoring annotation works
      // Without the annotation, any 404 would fail the test
      // With the annotation, the test should pass even if errors occur

      await page.goto('/')

      // Trigger a 404 by trying to fetch a non-existent resource
      // The network monitor should ignore this due to the annotation
      await page.evaluate(() => {
        const img = document.createElement('img')
        img.src = '/definitely-non-existent-image-12345.png'
        document.body.appendChild(img)
      })

      // Wait for the 404 response deterministically (expected to fail)
      await page
        .waitForResponse(
          (response) =>
            response.url().includes('definitely-non-existent-image-12345.png'),
          { timeout: 2000 }
        )
        .catch(() => {
          // Expected to fail - we're testing the annotation prevents failure
        })

      // Test passes - annotation prevents network errors from failing the test
      expect(true).toBe(true)
    }
  )
})
