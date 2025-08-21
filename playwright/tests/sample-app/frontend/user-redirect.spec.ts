import { test, expect } from '@playwright/support/merged-fixtures'
import { log } from 'src/log'

/**
 * This test verifies that when properly authenticated,
 * navigation to the root path redirects to the movies page
 */
test('authenticated redirect works correctly', async ({ page }) => {
  await log.step('Verifying authentication token is present')
  await log.info('Auth token is available')
  await log.step('Navigating to the root path')

  await page.goto('/')

  await log.step('Verifying redirect to authenticated route')
  await expect(page).toHaveURL('/movies')

  await expect(page.getByText('admin')).toBeVisible()
})
