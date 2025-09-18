/** Schema validation exports */

export { validateSchema, detectSchemaFormat } from './core'
export type {
  SupportedSchema,
  ValidationMode,
  ShapeValidator,
  ShapeAssertion,
  ValidateSchemaOptions,
  ValidationErrorDetail,
  ValidationResult,
  ValidatedApiResponse
} from './types'
export { ValidationError } from './types'

// Export the validateSchema fixture
export { test } from './fixture'
