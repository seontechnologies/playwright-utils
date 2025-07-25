/** Centralized logging system for Playwright tests */
import { formatMessage } from './formatters/format-message'
import { getTestContextInfo, getLoggingConfig } from './config'
import { tryPlaywrightStep } from './utils/playwright-step-utils'
import { logToConsole } from './outputs/log-to-console'
import { mergeOptions, configure } from './utils/options'
import { logToFile } from './outputs/log-to-file'
import { isEnabled } from './utils/flag'
import { LOG_LEVEL_PRIORITY } from './types'

import type { TestContextInfo } from './config'
import type { LogLevel, LoggingConfig } from './types'

// Configuration constants
const DEFAULT_MAX_LINE_LENGTH = 4000

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

/** Check if a log level meets the minimum configured level */
const meetsMinimumLevel = (
  messageLevel: LogLevel,
  configuredLevel?: LogLevel
): boolean => {
  if (!configuredLevel) return true // No filter if level isn't set

  const messagePriority = LOG_LEVEL_PRIORITY[messageLevel]
  const configuredPriority = LOG_LEVEL_PRIORITY[configuredLevel]

  return messagePriority >= configuredPriority
}

/** Handle console logging if enabled and meets minimum level requirement */
const handleConsoleLogging = async (
  formattedMessage: string,
  level: LogLevel,
  options: Partial<LoggingConfig> = {},
  config: Partial<LoggingConfig> = {}
): Promise<void> => {
  // if options has explicit console setting, use that
  // otherwise fall back to config setting
  const optionsConsole = isEnabled(options.console, undefined)
  const configConsole = isEnabled(config.console, true)

  // If options has explicit setting, use it, otherwise use config setting
  const shouldLog =
    optionsConsole !== undefined ? optionsConsole : configConsole

  // Check if this message meets the minimum level requirement
  const minLevel = options.level || config.level
  const meetsLevelRequirement = meetsMinimumLevel(level, minLevel)

  if (shouldLog && meetsLevelRequirement) {
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

  // Check if this message meets the minimum level requirement
  const minLevel = options.level || config.level
  const meetsLevelRequirement = meetsMinimumLevel(level, minLevel)

  if (shouldLogToFile && meetsLevelRequirement) {
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

/** Check if any logging output is enabled */
const hasAnyLoggingEnabled = (
  level: LogLevel,
  options: Partial<LoggingConfig>,
  config: Partial<LoggingConfig>
): boolean => {
  const consoleEnabled =
    isEnabled(options.console, undefined) !== undefined
      ? isEnabled(options.console, undefined)
      : isEnabled(config.console, true)
  const fileEnabled =
    isEnabled(options.fileLogging, undefined) !== undefined
      ? isEnabled(options.fileLogging, undefined)
      : isEnabled(config.fileLogging, false)
  const stepEnabled = level === 'step'

  return consoleEnabled || fileEnabled || stepEnabled
}

/** Extract display message and meta object from input */
const parseMessageData = (messageOrData: string | unknown) => {
  if (typeof messageOrData === 'string') {
    return {
      displayMessage: messageOrData || '(empty message)',
      metaObject: undefined
    }
  }

  return {
    displayMessage: '',
    metaObject: messageOrData
  }
}

/** Check if message formatting is needed for console/file logging */
const needsFormatting = (
  level: LogLevel,
  options: Partial<LoggingConfig>,
  config: Partial<LoggingConfig>
): boolean => {
  const consoleEnabled =
    isEnabled(options.console, undefined) !== undefined
      ? isEnabled(options.console, undefined)
      : isEnabled(config.console, true)
  const fileEnabled =
    isEnabled(options.fileLogging, undefined) !== undefined
      ? isEnabled(options.fileLogging, undefined)
      : isEnabled(config.fileLogging, false)

  const minLevel = options.level || config.level
  const meetsLevel = meetsMinimumLevel(level, minLevel)

  return (consoleEnabled && meetsLevel) || (fileEnabled && meetsLevel)
}

/** Format message for console and file output */
const formatLogMessage = (
  displayMessage: string,
  level: LogLevel,
  options: Partial<LoggingConfig>,
  config: Partial<LoggingConfig>,
  metaObject?: unknown
): string => {
  const formattingOptions = getFormattingOptions(options)
  const workerIdConfig = getWorkerIdConfig(options, config)

  return formatMessage(
    displayMessage,
    level,
    formattingOptions,
    workerIdConfig,
    metaObject ? [metaObject] : []
  )
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
  const config = getLoggingConfig()

  // Early return if no logging is enabled
  if (!hasAnyLoggingEnabled(level, options, config)) {
    return
  }

  // Parse the input message data
  const { displayMessage, metaObject } = parseMessageData(messageOrData)

  // Format message if needed for console/file logging
  let formattedMessage: string | undefined
  if (needsFormatting(level, options, config)) {
    formattedMessage = formatLogMessage(
      displayMessage,
      level,
      options,
      config,
      metaObject
    )
  }

  // Execute all logging operations in parallel
  const logPromises: Promise<void>[] = []

  // Console and file logging use formatted message
  if (formattedMessage) {
    logPromises.push(
      handleConsoleLogging(formattedMessage, level, options, config)
    )

    const testContext = getTestContextInfo()
    logPromises.push(
      handleFileLogging(formattedMessage, level, options, config, testContext)
    )
  }

  // Playwright step logging uses raw display message
  if (level === 'step') {
    logPromises.push(tryPlaywrightStep(displayMessage))
  }

  // Wait for all logging operations to complete
  if (logPromises.length > 0) {
    await Promise.all(logPromises)
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
  // Check level filtering
  const minLevel = merged.level || config.level
  const meetsLevelRequirement = meetsMinimumLevel('info', minLevel)

  if (
    isEnabled(merged.console, false) &&
    isEnabled(config.console, true) &&
    meetsLevelRequirement
  ) {
    console.info(formatted)
  }
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
  // Check level filtering
  const minLevel = merged.level || config.level
  const meetsLevelRequirement = meetsMinimumLevel('step', minLevel)

  if (
    isEnabled(merged.console, false) &&
    isEnabled(config.console, true) &&
    meetsLevelRequirement
  ) {
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
  // Check level filtering
  const minLevel = merged.level || config.level
  const meetsLevelRequirement = meetsMinimumLevel('success', minLevel)

  if (
    isEnabled(merged.console, false) &&
    isEnabled(config.console, true) &&
    meetsLevelRequirement
  ) {
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
  // Check level filtering
  const minLevel = merged.level || config.level
  const meetsLevelRequirement = meetsMinimumLevel('warning', minLevel)

  if (
    isEnabled(merged.console, false) &&
    isEnabled(config.console, true) &&
    meetsLevelRequirement
  ) {
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
  // Check level filtering
  const minLevel = merged.level || config.level
  const meetsLevelRequirement = meetsMinimumLevel('error', minLevel)

  if (
    isEnabled(merged.console, false) &&
    isEnabled(config.console, true) &&
    meetsLevelRequirement
  ) {
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
  // Check level filtering
  const minLevel = merged.level || config.level
  const meetsLevelRequirement = meetsMinimumLevel('debug', minLevel)

  if (
    isEnabled(merged.console, false) &&
    isEnabled(config.console, true) &&
    meetsLevelRequirement
  ) {
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
