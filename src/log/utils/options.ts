/* eslint-disable @typescript-eslint/no-explicit-any */
/** Options handling for the logging system */
import type { LogLevel, LogOptions } from '../types'
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

/** * Merge default options with per-call options and format options for the specific log level */
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

/** * Unified configuration function that handles both global and local settings
 * Always uses global scope by default, regardless of context */
export const configure = (
  options: Partial<LogOptions> | Partial<any>,
  scope: 'global' | 'local' = 'global'
): void => {
  // Always use global scope by default, can be overridden with explicit 'local'
  const effectiveScope = scope

  if (effectiveScope === 'global') {
    // For global config, use the configureLogging function
    configureLogging(options as Partial<any>)
  } else {
    // For local config, update defaultLogOptions directly
    Object.assign(defaultLogOptions, options)
  }
}
