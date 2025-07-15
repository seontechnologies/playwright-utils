import { test, expect } from '@playwright/support/merged-fixtures'
import path from 'node:path'
import { log } from 'src/log'

const DOWNLOAD_DIR = path.join(__dirname, '../downloads')

test.describe('file-utils using fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/downloads')
    await expect(page.getByTestId('files-list')).toBeVisible()
  })

  test('should download and read a PDF file with fixture', async ({
    page,
    handleDownload,
    readPDF
  }) => {
    // Using fixture version of handleDownload - notice page is not needed
    const downloadPath = await handleDownload({
      downloadDir: DOWNLOAD_DIR,
      trigger: () => page.getByTestId('download-button-application/pdf').click()
    })

    // doesn't add much value, but shows how to use the fixture
    const pdfResult = await readPDF({ filePath: downloadPath })

    expect(pdfResult.pagesCount).toBe(1)
    expect(pdfResult.fileName).toContain('.pdf')
    await log.info(pdfResult)
  })

  test('should download and read a CSV file with fixture', async ({
    page,
    handleDownload,
    readCSV
  }) => {
    const downloadPath = await handleDownload({
      downloadDir: DOWNLOAD_DIR,
      trigger: () => page.getByTestId('download-button-text/csv').click()
    })

    const csvResult = await readCSV({ filePath: downloadPath })
    const { data } = csvResult.content
    // or check a specific cell
    expect(data[1]?.transaction_amount).toContain('USD')
  })
})
