import { existsSync } from 'node:fs'
import { recurse } from '../../recurse'
import type { WaitFileOptions } from './types'

const DEFAULT_OPTIONS: Required<WaitFileOptions> = {
  timeout: 30000, // 30 seconds
  interval: 250, // 250ms
  log: 'Waiting for file to be available'
}

/**
 * Waits for a file to exist at the given path.
 *
 * Uses the recurse utility to poll until the file exists or the timeout is reached.
 *
 * @param options - Options for waiting, including the file path.
 * @returns A promise that resolves when the file exists.
 * @throws An error if the file does not exist after the timeout.
 *
 * @example
 * ```ts
 * // Wait for a file with default options
 * await waitForFile({ filePath: 'path/to/download.csv' });
 *
 * // Wait with custom timeout and interval
 * await waitForFile({
 *   filePath: 'path/to/large-file.xlsx',
 *   timeout: 60000,
 *   interval: 500,
 *   log: 'Waiting for large Excel file...'
 * });
 * ```
 */
export async function waitForFile(
  options: { filePath: string } & WaitFileOptions
): Promise<void> {
  const { filePath, ...waitOptions } = options
  const mergedOptions: Required<WaitFileOptions> = {
    ...DEFAULT_OPTIONS,
    ...waitOptions
  }

  await recurse(
    async () => {
      return { exists: existsSync(filePath), path: filePath }
    },
    (result) => result.exists,
    {
      timeout: mergedOptions.timeout,
      interval: mergedOptions.interval,
      log: mergedOptions.log,
      error: `Timed out waiting for file to exist at: ${filePath}`
    }
  )
}
