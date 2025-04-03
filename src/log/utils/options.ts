/**
 * Options handling for the logging system
 */
import type { LogLevel, LogOptions } from '../types'
import { isPlaywrightStepAvailable } from './playwright'
import { configureLogging } from '../config'

// Default logging options that apply to all log calls
export const defaultLogOptions: LogOptions = {
  console: true,
  fileLogging: true
}

/**
 * Get level-specific formatting options
 */
export const getLevelFormatOptions = (level: LogLevel): Record<string, any> => {
  const formatMap: Record<LogLevel, Record<string, any>> = {
    info: { prefix: 'ℹ' },
    step: { addNewLine: true },
    success: { prefix: '✓' },
    warning: { prefix: '⚠' },
    error: { prefix: '✖' },
    debug: { prefix: '🔍' }
  }

  return formatMap[level] || {}
}

/**
 * Merge default options with per-call options and format options for the specific log level
 */
export const mergeOptions = (
  options: Partial<LogOptions> = {},
  level: LogLevel
): LogOptions => {
  // Get level-specific formatting
  const levelFormat = getLevelFormatOptions(level)

  // Merge options with a functional approach
  return {
    ...defaultLogOptions,
    ...options,
    format: {
      ...levelFormat,
      ...(options.format || {})
    }
  }
}

/**
 * Unified configuration function that handles both global and local settings
 */
export const configure = (
  options: Partial<LogOptions> | Partial<any>,
  scope?: 'global' | 'local'
): void => {
  // Auto-detect scope if not explicitly provided
  // If being called in a test context, assume local scope by default
  const effectiveScope =
    scope || (isPlaywrightStepAvailable() ? 'local' : 'global')

  if (effectiveScope === 'global') {
    // For global config, use the configureLogging function
    configureLogging(options as Partial<any>)
  } else {
    // For local config, update defaultLogOptions directly
    Object.assign(defaultLogOptions, options)
  }
}
