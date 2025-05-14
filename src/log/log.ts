/** Centralized logging system for Playwright tests */
import { formatMessage } from './formatters/format-message'
import { getTestContextInfo, getLoggingConfig } from './config'
import { tryPlaywrightStep } from './utils/playwright-step-utils'
import { logToConsole } from './outputs/log-to-console'
import { mergeOptions, configure } from './utils/options'
import { logToFile } from './outputs/log-to-file'
import { isEnabled } from './utils/flag'

import type { TestContextInfo } from './config'
import type { LogLevel, LoggingConfig } from './types'

// Configuration constants
const DEFAULT_MAX_LINE_LENGTH = 120

/** Get formatting options by merging defaults with provided options */
const getFormattingOptions = (options?: Partial<LoggingConfig>) => ({
  timestamps: true,
  colorize: true,
  maxLineLength: DEFAULT_MAX_LINE_LENGTH,
  ...options?.format
})

/** Determine worker ID configuration from options and global config */
const getWorkerIdConfig = (
  options: Partial<LoggingConfig> = {},
  config: Partial<LoggingConfig> = {}
) => {
  const raw = options.workerID ?? config.workerID
  if (raw === false) return { enabled: false, format: '[W?]' }
  if (raw === true) return { enabled: true, format: '[W{workerIndex}]' }
  // raw is an object or undefined
  return {
    enabled: raw?.enabled ?? true,
    format: raw?.format ?? '[W{workerIndex}]'
  }
}

/** Handle console logging if enabled */
const handleConsoleLogging = async (
  formattedMessage: string,
  level: LogLevel,
  options: Partial<LoggingConfig> = {},
  config: Partial<LoggingConfig> = {}
): Promise<void> => {
  if (isEnabled(options.console, false) && isEnabled(config.console, true)) {
    await logToConsole(formattedMessage, level)
  }
}

