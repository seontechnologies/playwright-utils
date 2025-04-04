/** Log context and test tracking */
import type { LoggingConfig } from '../config'
import {
  getTestContextInfo,
  getLoggingConfig,
  getTestNameFromFilePath
} from '../config'

// Types
export type LogOptions = {
  testFile?: string
  testName?: string
  outputDir?: string
  workerIndex?: number
}

export type LogContext = {
  config: LoggingConfig
  options: LogOptions
  testFile?: string
  testName?: string
  workerIDEnabled: boolean
  workerIDFormat: string
}

const DEFAULT_WORKER_FORMAT = '[W{workerIndex}]'

/** Gets the log context for organizing logs */
export function getLogContext(options: LogOptions): LogContext {
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
  options: LogOptions,
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
export class TestTracker {
  lastTestName = ''
  lastTestFile = ''
  lastInferredFile = ''
  lastInferredTestName = ''
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

/** Populate the test options with context information */
export function populateTestOptions(options: LogOptions): {
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
