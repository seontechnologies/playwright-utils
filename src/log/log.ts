/** Centralized logging system for Playwright tests */
import { getLoggingConfig, getTestContextInfo } from './config'
import { formatMessage } from './formatters/message'
import { logToConsole } from './outputs/console'
import { logToFile } from './outputs/file'
import { tryPlaywrightStep } from './utils/playwright'
import { mergeOptions, configure } from './utils/options'
import type { LogLevel, LogOptions } from './types'

/**
 * Base logging function that handles common logging logic
 */
const logBase = async (
  message: string,
  level: LogLevel,
  options: LogOptions = {}
): Promise<void> => {
  // Get logging configuration
  const config = getLoggingConfig()

  // Get test context information
  const testContext = getTestContextInfo()

  // Ensure we have a message to log
  const displayMessage = message || '(empty message)'

  // Basic formatting options
  const formattingOptions = {
    timestamps: true,
    colorize: true,
    maxLineLength: 120, // Default value
    ...options.format
  }

  // Determine worker ID settings
  const workerIdConfig = {
    enabled:
      typeof options.workerID === 'boolean'
        ? options.workerID
        : (options.workerID?.enabled ?? config.workerID?.enabled ?? true),
    format:
      typeof options.workerID === 'object' && options.workerID?.format
        ? options.workerID.format
        : (config.workerID?.format ?? '[W{workerIndex}]')
  }

  // Format message for display based on log level
  const formattedMessage = formatMessage(
    displayMessage,
    level,
    formattingOptions,
    workerIdConfig
  )

  // Handle console output if requested and enabled
  if (options.console && (config.console?.enabled ?? true)) {
    await logToConsole(formattedMessage, level)
  }

  // Determine if we should log to file
  const shouldLogToFile =
    options.fileLogging !== undefined
      ? options.fileLogging
      : config.fileLogging?.enabled

  // Handle file logging if enabled
  if (shouldLogToFile) {
    await logToFile(formattedMessage, {
      testFile: options.testFile || testContext.testFile,
      testName: options.testName || testContext.testName,
      outputDir: config.fileLogging?.outputDir
    })
  }

  // Try to use Playwright step (only for 'step' level)
  if (level === 'step') {
    await tryPlaywrightStep(displayMessage)
  }
}

// Specific logging methods for each level
const logInfo = async (
  message: string,
  options?: Partial<LogOptions>
): Promise<void> => logBase(message, 'info', mergeOptions(options, 'info'))

const logStep = async (
  message: string,
  options?: Partial<LogOptions>
): Promise<void> => logBase(message, 'step', mergeOptions(options, 'step'))

const logSuccess = async (
  message: string,
  options?: Partial<LogOptions>
): Promise<void> =>
  logBase(message, 'success', mergeOptions(options, 'success'))

const logWarning = async (
  message: string,
  options?: Partial<LogOptions>
): Promise<void> =>
  logBase(message, 'warning', mergeOptions(options, 'warning'))

const logError = async (
  message: string,
  options?: Partial<LogOptions>
): Promise<void> => logBase(message, 'error', mergeOptions(options, 'error'))

const logDebug = async (
  message: string,
  options?: Partial<LogOptions>
): Promise<void> => logBase(message, 'debug', mergeOptions(options, 'debug'))

/**
 * Main logger utility with methods for different log levels
 */
export const log = {
  info: logInfo,
  step: logStep,
  success: logSuccess,
  warning: logWarning,
  error: logError,
  debug: logDebug,
  configure
}
