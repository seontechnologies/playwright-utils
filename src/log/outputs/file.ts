/**
 * File output handler for logging
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { getTestContextInfo, getLoggingConfig, LoggingConfig } from '../config'

// ANSI color escape sequence regex pattern
const ANSI_REGEX = /\u001b\[(?:\d*;)*\d*m/g

// Constants
const PATH_SAFE_REGEX = /[^a-zA-Z0-9-_]/g
const DEFAULT_LOG_DIR = 'playwright-logs'
const DEFAULT_TEST_FOLDER = 'default-test-folder'
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

/**
 * Gets the log context for organizing logs
 */
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

/**
 * Format a worker ID based on configuration and context
 */
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

/**
 * Create a file path for logs based on test context
 */
function createLogFilePath(context: LogContext): string {
  const { config, testFile, testName, organizeByTestEnabled, options } = context

  // Determine the base output directory for logs
  let outputDir = config.fileLogging?.outputDir
  if (!outputDir) {
    outputDir = 'playwright-logs'
  }

  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Get the current date for daily log folders
  const date = new Date()
  const dateString = `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  // Determine the subdirectory based on context
  let subDir: string
  let fileName: string

  // When organizeByTest is enabled, we'll try to use test file/name from context if available
  // Otherwise, we'll use consolidated logging
  const shouldOrganizeByTest = organizeByTestEnabled === true
  const hasTestContext = Boolean(testFile || testName)

  if (shouldOrganizeByTest && hasTestContext) {
    // Get the test file name without extension if available
    let testFileName = 'unknown-test-file'
    if (testFile) {
      testFileName = path.basename(testFile, path.extname(testFile))
    }

    // Create folder and file name based on test context
    subDir = path.join(outputDir, dateString, testFileName)

    // Use test name for file name if available, otherwise use a default prefix
    fileName = testName
      ? testName.replace(/[^a-zA-Z0-9]/g, '-')
      : 'unnamed-test'

    // Add worker index if enabled and available
    const workerIndex =
      typeof options?.workerIndex === 'number' ? options.workerIndex : 'unknown'

    fileName = `${fileName}-worker-${workerIndex}.log`
  } else {
    // Default to a consolidated file if not organizing by test or no test context available
    const defaultFolder = config.fileLogging?.testFolder || 'consolidated'
    subDir = path.join(outputDir, dateString, defaultFolder)

    // For the consolidated log file, don't include worker index in the name
    // unless it's explicitly provided
    if (typeof options?.workerIndex === 'number') {
      fileName = `worker-${options.workerIndex}.log`
    } else {
      // Just use a simple consolidated file name without worker index
      fileName = 'consolidated.log'
    }
  }

  // Ensure the subdirectory exists
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true })
  }

  // Return the full path to the log file
  return path.join(subDir, fileName)
}

/**
 * Create a header for a new log file
 * Strip ANSI color codes from a string
 */
function stripAnsiCodes(str: string): string {
  return str.replace(ANSI_REGEX, '')
}

/**
 * Create a header for a new log file
 */
async function writeLogFileHeader(
  filePath: string,
  context: LogContext
): Promise<void> {
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

      await fs.promises.appendFile(filePath, divider)
    }
    return
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

  await fs.promises.appendFile(filePath, header)
}

/**
 * Format a log message with timestamp, worker ID, etc.
 */
function formatLogMessage(message: string, context: LogContext): string {
  const { testName, testFile, organizeByTestEnabled, options } = context

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
 * @param options - Optional configuration including test file and name
 */
export const logToFile = async (
  message: string,
  options: LogOptions = {}
): Promise<void> => {
  // Get context with configuration and test information
  const context = getLogContext(options)

  // We used to have debug output for test context here, but it's been removed to reduce noise

  // Create the log file path based on context
  const logFilePath = createLogFilePath(context)

  // Write header if this is a new file
  await writeLogFileHeader(logFilePath, context)

  // Format the message with timestamp, worker ID, etc.
  const formattedMessage = formatLogMessage(message, context)

  // Strip ANSI color codes and write the message to the file
  const cleanMessage = stripAnsiCodes(formattedMessage)
  await fs.promises.appendFile(logFilePath, cleanMessage + '\n')
}
