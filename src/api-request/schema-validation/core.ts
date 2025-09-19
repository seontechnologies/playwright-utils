/** Core schema validation engine */

// Zod types - will be loaded dynamically
import type { SupportedSchema, ValidationResult, ShapeAssertion } from './types'
import { validateShape } from './internal/shape-validator'
import { processSchema } from './internal/schema-processors'
import {
  buildValidationResult,
  buildErrorResult
} from './internal/result-builder'

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

    return buildValidationResult(
      validationErrors,
      schemaFormat,
      validationTime,
      schemaForResult
    )
  } catch (error) {
    const validationTime = Date.now() - startTime
    return buildErrorResult(error, detectSchemaFormat(schema), validationTime)
  }
}
