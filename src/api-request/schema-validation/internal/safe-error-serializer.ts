/**
 * Safe Error Serialization Utility
 *
 * Provides defensive error serialization that handles all edge cases:
 * - String messages (normal case)
 * - Symbol values (error case)
 * - Undefined/null values
 * - Objects that need JSON stringification
 * - Circular references
 * - Functions and other non-serializable types
 *
 * This utility ensures error serialization never throws and preserves
 * as much error context as possible.
 */

/**
 * Handle primitive types (null, undefined, string, number, boolean, bigint)
 */
function handlePrimitiveTypes(value: unknown): string | null {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'bigint') return `${value}n`
  return null // Not a primitive type
}

/**
 * Handle Symbol values safely
 */
function handleSymbol(value: symbol): string {
  try {
    const description = value.description
    return description ? `Symbol(${description})` : 'Symbol()'
  } catch {
    return 'Symbol(?)'
  }
}

/**
 * Handle Function values safely
 */
function handleFunction(value: (...args: unknown[]) => unknown): string {
  try {
    return `Function(${value.name || 'anonymous'})`
  } catch {
    return 'Function(?)'
  }
}

/**
 * JSON replacer function to handle special types during serialization
 */
function createJsonReplacer() {
  return (key: string, val: unknown) => {
    // Handle circular references
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular Reference]'
      }
      seen.add(val)
    }

    // Handle special object types
    if (typeof val === 'symbol') return handleSymbol(val)
    if (typeof val === 'function') {
      return handleFunction(val as (...args: unknown[]) => unknown)
    }
    if (typeof val === 'bigint') return `${val}n`
    if (val instanceof Error) return `Error(${val.message})`

    return val
  }
}

/**
 * Handle object serialization with fallback strategies
 */
function handleObject(value: object, fallbackPrefix: string): string {
  try {
    return JSON.stringify(value, createJsonReplacer())
  } catch {
    // If JSON.stringify fails, try toString
    try {
      return value.toString()
    } catch {
      return `${fallbackPrefix} object`
    }
  } finally {
    seen.clear()
  }
}

/**
 * Safely serialize any value to a string, handling all edge cases
 *
 * @param value - The value to serialize
 * @param fallbackPrefix - Prefix for fallback messages
 * @returns A safe string representation
 */
export function safeStringify(
  value: unknown,
  fallbackPrefix = 'Non-serializable'
): string {
  // Handle primitive types first
  const primitiveResult = handlePrimitiveTypes(value)
  if (primitiveResult !== null) return primitiveResult

  // Handle Symbol values
  if (typeof value === 'symbol') return handleSymbol(value)

  // Handle functions
  if (typeof value === 'function') {
    return handleFunction(value as (...args: unknown[]) => unknown)
  }

  // Handle objects (excluding null which is handled in primitives)
  if (typeof value === 'object' && value !== null) {
    return handleObject(value, fallbackPrefix)
  }

  // Final fallback for any remaining types
  try {
    return String(value)
  } catch {
    return `${fallbackPrefix} value`
  }
}

// Set to track circular references during JSON.stringify
const seen = new Set()

/**
 * Safely extract and serialize error messages from validation errors
 *
 * @param errors - Array of validation errors that may contain Symbol values
 * @param maxLength - Maximum length of the combined error message
 * @returns Safe string representation of all error messages
 */
export function safeErrorMessage(
  errors: Array<{ message?: unknown; path?: unknown; [key: string]: unknown }>,
  maxLength = 2000
): string {
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'No error details available'
  }

  try {
    const messages = errors
      .map((error, index) => {
        if (!error || typeof error !== 'object') {
          return `Error ${index + 1}: ${safeStringify(error, 'Invalid error')}`
        }

        const message = safeStringify(error.message, 'Unknown error')
        const path = error.path
          ? safeStringify(error.path, 'unknown path')
          : null

        return path ? `${path}: ${message}` : message
      })
      .filter((msg) => msg.length > 0) // Remove empty messages
      .slice(0, 100) // Prevent memory issues with too many errors

    if (messages.length === 0) {
      return 'Error messages could not be serialized'
    }

    const combined = messages.join(', ')

    // Truncate if too long to prevent memory/display issues
    if (combined.length > maxLength) {
      const truncated = combined.substring(0, maxLength - 20)
      const errorCount = errors.length
      const shownCount = messages.length
      return `${truncated}... (${shownCount}/${errorCount} errors shown)`
    }

    return combined
  } catch (error) {
    // Ultimate fallback - this should never happen but provides safety
    return `Error serialization failed: ${errors.length} error(s) found but could not be displayed. Original error: ${safeStringify(error, 'Serialization error')}`
  }
}

/**
 * Create a safe error message for ValidationError constructor
 *
 * @param errors - Array of validation errors
 * @param context - Additional context for the error
 * @returns Safe error message string
 */
export function createValidationErrorMessage(
  errors: Array<{ message?: unknown; path?: unknown; [key: string]: unknown }>,
  context?: string
): string {
  const baseMessage = context || 'Schema validation failed'
  const errorCount = Array.isArray(errors) ? errors.length : 0

  if (errorCount === 0) {
    return `${baseMessage}: No specific errors reported`
  }

  const safeDetails = safeErrorMessage(errors, 1000) // Shorter for error messages
  return `${baseMessage}: ${safeDetails}`
}

/**
 * Safe utility to extract error details for UI display
 *
 * @param errors - Array of validation errors
 * @returns Array of safe string representations
 */
export function safeErrorDetails(
  errors: Array<{ message?: unknown; path?: unknown; [key: string]: unknown }>
): string[] {
  if (!Array.isArray(errors)) {
    return ['Invalid error format']
  }

  return errors
    .slice(0, 50) // Limit for UI display
    .map((error, index) => {
      if (!error || typeof error !== 'object') {
        return `Error ${index + 1}: ${safeStringify(error, 'Invalid error')}`
      }

      const message = safeStringify(error.message, 'Unknown error')
      const path = error.path ? safeStringify(error.path, 'unknown') : null

      return path ? `${path}: ${message}` : message
    })
    .filter((detail) => detail.length > 0)
}
