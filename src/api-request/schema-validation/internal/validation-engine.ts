/**
 * Advanced Schema Validation Engine
 *
 * This module provides comprehensive validation for JSON Schema objects with support for:
 * - Complex schema patterns (anyOf, oneOf, allOf)
 * - Required field validation
 * - Property-level validation
 * - Nested schema validation
 * - AJV integration with caching
 *
 * @module ValidationEngine
 */

import type { ValidationErrorDetail } from '../types'

/**
 * Schema compilation cache to avoid expensive recompilations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compilationCache = new Map<string, any>()
const MAX_COMPILATION_CACHE_SIZE = 200

/**
 * Gets or creates an AJV instance for validation
 *
 * @returns AJV validation instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAjvInstance(): any {
  // Lazy load AJV only when needed
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Ajv = require('ajv')
    return new Ajv({
      allErrors: true,
      verbose: true,
      strict: false
    })
  } catch {
    throw new Error(
      'AJV is required for JSON Schema validation. Install with: npm install ajv'
    )
  }
}

/**
 * Gets a cached validator for the given schema, creating one if needed
 *
 * @param schema - Schema to compile
 * @param ajvInstance - AJV instance to use for compilation
 * @returns Compiled validator function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCachedValidator(schema: any, ajvInstance: any): any {
  const cacheKey = JSON.stringify(schema)

  // Check if validator is already cached
  if (compilationCache.has(cacheKey)) {
    return compilationCache.get(cacheKey)
  }

  // Implement LRU-style eviction if cache is getting too large
  if (compilationCache.size >= MAX_COMPILATION_CACHE_SIZE) {
    // Remove the oldest entry (first key in the Map)
    const firstKey = compilationCache.keys().next().value
    if (firstKey !== undefined) {
      compilationCache.delete(firstKey)
    }
  }

  // Compile and cache the validator
  const validator = ajvInstance.compile(schema)
  compilationCache.set(cacheKey, validator)

  return validator
}

/**
 * Validates basic data structure against schema type requirements
 *
 * Ensures the root data type matches the schema expectation before
 * proceeding with detailed property validation.
 *
 * @param data - Data to validate
 * @param schema - Schema with type definition
 * @returns Validation error if structure is invalid, null if valid
 */
function validateBasicStructure(
  data: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
): ValidationErrorDetail | null {
  if (schema.type === 'object' && typeof data !== 'object') {
    return {
      path: 'root',
      message: 'Expected object type',
      expected: 'object',
      actual: typeof data
    }
  }

  if (schema.type === 'array' && !Array.isArray(data)) {
    return {
      path: 'root',
      message: 'Expected array type',
      expected: 'array',
      actual: typeof data
    }
  }

  return null
}

/**
 * Validates required fields in the data object
 *
 * Checks that all fields listed in schema.required are present
 * in the data object, regardless of their values.
 *
 * @param dataObj - Data object to check
 * @param schema - Schema with required field definitions
 * @returns Array of validation errors for missing required fields
 */
function validateRequiredFields(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataObj: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = []

  if (!schema.required || !Array.isArray(schema.required)) {
    return errors
  }

  for (const field of schema.required) {
    if (!(field in dataObj)) {
      errors.push({
        path: `/${field}`,
        message: `Missing required field: ${field}`,
        expected: field,
        actual: 'undefined'
      })
    }
  }

  return errors
}

/**
 * Validates a value against an anyOf schema constraint
 *
 * The anyOf constraint passes if the value matches at least one
 * of the provided schema options. This is more flexible than oneOf
 * which requires exactly one match.
 *
 * @param value - Value to validate
 * @param prop - Property schema containing anyOf definitions
 * @param key - Property name for error reporting
 * @returns Validation error if no anyOf schemas match, null if valid
 */
function validateAnyOfProperty(
  value: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prop: any,
  key: string
): ValidationErrorDetail | null {
  // Skip validation if anyOf is not defined or value is undefined
  if (!prop.anyOf || value === undefined) {
    return null
  }

  // Test value against each anyOf option
  for (const option of prop.anyOf) {
    try {
      const ajvInstance = getAjvInstance()
      const validate = getCachedValidator(option, ajvInstance)

      if (validate(value)) {
        return null // Value matches at least one schema
      }
    } catch {
      // Continue to next option if compilation fails
      continue
    }
  }

  return {
    path: `/${key}`,
    message: 'Value does not match any of the anyOf schemas',
    expected: 'one or more of anyOf schemas',
    actual:
      typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value
  }
}

/**
 * Validates a value against a oneOf schema constraint
 *
 * The oneOf constraint passes if the value matches exactly one
 * of the provided schema options. Matching zero or multiple
 * schemas results in validation failure.
 *
 * @param value - Value to validate
 * @param prop - Property schema containing oneOf definitions
 * @param key - Property name for error reporting
 * @returns Validation error if not exactly one oneOf schema matches, null if valid
 */
function validateOneOfProperty(
  value: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prop: any,
  key: string
): ValidationErrorDetail | null {
  if (!prop.oneOf || value === undefined) {
    return null
  }

  let matchCount = 0
  const matchingSchemas: string[] = []

  for (let i = 0; i < prop.oneOf.length; i++) {
    const option = prop.oneOf[i]
    try {
      const ajvInstance = getAjvInstance()
      const validate = getCachedValidator(option, ajvInstance)

      if (validate(value)) {
        matchCount++
        matchingSchemas.push(`schema-${i}`)
      }
    } catch {
      // Schema compilation error - skip this option
      continue
    }
  }

  // oneOf requires exactly one match
  if (matchCount === 1) {
    return null
  }

  return {
    path: `/${key}`,
    message:
      matchCount === 0
        ? 'Value does not match any of the oneOf schemas'
        : `Value matches ${matchCount} schemas (${matchingSchemas.join(', ')}), but should match exactly one`,
    expected: 'exactly one of oneOf schemas',
    actual: value
  }
}

