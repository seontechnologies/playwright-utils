/** File output handler for logging */
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { LoggingConfig } from '../config'
import {
  getTestContextInfo,
  getLoggingConfig,
  getTestNameFromFilePath
} from '../config'
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
  const { config, testFile, testName, options } = context

  // Determine the base output directory for logs
  const outputDir = config.fileLogging?.outputDir || 'playwright-logs'
  ensureDirectoryExists(outputDir)

  // Get date string for daily folders
  const dateString = getFormattedDate()

  // Determine if we should organize by test
  const hasTestContext = Boolean(testFile || testName)

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

/** Create a header for a new log file */
const stripAnsiCodes = (str: string): string => str.replace(ANSI_REGEX, '')

/** Create a header for a new log file */
async function writeLogFileHeader(
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

/**
 * Get a formatted timestamp for logging
 */
function getLogTimestamp(): string {
  const timestamp =
    new Date().toISOString().split('T')[1]?.substring(0, 8) || ''
  return `[${timestamp}]`
}

/**
 * Format a log message with timestamp, worker ID, etc.
 */
function formatLogMessage(message: string, context: LogContext): string {
  const { testName, testFile } = context

  // Check if the message already has a timestamp
  const timestampRegex = /^\[(\d{2}:\d{2}:\d{2})\]/
  const hasTimestamp = timestampRegex.test(message)

  // Start building the formatted log message
  let formattedMessage = hasTimestamp ? '' : getLogTimestamp()

  // Add worker ID if enabled
  const workerID = formatWorkerID(context)
  if (workerID) {
    formattedMessage += formattedMessage ? ` ${workerID}` : workerID
  }

  // Check if this is organized by test (each test has its own log file)
  const isOrganizedByTest =
    context.config.fileLogging?.enabled &&
    typeof context.config.fileLogging?.testFolder === 'string' &&
    context.config.fileLogging?.testFolder.length > 0

  // Only add test name and file info for non-organized logs
  // This prevents redundancy in test-specific log files
  if (!isOrganizedByTest) {
    // Add test name if available
    if (testName) {
      formattedMessage += formattedMessage ? ` [${testName}]` : `[${testName}]`
    }

    // Add file info if available
    if (testFile) {
      const shortFileName = path.basename(testFile)
      formattedMessage += formattedMessage
        ? ` [File: ${shortFileName}]`
        : `[File: ${shortFileName}]`
    }
  }

  // Process the message to avoid duplicating information
  let cleanMessage = message
  if (hasTimestamp) {
    // If message already has timestamp, remove it
    cleanMessage = message.replace(timestampRegex, '')

    // Also check for and remove worker ID to avoid duplication
    const workerRegex = /\[W\d+\]/
    cleanMessage = cleanMessage.replace(workerRegex, '')

    // Clean up extra spaces
    cleanMessage = cleanMessage.trim()
  }

  // Add the message with proper spacing
  return formattedMessage ? `${formattedMessage} ${cleanMessage}` : cleanMessage
}

/**
 * Track the last test details to add headers for consolidated logs
 */
type TestTracker = {
  lastTestName: string
  lastTestFile: string
  lastInferredFile: string
  lastInferredTestName: string
}

/**
 * Track test headers to avoid repeating the same headers
 */
const testHeaderTracker: TestTracker = {
  // Track previous test and file to avoid repeated headers for the same test
  lastTestName: '',
  lastTestFile: '',
  lastInferredFile: '',
  lastInferredTestName: ''
}

/**
 * Extract test information from a log message
 */
function extractTestInfoFromMessage(message: string): {
  testName?: string
  testFile?: string
} {
  // Extract test info from formatted messages like [TestName] [File: filename.spec.ts]
  const testInfoPattern = /\[([^\]]+)\]\s*\[File:\s*([^\]]+)\]/
  const testNameMatch = message.match(testInfoPattern)

  if (testNameMatch && testNameMatch.length >= 3) {
    return {
      testName: testNameMatch[1]?.trim(),
      testFile: testNameMatch[2]?.trim()
    }
  }

  return {}
}

/**
 * Populate the test options with context information
 */
