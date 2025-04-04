/** Centralized logging system for Playwright tests */
import { formatMessage } from './formatters/message'
import { getTestContextInfo, getLoggingConfig } from './config'
import type { LoggingConfig, TestContextInfo } from './config'
import { tryPlaywrightStep } from './utils/playwright'
import { logToConsole } from './outputs/console'
import { logToFile } from './outputs/file'
import type { LogLevel, LogOptions } from './types'
import { mergeOptions, configure } from './utils/options'

/**
 * Base logging function that handles common logging logic
 */
/**
 * Get formatting options by merging defaults with provided options
 */
const getFormattingOptions = (options: LogOptions) => ({
  timestamps: true,
  colorize: true,
  maxLineLength: 120, // Default value
  ...options.format
})

/**
 * Determine worker ID configuration from options and global config
 */
const getWorkerIdConfig = (options: LogOptions, config: LoggingConfig) => ({
  enabled:
    typeof options.workerID === 'boolean'
      ? options.workerID
      : (options.workerID?.enabled ?? config.workerID?.enabled ?? true),
  format:
    typeof options.workerID === 'object' && options.workerID?.format
      ? options.workerID.format
      : (config.workerID?.format ?? '[W{workerIndex}]')
})

/**
 * Handle console logging if enabled
 */
const handleConsoleLogging = async (
  formattedMessage: string,
  level: LogLevel,
  options: LogOptions,
  config: LoggingConfig
): Promise<void> => {
  if (options.console && (config.console?.enabled ?? true)) {
    await logToConsole(formattedMessage, level)
  }
}

/**
 * Handle file logging if enabled
 */
const handleFileLogging = async (
  formattedMessage: string,
  level: LogLevel,
  options: LogOptions,
  config: LoggingConfig,
  testContext: TestContextInfo
): Promise<void> => {
  const shouldLogToFile =
    options.fileLogging !== undefined
      ? options.fileLogging
      : config.fileLogging?.enabled

  if (shouldLogToFile) {
    await logToFile(formattedMessage, level, {
      testFile: options.testFile || testContext.testFile,
      testName: options.testName || testContext.testName,
      outputDir: config.fileLogging?.outputDir
    })
  }
}

/**
 * Base logging function that handles common logging logic
 */
const logBase = async (
  message: string,
  level: LogLevel,
  options: LogOptions = {}
): Promise<void> => {
  // Get configuration and context
  const config = getLoggingConfig()
  const testContext = getTestContextInfo()
  const displayMessage = message || '(empty message)'

  // Get configurations
  const formattingOptions = getFormattingOptions(options)
  const workerIdConfig = getWorkerIdConfig(options, config)

  // Format message
  const formattedMessage = formatMessage(
    displayMessage,
    level,
    formattingOptions,
    workerIdConfig
  )

  // Handle different output destinations
  await handleConsoleLogging(formattedMessage, level, options, config)
  await handleFileLogging(formattedMessage, level, options, config, testContext)

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