/**
 * Validates a value against a standard property schema
 *
 * Handles basic property validation using AJV compilation
 * for properties that don't use complex constraints like
 * anyOf or oneOf.
 *
 * @param value - Value to validate
 * @param prop - Property schema definition
 * @param key - Property name for error reporting
 * @returns Validation error if property doesn't match schema, null if valid
 */
function validateStandardProperty(
  value: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prop: any,
  key: string
): ValidationErrorDetail | null {
  if (!prop.type || value === undefined) {
    return null
  }

  try {
    const ajvInstance = getAjvInstance()
    const validate = getCachedValidator(prop, ajvInstance)

    if (validate(value)) {
      return null
    }

    // Extract meaningful error message from AJV
    const ajvError = validate.errors?.[0]
    const errorMessage = ajvError?.message || 'Validation failed'
    const expectedValue = prop.type || 'valid value'
    const actualValue = typeof value

    return {
      path: `/${key}`,
      message: `${key}: ${errorMessage}`,
      expected: expectedValue,
      actual: actualValue
    }
  } catch (error) {
    return {
      path: `/${key}`,
      message: `Schema compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      expected: 'valid schema',
      actual: 'compilation failed'
    }
  }
}

/**
 * Validates all properties defined in a schema against corresponding data values
 *
 * This function orchestrates property-level validation by applying the appropriate
 * validation strategy (anyOf, oneOf, or standard) for each property defined in
 * the schema.
 *
 * @param dataObj - Data object containing values to validate
 * @param schema - Schema object with property definitions
 * @param fullSpec - Complete schema specification for context
 * @returns Array of validation errors for invalid properties
 */
function validateSchemaProperties(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataObj: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = []

  if (!schema.properties || typeof schema.properties !== 'object') {
    return errors
  }

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const value = dataObj[key]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prop = propSchema as any

    // Apply validation strategies in order of complexity
    // 1. Try anyOf validation first (most flexible)
    const anyOfError = validateAnyOfProperty(value, prop, key)
    if (anyOfError) {
      errors.push(anyOfError)
      continue // Skip other validations if anyOf fails
    }

    // 2. Try oneOf validation (strict single match)
    const oneOfError = validateOneOfProperty(value, prop, key)
    if (oneOfError) {
      errors.push(oneOfError)
      continue // Skip standard validation if oneOf fails
    }

    // 3. Fall back to standard property validation
    const standardError = validateStandardProperty(value, prop, key)
    if (standardError) {
      errors.push(standardError)
    }
  }

  return errors
}

/**
 * Main validation function with comprehensive anyOf/oneOf support
 *
 * This is the primary entry point for complex JSON Schema validation.
 * It orchestrates all validation steps:
 * 1. Basic structure validation (type checking)
 * 2. Required field validation
 * 3. Property-level validation with complex constraint support
 *
 * @param data - Data to validate against the schema
 * @param schema - JSON Schema object with validation rules
 * @param fullSpec - Complete schema specification for reference resolution
 * @returns Array of validation errors (empty array means valid)
 *
 * @example
 * ```typescript
 * const schema = {
 *   type: 'object',
 *   required: ['name'],
 *   properties: {
 *     name: { type: 'string' },
 *     age: { anyOf: [{ type: 'number' }, { type: 'null' }] }
 *   }
 * }
 *
 * const errors = validateWithAnyOfSupport(data, schema)
 * if (errors.length === 0) {
 *   console.log('Data is valid!')
 * }
 * ```
 */
export function validateWithAnyOfSupport(
  data: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
): ValidationErrorDetail[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataObj = data as any

  // Step 1: Validate basic data structure
  const structureError = validateBasicStructure(data, schema)
  if (structureError) {
    return [structureError] // Early return for structural failures
  }

  // Step 2: Collect all validation errors
  const errors: ValidationErrorDetail[] = []

  // Step 3: Validate required fields
  const requiredFieldErrors = validateRequiredFields(dataObj, schema)
  errors.push(...requiredFieldErrors)

  // Step 4: Validate all schema properties
  const propertyErrors = validateSchemaProperties(dataObj, schema)
  errors.push(...propertyErrors)

  return errors
}

/**
 * Helper function to create detailed validation error objects
 *
 * @param path - JSON path to the invalid property
 * @param message - Human-readable error description
 * @param expected - Expected value or type
 * @param actual - Actual value or type that failed validation
 * @returns Standardized validation error object
 */
export function createValidationError(
  path: string,
  message: string,
  expected: unknown,
  actual: unknown
): ValidationErrorDetail {
  return {
    path,
    message,
    expected,
    actual
  }
}

/**
 * Helper function to format validation errors for logging
 *
 * @param errors - Array of validation errors
 * @returns Formatted error summary string
 */
export function formatValidationErrors(
  errors: ValidationErrorDetail[]
): string {
  if (errors.length === 0) {
    return 'No validation errors'
  }

  return errors
    .map(
      (error) =>
        `${error.path}: ${error.message} (expected: ${error.expected}, got: ${error.actual})`
    )
    .join('\n')
}