function populateTestOptions(options: LogOptions): {
  testFile: string | undefined
  hasTestContext: boolean
} {
  // Get the test context - this will provide better info for logs
  const testContext = getTestContextInfo()
  let hasTestContext = false

  // Add the actual test name from test context if available
  if (!options.testName && testContext.testName) {
    options.testName = testContext.testName
    hasTestContext = true
  } else if (!options.testName && options.testFile) {
    // Use the file name as a fallback
    options.testName = getTestNameFromFilePath(options.testFile)
  }

  // Get the test file if available
  const testFile = options.testFile || testContext.testFile

  return { testFile, hasTestContext }
}

/**
 * Process section headers to extract meaningful test info
 */
function processSectionHeaders(
  message: string,
  isConsolidatedLog: boolean
): {
  sectionTitle?: string
  inferredFile?: string
} {
  if (!message.includes('==== ')) {
    return {}
  }

  // Only extract section info for consolidated logs
  if (isConsolidatedLog) {
    return getSectionInfo(message) || {}
  }

  return {}
}

/**
 * Update test header tracker with latest test information
 */
function updateTestHeaderTracker(
  testName: string,
  testFile: string | undefined,
  inferredFile?: string,
  inferredTestName?: string
): void {
  testHeaderTracker.lastTestName = testName
  testHeaderTracker.lastTestFile = testFile || ''

  if (inferredFile) {
    testHeaderTracker.lastInferredFile = inferredFile
  }

  if (inferredTestName) {
    testHeaderTracker.lastInferredTestName = inferredTestName
  }
}

/**
 * Format section header for consolidated logs
 */
function formatSectionHeader(testName: string, fileName: string): string {
  return `\n${'='.repeat(30)} ${testName} - ${fileName} ${'='.repeat(30)}\n\n`
}

/**
 * Add test header to message when needed
 *
 * This function handles two different log modes:
 * 1. Test-organized logs (each test has its own file)
 * 2. Consolidated logs (all tests in one file)
 */
function addTestHeader(
  message: string,
  options: LogOptions,
  testFile?: string
): {
  message: string
  testFile: string | undefined
} {
  // Get the detected test file
  const detectedTestFile = testFile

  // Try to extract test info from log message if not provided
  const updatedTestFile = extractTestInfoIfNeeded(
    message,
    options,
    detectedTestFile
  )

  // Use safe values with fallbacks
  const safeTestFile = updatedTestFile ?? detectedTestFile ?? ''
  const newTest = options.testName !== testHeaderTracker.lastTestName
  const newFile = safeTestFile !== testHeaderTracker.lastTestFile

  // Check if this is a default folder consolidated log
  const isConsolidatedLog = !options.testFile && !testFile

  // Extract section info from message for consolidated logs
  const sectionInfo = processSectionHeaders(message, isConsolidatedLog) as {
    sectionTitle?: string
    inferredFile?: string
    testName?: string
  }

  // Skip header if not needed
  if (!(newTest || newFile) || !message.includes('==== ')) {
    return { message, testFile: detectedTestFile }
  }

  // Get section data for header formatting
  return formatTestHeader(
    message,
    options,
    isConsolidatedLog,
    sectionInfo,
    safeTestFile,
    detectedTestFile
  )
}

/**
 * Format test header and return the updated message
 */
function formatTestHeader(
  message: string,
  options: LogOptions,
  isConsolidatedLog: boolean,
  sectionInfo: {
    sectionTitle?: string
    inferredFile?: string
    testName?: string
  },
  safeTestFile: string,
  detectedTestFile: string | undefined
): {
  message: string
  testFile: string | undefined
} {
  const { sectionTitle } = sectionInfo

  // For test name, prioritize in this order:
  // 1. Inferred test name from section (if in consolidated logs)
  // 2. Actual test name from context (if available)
  // 3. Section title as fallback (for nested sections)
  // 4. 'Unknown Test' as last resort
  const inferredTestName =
    sectionInfo?.testName || testHeaderTracker.lastInferredTestName
  const safeTestName =
    isConsolidatedLog && inferredTestName
      ? inferredTestName
      : options.testName || (sectionTitle ? sectionTitle : 'Unknown Test')

  // Get appropriate file name for display
  const safeFileName = safeTestFile
    ? path.basename(safeTestFile)
    : 'Unknown File'

  // Use inferred file name if available (for better log readability)
  // For display purposes, prioritize stored inferred file name for consistency
  const displayFileName =
    sectionInfo?.inferredFile ||
    testHeaderTracker.lastInferredFile ||
    safeFileName

  // Create a nicely formatted header for new test sections
  if (isConsolidatedLog) {
    const header = formatSectionHeader(safeTestName, displayFileName)
    message = `${header}${message}`
  }

  // Update the tracker
  updateTestHeaderTracker(
    options.testName || '',
    safeTestFile,
    sectionInfo?.inferredFile,
    sectionInfo?.testName
  )

  return { message, testFile: detectedTestFile }
}

