import { test, expect } from '@playwright/support/merged-fixtures'
import fs from 'node:fs/promises'
import { parse } from 'papaparse'

test.describe('file-utils - Vanilla Playwright Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/downloads')
    await expect(page.getByTestId('files-list')).toBeVisible()
  })

  test('should download and read a CSV file - VANILLA PLAYWRIGHT', async ({
    page
  }, testInfo) => {
    // ❌ BOILERPLATE: Orchestrate download event and trigger action
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('download-button-CSV Export').click()
    ])

    // ❌ BOILERPLATE: Verify download status
    const failure = await download.failure()
    expect(failure).toBeNull()

    // ❌ BOILERPLATE: Choose a file path and save the download
    const filePath = testInfo.outputPath(download.suggestedFilename())
    await download.saveAs(filePath)

    // ❌ BOILERPLATE: Check file existence on disk
    await expect
      .poll(
        async () => {
          try {
            await fs.access(filePath)
            return true
          } catch {
            return false
          }
        },
        {
          timeout: 5000,
          intervals: [100, 200, 500]
        }
      )
      .toBe(true)

    // ❌ BOILERPLATE: Manual CSV reading with error handling
    let csvContent: string
    try {
      csvContent = await fs.readFile(filePath, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to read CSV file: ${error}`, { cause: error })
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

    // ❌ BOILERPLATE: Manual data extraction and type checking (explicit typing)
    const data = parseResult.data as Array<Record<string, unknown>>
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
 ❌ Manual download event handling (Promise.all around click + waitForEvent)
 ❌ Manual per-test output path via testInfo.outputPath (parallel-safe)
 ❌ Manual file saving and verification (download.saveAs + download.failure)
 ❌ Manual file existence check with expect.poll (no hard waits)
 ❌ Manual error handling for file I/O
 ❌ Manual CSV parsing setup with Papa Parse
 ❌ Manual data transformation and validation
 Note: This vanilla version avoids race conditions (Promise.all) and hard waits (expect.poll), and uses per-test output paths for parallel safety — but the steps remain manual.
 
 OUR FILE-UTILS UTILITY (~10 lines):
 ✅ const downloadPath = await handleDownload({ page, downloadDir, trigger })
 ✅ const csvResult = await readCSV({ filePath: downloadPath })
 ✅ const { data, headers } = csvResult.content
 ✅ Automatic cleanup and error handling
 ✅ Consistent API across all file types
 
 The vanilla approach requires ~8x more boilerplate just for basic CSV download/read!
 */