/** Handle file logging if enabled */
const handleFileLogging = async (
  formattedMessage: string,
  level: LogLevel,
  options: Partial<LoggingConfig> = {},
  config: Partial<LoggingConfig> = {},
  testContext: TestContextInfo
): Promise<void> => {
  // If options.fileLogging is explicitly specified for this particular log call, use that value
  // If not specified, fall back to the global setting from config.fileLogging?.enabled
  // ex: might globally disable file logging but want specific critical errors to still be logged to a file

  // Determine if we should log to file based on options or config
  const optionsFileLogging = isEnabled(options.fileLogging, undefined)
  const configFileLogging = isEnabled(config.fileLogging, false)

  const shouldLogToFile =
    optionsFileLogging !== undefined ? optionsFileLogging : configFileLogging

  if (shouldLogToFile) {
    try {
      await logToFile(formattedMessage, level, {
        testFile: options.testFile || testContext.testFile,
        testName: options.testName || testContext.testName
      })
    } catch (error) {
      // Prevent file I/O failures from crashing tests
      console.warn(
        `[Log System] Failed to write to log file: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

/**
 * Base logging function that handles common logging logic
 * Supports either string message or object as first parameter
 */
const logBase = async (
  messageOrData: string | unknown,
  level: LogLevel,
  options: Partial<LoggingConfig> = {}
): Promise<void> => {
  // Get configuration and context
  const config = getLoggingConfig()
  const testContext = getTestContextInfo()

  // Handle message formatting based on type
  let displayMessage: string
  let metaObject: unknown | undefined

  if (typeof messageOrData === 'string') {
    displayMessage = messageOrData || '(empty message)'
    metaObject = undefined
  } else {
    // If first argument is not a string, treat it as an object to log
    displayMessage = ''
    metaObject = messageOrData
  }

  // Get configurations
  const formattingOptions = getFormattingOptions(options)
  const workerIdConfig = getWorkerIdConfig(options, config)

  // Format message with optional object parameter
  const formattedMessage = formatMessage(
    displayMessage,
    level,
    formattingOptions,
    workerIdConfig,
    metaObject ? [metaObject] : []
  )

  // Handle different output destinations
  await handleConsoleLogging(formattedMessage, level, options, config)
  await handleFileLogging(formattedMessage, level, options, config, testContext)

  // Try to use Playwright step (only for 'step' level)
  // For PW steps, only use the string message for better UI display
  if (level === 'step') {
    await tryPlaywrightStep(displayMessage)
  }
}

// Specific logging methods for each level with support for objects
const logInfo = async (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): Promise<void> =>
  logBase(messageOrData, 'info', mergeOptions(options, 'info'))

const logStep = async (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): Promise<void> =>
  logBase(messageOrData, 'step', mergeOptions(options, 'step'))

const logSuccess = async (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): Promise<void> =>
  logBase(messageOrData, 'success', mergeOptions(options, 'success'))

const logWarning = async (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): Promise<void> =>
  logBase(messageOrData, 'warning', mergeOptions(options, 'warning'))

const logError = async (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): Promise<void> =>
  logBase(messageOrData, 'error', mergeOptions(options, 'error'))

const logDebug = async (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): Promise<void> =>
  logBase(messageOrData, 'debug', mergeOptions(options, 'debug'))

/**
 * Helper function for synchronous formatting of log messages
 * Reduces duplication by extracting common formatting logic
 */
function formatSync(
  messageOrData: string | unknown,
  level: LogLevel,
  options: Partial<LoggingConfig> = {}
) {
  const config = getLoggingConfig()
  const merged = mergeOptions(options, level)
  const displayMessage =
    typeof messageOrData === 'string' ? messageOrData || '(empty message)' : ''
  const meta = typeof messageOrData === 'string' ? undefined : messageOrData
  const formatted = formatMessage(
    displayMessage,
    level,
    getFormattingOptions(merged),
    getWorkerIdConfig(merged, config),
    meta ? [meta] : []
  )
  return { config, merged, formatted }
}

/**
 * Synchronous version of logging functions
 */
const logInfoSync = (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): void => {
  const { config, merged, formatted } = formatSync(
    messageOrData,
    'info',
    options
  )
  if (isEnabled(merged.console, false) && isEnabled(config.console, true)) {
    // Use console methods directly instead of the async wrapper
    console.info(formatted)
  }
  // Note: File logging is skipped in sync mode as it requires async operations
  // Playwright steps are also skipped as they are async
}

const logStepSync = (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): void => {
  const { config, merged, formatted } = formatSync(
    messageOrData,
    'step',
    options
  )
  if (isEnabled(merged.console, false) && isEnabled(config.console, true)) {
    console.log(formatted)
  }
}

const logSuccessSync = (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): void => {
  const { config, merged, formatted } = formatSync(
    messageOrData,
    'success',
    options
  )
  if (isEnabled(merged.console, false) && isEnabled(config.console, true)) {
    console.log(formatted)
  }
}

const logWarningSync = (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): void => {
  const { config, merged, formatted } = formatSync(
    messageOrData,
    'warning',
    options
  )
  if (isEnabled(merged.console, false) && isEnabled(config.console, true)) {
    console.warn(formatted)
  }
}

const logErrorSync = (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): void => {
  const { config, merged, formatted } = formatSync(
    messageOrData,
    'error',
    options
  )
  if (isEnabled(merged.console, false) && isEnabled(config.console, true)) {
    console.error(formatted)
  }
}

const logDebugSync = (
  messageOrData: string | unknown,
  options?: Partial<LoggingConfig>
): void => {
  const { config, merged, formatted } = formatSync(
    messageOrData,
    'debug',
    options
  )
  if (isEnabled(merged.console, false) && isEnabled(config.console, true)) {
    console.debug(formatted)
  }
}

/**
 * Main logger utility with methods for different log levels
 */
export const log = {
  // Async methods
  info: logInfo,
  step: logStep,
  success: logSuccess,
  warning: logWarning,
  error: logError,
  debug: logDebug,
  // Sync methods
  infoSync: logInfoSync,
  stepSync: logStepSync,
  successSync: logSuccessSync,
  warningSync: logWarningSync,
  errorSync: logErrorSync,
  debugSync: logDebugSync,
  // Configuration
  configure
}
