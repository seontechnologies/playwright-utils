import { test, expect } from '@playwright/support/merged-fixtures'
import path from 'node:path'
import fs from 'node:fs/promises'
import { parse } from 'papaparse'

const DOWNLOAD_DIR = path.join(__dirname, '../downloads-vanilla')

test.describe('file-utils - Vanilla Playwright Comparison', () => {
  test.beforeEach(async ({ page }) => {
    // ❌ BOILERPLATE: Manual setup - ensure download directory exists
    try {
      await fs.mkdir(DOWNLOAD_DIR, { recursive: true })
    } catch {
      // Directory might already exist, ignore error
    }

    await page.goto('/downloads')
    await expect(page.getByTestId('files-list')).toBeVisible()
  })

  test.afterEach(async () => {
    // ❌ BOILERPLATE: Manual cleanup - remove downloaded files
    try {
      const files = await fs.readdir(DOWNLOAD_DIR)
      await Promise.all(
        files.map((file) => fs.unlink(path.join(DOWNLOAD_DIR, file)))
      )
    } catch {
      // Ignore cleanup errors
    }
  })

  test('should download and read a CSV file - VANILLA PLAYWRIGHT', async ({
    page
  }) => {
    // ❌ BOILERPLATE: Manual download handling with event listeners and promises
    let downloadPath = ''
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('download-button-CSV Export').click()
    const download = await downloadPromise

    // ❌ BOILERPLATE: Manual path construction and file saving
    const fileName = download.suggestedFilename()
    downloadPath = path.join(DOWNLOAD_DIR, fileName)
    await download.saveAs(downloadPath)

    // ❌ BOILERPLATE: Manual file existence verification
    let fileExists = false
    let attempts = 0
    const maxAttempts = 10

    while (!fileExists && attempts < maxAttempts) {
      try {
        await fs.access(downloadPath)
        fileExists = true
      } catch {
        attempts++
        await page.waitForTimeout(100) // Wait and retry
      }
    }

    if (!fileExists) {
      throw new Error(`File was not downloaded successfully: ${downloadPath}`)
    }

    // ❌ BOILERPLATE: Manual CSV reading with error handling
    let csvContent = ''
    try {
      csvContent = await fs.readFile(downloadPath, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to read CSV file: ${error}`)
    }

    // ❌ BOILERPLATE: Manual CSV parsing with Papa Parse configuration
    // Note: Must manually configure dynamicTyping to match our utility's behavior
    const parseResult = parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // ❌ BOILERPLATE: Must remember to add this for null handling
      transformHeader: (header: string) => header.trim()
    })

    if (parseResult.errors.length > 0) {
      throw new Error(
        `CSV parsing errors: ${JSON.stringify(parseResult.errors)}`
      )
    }

    // ❌ BOILERPLATE: Manual data extraction and type checking
    const data = parseResult.data as Record<string, string>[]
    const headers = parseResult.meta.fields || []

    // Finally, the actual test assertions (same as our utility version)
    expect(headers).toEqual([
      'alert_id',
      'alert_trigger_name',
      'trigger_deleted_at',
      'alert_created_at',
      'alert_deadline_time',
      'alert_status',
      'alert_assignee',
      'transaction_id',
      'transaction_amount'
    ])

    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    expect(typeof data[0]).toBe('object')
    expect(data[0]).toHaveProperty('alert_id')

    // Finally, the actual test assertions (same as our utility version)
    expect(data[0]).toMatchObject({
      alert_id: expect.stringMatching(/^[A-Za-z0-9]+$/),
      alert_assignee: null,
      alert_deadline_time: null,
      alert_status: 'open',
      alert_trigger_name: 'default_test_trigger_01',
      transaction_amount: expect.stringContaining('USD'),
      transaction_id: expect.any(String),
      trigger_deleted_at: null
    })

    expect(data[1]?.transaction_amount).toContain('USD')
  })
})

/*
🎯 COMPARISON SUMMARY:

VANILLA PLAYWRIGHT (~80 lines):
❌ Manual download event handling
❌ Manual file path construction  
❌ Manual file saving and verification
❌ Manual retry logic for file existence
❌ Manual error handling for file operations
❌ Manual CSV parsing setup with Papa Parse
❌ Manual data transformation and validation
❌ Manual cleanup in afterEach hook

OUR FILE-UTILS UTILITY (~10 lines):
✅ const downloadPath = await handleDownload({ page, downloadDir, trigger })
✅ const csvResult = await readCSV({ filePath: downloadPath })
✅ const { data, headers } = csvResult.content
✅ Automatic cleanup and error handling
✅ Consistent API across all file types

The vanilla approach requires ~8x more boilerplate just for basic CSV download/read!
*/
