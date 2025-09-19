/**
 * Shape Validation Engine
 *
 * This module provides advanced shape validation capabilities for API responses,
 * allowing flexible validation patterns including nested objects, functions, and
 * direct value comparisons.
 *
 * @module ShapeValidator
 */

import type { ValidationErrorDetail, ShapeAssertion } from '../types'

/**
 * Execute shape validation assertions against data
 *
 * Shape validation provides a flexible way to validate data structure and values
 * without requiring formal schemas. It supports:
 * - Direct value comparisons
 * - Function-based validators
 * - Nested object validation
 * - Custom validation logic
 *
 * @param data - Data to validate against shape assertions
 * @param shapeAssertion - Shape validation rules
 * @param basePath - Base path for error reporting (used internally for nesting)
 * @returns Array of validation errors (empty if valid)
 *
 * @example
 * ```typescript
 * // Direct value validation
 * const errors = await validateShape(
 *   { status: 200, name: "test" },
 *   { status: 200, name: (value) => typeof value === 'string' }
 * )
 *
 * // Nested validation
 * const errors = await validateShape(
 *   { user: { id: 123, name: "John" } },
 *   { user: { id: 123, name: (value) => value.length > 0 } }
 * )
 * ```
 */
export async function validateShape(
  data: unknown,
  shapeAssertion: ShapeAssertion,
  basePath = ''
): Promise<ValidationErrorDetail[]> {
  const errors: ValidationErrorDetail[] = []

  for (const [key, assertion] of Object.entries(shapeAssertion)) {
    const currentPath = basePath ? `${basePath}.${key}` : key
    const dataObj = data as Record<string, unknown>
    const value = dataObj[key]

    if (typeof assertion === 'function') {
      // Shape validator function
      try {
        const result = assertion(value)
        if (result === false) {
          errors.push({
            path: currentPath,
            message: `Shape validation failed for ${key}`,
            expected: 'validation to pass',
            actual: value
          })
        }
      } catch (error) {
        errors.push({
          path: currentPath,
          message: `Shape validation error: ${error instanceof Error ? error.message : String(error)}`,
          expected: 'validation to pass',
          actual: value
        })
      }
    } else if (
      typeof assertion === 'object' &&
      assertion !== null &&
      !Array.isArray(assertion)
    ) {
      // Nested shape assertion
      if (typeof value === 'object' && value !== null) {
        const nestedErrors = await validateShape(
          value,
          assertion as ShapeAssertion,
          currentPath
        )
        errors.push(...nestedErrors)
      } else {
        errors.push({
          path: currentPath,
          message: 'Expected object for nested shape validation',
          expected: 'object',
          actual: typeof value
        })
      }
    } else {
      // Direct value comparison
      if (value !== assertion) {
        errors.push({
          path: currentPath,
          message: `Shape assertion failed: expected ${assertion}, got ${value}`,
          expected: assertion,
          actual: value
        })
      }
    }
  }

  return errors
}

/**
 * Create a shape validator function for common validation patterns
 *
 * @param validatorFn - Function that returns true if value is valid
 * @param errorMessage - Custom error message for validation failures
 * @returns Shape validator function
 *
 * @example
 * ```typescript
 * const emailValidator = createShapeValidator(
 *   (value) => typeof value === 'string' && value.includes('@'),
 *   'Must be a valid email address'
 * )
 *
 * const errors = await validateShape(
 *   { email: 'invalid-email' },
 *   { email: emailValidator }
 * )
 * ```
 */
export function createShapeValidator(
  validatorFn: (value: unknown) => boolean,
  errorMessage: string
): (value: unknown) => boolean {
  return (value: unknown) => {
    const isValid = validatorFn(value)
    if (!isValid) {
      throw new Error(errorMessage)
    }
    return isValid
  }
}

/**
 * Common shape validators for typical validation scenarios
 */
export const ShapeValidators = {
  /**
   * Validates that a value is a non-empty string
   */
  nonEmptyString: (value: unknown) =>
    typeof value === 'string' && value.length > 0,

  /**
   * Validates that a value is a positive number
   */
  positiveNumber: (value: unknown) => typeof value === 'number' && value > 0,

  /**
   * Validates that a value is a non-empty array
   */
  nonEmptyArray: (value: unknown) => Array.isArray(value) && value.length > 0,

  /**
   * Validates that a value exists (not null or undefined)
   */
  exists: (value: unknown) => value !== null && value !== undefined,

  /**
   * Creates a validator for string length constraints
   */
  stringLength: (min: number, max?: number) => (value: unknown) => {
    if (typeof value !== 'string') return false
    if (value.length < min) return false
    if (max !== undefined && value.length > max) return false
    return true
  },

  /**
   * Creates a validator for numeric range constraints
   */
  numberRange: (min: number, max: number) => (value: unknown) => {
    if (typeof value !== 'number') return false
    return value >= min && value <= max
  },

  /**
   * Creates a validator that checks if value matches one of the allowed values
   */
  oneOf:
    <T>(...allowedValues: T[]) =>
    (value: unknown): value is T => {
      return allowedValues.includes(value as T)
    }
} as const
