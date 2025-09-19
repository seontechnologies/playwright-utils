/** Response extension with validateSchema method */

import { expect } from '@playwright/test'
import { getLogger } from '../../../internal'
import { validateSchema as coreValidateSchema } from '../core'
import { ValidationError } from '../types'
import type {
  SupportedSchema,
  ValidateSchemaOptions,
  ValidatedApiResponse,
  ValidationResult
} from '../types'
import type { ApiRequestResponse } from '../../api-request'
import {
  addApiCardToUI,
  type RequestDataInterface,
  type ResponseDataInterface
} from '../../ui-display'
import type { Page } from '@playwright/test'

/**
 * Maps request context to standardized format for UI display
 */
function mapRequestContext(context?: {
  method: string
  path: string
  body?: unknown
  headers?: Record<string, string>
}) {
  return context
    ? {
        method: context.method,
        path: context.path,
        body: context.body,
        headers: context.headers
      }
    : undefined
}

/** Enhanced API response with validateSchema method */
export interface EnhancedApiResponse<T = unknown>
  extends ApiRequestResponse<T> {
  validateSchema<TValidated = T>(
    schema: SupportedSchema,
    options?: ValidateSchemaOptions
  ): Promise<ValidatedApiResponse<TValidated>>
}

/** Create successful validation response */
function createSuccessResponse<TValidated>(
  originalResponse: ApiRequestResponse<unknown>,
  validationResult: ValidationResult
): ValidatedApiResponse<TValidated> {
  return {
    status: originalResponse.status,
    body: originalResponse.body as unknown as TValidated,
    validationResult,
    originalResponse:
      originalResponse as unknown as ApiRequestResponse<TValidated>
  }
}

/** Create return-mode validation response */
function createReturnModeResponse<TValidated>(
  originalResponse: ApiRequestResponse<unknown>,
  validationResult: ValidationResult
): ValidatedApiResponse<TValidated> {
  return {
    status: originalResponse.status,
    body: originalResponse.body as unknown as TValidated,
    validationResult,
    originalResponse:
      originalResponse as unknown as ApiRequestResponse<TValidated>
  }
}

/** Handle validation failure by throwing Playwright-compatible error */
function handleValidationFailure(
  validationResult: ValidationResult,
  requestContext?: {
    method: string
    path: string
    body?: unknown
    headers?: Record<string, string>
  },
  responseContext?: {
    status: number
    body: unknown
  }
): never {
  const error = new ValidationError(
    `Schema validation failed: ${validationResult.errors.length} error(s) found`,
    validationResult,
    requestContext,
    responseContext
  )

  // Use Playwright's expect to throw for proper test integration
  try {
    expect(validationResult.success, error.message).toBe(true)
  } catch (playwrightError) {
    // Create a proper ValidationError that wraps the Playwright error
    const validationError = new ValidationError(
      error.message,
      validationResult,
      requestContext,
      responseContext
    )

    // Preserve both stacks for debugging
    if (playwrightError instanceof Error) {
      validationError.stack = `${validationError.stack}\n\nCaused by:\n${playwrightError.stack}`
    }

    throw validationError
  }

  // This should never be reached due to expect throwing
  throw error
}

/** Create fallback validation error for unexpected errors */
function createFallbackValidationError(
  error: unknown,
  startTime: number,
  requestContext?: {
    method: string
    path: string
    body?: unknown
    headers?: Record<string, string>
  },
  originalResponse?: ApiRequestResponse<unknown>
): ValidationError {
  const validationTime = Date.now() - startTime
  const fallbackResult: ValidationResult = {
    success: false,
    errors: [
      {
        path: 'validation',
        message: `Validation process failed: ${error instanceof Error ? error.message : String(error)}`,
        expected: 'successful validation',
        actual: 'validation error'
      }
    ],
    schemaFormat: 'JSON Schema',
    validationTime,
    uiData: {
      statusIcon: '❌',
      validationSummary: 'FAILED',
      schemaInfo: `Validation Error (${validationTime}ms)`,
      errorDetails: [error instanceof Error ? error.message : String(error)]
    }
  }

  return new ValidationError(
    `Schema validation process failed: ${error instanceof Error ? error.message : String(error)}`,
    fallbackResult,
    requestContext,
    originalResponse
      ? {
          status: originalResponse.status,
          body: originalResponse.body
        }
      : undefined
  )
}

