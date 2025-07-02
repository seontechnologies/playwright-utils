import { test, expect } from '@playwright/support/merged-fixtures'

const role = 'freeUser'

test.use({
  authOptions: {
    userRole: role
  }
})

test(`should login with a different role; ${role}`, async ({
  page,
  authToken
}) => {
  expect(authToken).toBeDefined() // wait for auth token to be ready, to avoid race conditions

  await page.goto('/')

  await expect(page).toHaveURL('/movies')

  await expect(page.getByText(role)).toBeVisible()
})
