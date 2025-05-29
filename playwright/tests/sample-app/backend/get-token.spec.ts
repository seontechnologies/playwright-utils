import { API_URL } from '@playwright/config/local.config'
import { test, expect } from '../../../support/merged-fixtures'
import { log } from '../../../../src/log'

// Disable auth session for these tests since we're testing token acquisition
// This prevents the global auth from interfering with these tests
test.use({
  authSessionEnabled: false
})

test.describe('token acquisition', () => {
  test('sanity', async ({ apiRequest }) => {
    const {
      status,
      body: { message }
    } = await apiRequest<{ message: string }>({
      baseUrl: API_URL,
      method: 'GET',
      path: '/'
    })

    expect(status).toBe(200)
    expect(message).toEqual('Server is running')
  })

  test('should get a token with basic PW api', async ({ playwright }) => {
    // changing the baseUrl from the config baseURL is clunky
    // if baseUrl == configBaseUrl, this is just request.get(..)
    // but for sending api requests to urls other than the baseURL, we have to create a context
    const apiRequestContext = await playwright.request.newContext({
      baseURL: API_URL
    })
    const tokenRes = await apiRequestContext.post('/auth/fake-token')
    const tokenResBody = await tokenRes.json()
    const tokenResStatus = tokenRes.status()
    const token = tokenResBody.token

    expect(tokenResStatus).toBe(200)
    expect(token).toEqual(expect.any(String))
    // and we have to clean up the request context we had to create
    await apiRequestContext.dispose()
  })

  test('should get a token & refresh token with helper', async ({
    apiRequest
  }) => {
    const {
      body: { token },
      status
    } = await apiRequest<{ token: string }>({
      baseUrl: API_URL,
      method: 'POST',
      path: '/auth/fake-token'
    })

    expect(status).toBe(200)
    expect(token).toEqual(expect.any(String))

    await log.step('Test the refresh token')

    const {
      body: { token: refreshToken },
      status: refreshTokenStatus
    } = await apiRequest<{ token: string }>({
      baseUrl: API_URL,
      method: 'POST',
      path: '/auth/renew'
    })

    expect(refreshTokenStatus).toBe(200)
    expect(refreshToken).toEqual(expect.any(String))
    expect(token).not.toEqual(refreshToken)
  })
})
