import { test, expect } from '@playwright/support/merged-fixtures'

const userIdentifiers = [
  'admin',
  'fraudAnalystUser',
  'freeUser',
  'settingsAdminUser',
  'shopifyUser'
]

// Use test.describe() for proper test isolation instead of forEach
userIdentifiers.forEach((userIdentifier) => {
  test.describe(`User: ${userIdentifier}`, () => {
    // Properly scoped test.use() within describe block
    test.use({
      authOptions: {
        userIdentifier
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
  })
})
