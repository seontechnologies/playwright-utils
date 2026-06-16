/**
 * E2E coverage for localStorage-based auth (Playwright 1.61 WebStorage API).
 *
 * Demonstrates the localStorage counterpart of the cookie helpers:
 * - applyUserStorageToBrowserContext seeds localStorage before page scripts run
 *   (via context.addInitScript — version-agnostic).
 * - applyUserStorageToPage writes localStorage on a live page using the 1.61
 *   page.localStorage WebStorage API (with graceful fallback on older versions).
 *
 * Also asserts the cookie path is untouched: the same provider exposes both
 * extractCookies and the new optional extractStorage hook.
 */
import { test, expect } from '../../support/merged-fixtures'
import {
  applyUserStorageToBrowserContext,
  applyUserStorageToPage,
  getAuthProvider
} from '../../../src/auth-session'
import { log } from '../../../src/log'

test.describe('Auth Session — localStorage (WebStorage API)', () => {
  test('applyUserStorageToBrowserContext seeds localStorage for the origin', async ({
    context,
    page,
    authToken
  }) => {
    // Register the init script before navigating; it runs before page scripts.
    await applyUserStorageToBrowserContext(context, { token: authToken })

    await page.goto('/')

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('app-jwt')
    )
    expect(stored).toBe(authToken)
    await log.step('Token seeded into localStorage before first page load')
  })

  test('applyUserStorageToPage writes via the 1.61 page.localStorage API', async ({
    page,
    authToken
  }) => {
    await page.goto('/')

    await applyUserStorageToPage(page, { token: authToken })

    // Read back via the 1.61 WebStorage API AND independently via page.evaluate,
    // so we confirm the value is actually committed to the browser window (not
    // just round-tripped through the same API surface).
    const viaApi = await page.localStorage.getItem('app-jwt')
    const viaEvaluate = await page.evaluate(() =>
      window.localStorage.getItem('app-jwt')
    )
    expect(viaApi).toBe(authToken)
    expect(viaEvaluate).toBe(authToken)
    await log.step(
      'Token written and confirmed committed to window.localStorage'
    )
  })

  test('applyUserStorageToPage falls back to page.evaluate when page.localStorage is absent', async ({
    page,
    authToken
  }) => {
    await page.goto('/')

    // Simulate a pre-1.61 Page where the WebStorage API does not exist, forcing
    // the page.evaluate fallback that protects the >=1.54.1 peer floor.
    const original = Object.getOwnPropertyDescriptor(page, 'localStorage')
    Object.defineProperty(page, 'localStorage', {
      value: undefined,
      configurable: true
    })

    try {
      await applyUserStorageToPage(page, { token: authToken })
      const stored = await page.evaluate(() =>
        window.localStorage.getItem('app-jwt')
      )
      expect(stored).toBe(authToken)
      await log.step('Fallback path wrote localStorage via page.evaluate')
    } finally {
      if (original) {
        Object.defineProperty(page, 'localStorage', original)
      } else {
        delete (page as { localStorage?: unknown }).localStorage
      }
    }
  })

  test('cookie and localStorage extraction coexist (non-breaking)', async ({
    authToken
  }) => {
    const provider = getAuthProvider()
    const tokenData = { token: authToken }

    // Cookie path is unchanged.
    const cookies = provider.extractCookies(tokenData)
    expect(
      cookies.some((c) => c.name === 'app-jwt' && c.value === authToken)
    ).toBe(true)

    // New optional localStorage path is available and returns the JWT.
    const origins = provider.extractStorage?.(tokenData) ?? []
    expect(origins).toHaveLength(1)
    expect(origins[0]?.localStorage[0]).toMatchObject({
      name: 'app-jwt',
      value: authToken
    })
  })
})
