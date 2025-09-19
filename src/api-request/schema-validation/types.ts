/** Schema validation types for API request responses */

import type { ZodSchema } from 'zod'
import type { ApiRequestResponse } from '../api-request'

/** Supported schema formats */
export type SupportedSchema =
  | object // JSON Schema object
  | ZodSchema // Zod schema
  | string // YAML file path or OpenAPI spec

/** Validation mode - throw errors or return results */
export type ValidationMode = 'throw' | 'return'

/** Shape validation function for custom assertions */
export type ShapeValidator<T = unknown> = (value: T) => boolean | void

/** Shape validation object with nested assertions */
export type ShapeAssertion = {
  [key: string]: unknown | ShapeValidator | ShapeAssertion
}

/** Options for validateSchema method */
export type ValidateSchemaOptions = {
  /** Custom shape assertions to run alongside schema validation */
  shape?: ShapeAssertion
  /** Validation mode - 'throw' (default) or 'return' */
  mode?: ValidationMode
  /** Enable UI mode display for this validation */
  uiMode?: boolean
  /** For OpenAPI schemas - target specific path (interchangeable with endpoint) */
  path?: string
  /** For OpenAPI schemas - target specific endpoint (interchangeable with path) */
  endpoint?: string
  /** For OpenAPI schemas - target specific HTTP method */
  method?: string
  /** For OpenAPI schemas - target specific status code */
  status?: number
}

/** Validation error details */
export type ValidationErrorDetail = {
  /** JSON path to the error location */
  path: string
  /** Error message */
  message: string
  /** Expected value or constraint */
  expected?: unknown
  /** Actual value that failed validation */
  actual?: unknown
}

/** Validation result details */
export type ValidationResult = {
  /** Whether validation passed */
  success: boolean
  /** List of validation errors (empty if success) */
  errors: ValidationErrorDetail[]
  /** Schema format that was used */
  schemaFormat: 'JSON Schema' | 'Zod Schema' | 'YAML OpenAPI' | 'JSON OpenAPI'
  /** Validation execution time in milliseconds */
  validationTime: number
  /** The actual schema used for validation (for debugging) */
  schema?: object
  /** UI display data if uiMode is enabled */
  uiData?: {
    statusIcon: '✅' | '❌'
    validationSummary: string
    schemaInfo: string
    errorDetails?: string[]
  }
}

/** Enhanced API response with validation result */
export type ValidatedApiResponse<T = unknown> = ApiRequestResponse<T> & {
  /** Validation result details */
  validationResult: ValidationResult
  /** Original response before validation */
  originalResponse: ApiRequestResponse<T>
}

/** Validation error thrown when schema validation fails */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationResult: ValidationResult,
    public readonly requestContext?: {
      method: string
      path: string
      body?: unknown
      headers?: Record<string, string>
    },
    public readonly responseContext?: {
      status: number
      body: unknown
    }
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