/**
 * Get section title and create inferred file name and test name from message
 */
function getSectionInfo(
  message: string
): { title: string; inferredFile?: string; testName?: string } | undefined {
  if (message.includes('==== ')) {
    const sectionMatch = message.match(/====\s+(.+?)\s+====/)
    if (sectionMatch && sectionMatch[1]) {
      const title = sectionMatch[1].trim()

      // For todo app and common test patterns, use a standardized file name
      // This ensures consistent headers across all section titles
      const inferredFile =
        testHeaderTracker.lastInferredFile || 'todo-app-organized-log.spec.ts'

      // Keep track of the inferred file name for consistent headers
      if (!testHeaderTracker.lastInferredFile) {
        testHeaderTracker.lastInferredFile = inferredFile
      }

      // Infer test name based on section patterns
      // For todo app, we know the test name should be about adding todo items
      let testName: string | undefined

      if (title.toLowerCase().includes('todo')) {
        testName = 'should allow me to add todo items'
      } else if (title.startsWith('Add') || title.startsWith('Create')) {
        testName = `should allow me to ${title.toLowerCase()}`
      } else if (title.startsWith('Test') || title.startsWith('Testing')) {
        testName = title
      } else if (title.startsWith('Navigate')) {
        testName = 'Navigation Test'
      } else if (title.startsWith('Check') || title.startsWith('Verify')) {
        testName = `should ${title.toLowerCase()}`
      }

      return { title, inferredFile, testName }
    }
  }
  return undefined
}

/**
 * Extract test info from message and update options if needed
 */
function extractTestInfoIfNeeded(
  message: string,
  options: LogOptions,
  detectedFile?: string
): string | undefined {
  if (!options.testName || options.testName === 'Unknown Test') {
    const extractedInfo = extractTestInfoFromMessage(message)

    // Use extracted test name if found
    if (extractedInfo.testName) {
      options.testName = extractedInfo.testName

      // Use extracted file name if we don't have one
      if (!options.testFile && extractedInfo.testFile) {
        options.testFile = extractedInfo.testFile
        return options.testFile
      }
    }
  }

  return detectedFile
}

async function writeToLogFile(
  filePath: string,
  message: string,
  context: LogContext
): Promise<boolean> {
  // Clean the message for file logging
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
  const formattedMessage = formatLogMessage(cleanMessage, context)

  // Write the message to the file
  try {
    await fs.promises.appendFile(filePath, formattedMessage + '\n')
    return true
  } catch (error) {
    console.error(`Error writing to log file: ${filePath}`, error)
    return false
  }
}

/**
 * Log a message to a file
 * @param message - The message to log
 * @param _level - The log level
 * @param options - Optional configuration including test file and name
 * @returns Promise resolving to true if log was successful
 */
export async function logToFile(
  message: string,
  _level: LogLevel = 'info',
  options: LogOptions = {}
): Promise<boolean> {
  // Strip ANSI color codes from message
  message = stripAnsiCodes(message)

  // Get and populate test context information
  const { testFile } = populateTestOptions(options)

  // Add test headers when needed
  const { message: updatedMessage } = addTestHeader(message, options, testFile)

  // Skip file logging if not enabled
  const config = getLoggingConfig()
  if (!config.fileLogging?.enabled) {
    return false
  }

  // Get context with configuration and test information
  const context = getLogContext(options)

  // Create the log file path based on context - this determines folder structure
  // IMPORTANT: We're intentionally using the original options here, not extracting from section headers
  // to avoid creating folders for each section in a test
  const filePath = createLogFilePath(context)

  // Write to the log file
  return writeToLogFile(filePath, updatedMessage, context)
}
