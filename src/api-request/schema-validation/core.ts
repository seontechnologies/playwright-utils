/** Core schema validation engine */

// Zod types - will be loaded dynamically
import type { SupportedSchema, ValidationResult, ShapeAssertion } from './types'
import { validateShape } from './internal/shape-validator'
import { processSchema } from './internal/schema-processors'
import {
  buildValidationResult,
  buildErrorResult
} from './internal/result-builder'
import { getPageContext, getLogger } from '../../internal'
import {
  addApiCardToUI,
  type RequestDataInterface,
  type ResponseDataInterface
} from '../ui-display'

/** Check if validation UI should be displayed */
function shouldDisplayValidationUI(): boolean {
  return process.env.API_E2E_UI_MODE === 'true'
}

/** Display validation results in UI for plain function usage */
async function displayValidationUI(
  validationResult: ValidationResult
): Promise<void> {
  const page = getPageContext()
  if (!page || !validationResult.uiData) return

  try {
    const requestData: RequestDataInterface = {
      url: 'Schema Validation',
      method: 'VALIDATE',
      validationInfo: {
        schemaFormat: validationResult.schemaFormat,
        validationTime: validationResult.validationTime,
        success: validationResult.success,
        errorCount: validationResult.errors.length
      }
    }

    const responseData: ResponseDataInterface = {
      status: validationResult.success ? 200 : 400,
      statusClass: validationResult.success ? '2xx' : '4xx',
      statusText: validationResult.success ? 'Valid' : 'Invalid',
      validationResult: {
        icon: validationResult.uiData.statusIcon,
        summary: validationResult.uiData.validationSummary,
        schemaInfo: validationResult.uiData.schemaInfo,
        errors: validationResult.uiData.errorDetails,
        schema: validationResult.schema
      }
    }

    await addApiCardToUI(requestData, responseData, page, true)
  } catch (error) {
    await getLogger().warning(
      `Failed to display validation UI: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/** Detect schema format based on input */
export function detectSchemaFormat(
  schema: SupportedSchema
): ValidationResult['schemaFormat'] {
  if (typeof schema === 'string') {
    if (schema.endsWith('.yaml') || schema.endsWith('.yml')) {
      return 'YAML OpenAPI'
    }
    return 'JSON OpenAPI'
  }

  if (schema && typeof schema === 'object') {
    // Check if it's a Zod schema
    if (
      '_def' in schema &&
      typeof (schema as unknown as Record<string, unknown>).parse === 'function'
    ) {
      return 'Zod Schema'
    }

    // Check if it's an OpenAPI spec (has 'openapi' or 'swagger' field)
    if (
      (schema as Record<string, unknown>).openapi ||
      (schema as Record<string, unknown>).swagger
    ) {
      return 'JSON OpenAPI'
    }

    // Default to JSON Schema
    return 'JSON Schema'
  }

  return 'JSON Schema'
}

/** Main validation function using strategy pattern */
export async function validateSchema(
  data: unknown,
  schema: SupportedSchema,
  options: {
    shape?: ShapeAssertion
    path?: string
    endpoint?: string
    method?: string
    status?: number
    /** Enable UI display for this validation (or set API_E2E_UI_MODE=true) */
    uiMode?: boolean
    /** Validation mode - 'throw' (default) or 'return' */
    mode?: 'throw' | 'return'
    /**
     * Internal flag to skip UI display (used by chained API to avoid duplicates).
     * @internal Do not use directly; automatically set by response-extension.ts
     */
    _skipUI?: boolean
  } = {}
): Promise<ValidationResult> {
  const startTime = Date.now()

  try {
    const schemaFormat = detectSchemaFormat(schema)

    // Process schema using appropriate strategy
    const processingResult = await processSchema(
      data,
      schema,
      schemaFormat,
      options
    )

    let { validationErrors } = processingResult
    const { schemaForResult } = processingResult

    // Add shape validation if provided
    if (options.shape) {
      const shapeErrors = await validateShape(data, options.shape)
      validationErrors = [...validationErrors, ...shapeErrors]
    }

    const validationTime = Date.now() - startTime

    const result = buildValidationResult(
      validationErrors,
      schemaFormat,
      validationTime,
      schemaForResult
    )

    // Display UI if enabled (via option or environment variable)
    // Skip if _skipUI is set (used by chained API to avoid duplicate UI)
    if (!options._skipUI && (options.uiMode || shouldDisplayValidationUI())) {
      await displayValidationUI(result)
    }

    return result
  } catch (error) {
    const validationTime = Date.now() - startTime
    const result = buildErrorResult(
      error,
      detectSchemaFormat(schema),
      validationTime
    )

    // Display UI for errors too (skip if _skipUI is set)
    if (!options._skipUI && (options.uiMode || shouldDisplayValidationUI())) {
      await displayValidationUI(result)
    }

    return result
  }
}
