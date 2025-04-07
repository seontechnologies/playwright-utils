/** File system utilities for file logging */
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { LogContext } from './context'

// Tracks which files have been written to in the current test run
const writtenFiles = new Set<string>()

/**
 * Tracks which files have been written to in the current test run
 * Returns true if this is the first write to this file in the current run
 */
export function trackFirstWrite(filePath: string): boolean {
  if (writtenFiles.has(filePath)) {
    return false
  }
  writtenFiles.add(filePath)
  return true
}

/** Ensures a directory exists, creating it if necessary */
export function ensureDirectoryExists(directory: string): void {
  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { recursive: true })
    } catch (error) {
      console.error(`Error creating directory: ${directory}`, error)
    }
  }
}

/** Gets current date formatted as YYYY-MM-DD */
export const getFormattedDate = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Creates a file name for test-organized logs */
export const createTestBasedFileName = (
  testName: string | undefined,
  workerIndex: number | string
): string => {
  const safeName = testName
    ? testName.replace(/[^a-zA-Z0-9]/g, '-')
    : 'unnamed-test'

  return `${safeName}-worker-${workerIndex}.log`
}

/** Creates a file path for logs based on test context */
export function createLogFilePath(context: LogContext): string {
  const { config, testFile, testName, options } = context

  // Determine the base output directory for logs
  const outputDir = config.fileLogging?.outputDir || 'playwright-logs'
  ensureDirectoryExists(outputDir)

  // Get date string for daily folders
  const dateString = getFormattedDate()

  // Check if forceConsolidated flag is set in the config
  const forceConsolidated = config.fileLogging?.forceConsolidated === true

  // Determine if we should organize by test
  // If forceConsolidated is true, we'll ignore test context
  const hasTestContext = !forceConsolidated && Boolean(testFile || testName)

  let subDir: string
  let fileName: string

  if (hasTestContext) {
    // Organize by test - use test file/name pattern
    const testFileName = testFile
      ? path.basename(testFile, path.extname(testFile))
      : 'unknown-test-file'

    subDir = path.join(outputDir, dateString, testFileName)

    const workerIndex =
      typeof options?.workerIndex === 'number' ? options.workerIndex : 'unknown'

    fileName = createTestBasedFileName(testName, workerIndex)
  } else {
    // Consolidated logs - use simple pattern
    const defaultFolder = config.fileLogging?.testFolder || 'consolidated'
    subDir = path.join(outputDir, dateString, defaultFolder)
    fileName = 'test-logs.log'
  }

  // Ensure the subdirectory exists
  ensureDirectoryExists(subDir)

  // Return the full path to the log file
  return path.join(subDir, fileName)
}

/** Write content to a file */
export async function writeToFile(
  filePath: string,
  content: string
): Promise<boolean> {
  try {
    await fs.promises.appendFile(filePath, content)
    return true
  } catch (error) {
    console.error(`Error writing to log file: ${filePath}`, error)
    return false
  }
}

/** Create a header for a new log file */
export async function writeLogFileHeader(
  filePath: string,
  context: LogContext
): Promise<boolean> {
  const { testName, testFile } = context
  const isDefaultFolder = !testFile && !testName

  // For default folder logs using the consolidated file, we only want to add the
  // header when the file is first created, not for every test run
  const isFirstWrite = trackFirstWrite(filePath)

  // If this is a regular test log, we always add a header on first write
  // If this is the default consolidated log, only add header on very first write to file
  if (!isFirstWrite) {
    // For consolidated logs in default folder, add a session divider on each new test run
    if (isDefaultFolder) {
      const divider = [
        '',
        '-'.repeat(80),
        `New Test Session Started: ${new Date().toISOString()}`,
        '-'.repeat(80),
        ''
      ].join('\n')

      try {
        await fs.promises.appendFile(filePath, divider)
      } catch (error) {
        console.error(`Error writing to log file: ${filePath}`, error)
        return false
      }
    }
    return true
  }

  // First time writing to this file, add the main header
  const header = [
    '='.repeat(80),
    `Test Log: ${testName || 'Consolidated Test Log'}`,
    `Test File: ${testFile || (isDefaultFolder ? 'Multiple Files' : 'Unknown')}`,
    `Started: ${new Date().toISOString()}`,
    '='.repeat(80),
    ''
  ].join('\n')

  try {
    await fs.promises.writeFile(filePath, header)
    return true
  } catch (error) {
    console.error(`Error writing header to log file: ${filePath}`, error)
    return false
  }
}

/** Write formatted log message to file with proper headers */
export async function writeToLogFile(
  filePath: string,
  message: string,
  context: LogContext
): Promise<boolean> {
  // Ensure directory exists
  const directory = path.dirname(filePath)
  ensureDirectoryExists(directory)

  // Add header on first write to this file
  if (trackFirstWrite(filePath)) {
    const headerSuccess = await writeLogFileHeader(filePath, context)
    if (!headerSuccess) return false

    // Add a newline after the header if the message doesn't start with one
    if (message && !message.startsWith('\n')) {
      try {
        await fs.promises.appendFile(filePath, '\n')
      } catch (error) {
        console.error(`Error writing newline to log file: ${filePath}`, error)
        return false
      }
    }
  }

  // Write the message to the file
  try {
    await fs.promises.appendFile(filePath, message + '\n')
    return true
  } catch (error) {
    console.error(`Error writing to log file: ${filePath}`, error)
    return false
  }
}
