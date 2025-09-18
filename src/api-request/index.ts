// Export core API request functionality and types
export {
  apiRequest,
  type ApiRequestParams,
  type ApiRequestResponse,
  type ApiRetryConfig,
  ApiRequestError,
  ApiNetworkError
} from './api-request'

// Re-export the fixture-specific type
export { type ApiRequestFixtureParams } from './api-request-fixture'

// Export schema validation types and functionality
export type { EnhancedApiResponse } from './schema-validation/response-extension'

export type { EnhancedApiPromise } from './schema-validation/promise-extension'

export type {
  SupportedSchema,
  ValidationMode,
  ShapeValidator,
  ShapeAssertion,
  ValidateSchemaOptions,
  ValidationErrorDetail,
  ValidationResult,
  ValidatedApiResponse
} from './schema-validation/types'

export { ValidationError } from './schema-validation/types'
