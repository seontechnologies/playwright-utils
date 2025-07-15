import { test, expect } from '@playwright/support/merged-fixtures'
import {
  handleDownload,
  readPDF,
  readCSV,
  readXLSX,
  readZIP
} from 'src/file-utils'
import path from 'node:path'
import { log } from 'src/log'

const DOWNLOAD_DIR = path.join(__dirname, '../downloads')

test.describe('file-utils', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/downloads')
    await expect(page.getByTestId('files-list')).toBeVisible()
  })

  test('should download and read a PDF file', async ({ page }) => {
    const downloadPath = await handleDownload({
      page,
      downloadDir: DOWNLOAD_DIR,
      trigger: () => page.getByTestId('download-button-application/pdf').click()
    })

    const pdfResult = await readPDF({ filePath: downloadPath })

    expect(pdfResult.pagesCount).toBe(1)
    expect(pdfResult.fileName).toContain('.pdf')
    await log.info(pdfResult)
  })

  test('should download and read a CSV file', async ({ page }) => {
    const downloadPath = await handleDownload({
      page,
      downloadDir: DOWNLOAD_DIR,
      trigger: () => page.getByTestId('download-button-text/csv').click()
    })

    const csvResult = await readCSV({ filePath: downloadPath })
    const { data, headers } = csvResult.content
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

    // the data is an array of objects
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    // check that the first item is an object with expected properties
    expect(typeof data[0]).toBe('object')
    expect(data[0]).toHaveProperty('alert_id')

    // can do relaxed checks
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
    // or check a specific cell
    expect(data[1]?.transaction_amount).toContain('USD')
  })

  test('should download and read an XLSX file', async ({ page }) => {
    const downloadPath = await handleDownload({
      page,
      downloadDir: DOWNLOAD_DIR,
      trigger: () =>
        page
          .getByTestId(
            'download-button-application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          )
          .click()
    })

    const xlsxResult = await readXLSX({ filePath: downloadPath })

    // Verify worksheet structure
    expect(xlsxResult.content.worksheets.length).toBeGreaterThan(0)
    const worksheet = xlsxResult.content.worksheets[0]
    expect(worksheet).toBeDefined()
    expect(worksheet).toHaveProperty('name')

    // Make sure we have sheet data
    const sheetData = worksheet?.data
    expect(sheetData).toBeDefined()
    expect(Array.isArray(sheetData)).toBe(true)
    expect(sheetData?.length).toBeGreaterThan(0)

    // use type assertion to handle the first row safely
    const firstRow = sheetData![0] as Record<string, unknown>
    // check first row is an object with expected properties
    expect(typeof firstRow).toBe('object')
    expect(firstRow).toHaveProperty('id')

    // check for basic transaction data structure
    expect(typeof firstRow.transaction_id).toBe('string')
    expect(typeof firstRow.fraud_score).toBe('number')

    // do a specific check
    expect(worksheet?.data[3]?.fraud_score).toBe(0.9)
  })

  test('should download and read a ZIP file', async ({ page }) => {
    const downloadPath = await handleDownload({
      page,
      downloadDir: DOWNLOAD_DIR,
      trigger: () => page.getByTestId('download-button-application/zip').click()
    })

    // First, check basic ZIP structure without extraction
    const zipResult = await readZIP({ filePath: downloadPath })
    expect(Array.isArray(zipResult.content.entries)).toBe(true)
    expect(zipResult.content.entries).toContain(
      'Case_53125_10-19-22_AM/Case_53125_10-19-22_AM_case_data.csv'
    )

    await log.step('Extract specific file from the zip')
    const targetFile =
      'Case_53125_10-19-22_AM/Case_53125_10-19-22_AM_case_data.csv'

    // Extract specific file by providing extractFiles option
    const zipWithExtraction = await readZIP({
      filePath: downloadPath,
      extractFiles: [targetFile]
    })

    // Verify the file was extracted
    expect(zipWithExtraction.content.extractedFiles).toBeDefined()
    const extractedFiles = zipWithExtraction.content.extractedFiles || {}
    expect(Object.keys(extractedFiles)).toContain(targetFile)

    // Type-safe buffer access with proper checks
    const fileBuffer = extractedFiles[targetFile]
    expect(fileBuffer).toBeInstanceOf(Buffer)
    expect(fileBuffer?.length).toBeGreaterThan(0)
  })
})
