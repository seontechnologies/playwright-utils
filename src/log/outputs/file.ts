/** File output handler for logging */
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { LoggingConfig } from '../config'
import { getTestContextInfo, getLoggingConfig } from '../config'
import type { LogLevel } from '../types'

// ANSI color escape sequence regex pattern
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[(?:\d*;)*\d*m/g

const DEFAULT_WORKER_FORMAT = '[W{workerIndex}]'

// Types
type LogOptions = {
  testFile?: string
  testName?: string
  outputDir?: string
  workerIndex?: number
}

type LogContext = {
  config: LoggingConfig
  options: LogOptions
  organizeByTestEnabled: boolean | undefined
  testFile?: string
  testName?: string
  workerIDEnabled: boolean
  workerIDFormat: string
}

// Tracks which files have been written to in the current test run
const writtenFiles = new Set<string>()

/**
 * Tracks which files have been written to in the current test run
 * Returns true if this is the first write to this file in the current run
 */
function trackFirstWrite(filePath: string): boolean {
  if (writtenFiles.has(filePath)) {
    return false
  }
  writtenFiles.add(filePath)
  return true
}

/** Gets the log context for organizing logs */
function getLogContext(options: LogOptions): LogContext {
  const config = getLoggingConfig()
  const testContext = getTestContextInfo()
  const organizeByTestEnabled = config.fileLogging?.organizeByTest === true

  // Create a new options object with test context information
  const enrichedOptions: LogOptions = {
    ...options,
    // Use options values or fallback to test context values
    testFile: options.testFile || testContext?.testFile,
    testName: options.testName || testContext?.testName,
    workerIndex:
      options.workerIndex !== undefined
        ? options.workerIndex
        : testContext?.workerIndex
  }

  // Determine if worker IDs are enabled (default to true unless explicitly disabled)
  const workerIDEnabled = config.workerID?.enabled !== false
  const workerIDFormat = config.workerID?.format || DEFAULT_WORKER_FORMAT

  return {
    config,
    testFile: enrichedOptions.testFile,
    testName: enrichedOptions.testName,
    organizeByTestEnabled,
    options: enrichedOptions,
    workerIDEnabled,
    workerIDFormat
  }
}

/** Format a worker ID based on configuration and context */
function formatWorkerID(context: LogContext): string | null {
  const { workerIDEnabled, workerIDFormat, options } = context

  // If worker IDs are disabled, return null
  if (!workerIDEnabled) {
    return null
  }

  // Get the worker index from the options or use a default
  const workerIndex =
    typeof options.workerIndex === 'number' ? options.workerIndex : 0

  // Replace {workerIndex} with the actual worker index
  return workerIDFormat.replace('{workerIndex}', String(workerIndex))
}

/** Ensures a directory exists, creating it if necessary */
function ensureDirectoryExists(directory: string): void {
  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { recursive: true })
    } catch (error) {
      console.error(`Error creating directory: ${directory}`, error)
    }
  }
}

/** Gets current date formatted as YYYY-MM-DD */
const getFormattedDate = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Creates a file name for test-organized logs */
const createTestBasedFileName = (
  testName: string | undefined,
  workerIndex: number | string
): string => {
  const safeName = testName
    ? testName.replace(/[^a-zA-Z0-9]/g, '-')
    : 'unnamed-test'

  return `${safeName}-worker-${workerIndex}.log`
}

/** Creates a file path for logs based on test context */
function createLogFilePath(context: LogContext): string {
  const { config, testFile, testName, organizeByTestEnabled, options } = context

  // Determine the base output directory for logs
  const outputDir = config.fileLogging?.outputDir || 'playwright-logs'
  ensureDirectoryExists(outputDir)

  // Get date string for daily folders
  const dateString = getFormattedDate()

  // Determine if we should organize by test
  const shouldOrganizeByTest = organizeByTestEnabled === true
  const hasTestContext = Boolean(testFile || testName)

  let subDir: string
  let fileName: string

  if (shouldOrganizeByTest && hasTestContext) {
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

/** Create a header for a new log file */
const stripAnsiCodes = (str: string): string => str.replace(ANSI_REGEX, '')

/** Create a header for a new log file */
async function writeLogFileHeader(
  filePath: string,
  context: LogContext
): Promise<boolean> {
  const { testName, testFile } = context
  const isDefaultFolder =
    !context.organizeByTestEnabled || (!testFile && !testName)

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

/**
 * Format a log message with timestamp, worker ID, etc.
 */
function formatLogMessage(message: string, context: LogContext): string {
  const { testName, testFile, organizeByTestEnabled } = context

  // Get formatted timestamp (HH:MM:SS)
  const timestamp =
    new Date().toISOString().split('T')[1]?.substring(0, 8) || ''

  // Start building the formatted log entry
  let formattedMessage = `[${timestamp}]`

  // Add worker ID if available
  const workerID = formatWorkerID(context)
  if (workerID) {
    formattedMessage += ` ${workerID}`

    // We used to have debug output for worker ID here, but it's been removed to reduce noise
  }

  // Add test name and file to the log entry if we have them
  if (testName && organizeByTestEnabled) {
    formattedMessage += ` [${testName}]`
  }

  // For default folder logs, ALWAYS include test file information if available
  if (!organizeByTestEnabled && testFile) {
    // Extract just the filename from the full path
    const shortFileName = path.basename(testFile)
    formattedMessage += ` [File: ${shortFileName}]`
  }

  // Add the message content - worker ID is already included in the prefix,
  // so we don't need to add it again to the message content
  formattedMessage += ` ${message}`

  return formattedMessage
}

/**
 * Log a message to a file with smart path organization using test context
 *
 * @param message - The message to log
 * @param level - The log level
 * @param options - Optional configuration including test file and name
 * @returns Promise resolving to true if log was successful
 */
export async function logToFile(
  message: string,
  _level: LogLevel = 'info',
  options: LogOptions = {}
): Promise<boolean> {
  // Skip file logging if not enabled
  if (!getLoggingConfig().fileLogging?.enabled) {
    return false
  }

  // Get context with configuration and test information
  const context = getLogContext(options)

  // We used to have debug output for test context here, but it's been removed to reduce noise

  // Create the log file path based on context
  const filePath = createLogFilePath(context)

  // Remove ANSI color codes for file logging
  const cleanMessage = stripAnsiCodes(message)

  // Add header on first write to this file
  if (trackFirstWrite(filePath)) {
    const headerSuccess = await writeLogFileHeader(filePath, context)
    if (!headerSuccess) return false

    // Add a newline after the header if the message doesn't start with one
    if (cleanMessage && !cleanMessage.startsWith('\n')) {
      try {
        await fs.promises.appendFile(filePath, '\n')
      } catch (error) {
        console.error(`Error writing newline to log file: ${filePath}`, error)
        return false
      }
    }
  }

  // Format the message with timestamp, worker ID, etc.
  const formattedMessage = formatLogMessage(message, context)

  // Write the message to the file
  try {
    await fs.promises.appendFile(filePath, formattedMessage + '\n')
    return true
  } catch (error) {
    console.error(`Error writing to log file: ${filePath}`, error)
    return false
  }
}
