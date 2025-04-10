import * as path from 'node:path'
import type { FormatOptions, LoggingConfig } from '../types'

/**
 * Format options for the base message formatter
 * Leverages shared types from types.ts where possible while adding
 * formatter-specific options
 */
type BaseFormatOptions = {
  /** Whether to add timestamp to the formatted message (maps to FormatOptions.timestamps) */
  addTimestamp?: boolean
  /** Worker ID configuration - derived from LoggingConfig.workerID */
  workerIdConfig?: {
    /** Whether worker ID is enabled */
    enabled: boolean
    /** Format string for worker ID */
    format: string
    /** Context object with workerIndex or other values to use */
    context?: {
      workerIndex?: number
      extractedWorkerIndex?: string
      [key: string]: unknown
    }
  }
  /** Whether to strip existing timestamps and worker IDs from the message */
  stripExistingFormatting?: boolean
  /** Optional prefix to add before the formatted message (from FormatOptions.prefix) */
  prefix?: string
  /** Test information from LoggingConfig */
  testInfo?: Pick<LoggingConfig, 'testName' | 'testFile'>
  /** Log organization mode */
  organizationMode?: 'consolidated' | 'organized'
  /** Whether to apply colors to the message (from FormatOptions.colorize) */
  colorize?: boolean
  /** Configuration for log level formatting */
  levelConfig?: {
    /** ANSI color function to apply */
    color?: unknown
    /** Prefix to add before the message content */
    prefix?: string
    /** Suffix to add after the message content */
    suffix?: string
  }
  /** Maximum length for the formatted message (maps to FormatOptions.maxLineLength) */
  maxLength?: number
  /** Whether to add new line at the end (from FormatOptions.addNewLine) */
  addNewLine?: boolean
  /** Whether to include milliseconds in timestamp */
  includeMilliseconds?: boolean
}

/**
 * Generates a formatted timestamp string for log messages
 * @returns {string} Formatted timestamp string like "[05:30:02]" or "[05:30:02.123]" */
const formatTimestamp = ({
  showTimestamp = true,
  includeMilliseconds = false
}: {
  showTimestamp?: boolean
  includeMilliseconds?: boolean
} = {}): string => {
  if (!showTimestamp) return ''

  const date = new Date()
  const isoString = date.toISOString()
  // Extract either HH:MM:SS or HH:MM:SS.mmm depending on options
  const timePart = includeMilliseconds
    ? isoString.slice(11, 23) // With milliseconds
    : isoString.split('T')[1]?.substring(0, 8) || '' // Just HH:MM:SS

  return `[${timePart}]`
}

/**
 * Formats a worker ID string based on the provided format and context
 " ex: [W{workerIndex}]" with context.workerIndex=3 becomes "[W3]"
 */
const formatWorkerID = (
  format: string,
  context: { workerIndex?: number; [key: string]: unknown },
  options: { enabled?: boolean } = {}
): string => {
  const { enabled = true } = options

  // Skip if disabled or no worker index available
  if (
    !enabled ||
    (context.workerIndex === undefined && context.workerIndex !== 0)
  )
    return ''

  // Replace placeholders with actual values from context
  return format.replace(/\{(\w+)\}/g, (_, key) => {
    const value = context[key]
    return value !== undefined ? String(value) : ''
  })
}

/** Build message components (timestamp, worker ID, prefix, test info) */
const buildMessageComponents = (
  options: BaseFormatOptions,
  extractedWorkerIndex: string | null | undefined
): string[] => {
  const {
    addTimestamp = true,
    workerIdConfig,
    prefix = '',
    testInfo,
    organizationMode = 'consolidated',
    includeMilliseconds = false
  } = options

  // Create specialized component generators to improve readability
  const getTimestampComponent = () =>
    addTimestamp
      ? [formatTimestamp({ showTimestamp: true, includeMilliseconds })]
      : []

  const getWorkerIdComponent = () => {
    if (!workerIdConfig?.enabled) return []

    if (extractedWorkerIndex) return [`[W${extractedWorkerIndex}]`]

    if (workerIdConfig.format && workerIdConfig.context) {
      const workerId = formatWorkerID(
        workerIdConfig.format,
        workerIdConfig.context,
        { enabled: true }
      )
      return workerId ? [workerId] : []
    }

    return []
  }

  const getPrefixComponent = () => (prefix ? [prefix] : [])

  const getTestInfoComponent = () => {
    if (organizationMode !== 'consolidated' || !testInfo) return []

    return [
      ...(testInfo.testName ? [`[${testInfo.testName}]`] : []),
      ...(testInfo.testFile
        ? [`[File: ${path.basename(testInfo.testFile)}]`]
        : [])
    ]
  }

  // Compose the final result from all component generators
  return [
    ...getTimestampComponent(),
    ...getWorkerIdComponent(),
    ...getPrefixComponent(),
    ...getTestInfoComponent()
  ]
}

