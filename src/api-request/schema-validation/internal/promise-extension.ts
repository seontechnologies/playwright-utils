/** Promise extension to add validateSchema method to promises */

import type {
  SupportedSchema,
  ValidateSchemaOptions,
  ValidatedApiResponse
} from '../types'
import type { EnhancedApiResponse } from './response-extension'

/** Enhanced Promise with validateSchema method */
export interface EnhancedApiPromise<T = unknown> extends Promise<
  EnhancedApiResponse<T>
> {
  validateSchema<TValidated = T>(
    schema: SupportedSchema,
    options?: ValidateSchemaOptions
  ): Promise<ValidatedApiResponse<TValidated>>
}

/** Create enhanced promise with validateSchema method */
export function createEnhancedPromise<T>(
  promise: Promise<EnhancedApiResponse<T>>
): EnhancedApiPromise<T> {
  const enhanced = promise as EnhancedApiPromise<T>

  enhanced.validateSchema = async <TValidated = T>(
    schema: SupportedSchema,
    options: ValidateSchemaOptions = {}
  ): Promise<ValidatedApiResponse<TValidated>> => {
    const response = await promise
    return response.validateSchema<TValidated>(schema, options)
  }

  return enhanced
}
