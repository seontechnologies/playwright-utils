import { test, expect } from '@playwright/support/merged-fixtures'

const userIdentifier = 'freeUser'

test.use({
  authOptions: {
    userIdentifier: userIdentifier
  }
})

test(`should login with a different user; ${userIdentifier}`, async ({
  page,
  authToken
}) => {
  expect(authToken).toBeDefined() // wait for auth token to be ready, to avoid race conditions

  await page.goto('/')

  await expect(page).toHaveURL('/movies')

  await expect(page.getByText(userIdentifier)).toBeVisible()
})
