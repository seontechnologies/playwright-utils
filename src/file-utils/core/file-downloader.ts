import type { Page } from '@playwright/test'
import path from 'node:path'
import { recurse } from '../../recurse'
import type { WaitFileOptions } from './types'
import { existsSync } from 'node:fs'

export type DownloadOptions = {
  page: Page
  /** 
   * The directory where the file will be saved.
   * If not provided, defaults to a 'downloads' directory in the same directory as the calling test.
   */
  downloadDir?: string
  /** A function that triggers the download action. */
  trigger: () => Promise<void>
  /** Optional: A specific filename to save the file as. If not provided, a unique name is generated. */
  fileName?: string
  /** Optional: Timeout for waiting for the download event. Defaults to 30 seconds. */
  timeout?: number
  /** Optional: Clean up the downloaded file after test completion. Defaults to false. */
  cleanupAfterTest?: boolean
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

const DEFAULT_OPTIONS: Required<WaitFileOptions> = {
  timeout: 30000, // 30 seconds
  interval: 250, // 250ms
  log: 'Waiting for file to be available'
}

async function waitForFile(
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
