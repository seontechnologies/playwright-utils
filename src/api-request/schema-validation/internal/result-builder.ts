/**
 * Validation Result Builder
 *
 * This module provides utilities for building consistent validation results
 * with proper formatting, logging, and UI data generation.
 *
 * @module ResultBuilder
 */

import type { ValidationResult, ValidationErrorDetail } from '../types'
import { getLogger } from '../../../internal'
import { safeErrorDetails, safeStringify } from './safe-error-serializer'

/**
 * Build a successful validation result
 *
 * @param validationErrors - Array of validation errors (should be empty for success)
 * @param schemaFormat - Format of the schema that was validated
 * @param validationTime - Time taken for validation in milliseconds
 * @param schema - The processed schema object
 * @returns Complete validation result object
 */
export function buildValidationResult(
  validationErrors: ValidationErrorDetail[],
  schemaFormat: ValidationResult['schemaFormat'],
  validationTime: number,
  schema?: object
): ValidationResult {
  const success = validationErrors.length === 0

  // Log the extracted schema if DEBUG is enabled
  if (process.env.DEBUG === 'true' && schema) {
    void getLogger().debug(
      `Extracted schema for validation: ${JSON.stringify(schema, null, 2)}`
    )
  }

  return {
    success,
    errors: validationErrors,
    schemaFormat,
    validationTime,
    schema,
    uiData: {
      statusIcon: success ? '✅' : '❌',
      validationSummary: success ? 'PASSED' : 'FAILED',
      schemaInfo: `${schemaFormat} (${validationTime}ms)`,
      errorDetails: success ? undefined : safeErrorDetails(validationErrors)
    }
  }
}

/**
 * Build an error validation result for when validation setup fails
 *
 * @param error - The error that occurred during validation setup
 * @param schemaFormat - Format of the schema that was being validated
 * @param validationTime - Time taken before the error occurred
 * @returns Complete validation result object with error information
 */
export function buildErrorResult(
  error: unknown,
  schemaFormat: ValidationResult['schemaFormat'],
  validationTime: number
): ValidationResult {
  const errorMessage =
    error instanceof Error
      ? error.message
      : safeStringify(error, 'Unknown error')

  return {
    success: false,
    errors: [
      {
        path: 'schema',
        message: `Schema validation setup failed: ${errorMessage}`,
        expected: 'valid schema',
        actual: 'invalid schema'
      }
    ],
    schemaFormat,
    validationTime,
    uiData: {
      statusIcon: '❌',
      validationSummary: 'FAILED',
      schemaInfo: `Schema Error (${validationTime}ms)`,
      errorDetails: [errorMessage]
    }
  }
}

/**
 * Create a validation error object with consistent formatting
 *
 * @param path - JSON path to the invalid property
 * @param message - Human-readable error message
 * @param expected - Expected value or type
 * @param actual - Actual value or type that failed validation
 * @returns Formatted validation error object
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
 * Format validation time with appropriate units
 *
 * @param milliseconds - Time in milliseconds
 * @returns Formatted time string with units
 */
export function formatValidationTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`
  }
}

/**
 * Generate UI-friendly status icon based on validation result
 *
 * @param success - Whether validation was successful
 * @param hasWarnings - Whether there are warnings (future use)
 * @returns Appropriate status icon
 */
export function getStatusIcon(success: boolean, hasWarnings = false): string {
  if (success) {
    return hasWarnings ? '⚠️' : '✅'
  }
  return '❌'
}

/**
 * Generate a summary of validation errors for UI display
 *
 * @param errors - Array of validation errors
 * @param maxErrors - Maximum number of errors to include in summary
 * @returns Array of formatted error strings for UI display
 */
export function summarizeErrors(
  errors: ValidationErrorDetail[],
  maxErrors = 10
): string[] {
  const summary = errors
    .slice(0, maxErrors)
    .map((e) => `${e.path}: ${e.message}`)

  if (errors.length > maxErrors) {
    summary.push(`... and ${errors.length - maxErrors} more errors`)
  }

  return summary
}
