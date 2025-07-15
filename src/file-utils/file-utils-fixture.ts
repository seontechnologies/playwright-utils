import { test as base } from '@playwright/test'
import { waitForFile } from './core/file-waiter'
import * as csvReader from './core/csv-reader'
import * as xlsxReader from './core/xlsx-reader'
import * as pdfReader from './core/pdf-reader'
import * as zipReader from './core/zip-reader'

// Combine all file utility functions into a single type for the fixture
type FileUtils = typeof csvReader &
  typeof xlsxReader &
  typeof pdfReader &
  typeof zipReader & {
    waitForFile: typeof waitForFile
  }

// Define the fixture type that will be added to Playwright's test object
type FileUtilsFixtures = {
  fileUtils: FileUtils
}

export const test = base.extend<FileUtilsFixtures>({
  fileUtils: async ({}, use) => {
    // Assemble the complete fileUtils object
    const fileUtils: FileUtils = {
      ...csvReader,
      ...xlsxReader,
      ...pdfReader,
      ...zipReader,
      waitForFile
    }

    // Provide the assembled object to the test
    await use(fileUtils)
  }
})
