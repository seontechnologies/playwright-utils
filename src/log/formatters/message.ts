/**
 * Message formatting utilities
 */
import { colorizeText, addDelimiters } from './colors'
import type { LogLevel, FormatOptions, FormatConfigMap } from '../types'
import { getTestContextInfo } from '../config'
import type { TestContextInfo } from '../config'

/** Configuration for formatting messages based on log level */
export const formatConfig: FormatConfigMap = {
  step: {
    prefix: '==== ',
    suffix: ' ====',
    color: '\x1b[36m' // Cyan
  },
  success: {
    prefix: '✓ ',
    suffix: '',
    color: '\x1b[32m' // Green
  },
  warning: {
    prefix: '⚠ ',
    suffix: '',
    color: '\x1b[33m' // Yellow
  },
  error: {
    prefix: '✖ ',
    suffix: '',
    color: '\x1b[31m' // Red
  },
  debug: {
    prefix: '🔍 ',
    suffix: '',
    color: '\x1b[90m' // Gray
  },
  info: {
    prefix: '',
    suffix: '',
    color: '\x1b[37m' // White
  }
}

/**
 * Generates a timestamp string for log messages
 */
export const getTimestamp = (showTimestamp: boolean): string =>
  showTimestamp ? `[${new Date().toISOString().slice(11, 23)}]` : ''

/**
 * Formats a worker ID string based on the provided format and test context
 */
export const getWorkerID = (
  format: string,
  testContext: TestContextInfo
): string => {
  if (!testContext.workerIndex && testContext.workerIndex !== 0) {
    return '' // Skip if no worker index available
  }

  // Replace placeholders with actual values from test context
  return format.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === 'workerIndex' && testContext.workerIndex !== undefined) {
      return String(testContext.workerIndex)
    }
    return ''
  })
}

/**
 * Format a message for logging with appropriate formatting based on log level
 */
export const formatMessage = (
  message: string,
  level: LogLevel = 'info',
  options: FormatOptions = {
    timestamps: true,
    colorize: true,
    maxLineLength: 120
  },
  workerIdConfig?: { enabled: boolean; format: string }
): string => {
  // Get configuration for this log level
  const config = formatConfig[level]

  // Start building the log message components
  const components: string[] = []

  // Add timestamp if enabled
  if (options.timestamps) {
    components.push(getTimestamp(true))
  }

  // Add worker ID if enabled and available
  if (workerIdConfig?.enabled) {
    const testContext = getTestContextInfo()
    const workerId = getWorkerID(workerIdConfig.format, testContext)
    if (workerId) {
      components.push(workerId)
    }
  }

  // Add any prefix specified in options
  if (options.prefix) {
    components.push(options.prefix)
  }

  // Apply level-specific formatting to message
  let formattedText = addDelimiters(message, config)

  // Apply color if enabled
  formattedText = colorizeText(formattedText, config.color, options.colorize)

  // Add the formatted text to components
  components.push(formattedText)

  // Join all components with spaces
  let result = components.join(' ')

  // Respect max line length if specified
  if (options.maxLineLength > 0 && result.length > options.maxLineLength) {
    result = result.substring(0, options.maxLineLength - 3) + '...'
  }

  // Add newline if requested
  if (options.addNewLine) {
    result += '\n'
  }

  return result
}
