import { test, expect } from '@playwright/support/merged-fixtures'
import { log } from 'src/log'

/**
 * Test suite for authentication-related functionality in the frontend app
 * These tests verify token handling and redirect behavior
 */
test.describe('Frontend Authentication', () => {
  test('logs detailed auth cookie information', async ({
    page,
    context,
    authToken
  }) => {
    await log.step('Examining auth token and cookie state')

    // Log the auth token from the fixture for reference
    await log.info(`Auth token from fixture: ${authToken.substring(0, 20)}...`)

    // First, let's check the cookies before any navigation
    await log.step('Checking cookies before navigation')
    const initialCookies = await context.cookies()
    await log.info(
      `Initial cookies: ${JSON.stringify(initialCookies, null, 2)}`
    )

    // Look specifically for our auth cookie
    const authCookie = initialCookies.find(
      (cookie) => cookie.name === 'seon-jwt'
    )
    if (authCookie) {
      await log.info(
        `Found auth cookie: ${JSON.stringify(authCookie, null, 2)}`
      )

      // Decode and log the cookie value to see the format
      try {
        const decodedValue = decodeURIComponent(authCookie.value)
        await log.info(`Decoded cookie value: ${decodedValue}`)

        // Check if it has the correct format (Bearer TIMESTAMP:JSON)
        if (decodedValue.startsWith('Bearer ')) {
          await log.success('Cookie has proper Bearer prefix')

          const tokenParts = decodedValue.replace('Bearer ', '').split(':')
          if (tokenParts.length > 1) {
            await log.success('Cookie has proper TIMESTAMP:JSON format')
            await log.info(`Timestamp part: ${tokenParts[0]}`)
            await log.info(`JSON part: ${tokenParts.slice(1).join(':')}`)
          } else {
            await log.warning('Cookie does not have TIMESTAMP:JSON format')
          }
        } else {
          await log.warning('Cookie does not have Bearer prefix')
        }
      } catch (error) {
        await log.error(`Error decoding cookie value: ${error}`)
      }
    } else {
      await log.warning('Auth cookie not found in initial cookies')
    }

    // Navigate to the root path and observe what happens
    await log.step('Navigating to the root path')
    const response = await page.goto('/')

    // Log the response status and headers
    await log.info(`Navigation response status: ${response?.status()}`)
    await log.info(`Navigation response URL: ${response?.url()}`)

    // Check the current URL after navigation
    const currentUrl = page.url()
    await log.info(`Current URL after navigation: ${currentUrl}`)

    // Check if we were redirected as expected (to /movies) or redirected elsewhere
    if (currentUrl.endsWith('/movies')) {
      await log.success('Successfully redirected to /movies')
    } else if (currentUrl.endsWith('/login')) {
      await log.warning('Redirected to /login instead of /movies')
    } else {
      await log.info(`Unexpected redirection to: ${currentUrl}`)
    }

    // Check cookies again after navigation
    await log.step('Checking cookies after navigation')
    const afterNavCookies = await context.cookies()
    await log.info(
      `Cookies after navigation: ${JSON.stringify(afterNavCookies, null, 2)}`
    )

    // Check the auth cookie again
    const afterNavAuthCookie = afterNavCookies.find(
      (cookie) => cookie.name === 'seon-jwt'
    )
    if (afterNavAuthCookie) {
      await log.info(
        `Auth cookie after navigation: ${JSON.stringify(afterNavAuthCookie, null, 2)}`
      )
      if (authCookie && afterNavAuthCookie.value !== authCookie.value) {
        await log.warning('Auth cookie value changed after navigation')
      }
    } else {
      await log.warning('Auth cookie not found after navigation')
    }

    // Capture console logs
    await log.step('Capturing console logs')
    page.on('console', (msg) => {
      log.infoSync(`Console ${msg.type()}: ${msg.text()}`)
    })

    // Take a screenshot for visual verification
    await log.step('Taking screenshot')
    await page.screenshot({ path: 'debug-auth-redirect.png' })

    // Make the final assertion
    await log.step('Final assertion')
    await expect(page).toHaveURL('/movies')
  })

  test('manually sets auth cookie and verifies redirect', async ({
    page,
    context
  }) => {
    await log.step('Setting auth cookie manually')

    // Create a timestamp-based token in the correct format
    const timestamp = Date.now().toString()
    const jsonPart = JSON.stringify({ id: 'test-user', username: 'testuser' })
    const formattedToken = `Bearer ${timestamp}:${jsonPart}`

    // Set the cookie directly
    await context.addCookies([
      {
        name: 'seon-jwt',
        value: formattedToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false
      }
    ])

    await log.info('Manually set auth cookie with proper format')

    // Navigate and verify redirect
    await log.step('Navigating to root path with manual cookie')
    await page.goto('/')

    // Check current URL
    const currentUrl = page.url()
    await log.info(`URL after navigation with manual cookie: ${currentUrl}`)

    // Assert proper redirect
    await log.step('Verifying redirect with manual cookie')
    await expect(page).toHaveURL('/movies')
  })

  test('authenticated redirect works correctly', async ({
    page,
    authToken
  }) => {
    await log.step('Verifying authentication token is present')
    // Simply requesting the authToken fixture ensures we're authenticated
    await log.info(`Auth token is available: ${authToken.substring(0, 20)}...`)

    await log.step('Navigating to the root path')
    await page.goto('/')

    await log.step('Verifying redirect to authenticated route')
    // When authenticated, we should be redirected to the movies path
    await expect(page).toHaveURL('/movies')
  })
})
