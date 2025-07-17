import type { Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { recurse } from '../../recurse'

export type DownloadOptions = {
  page: Page
  downloadDir: string
  /** A function that triggers the download action. */
  trigger: () => Promise<void>
  /** Optional: A specific filename to save the file as. If not provided, a unique name is generated. */
  fileName?: string
  /** Optional: Timeout for waiting for the download event. Defaults to 30 seconds. */
  timeout?: number
}

/**
 * Handles a file download in Playwright by wrapping the common boilerplate.
 * It waits for the download event, triggers the download, and saves the file.
 *
 * @returns The full path to the downloaded file.
 */
export async function handleDownload(
  options: DownloadOptions
): Promise<string> {
  const { page, downloadDir, trigger, fileName, timeout = 30000 } = options

  const downloadPromise = page.waitForEvent('download', { timeout })
  await trigger()
  const download = await downloadPromise
  const finalFileName = fileName || download.suggestedFilename()

  if (!finalFileName) {
    throw new Error(
      'Download failed: No filename was suggested by the server, and no explicit `fileName` was provided.'
    )
  }

  const extension = path.extname(finalFileName)
  const basename = path.basename(finalFileName, extension)
  const uniqueFilename = `${basename}-${Date.now()}${extension}`
  const downloadPath = path.join(downloadDir, uniqueFilename)

  await download.saveAs(downloadPath)

  // Wait for the file to be fully written to the disk
  await waitForFile({ filePath: downloadPath, timeout })

  return downloadPath
}

type WaitFileOptions = {
  timeout?: number
  interval?: number
  /**
   * Controls logging behavior.
   * - If `true`, logs a default message to the console.
   * - If a `string`, logs that custom message.
   * - If `false` or `undefined`, logging is disabled.
   */
  log?: boolean | string
}

async function waitForFile(
  options: { filePath: string } & WaitFileOptions
): Promise<void> {
  const { filePath, ...waitOptions } = options
  const mergedOptions = {
    timeout: 30000,
    interval: 250,
    log: 'Waiting for file to be available',
    ...waitOptions
  }

  await recurse(
    async () => existsSync(filePath),
    (exists) => exists,
    {
      timeout: mergedOptions.timeout,
      interval: mergedOptions.interval,
      log: mergedOptions.log,
      error: `Timed out waiting for file to exist at: ${filePath}`
    }
  )
}
