/** Centralized logging system for Playwright tests */
import { formatMessage } from './formatters/format-message'
import { getTestContextInfo, getLoggingConfig } from './config'
import type { TestContextInfo } from './config'
import { tryPlaywrightStep } from './utils/playwright-step-utils'
import { logToConsole } from './outputs/console'
import type { LogLevel, LoggingConfig } from './types'
import { mergeOptions, configure } from './utils/options'
import { logToFile } from './outputs/log-to-file'

/** Get formatting options by merging defaults with provided options */
const getFormattingOptions = (options: LoggingConfig) => ({
  timestamps: true,
  colorize: true,
  maxLineLength: 120, // Default value
  ...options.format
})

/** Determine worker ID configuration from options and global config */
const getWorkerIdConfig = (options: LoggingConfig, config: LoggingConfig) => {
  // Handle options.workerID
  const optionsEnabled =
    typeof options.workerID === 'boolean'
      ? options.workerID
      : options.workerID
        ? options.workerID.enabled
        : undefined

  // Handle config.workerID
  const configEnabled =
    typeof config.workerID === 'boolean'
      ? config.workerID
      : config.workerID
        ? config.workerID.enabled
        : undefined

  // Handle format from options or config
  const optionsFormat =
    typeof options.workerID === 'object' && options.workerID
      ? options.workerID.format
      : undefined

  const configFormat =
    typeof config.workerID === 'object' && config.workerID
      ? config.workerID.format
      : undefined

  return {
    enabled: optionsEnabled ?? configEnabled ?? true,
    format: optionsFormat ?? configFormat ?? '[W{workerIndex}]'
  }
}

/** Handle console logging if enabled */
const handleConsoleLogging = async (
  formattedMessage: string,
  level: LogLevel,
  options: LoggingConfig,
  config: LoggingConfig
): Promise<void> => {
  // Get options.console value - either boolean or enabled property
  const optionsConsole =
    typeof options.console === 'boolean'
      ? options.console
      : options.console?.enabled

  // Get config.console value - either boolean or enabled property
  const configConsole =
    typeof config.console === 'boolean'
      ? config.console
      : (config.console?.enabled ?? true)

  if (optionsConsole && configConsole) {
    await logToConsole(formattedMessage, level)
  }
}

/** Handle file logging if enabled */
const handleFileLogging = async (
  formattedMessage: string,
  level: LogLevel,
  options: LoggingConfig,
  config: LoggingConfig,
  testContext: TestContextInfo
): Promise<void> => {
  // If options.fileLogging is explicitly specified for this particular log call, use that value
  // If not specified, fall back to the global setting from config.fileLogging?.enabled
  // ex: might globally disable file logging but want specific critical errors to still be logged to a file

  // Get options.fileLogging value - either boolean or enabled property
  const optionsFileLogging =
    typeof options.fileLogging === 'boolean'
      ? options.fileLogging
      : options.fileLogging?.enabled

  // Get config.fileLogging value - either boolean or enabled property
  const configFileLogging =
    typeof config.fileLogging === 'boolean'
      ? config.fileLogging
      : config.fileLogging?.enabled

  const shouldLogToFile =
    optionsFileLogging !== undefined ? optionsFileLogging : configFileLogging

  if (shouldLogToFile) {
    await logToFile(formattedMessage, level, {
      testFile: options.testFile || testContext.testFile,
      testName: options.testName || testContext.testName
    })
  }
}

/** Base logging function that handles common logging logic */
const logBase = async (
  message: string,
  level: LogLevel,
  options: LoggingConfig = {}
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
  options?: Partial<LoggingConfig>
): Promise<void> => logBase(message, 'info', mergeOptions(options, 'info'))

const logStep = async (
  message: string,
  options?: Partial<LoggingConfig>
): Promise<void> => logBase(message, 'step', mergeOptions(options, 'step'))

const logSuccess = async (
  message: string,
  options?: Partial<LoggingConfig>
): Promise<void> =>
  logBase(message, 'success', mergeOptions(options, 'success'))

const logWarning = async (
  message: string,
  options?: Partial<LoggingConfig>
): Promise<void> =>
  logBase(message, 'warning', mergeOptions(options, 'warning'))

const logError = async (
  message: string,
  options?: Partial<LoggingConfig>
): Promise<void> => logBase(message, 'error', mergeOptions(options, 'error'))

const logDebug = async (
  message: string,
  options?: Partial<LoggingConfig>
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
