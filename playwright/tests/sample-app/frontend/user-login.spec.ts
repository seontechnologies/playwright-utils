import { test, expect } from '@playwright/support/merged-fixtures'
import { log } from 'src/log'

test.use({
  authSessionEnabled: false
})

test('should login @smoke', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/login')

  await page.getByTestId('username-input').fill('admin')
  await page.getByTestId('password-input').fill('admin')

  await page.getByTestId('login-button').click()

  await expect(page).toHaveURL('/movies')
  await log.step('at movies page')
})

// testing smart burn-in, remove this line later
