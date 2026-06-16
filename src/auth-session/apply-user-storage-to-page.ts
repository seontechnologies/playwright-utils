/**
 * Write a user's localStorage-based authentication onto an already-navigated
 * page — the page-level counterpart of {@link applyUserStorageToBrowserContext}.
 *
 * Prefers the Playwright 1.61 `page.localStorage` WebStorage API (clean async
 * read/write) and transparently falls back to `page.evaluate` on older
 * versions, so the package peer floor does not have to be raised. Scope is
 * `localStorage` only.
 */
import type { Page } from '@playwright/test'
import { log } from '../log'
import {
  extractStorageOrigins,
  normalizeOrigin
} from './internal/extract-storage-origins'

/**
 * Write a user's localStorage auth onto an already-navigated page. Only entries
 * whose (normalized) `origin` matches the page's current origin are written;
 * navigate the page to the target origin before calling this.
 *
 * @param page The page (already on the target origin) to write storage into
 * @param tokenData The storage state object or user data containing the token
 * @returns The same page
 */
export async function applyUserStorageToPage(
  page: Page,
  tokenData: Record<string, unknown>
): Promise<Page> {
  let origins
  try {
    origins = extractStorageOrigins(tokenData)
  } catch (error) {
    await log.error(
      `Failed to extract localStorage entries from token data: ${String(error)}`
    )
    throw new Error(`Failed to extract localStorage entries: ${String(error)}`)
  }

  if (origins.length === 0) {
    await log.warning('No auth localStorage entries found to apply')
    return page
  }

  const currentOrigin = new URL(page.url()).origin
  const entries = origins
    .filter((o) => normalizeOrigin(o.origin) === currentOrigin)
    .flatMap((o) => o.localStorage)

  if (entries.length === 0) {
    await log.warning(
      `No localStorage entries match the page origin (${currentOrigin})`
    )
    return page
  }

  // Feature-detect the 1.61 WebStorage API; degrade gracefully otherwise.
  // Model the older-version reality where `localStorage` may be absent.
  const webStorage = (page as { localStorage?: Page['localStorage'] })
    .localStorage
  const useNativeWebStorage = typeof webStorage?.setItem === 'function'

  try {
    for (const { name, value } of entries) {
      if (useNativeWebStorage) {
        await page.localStorage.setItem(name, value)
      } else {
        await page.evaluate(([n, v]) => window.localStorage.setItem(n, v), [
          name,
          value
        ] as const)
      }
    }
    await log.info(
      `Applied ${entries.length} localStorage entries to page via ${
        useNativeWebStorage ? 'page.localStorage (1.61)' : 'page.evaluate'
      }`
    )
  } catch (error) {
    await log.error(`Failed to write localStorage to page: ${String(error)}`)
    throw new Error(`Failed to write localStorage to page: ${String(error)}`)
  }

  return page
}
