/** Log context and test tracking */
import type { LogContext, LoggingConfig } from '../types'
import { getTestContextInfo, getLoggingConfig } from '../config'

// Additional properties used in context tracking
type LoggingContextOptions = LoggingConfig & {
  workerIndex?: number
}

const DEFAULT_WORKER_FORMAT = '[W{workerIndex}]'

/**
 * Creates a unified context object for organizing and formatting logs.
 *
 * This function serves several important purposes in the logging system:
 *
 * 1. Combines global configuration with per-call options to enable flexibility
 *    in how logs are formatted and stored
 *
 * 2. Enriches logging context with test information (test name, file, worker index)
 *    which is used for properly organizing logs by test
 *
 * 3. Normalizes worker ID settings by determining if worker IDs are enabled
 *    and what format they should use
 *
 * 4. Provides a consistent interface for other logging components (file, console)
 *    to access all context information needed for their operations
 *
 * The returned LogContext is used throughout the logging system to:
 * - Create proper file paths for log files
 * - Format messages with appropriate test headers
 * - Add worker identification to logs
 * - Apply formatting rules consistently
 *
 * @param options - Per-call logging options passed to the log method
 * @returns LogContext - A complete context object with both global and call-specific settings
 */
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

/** Extract test information from formatted messages
 * like [TestName] [File: filename.spec.ts] */
const extractTestInfoFromMessage = (
  message: string
): {
  testName?: string
  testFile?: string
} => {
  // [TestName] [File: filename.spec.ts]
  const testInfoPattern = /\[([^\]]+)\]\s*\[File:\s*([^\]]+)\]/
  const testNameMatch = message.match(testInfoPattern)

  // If we have a match (3 capture groups), extract the test name and file
  if (testNameMatch && testNameMatch.length >= 3) {
    return {
      testName: testNameMatch[1] ? testNameMatch[1].trim() : undefined,
      testFile: testNameMatch[2] ? testNameMatch[2].trim() : undefined
    }
  }

  return {}
}

/**
 * Extracts test information from log messages and updates options object with this data.
 *
 * Used specifically for consolidated logging mode to ensure test context is maintained
 * when multiple tests write to the same log file. This function:
 *
 * 1. Checks if the message contains test info in the [TestName] [File: path] format
 * 2. Updates the options object directly by adding the extracted test name
 * 3. If needed, also updates the test file path in the options object
 * 4. Returns the detected test file path for caller's reference
 *
 * Note: This function intentionally mutates the options parameter as a side effect
 * to ensure test context is properly maintained across the logging system.
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

/**
 * Populates test options with context information for both logging modes.
 *
 * This function enriches logging options with test context information,
 * supporting both organized and consolidated logging modes:
 *
 * For organized logging:
 * - Ensures each test log file has the correct test name in its path
 * - Provides proper file organization based on test information
 *
 * For consolidated logging:
 * - Ensures test identification headers contain accurate test names
 * - Provides fallback test names based on file paths when needed
 *
 * The function mutates the options object by adding test context,
 * and returns additional metadata about the context enrichment.
 *
 * @param options - The logging options to enrich with test context
 * @returns Object containing the resolved test file and whether context was found
 */
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
