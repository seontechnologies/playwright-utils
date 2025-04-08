/** Options handling for the logging system */
import type { LogLevel, LoggingConfig } from '../types'
import { configureLogging } from '../config'

// Default logging options that apply to all log calls
export const defaultLoggingConfig: LoggingConfig = {
  console: true,
  fileLogging: false
}

/** Get level-specific formatting options */
export const getLevelFormatOptions = (
  level: LogLevel
): Record<string, unknown> => {
  const formatMap: Record<LogLevel, Record<string, unknown>> = {
    info: { prefix: 'ℹ' },
    step: { addNewLine: true },
    success: { prefix: '✓' },
    warning: { prefix: '⚠' },
    error: { prefix: '✖' },
    debug: { prefix: '🔍' }
  }

  return formatMap[level] || {}
}

/** Merge default options with per-call options and format options for the specific log level */
export const mergeOptions = (
  options: Partial<LoggingConfig> = {},
  level: LogLevel
): LoggingConfig => {
  // Get level-specific formatting
  const levelFormat = getLevelFormatOptions(level)

  // Merge options with a functional approach
  return {
    ...defaultLoggingConfig,
    ...options,
    format: {
      ...levelFormat,
      ...(options.format || {})
    }
  }
}

/** Convert a unified configuration to LoggingConfig format
 * This ensures we can still use the simple LoggingConfig interface with booleans */
export const toLoggingConfig = (
  config: Partial<LoggingConfig>
): Partial<LoggingConfig> => {
  const result: Partial<LoggingConfig> = {}

  // Handle console setting
  if (typeof config.console === 'boolean') {
    result.console = config.console
  } else if (config.console?.enabled !== undefined) {
    result.console = config.console.enabled
  }

  // Handle fileLogging setting
  if (typeof config.fileLogging === 'boolean') {
    result.fileLogging = config.fileLogging
  } else if (config.fileLogging?.enabled !== undefined) {
    result.fileLogging = config.fileLogging.enabled
  }

  // Handle workerID setting - this one is actually already compatible
  result.workerID = config.workerID

  // Copy over other LoggingConfig properties
  if (config.format) result.format = config.format
  if (config.context) result.context = config.context
  if (config.testFile) result.testFile = config.testFile
  if (config.testName) result.testName = config.testName

  return result
}

/** Unified configuration function that handles both global and local settings
 * Always uses global scope by default, regardless of context */
export const configure = (
  options: Partial<LoggingConfig>,
  scope: 'global' | 'local' = 'global'
): void => {
  // Always use global scope by default, can be overridden with explicit 'local'
  const effectiveScope = scope

  // Convert unified config to LoggingConfig for internal use
  const LoggingConfig = toLoggingConfig(options)

  // Update defaultLoggingConfig regardless of scope
  // This ensures that mergeOptions() will use the updated defaults
  Object.assign(defaultLoggingConfig, LoggingConfig)

  if (effectiveScope === 'global') {
    // For global config, use the configureLogging function
    configureLogging(options)
  }
}
