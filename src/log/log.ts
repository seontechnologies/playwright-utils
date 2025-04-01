/**
 * Logging utilities for Playwright tests with clear step delimiters
 * Provides functionality similar to Cypress cy.log()
 *
 * Integrates with Playwright's reporter UI for better visibility
 */

// Import test in a way that allows us to handle it being undefined in non-test contexts
let testObj:
  | { step: (title: string, body: () => Promise<void>) => Promise<void> }
  | undefined
try {
  // This will succeed in test files but might fail in utility files
  const { test } = require('@playwright/test')
  testObj = test
} catch (error) {
  // We'll handle this gracefully - testObj will remain undefined
  // Use direct console.log here since we can't use our log utility (it would create a circular reference)
  console.info(
    'Note: Running in non-test context, Playwright test API is not available'
  )
}

// Simple color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
}

/** log level types */
type LogLevel = 'info' | 'step' | 'success' | 'warning' | 'error' | 'debug'

/** options for formatting log messages */
type FormatOptions = {
  timestamps: boolean
  colorize: boolean
  maxLineLength: number
}

/** default formatting options for log messages */
const formatOptions: FormatOptions = {
  timestamps: true,
  colorize: true,
  maxLineLength: 120
}

/** Configuration for formatting messages based on log level
 * Defines prefix, suffix, and color for each log level  */
const formatConfig = {
  step: {
    prefix: '==== ',
    suffix: ' ====',
    color: colors.cyan
  },
  success: {
    prefix: '✓ ',
    suffix: '',
    color: colors.green
  },
  warning: {
    prefix: '⚠ ',
    suffix: '',
    color: colors.yellow
  },
  error: {
    prefix: '✖ ',
    suffix: '',
    color: colors.red
  },
  debug: {
    prefix: '🔍 ',
    suffix: '',
    color: colors.gray
  },
  info: {
    prefix: '',
    suffix: '',
    color: colors.white
  }
}

/**
 * Generates a timestamp string for log messages
 * @param showTimestamp - Whether to include the timestamp
 * @returns Formatted timestamp string or empty string
 */
const getTimestamp = (showTimestamp: boolean): string =>
  showTimestamp ? `[${new Date().toISOString().slice(11, 23)}]` : ''

/**
 * Applies ANSI color formatting to text
 * @param text - The text to colorize
 * @param color - ANSI color code to apply
 * @param useColor - Whether to apply coloring
 * @returns Colorized text or original text if useColor is false
 */
const colorizeText = (
  text: string,
  color: string,
  useColor: boolean
): string => (useColor ? `${colors.bold}${color}${text}${colors.reset}` : text)

/**
 * Adds prefix and suffix delimiters to text
 * @param text - Text to add delimiters to
 * @param config - Object containing prefix and suffix strings
 * @returns Text with delimiters added
 */
const addDelimiters = (
  text: string,
  config: { prefix: string; suffix: string }
): string => `${config.prefix}${text}${config.suffix}`

/**
 * Format a message for logging with appropriate formatting based on log level
 * @param message - The message to format
 * @param level - The log level to determine formatting
 * @param options - Additional formatting options
 * @returns The formatted message string
 */
const formatMessage = (
  message: string,
  level: LogLevel = 'info',
  options: FormatOptions = formatOptions
): string => {
  // get configuration for this log level (or default to info)
  const config = formatConfig[level] || formatConfig.info

  const timestamp = getTimestamp(options.timestamps)

  const delimitedMessage = addDelimiters(message, config)

  const formattedMessage = options.colorize
    ? colorizeText(delimitedMessage, config.color, options.colorize)
    : delimitedMessage

  return `${timestamp}${formattedMessage}`
}

/**
 * Wraps a synchronous function in a Promise and resolves after I/O processing (thanks to setImmediate).
 * Used for asynchronous console.logging
 * @param fn - Function to execute synchronously before resolving
 * @returns Promise that resolves after the function executes and I/O is processed
 */
const asPromise = async (fn: () => void): Promise<void> =>
  new Promise<void>((resolve) => {
    fn()
    // Process any pending I/O and then resolve
    setImmediate(() => resolve())
  })

// switch vs map record
// const getConsoleMethodForLevelOLD = (
//   level: LogLevel
// ): ((message: string) => void) => {
//   switch (level) {
//     case 'error':
//       return console.error
//     case 'warning':
//       return console.warn
//     case 'info':
//       return console.info
//     case 'debug':
//       return console.debug
//     default:
//       // For 'step', 'success', and any others
//       return console.log
//   }
// }