/** Format message text based on level configuration */
const formatMessageText = (
  message: string,
  options: {
    levelConfig?: BaseFormatOptions['levelConfig']
    colorize?: FormatOptions['colorize']
  }
): string => {
  const { levelConfig, colorize = false } = options

  // No level config means return the original message
  if (!levelConfig) return message

  // Function to add delimiters (prefix/suffix) to text
  const addDelimiters = (text: string) => {
    if (!levelConfig.prefix && !levelConfig.suffix) return text
    return `${levelConfig.prefix || ''}${text}${levelConfig.suffix || ''}`
  }

  // Function to apply color if enabled and color function exists
  const applyColor = (text: string) => {
    const hasValidColorFn =
      colorize && levelConfig.color && typeof levelConfig.color === 'function'

    return hasValidColorFn
      ? (levelConfig.color as (text: string) => string)(text)
      : text
  }

  // Apply transformations in sequence
  return applyColor(addDelimiters(message))
}

/** Clean a message by removing timestamps and worker IDs */
const cleanMessageFormatting = (
  message: string,
  _workerIdConfig?: BaseFormatOptions['workerIdConfig']
): {
  processedMessage: string
  extractedWorkerIndex: string | null | undefined
} => {
  const timestampRegex = /\[(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\]/g
  const workerRegex = /\[W(\d+)\]/g

  // Extract worker ID if needed for preservation
  const workerMatch = workerRegex.exec(message)
  // Using null instead of undefined for consistency
  const extractedWorkerIndex: string | null | undefined = workerMatch
    ? workerMatch[1]
    : null

  // Remove existing formatting
  const processedMessage = message
    .replace(workerRegex, '')
    .replace(timestampRegex, '')
    .replace(/\s+/g, ' ')
    .trim()

  return { processedMessage, extractedWorkerIndex }
}

/**
 * Base function for formatting log messages
 * @param message Raw message to format
 * @param options Formatting options derived from FormatOptions and LoggingConfig
 * @returns Formatted message string
 */
export const formatMessageBase = (
  message: string,
  options: BaseFormatOptions = {}
): string => {
  const {
    stripExistingFormatting = false,
    maxLength = 0,
    addNewLine = false
  } = options

  // Step 1: Clean the message if requested
  let processedMessage = message
  let extractedWorkerIndex: string | null | undefined = null

  if (stripExistingFormatting) {
    const result = cleanMessageFormatting(message, options.workerIdConfig)
    processedMessage = result.processedMessage
    extractedWorkerIndex = result.extractedWorkerIndex

    // Update workerIdConfig if needed
    if (extractedWorkerIndex && options.workerIdConfig) {
      options.workerIdConfig.context = {
        ...options.workerIdConfig.context,
        extractedWorkerIndex
      }
    }
  }

  // Step 2: Build components (timestamp, worker ID, prefixes, test info)
  const components = buildMessageComponents(options, extractedWorkerIndex)

  // Step 3: Format the message text based on level configuration
  const formattedText = formatMessageText(processedMessage, {
    levelConfig: options.levelConfig,
    colorize: options.colorize
  })

  // Step 4: Add the formatted text and combine components
  components.push(formattedText)
  let result = components.join(' ')

  // Step 5: Apply max length if specified
  if (maxLength > 0 && result.length > maxLength) {
    result = result.substring(0, maxLength - 3) + '...'
  }

  // Step 6: Add newline if requested
  if (addNewLine) {
    result += '\n'
  }

  return result
}
