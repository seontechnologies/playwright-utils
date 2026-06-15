/**
 * Unit-style coverage (no sample-app needed) for defaultTokenFormatter's
 * provider-origin augmentation. Uses plain Playwright test so it can swap the
 * global auth provider in isolation (set/restore per test — tests never run
 * concurrently within a worker).
 *
 * Proves:
 * - cookie path is unchanged when the provider has no extractStorage hook;
 * - a throwing extractStorage is non-fatal (cookies still saved, origins empty);
 * - extractStorage populates `origins` across ALL three formatter input shapes,
 *   including the storage-state object and JSON-string early-return paths that
 *   the real saveToken() flow exercises (regression guard for the persisted
 *   localStorage Blocker).
 */
import { test, expect } from '@playwright/test'
import {
  setAuthProvider,
  getAuthProvider,
  type AuthProvider
} from '../../../src/auth-session'
import { defaultTokenFormatter } from '../../../src/auth-session/internal/auth-session'

const stubProvider = (overrides: Partial<AuthProvider> = {}): AuthProvider => ({
  getEnvironment: () => 'local',
  getUserIdentifier: () => 'test',
  extractToken: (d) => (typeof d.token === 'string' ? d.token : null),
  extractCookies: () => [],
  manageAuthToken: async () => ({}),
  clearToken: () => undefined,
  ...overrides
})

/** Run fn with a temporary provider, always restoring the previous one. */
const withProvider = <T>(provider: AuthProvider, fn: () => T): T => {
  let previous: AuthProvider | null = null
  try {
    previous = getAuthProvider()
  } catch {
    previous = null
  }
  setAuthProvider(provider)
  try {
    return fn()
  } finally {
    if (previous) setAuthProvider(previous)
  }
}

const populatingProvider = stubProvider({
  extractStorage: (d) => {
    const cookies = Array.isArray(d.cookies)
      ? (d.cookies as Array<{ name?: string; value?: string }>)
      : []
    const fromCookie = cookies.find((c) => c?.name === 'app-jwt')?.value
    const token = typeof d.token === 'string' ? d.token : fromCookie
    return token
      ? [
          {
            origin: 'http://localhost:3000',
            localStorage: [{ name: 'app-jwt', value: String(token) }]
          }
        ]
      : []
  }
})

test.describe('defaultTokenFormatter — provider origin augmentation', () => {
  test('cookie path unchanged when provider has no extractStorage', () => {
    const out = withProvider(stubProvider(), () =>
      defaultTokenFormatter({ token: 'jwt-x' })
    )
    expect(out.origins).toEqual([])
    expect(out.cookies).toHaveLength(1)
    expect(out.cookies[0]?.value).toBe('jwt-x')
  })

  test('throwing extractStorage is non-fatal and yields empty origins', () => {
    const out = withProvider(
      stubProvider({
        extractStorage: () => {
          throw new Error('boom')
        }
      }),
      () => defaultTokenFormatter({ token: 'jwt-x' })
    )
    expect(out.origins).toEqual([])
    expect(out.cookies[0]?.value).toBe('jwt-x')
  })

  test('extractStorage populates origins across all formatter input shapes', () => {
    withProvider(populatingProvider, () => {
      // (a) object carrying a raw token — the build-from-token branch
      const a = defaultTokenFormatter({ token: 'jwt' })
      expect(a.cookies).toHaveLength(1)
      expect(a.origins).toHaveLength(1)
      expect(a.origins[0]?.localStorage[0]).toMatchObject({
        name: 'app-jwt',
        value: 'jwt'
      })

      // (b) storage-state OBJECT — early-return path (Blocker regression guard)
      const b = defaultTokenFormatter({
        cookies: [{ name: 'app-jwt', value: 'jwt' }],
        origins: []
      })
      expect(b.origins).toHaveLength(1)

      // (c) storage-state JSON STRING — the real saveToken() path (Blocker)
      const c = defaultTokenFormatter(
        JSON.stringify({
          cookies: [{ name: 'app-jwt', value: 'jwt' }],
          origins: []
        })
      )
      expect(c.origins).toHaveLength(1)
    })
  })
})
