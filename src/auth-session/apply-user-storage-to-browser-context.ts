/**
 * Seed a user's localStorage-based authentication into a browser context
 * without persisting it to disk — the localStorage counterpart of
 * {@link applyUserCookiesToBrowserContext}.
 *
 * Uses `context.addInitScript`, which runs before any page script for every
 * page/frame in the context, so the token is available on first load.
 * Version-agnostic (works on any supported Playwright). Scope is `localStorage`
 * only — Playwright storage state `origins` does not carry `sessionStorage`.
 */
import type { BrowserContext } from '@playwright/test'
import { log } from '../log'
import {
  extractStorageOrigins,
  type StorageOrigin
} from './internal/extract-storage-origins'

/**
 * Seed a user's localStorage auth into a browser context. The init script only
 * writes entries whose (normalized) `origin` matches the page's current origin,
 * mirroring how Playwright applies storage-state `origins`, and tolerates
 * storage being unavailable (e.g. sandboxed frames throwing SecurityError).
 *
 * @param context The browser context to seed
 * @param tokenData The storage state object or user data containing the token
 * @returns The same context, with the init script registered
 */
export async function applyUserStorageToBrowserContext(
  context: BrowserContext,
  tokenData: Record<string, unknown>
): Promise<BrowserContext> {
  let origins: Array<StorageOrigin>
  try {
    origins = extractStorageOrigins(tokenData)
  } catch (error) {
    await log.error(
      `Failed to extract localStorage entries from token data: ${String(error)}`
    )
    throw new Error(`Failed to extract localStorage entries: ${String(error)}`)
  }

  const entryCount = origins.reduce((sum, o) => sum + o.localStorage.length, 0)
  await log.info(
    `Applying user auth with ${entryCount} localStorage entries across ${origins.length} origin(s)`
  )

  if (origins.length === 0) {
    await log.warning('No auth localStorage entries found to apply')
    return context
  }

  try {
    // Runs in the page before its own scripts; guards by normalized origin so
    // we never leak one origin's token onto another, and swallows per-key
    // SecurityErrors (storage disabled / sandboxed frames) so page load is not
    // broken.
    await context.addInitScript((seeded: Array<StorageOrigin>) => {
      const normalize = (value: string): string => {
        try {
          return new URL(value).origin
        } catch {
          return value.replace(/\/+$/, '')
        }
      }
      const current = window.location.origin
      for (const entry of seeded) {
        if (normalize(entry.origin) !== current) continue
        for (const { name, value } of entry.localStorage) {
          try {
            window.localStorage.setItem(name, value)
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(
              `[playwright-utils] Failed to set localStorage key "${name}":`,
              e
            )
          }
        }
      }
    }, origins)
    await log.info('Successfully registered auth localStorage init script')
  } catch (error) {
    await log.error(
      `Failed to register localStorage init script: ${String(error)}`
    )
    throw new Error(
      `Failed to register localStorage init script: ${String(error)}`
    )
  }

  return context
}
