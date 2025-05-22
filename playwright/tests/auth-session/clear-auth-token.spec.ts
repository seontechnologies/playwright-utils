import { log } from '../../../src/log'
import { clearAuthToken } from '../../../src/auth-session'
import { test, expect } from '../../support/merged-fixtures'

// NOTE: when testing token refresh, skip the below tests
// because they will clear the token and cause other tests to always get a fresh one

/**
 * Create a preview of a token that's safe for logging
 * @param token - The full token
 * @returns A shortened preview with the middle part replaced by '...'
 */
const createTokenPreview = (token: string): string =>
  token.substring(0, 10) + '...' + token.substring(token.length - 5)

test.skip()

// Configure tests to run in serial mode (sequentially, not in parallel)
// This is required for properly testing auth token reuse between tests
test.describe.configure({ mode: 'serial' })
test.describe('Auth Token Clearing Example', () => {
  test('should clear token and verify it was cleared', async () => {
    // Store the original token clearing status for verification
    const wasCleared = clearAuthToken()
    expect(wasCleared).toBe(true)

    // Get a new token via the auth fixture in the next test
    // This will be verified in the next test which will get a fresh token
    await log.info('Token cleared successfully')
  })

  test('verifies a new token is acquired after clearing', async ({
    authToken
  }) => {
    // After clearing in the previous test, this should be a fresh token
    expect(authToken).toBeDefined()
    expect(typeof authToken).toBe('string')
    expect(authToken.length).toBeGreaterThan(0)

    // Log token for debugging (shortened for security)
    const tokenPreview = createTokenPreview(authToken)
    await log.info(`New token after clearing: ${tokenPreview}`)

    // Verify this is a valid token
    expect(authToken).toMatch(/[A-Za-z0-9]+/)
  })

  test('can manually clear the token if needed', async () => {
    // Clear the token - this will cause the next test to fetch a new one
    clearAuthToken()
    await log.info('Token cleared - next test will fetch a new one')
  })
})
