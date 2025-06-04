import { test as pwTest } from '@playwright/test'
import { test, expect } from '@playwright/support/merged-fixtures'

test.describe('tests with auth session', () => {
  test('should navigate to base url with auth session', async ({ page }) => {
    // Use full URL for reliable navigation with auth
    await page.goto('/')
    expect(page.url()).toContain('http://localhost:3000/')
  })
})

// Use standard Playwright test for tests without auth
pwTest.describe('tests without auth session', () => {
  pwTest('should navigate to base url directly', async ({ page }) => {
    // Use full URL for reliable navigation without auth
    await page.goto('/')
    expect(page.url()).toContain('http://localhost:3000/')
  })
})
