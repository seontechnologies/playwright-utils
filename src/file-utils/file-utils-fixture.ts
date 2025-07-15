import { test as base } from '@playwright/test'
import { handleDownload } from './core/file-downloader'
import * as csvReader from './core/csv-reader'
import * as xlsxReader from './core/xlsx-reader'
import * as pdfReader from './core/pdf-reader'
import * as zipReader from './core/zip-reader'

type AutoHandleDownload = (
  options: Omit<Parameters<typeof handleDownload>[0], 'page'>
) => ReturnType<typeof handleDownload>

type FileUtilsFixtures = {
  handleDownload: AutoHandleDownload
  readCSV: typeof csvReader.readCSV
  readXLSX: typeof xlsxReader.readXLSX
  readPDF: typeof pdfReader.readPDF
  readZIP: typeof zipReader.readZIP
}

export const test = base.extend<FileUtilsFixtures>({
  // File Downloader (with automatic page injection)
  handleDownload: async ({ page }, use) => {
    // Create a wrapped version that auto-injects the page parameter
    const wrappedHandleDownload: AutoHandleDownload = (options) => {
      return handleDownload({ ...options, page })
    }
    await use(wrappedHandleDownload)
  },

  readCSV: async ({}, use) => {
    await use(csvReader.readCSV)
  },

  readXLSX: async ({}, use) => {
    await use(xlsxReader.readXLSX)
  },

  readPDF: async ({}, use) => {
    await use(pdfReader.readPDF)
  },

  readZIP: async ({}, use) => {
    await use(zipReader.readZIP)
  }
})
