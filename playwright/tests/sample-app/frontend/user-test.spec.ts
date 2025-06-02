/* eslint-disable complexity */
import { test, expect } from '@playwright/support/merged-fixtures'
import { log } from 'src/log'

/**
 * This test compares the cookie formats between:
 * 1. Manual login through the UI
 * 2. Auth provider authentication
 *
 * The goal is to identify any differences that might cause auth issues
 */
test('compare cookie formats between manual login and auth provider', async ({
  page,
  context
}) => {
  // PART 1: EXAMINE AUTH PROVIDER COOKIES
  await log.step('Step 1: Examining auth provider cookies')

  // Get cookies that are already set by the auth provider
  const providerCookies = await context.cookies()
  await log.info('Auth provider cookies:')
  await log.info(providerCookies)

  // Find the auth cookie if it exists
  const providerAuthCookie = providerCookies.find(
    (cookie) => cookie.name === 'seon-jwt'
  )

  if (providerAuthCookie) {
    await log.success('Found auth provider cookie: seon-jwt')

    // Log detailed cookie attributes
    await log.info('Auth provider cookie details:')
    await log.info({
      name: providerAuthCookie.name,
      valuePrefix: providerAuthCookie.value.substring(0, 50) + '...',
      valueLength: providerAuthCookie.value.length,
      startsWithBearer: providerAuthCookie.value.startsWith('Bearer'),
      isUrlEncoded: providerAuthCookie.value.includes('%'),
      domain: providerAuthCookie.domain,
      path: providerAuthCookie.path,
      expires: providerAuthCookie.expires,
      httpOnly: providerAuthCookie.httpOnly,
      secure: providerAuthCookie.secure,
      sameSite: providerAuthCookie.sameSite
    })

    // Check if the provider cookie is URL encoded
    if (providerAuthCookie.value.includes('%')) {
      try {
        const decodedValue = decodeURIComponent(providerAuthCookie.value)
        await log.info('Decoded provider cookie value (first 50 chars):')
        await log.info(decodedValue.substring(0, 50) + '...')
      } catch {
        await log.warning('Failed to URL-decode provider cookie value')
      }
    }

    // Try navigating to see if the cookie works
    await log.step('Step 2: Testing auth provider cookie with navigation')
    await page.goto('/')

    // Check if we're authenticated
    const currentUrl = page.url()
    await log.info(`Current URL after navigation: ${currentUrl}`)

    if (currentUrl.includes('/login')) {
      await log.warning(
        'Auth provider cookie not recognized - redirected to login'
      )
    } else {
      await log.success('Auth provider cookie recognized!')
    }
  } else {
    await log.warning('No auth provider cookie found!')
  }

  // PART 2: PERFORM MANUAL LOGIN AND EXAMINE COOKIES
  await log.step('Step 3: Performing manual login')

  // Clear cookies to start fresh
  await context.clearCookies()

  // Verify cookies are cleared
  const clearedCookies = await context.cookies()
  await log.info(`Cookies after clearing: ${clearedCookies.length}`)

  // Go to login page
  await page.goto('/')
  await expect(page).toHaveURL('/login')

  // Perform login
  await page.getByTestId('username-input').fill('admin')
  await page.getByTestId('password-input').fill('admin')
  await page.getByTestId('login-button').click()

  // Verify login success
  await expect(page).toHaveURL('/movies')
  await log.success('Manual login successful')

  // Get cookies after manual login
  await log.step('Step 4: Examining manual login cookies')
  const manualLoginCookies = await context.cookies()
  await log.info('Manual login cookies:')
  await log.info(manualLoginCookies)

  // Find the auth cookie
  const manualAuthCookie = manualLoginCookies.find(
    (cookie) => cookie.name === 'seon-jwt'
  )

  if (manualAuthCookie) {
    await log.success('Found manual login cookie: seon-jwt')

    // Log detailed cookie attributes
    await log.info('Manual login cookie details:')
    await log.info({
      name: manualAuthCookie.name,
      valuePrefix: manualAuthCookie.value.substring(0, 50) + '...',
      valueLength: manualAuthCookie.value.length,
      startsWithBearer: manualAuthCookie.value.startsWith('Bearer'),
      isUrlEncoded: manualAuthCookie.value.includes('%'),
      domain: manualAuthCookie.domain,
      path: manualAuthCookie.path,
      expires: manualAuthCookie.expires,
      httpOnly: manualAuthCookie.httpOnly,
      secure: manualAuthCookie.secure,
      sameSite: manualAuthCookie.sameSite
    })

    // Check if the manual cookie is URL encoded
    if (manualAuthCookie.value.includes('%')) {
      try {
        const decodedValue = decodeURIComponent(manualAuthCookie.value)
        await log.info('Decoded manual cookie value (first 50 chars):')
        await log.info(decodedValue.substring(0, 50) + '...')
      } catch {
        await log.warning('Failed to URL-decode manual cookie value')
      }
    }
  } else {
    await log.error('No manual login cookie found!')
  }

  // PART 3: COMPARE THE TWO COOKIES
  await log.step('Step 5: Comparing cookies')

  if (providerAuthCookie && manualAuthCookie) {
    // Compare cookie attributes
    await log.info('Cookie attribute comparison:')
    await log.info({
      sameDomain: providerAuthCookie.domain === manualAuthCookie.domain,
      samePath: providerAuthCookie.path === manualAuthCookie.path,
      sameHttpOnly: providerAuthCookie.httpOnly === manualAuthCookie.httpOnly,
      sameSecure: providerAuthCookie.secure === manualAuthCookie.secure,
      sameSameSite: providerAuthCookie.sameSite === manualAuthCookie.sameSite,
      providerValueLength: providerAuthCookie.value.length,
      manualValueLength: manualAuthCookie.value.length
    })

    // Compare Bearer prefix
    const providerHasBearer = providerAuthCookie.value.startsWith('Bearer')
    const manualHasBearer = manualAuthCookie.value.startsWith('Bearer')

    await log.info('Bearer prefix comparison:')
    await log.info({
      providerHasBearer,
      manualHasBearer,
      mismatch: providerHasBearer !== manualHasBearer
    })

    // Compare URL encoding
    const providerIsEncoded = providerAuthCookie.value.includes('%')
    const manualIsEncoded = manualAuthCookie.value.includes('%')

    await log.info('URL encoding comparison:')
    await log.info({
      providerIsEncoded,
      manualIsEncoded,
      mismatch: providerIsEncoded !== manualIsEncoded
    })

    // Try to normalize and compare the actual values
    try {
      // Normalize by removing Bearer prefix and URL decoding if needed
      let normalizedProvider = providerAuthCookie.value
      let normalizedManual = manualAuthCookie.value

      // Remove Bearer prefix if present
      if (normalizedProvider.startsWith('Bearer ')) {
        normalizedProvider = normalizedProvider.substring(7)
      }
      if (normalizedManual.startsWith('Bearer ')) {
        normalizedManual = normalizedManual.substring(7)
      }

      // URL decode if needed
      if (providerIsEncoded) {
        normalizedProvider = decodeURIComponent(normalizedProvider)
      }
      if (manualIsEncoded) {
        normalizedManual = decodeURIComponent(normalizedManual)
      }

      // Extract timestamp parts - since backend tokens have JSON identity data after the timestamp
      // while frontend tokens might just have the timestamp
      const getTimestampPart = (token: string) => {
        const colonPos = token.indexOf(':')
        return colonPos > 0 ? token.substring(0, colonPos) : token
      }

      const providerTimestamp = getTimestampPart(normalizedProvider)
      const manualTimestamp = getTimestampPart(normalizedManual)

      // Compare only the timestamp parts
      const valueMatch = providerTimestamp === manualTimestamp
      // Format match checks if both have or don't have JSON data
      const formatMatch =
        normalizedProvider.includes(':') === normalizedManual.includes(':')

      await log.info('Normalized token comparison:')
      await log.info({
        valueMatch,
        formatMatch,
        providerTimestamp: providerTimestamp.substring(0, 20) + '...',
        manualTimestamp: manualTimestamp.substring(0, 20) + '...',
        providerHasJsonIdentity: normalizedProvider.includes(':'),
        manualHasJsonIdentity: normalizedManual.includes(':')
      })

      // It's acceptable to have different formats as long as the timestamp part is valid
      if (valueMatch) {
        await log.success('Token timestamp parts match!')
        if (!formatMatch) {
          await log.info(
            'Note: One token has JSON identity data and the other does not, but both are valid formats'
          )
        }
      } else {
        await log.error('Token timestamp parts do not match')
      }
    } catch {
      await log.error('Error comparing normalized tokens')
    }
  } else {
    await log.warning('Cannot compare cookies - one or both missing')
  }
})