const getConsoleMethodForLevel = (
  level: LogLevel
): ((message: string) => void) => {
  const methodMap: Record<LogLevel, (message: string) => void> = {
    error: console.error,
    warning: console.warn,
    info: console.info,
    debug: console.debug,
    step: console.log,
    success: console.log
  }

  return methodMap[level]
}

/**
 * Logs a message to the console using the method corresponding to the log level
 * @param message - The formatted message to log
 * @param level - The log level that determines which console method to use
 * @returns Promise that resolves when logging is complete
 */
const logToConsole = async (
  message: string,
  level: LogLevel
): Promise<void> => {
  const consoleMethod = getConsoleMethodForLevel(level)
  return asPromise(() => consoleMethod(message))
}

/** Checks if the Playwright test step API is available in the current context */
const isPlaywrightStepAvailable = (): boolean =>
  !!(testObj && typeof testObj.step === 'function')

/**
 * Executes a Playwright test step with error handling
 * @param stepMessage - Message to display for the test step
 * @returns Promise that resolves when the step is completed or fails silently
 */
const executePlaywrightStep = async (stepMessage: string): Promise<void> => {
  if (!testObj) return

  try {
    await testObj.step(stepMessage, async () => {
      // the step is created just by calling this
    })
  } catch (error) {
    // silently fail if the step call fails
    // this allows graceful fallback in non-test contexts
  }
}

/**
 * Attempts to execute a Playwright test step if the test API is available
 * @param stepMessage - Message to display for the test step
 * @returns Promise that resolves when the operation is complete
 */
const tryPlaywrightStep = async (stepMessage: string): Promise<void> => {
  if (isPlaywrightStepAvailable()) {
    return await executePlaywrightStep(stepMessage)
  }
  // Otherwise, we've already logged to console if requested
}

/**
 * Base logging function that handles common logging logic and coordinates output channels
 * @param message - The message to log
 * @param level - The log level (error, warning, info, debug, etc.)
 * @param options - Options for customizing the log output
 * @param options.addNewLine - Whether to add a new line before the message
 * @param options.prefix - Prefix symbol or text to add before the message
 * @param options.console - Set to true to use level-appropriate console method, or string to specify method
 * @returns Promise that resolves when all logging operations are complete
 */
const logBase = async (
  message: string,
  level: LogLevel,
  options: {
    addNewLine?: boolean
    prefix?: string
    console?: boolean | string
  } = {}
) => {
  const formattedMessage = formatMessage(message, level, formatOptions)

  if (options?.console) await logToConsole(formattedMessage, level)

  const stepMessage = options.prefix
    ? `${options.prefix} ${formattedMessage}`
    : formattedMessage

  return await tryPlaywrightStep(stepMessage)
}

const logInfo = async (message: string, console = true): Promise<void> =>
  logBase(message, 'info', { prefix: 'ℹ', console })

const logStep = async (message: string, console = true): Promise<void> =>
  logBase(message, 'step', { addNewLine: true, console })

const logSuccess = async (message: string, console = true): Promise<void> =>
  logBase(message, 'success', { prefix: '✓', console })

const logWarning = async (message: string, console = true): Promise<void> =>
  logBase(message, 'warning', { prefix: '⚠', console })

const logError = async (message: string, console = true): Promise<void> =>
  logBase(message, 'error', { prefix: '✖', console })

const logDebug = async (message: string, console = true): Promise<void> =>
  logBase(message, 'debug', { prefix: '🔍', console })

/**
 * Main logger object with methods for different log levels
 *
 * Each logging method has the same signature:
 * @param message - The message to log
 * @param console - Output control parameter:
 *   - true (default): Use the level-appropriate console method
 *   - false: No console output
 *   - string (e.g., 'console.debug'): Use the specified console method
 * @returns Promise that resolves when logging is complete
 *
 * @example
 * log.step('Initializing test')                // Uses console.log (default)
 * log.info('Information message')              // Uses console.info (default)
 * log.error('Error occurred')                  // Uses console.error (default)
 * log.warning('Warning message', false)        // No console output
 * log.debug('Debug information')               // Uses console.debug (default)
 * log.success('Operation succeeded')           // Uses console.log (default)
 * log.info('Custom output', 'console.warn')    // Forces console.warn
 */
export const log = {
  info: logInfo,
  step: logStep,
  success: logSuccess,
  warning: logWarning,
  error: logError,
  debug: logDebug
  // No need for setTestInfo anymore - using test object directly
}

export type LogParams = {
  level?: LogLevel
  message: string
  console?: boolean
}
