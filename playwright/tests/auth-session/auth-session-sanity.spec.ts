import { log } from '../../../src/log'
import { test, expect } from '../../support/merged-fixtures'

/**
 * Create a preview of a token that's safe for logging
 * @param token - The full token
 * @returns A shortened preview with the middle part replaced by '...'
 */
const createTokenPreview = (token: string): string =>
  token.substring(0, 10) + '...' + token.substring(token.length - 5)

// Configure tests to run in serial mode (sequentially, not in parallel)
// This is required for properly testing auth token reuse between tests
test.describe.configure({ mode: 'serial' })
test.describe('Auth Session Example', () => {
  // This test just demonstrates that we get a token
  test('should have auth token available', async ({ authToken }) => {
    // Token is already obtained via the fixture
    expect(authToken).toBeDefined()
    expect(typeof authToken).toBe('string')
    expect(authToken.length).toBeGreaterThan(0)

    // Log token for debugging (shortened for security)
    const tokenPreview = createTokenPreview(authToken)
    await log.info(`Token available without explicit fetching: ${tokenPreview}`)
  })

  // This test will reuse the same token without making another request
  test('should reuse the same auth token', async ({
    authToken,
    apiRequest
  }) => {
    // The token is already available without making a new request
    expect(authToken).toBeDefined()
    expect(typeof authToken).toBe('string')

    // We can use the token for API requests
    const { status } = await apiRequest({
      method: 'GET',
      path: '/movies',
      headers: {
        Authorization: authToken // Use the token directly as the CRUD helpers do
      }
    })

    expect(status).toBe(200)

    // Log token for debugging (shortened for security)
    const tokenPreview = createTokenPreview(authToken)
    await log.step(
      `Second test reuses the token without fetching again: ${tokenPreview}`
    )
  })
})
