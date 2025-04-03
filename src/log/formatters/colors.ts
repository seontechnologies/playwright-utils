/**
 * Color utilities for terminal output
 */

/** ANSI color codes for terminal output */
export const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
}

/**
 * Applies ANSI color formatting to text
 */
export const colorizeText = (
  text: string,
  color: string,
  useColor: boolean
): string => (useColor ? `${colors.bold}${color}${text}${colors.reset}` : text)

/**
 * Adds prefix and suffix delimiters to text
 */
export const addDelimiters = (
  text: string,
  config: { prefix: string; suffix: string }
): string => `${config.prefix}${text}${config.suffix}`
