import { test as base } from '@playwright/test'
import { recurse as recurseFunction } from './recurse'
import type { RecurseParams } from './recurse'

export const test = base.extend<{
  /**
   * Re-runs a function until the predicate returns true or timeout is reached.
   * This fixture version provides the same functionality as the direct import
   * but can be used within test fixtures.
   *
   * @example
   * // Poll until session becomes active
   * test('wait for activation', async ({ recurse }) => {
   *   const session = await recurse(
   *     () => apiRequest({ method: 'GET', url: '/session' }),
   *     (response) => response.body.status === 'ACTIVE',
   *     { timeout: 60000, interval: 2000 }
   *   );
   *
   *   expect(session.body.id).toBeDefined();
   * });
   *
   * @example
   * // Poll with custom logging
   * test('custom logging', async ({ recurse }) => {
   *   await recurse(
   *     () => fetchData(),
   *     (data) => data.isReady,
   *     {
   *       log: 'Waiting for data to be ready',
   *       timeout: 15000
   *     }
   *   );
   * });
   */
  recurse: <T>(params: RecurseParams<T>) => Promise<T>
}>({
  recurse: async ({}, use) => {
    const recurse = async <T>({
      command,
      predicate,
      options
    }: RecurseParams<T>): Promise<T> =>
      recurseFunction({ command, predicate, options })

    await use(recurse)
  }
})

export { expect } from '@playwright/test'
