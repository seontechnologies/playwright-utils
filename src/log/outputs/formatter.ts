/** Message formatting and header management for logging */
import * as path from 'node:path'
import * as fs from 'node:fs'
import type { LogContext } from './context'
import type { LoggingConfig } from '../types'
import { testHeaderTracker, extractTestInfoIfNeeded } from './context'
import { trackFirstWrite } from './file-utils'

// ANSI color escape sequence regex pattern
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[(?:\d*;)*\d*m/g

/** Strip ANSI color codes from a string */
export const stripAnsiCodes = (str: string): string =>
  str.replace(ANSI_REGEX, '')

/** Get a formatted timestamp for logging */
function getLogTimestamp(): string {
  const timestamp =
    new Date().toISOString().split('T')[1]?.substring(0, 8) || ''
  return `[${timestamp}]`
}

/** Format a worker ID based on configuration and context */
function formatWorkerID(context: LogContext): string | null {
  const { workerIDEnabled, workerIDFormat, options } = context

  // If worker IDs are disabled, return null
  if (!workerIDEnabled) {
    return null
  }

  // Get the worker index from the options or use a default
  // In LogContext, options may include workerIndex from LoggingContextOptions
  const logContextOptions = options as { workerIndex?: number }
  const workerIndex =
    typeof logContextOptions.workerIndex === 'number'
      ? logContextOptions.workerIndex
      : 0

  // Replace {workerIndex} with the actual worker index
  return workerIDFormat.replace('{workerIndex}', String(workerIndex))
}

/** Format a log message with timestamp, worker ID, etc. */
export function formatLogMessage(message: string, context: LogContext): string {
  const { testName, testFile } = context

  // First, extract any existing timestamp and worker ID from the message
  // Define regex patterns
  const timestampRegex = /\[(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\]/g
  const workerRegex = /\[W(\d+)\]/g

  // Clean the message by removing all timestamps and worker IDs
  let cleanMessage = message

  // Extract the first worker ID if it exists (to preserve it)
  const workerMatch = workerRegex.exec(cleanMessage)
  const extractedWorkerIndex = workerMatch ? workerMatch[1] : null

  // Remove all worker IDs from the message
  cleanMessage = cleanMessage.replace(workerRegex, '')

  // Remove all timestamps from the message
  cleanMessage = cleanMessage.replace(timestampRegex, '')

  // Clean up extra spaces and trim
  cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim()

  // Build the formatted message with only one set of metadata
  let formattedMessage = getLogTimestamp()

  // Add worker ID - use extracted one if found, otherwise from context
  if (extractedWorkerIndex) {
    formattedMessage += ` [W${extractedWorkerIndex}]`
  } else {
    const workerID = formatWorkerID(context)
    if (workerID) {
      formattedMessage += ` ${workerID}`
    }
  }

  // Check if this is organized by test (each test has its own log file)
  const fileLoggingObj = context.config.fileLogging
  const isEnabled =
    typeof fileLoggingObj === 'boolean'
      ? fileLoggingObj
      : typeof fileLoggingObj === 'object' && fileLoggingObj?.enabled !== false

  const isForceConsolidated =
    typeof fileLoggingObj === 'object' &&
    fileLoggingObj?.forceConsolidated === true

  const isAllTestsInOne =
    typeof fileLoggingObj === 'object' &&
    fileLoggingObj?.testFolder === 'all-tests-in-one'

  const isOrganizedByTest =
    isEnabled && !isForceConsolidated && !isAllTestsInOne

  // Only add test name and file info for consolidated logs
  // Skip redundant info for organized logs since it's already in the folder/filename
  if (!isOrganizedByTest) {
    // Add test name if available
    if (testName) {
      formattedMessage += ` [${testName}]`
    }

    // Add file info if available
    if (testFile) {
      const shortFileName = path.basename(testFile)
      formattedMessage += ` [File: ${shortFileName}]`
    }
  }

  // Combine formatted prefix with cleaned message
  return `${formattedMessage} ${cleanMessage}`
}

/** Format section header for consolidated logs */
export function formatSectionHeader(
  testName: string,
  fileName: string
): string {
  return `\n${'='.repeat(30)} ${testName} - ${fileName} ${'='.repeat(30)}\n\n`
}

function updateTestHeaderTracker(
  testName: string,
  testFile: string | undefined,
  inferredFile?: string,
  inferredTestName?: string
): void {
  testHeaderTracker.lastTestName = testName || ''
  if (testFile) {
    testHeaderTracker.lastTestFile = testFile
  }
  if (inferredFile) {
    testHeaderTracker.lastInferredFile = inferredFile
  }
  if (inferredTestName) {
    testHeaderTracker.lastInferredTestName = inferredTestName
  }
}

/** Format test header and return the updated message */
export function formatTestHeader(
  message: string,
  options: LoggingConfig,
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

/**
 * Get section title and create inferred file name and test name from message
 */
export function getSectionInfo(
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
 * Process section headers to extract meaningful test info
 */
function processSectionHeaders(
  message: string,
  isConsolidatedLog: boolean
): {
  sectionTitle?: string
  inferredFile?: string
  testName?: string
} {
  if (!message.includes('==== ')) {
    return {}
  }

  // Only extract section info for consolidated logs
  if (isConsolidatedLog) {
    const info = getSectionInfo(message)
    return info
      ? {
          sectionTitle: info.title,
          inferredFile: info.inferredFile,
          testName: info.testName
        }
      : {}
  }

  return {}
}

/** Add test header to message when needed */
export function addTestHeader(
  message: string,
  options: LoggingConfig,
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
