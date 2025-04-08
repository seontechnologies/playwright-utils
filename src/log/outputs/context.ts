/** Log context and test tracking */
import type { LoggingConfig } from '../types'
import { getTestContextInfo, getLoggingConfig } from '../config'

// Additional properties used in context tracking
type LoggingContextOptions = LoggingConfig & {
  workerIndex?: number
}

export type LogContext = {
  config: LoggingConfig
  options: LoggingConfig
  testFile?: string
  testName?: string
  workerIDEnabled: boolean
  workerIDFormat: string
}

const DEFAULT_WORKER_FORMAT = '[W{workerIndex}]'

/** Gets the log context for organizing logs */
export function getLogContext(options: LoggingConfig): LogContext {
  const config = getLoggingConfig()
  const testContext = getTestContextInfo()

  // Create a new options object with test context information
  const enrichedOptions = {
    ...options,
    // Use options values or fallback to test context values
    testFile: options.testFile || testContext?.testFile,
    testName: options.testName || testContext?.testName,
    // Worker index is stored in test context but not part of LoggingConfig
    workerIndex: testContext?.workerIndex
  } as LoggingContextOptions

  // Determine if worker IDs are enabled (default to true unless explicitly disabled)
  const workerIDEnabled =
    typeof config.workerID === 'boolean'
      ? config.workerID
      : config.workerID?.enabled !== false

  const workerIDFormat =
    typeof config.workerID === 'object' && config.workerID?.format
      ? config.workerID.format
      : DEFAULT_WORKER_FORMAT

  return {
    config,
    testFile: enrichedOptions.testFile,
    testName: enrichedOptions.testName,
    options: enrichedOptions,
    workerIDEnabled,
    workerIDFormat
  }
}

/** Extract test information from a log message */
export function extractTestInfoFromMessage(message: string): {
  testName?: string
  testFile?: string
} {
  // Extract test info from formatted messages like [TestName] [File: filename.spec.ts]
  const testInfoPattern = /\[([^\]]+)\]\s*\[File:\s*([^\]]+)\]/
  const testNameMatch = message.match(testInfoPattern)

  if (testNameMatch && testNameMatch.length >= 3) {
    return {
      testName: testNameMatch[1] ? testNameMatch[1].trim() : undefined,
      testFile: testNameMatch[2] ? testNameMatch[2].trim() : undefined
    }
  }

  return {}
}

/**
 * Extract test info from message and update options if needed
 */
export function extractTestInfoIfNeeded(
  message: string,
  options: LoggingConfig,
  detectedFile?: string
): string | undefined {
  // If no test name in options, see if we can extract it from the message
  if (!options.testName) {
    const testInfo = extractTestInfoFromMessage(message)

    if (testInfo.testName) {
      options.testName = testInfo.testName

      // If no test file either in options or detected, use the one from message
      if (!options.testFile && !detectedFile && testInfo.testFile) {
        options.testFile = testInfo.testFile
        return testInfo.testFile
      }
    }
  }

  return detectedFile
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
export const testHeaderTracker: TestTracker = {
  lastTestName: '',
  lastTestFile: '',
  lastInferredFile: '',
  lastInferredTestName: ''
}

/** Get test name from a spec file path
 * Useful for log formatting when test context isn't captured */
function getTestNameFromFilePath(filePath: string | undefined): string {
  if (!filePath) return 'Unknown Test'

  // Extract filename without extension
  const filename =
    filePath
      .split('/')
      .pop()
      ?.replace(/\.spec\.ts$|\.test\.ts$/, '') || ''

  // Convert kebab-case to readable format
  return filename.replace(/-/g, ' ')
}

/** Populate the test options with context information */
export function populateTestOptions(options: LoggingContextOptions): {
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
