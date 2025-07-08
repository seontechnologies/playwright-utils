import { VALID_TEST_USERS } from '@playwright/support/global-setup'
import { test, expect } from '@playwright/support/merged-fixtures'

const userIdentifiers = Object.values(VALID_TEST_USERS)

// KEY: Describe block has to be used, and the forEach has to wrap the describe block
userIdentifiers.forEach((userIdentifier) => {
  test.describe(`User: ${userIdentifier}`, () => {
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