/** Create enhanced response with validateSchema method */
export function createEnhancedResponse<T>(
  originalResponse: ApiRequestResponse<T>,
  requestContext?: {
    method: string
    path: string
    body?: unknown
    headers?: Record<string, string>
    page?: Page
    uiMode?: boolean
  }
): EnhancedApiResponse<T> {
  const enhanced = {
    ...originalResponse,
    validateSchema: async <TValidated = T>(
      schema: SupportedSchema,
      options: ValidateSchemaOptions = {}
    ): Promise<ValidatedApiResponse<TValidated>> => {
      const startTime = Date.now()

      try {
        // Run core validation
        const validationResult = await coreValidateSchema(
          originalResponse.body,
          schema,
          {
            shape: options.shape,
            path: options.path,
            endpoint: options.endpoint,
            method: options.method,
            status: options.status
          }
        )

        // Display validation results in UI if enabled
        if (
          options.uiMode ||
          shouldDisplayValidationUI() ||
          requestContext?.uiMode
        ) {
          await displayValidationUI({
            validationResult,
            requestContext: mapRequestContext(requestContext),
            responseContext: {
              status: originalResponse.status,
              body: originalResponse.body
            },
            page: requestContext?.page
          })
        }

        // Handle validation failure based on mode
        if (!validationResult.success) {
          if (options.mode === 'return') {
            return createReturnModeResponse<TValidated>(
              originalResponse,
              validationResult
            )
          } else {
            handleValidationFailure(
              validationResult,
              mapRequestContext(requestContext),
              {
                status: originalResponse.status,
                body: originalResponse.body
              }
            )
          }
        }

        // Validation successful
        return createSuccessResponse<TValidated>(
          originalResponse,
          validationResult
        )
      } catch (error) {
        // Handle unexpected errors during validation
        if (
          error instanceof ValidationError ||
          (error as Record<string, unknown>).validationResult
        ) {
          throw error // Re-throw validation errors as-is
        }

        throw createFallbackValidationError(
          error,
          startTime,
          mapRequestContext(requestContext),
          originalResponse
        )
      }
    }
  }

  return enhanced
}

/** Check if validation UI should be displayed */
function shouldDisplayValidationUI(): boolean {
  const envUiMode = process.env.API_E2E_UI_MODE
  return envUiMode === 'true'
}

/** Display validation results in UI */
async function displayValidationUI(params: {
  validationResult: ValidationResult
  requestContext?: {
    method: string
    path: string
    body?: unknown
    headers?: Record<string, string>
  }
  responseContext?: {
    status: number
    body: unknown
  }
  page?: Page
}): Promise<void> {
  try {
    if (!params.validationResult.uiData) return

    const { validationResult, requestContext, responseContext, page } = params

    // Create validation-specific request data
    const requestData: RequestDataInterface = {
      url: requestContext?.path || '/unknown',
      method: requestContext?.method || 'UNKNOWN',
      headers: requestContext?.headers,
      data: requestContext?.body,
      params: undefined,
      // Add validation-specific markers
      validationInfo: {
        schemaFormat: validationResult.schemaFormat,
        validationTime: validationResult.validationTime,
        success: validationResult.success,
        errorCount: validationResult.errors.length
      }
    }

    // Create validation-enhanced response data
    const responseData: ResponseDataInterface = {
      status: responseContext?.status || 0,
      statusClass: responseContext?.status
        ? Math.floor(responseContext.status / 100) + 'xx'
        : '0xx',
      statusText: 'OK',
      headers: {},
      body: responseContext?.body,
      duration: validationResult.validationTime,
      // Add validation results
      validationResult: validationResult.uiData
        ? {
            icon: validationResult.uiData.statusIcon,
            summary: validationResult.uiData.validationSummary,
            schemaInfo: validationResult.uiData.schemaInfo,
            errors: validationResult.uiData.errorDetails,
            schema: validationResult.schema
          }
        : undefined
    }

    await addApiCardToUI(requestData, responseData, page, true)

    // Also log validation results
    if (validationResult.success) {
      await getLogger().info(
        `✅ Schema validation passed (${validationResult.schemaFormat}, ${validationResult.validationTime}ms)`
      )
    } else {
      await getLogger().warning(
        `❌ Schema validation failed (${validationResult.errors.length} errors):`
      )
      for (const error of validationResult.errors) {
        await getLogger().warning(`  - ${error.path}: ${error.message}`)
      }
    }
  } catch (error) {
    // Silent failure for UI display issues
    await getLogger().debug(`Validation UI display failed: ${error}`)
  }
}
