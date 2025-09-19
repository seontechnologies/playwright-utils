/**
 * Schema Processing Strategies
 *
 * This module implements the Strategy pattern for processing different schema formats.
 * Each processor handles a specific schema type and validation logic.
 *
 * @module SchemaProcessors
 */

import type { ValidationErrorDetail, SupportedSchema } from '../types'
import { loadSchemaFromFile } from './file-loader'
import { extractOpenApiSchema } from './openapi-handler'
import { validateWithAnyOfSupport } from './validation-engine'

/**
 * Common options for schema processing
 */
export interface SchemaProcessingOptions {
  shape?: unknown
  path?: string
  endpoint?: string
  method?: string
  status?: number
}

/**
 * Result of schema processing
 */
export interface SchemaProcessingResult {
  validationErrors: ValidationErrorDetail[]
  processedSchema: object
  schemaForResult?: object
}

/**
 * Maximum input size for validation (1MB)
 */
const MAX_INPUT_SIZE = 1024 * 1024

/**
 * Base interface for schema processors
 */
export interface SchemaProcessor {
  validate(
    data: unknown,
    schema: SupportedSchema,
    options: SchemaProcessingOptions
  ): Promise<SchemaProcessingResult>
}

/**
 * Validates input data before processing to prevent DoS attacks
 *
 * @param data - Input data to validate
 * @throws Error if input is invalid or too large
 */
function validateInput(data: unknown): void {
  if (data === null || data === undefined) {
    throw new Error('Input cannot be null or undefined')
  }

  try {
    const serialized = JSON.stringify(data)
    if (serialized.length > MAX_INPUT_SIZE) {
      throw new Error(
        `Input too large for validation (${serialized.length} bytes, max: ${MAX_INPUT_SIZE})`
      )
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('circular')) {
      throw new Error(
        'Input contains circular references and cannot be validated'
      )
    }
    throw error
  }
}

/**
 * Standardized error transformation utility
 *
 * @param error - Raw error from validation library
 * @param schemaType - Type of schema that produced the error
 * @param path - Path context for the error
 * @returns Standardized validation error
 */
function createStandardValidationError(
  error: unknown,
  schemaType: string,
  path = 'root'
): ValidationErrorDetail {
  if (error instanceof Error) {
    return {
      path,
      message: `${schemaType} validation failed: ${error.message}`,
      expected: 'valid data',
      actual: 'invalid'
    }
  }

  return {
    path,
    message: `${schemaType} validation failed: Unknown error`,
    expected: 'valid data',
    actual: 'invalid'
  }
}

/**
 * AJV instance cache for schema compilation with memory management
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ajvInstanceCache = new Map<string, any>()
const MAX_AJV_INSTANCE_CACHE_SIZE = 50

/**
 * Get or create cached AJV instance for specs with components
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAjvInstance(fullSpec?: Record<string, unknown>): any {
  if (!fullSpec?.components) {
    return getDefaultAjv()
  }

  // Create a stable cache key from components
  const cacheKey = JSON.stringify(fullSpec.components)

  if (!ajvInstanceCache.has(cacheKey)) {
    // Implement LRU-style eviction if cache is too large
    if (ajvInstanceCache.size >= MAX_AJV_INSTANCE_CACHE_SIZE) {
      const firstKey = ajvInstanceCache.keys().next().value
      if (firstKey) {
        ajvInstanceCache.delete(firstKey)
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ajv = require('ajv')
      ajvInstanceCache.set(
        cacheKey,
        new Ajv({
          strict: false,
          schemas: [fullSpec]
        })
      )
    } catch {
      throw new Error(
        'AJV is required for JSON Schema validation. Install with: npm install ajv'
      )
    }
  }

  return ajvInstanceCache.get(cacheKey)!
}

/**
 * Creates a default AJV instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDefaultAjv(): any {
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
 * Validate data against JSON Schema
 */
function validateWithJsonSchema(
  data: unknown,
  schema: object,
  fullSpec?: Record<string, unknown>
): ValidationErrorDetail[] {
  // Check if schema has anyOf/oneOf at the property level
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schemaObj = schema as any
  const hasAnyOfProperties =
    schemaObj.properties &&
    Object.values(schemaObj.properties).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prop: any) => prop?.anyOf || prop?.oneOf
    )

  if (hasAnyOfProperties) {
    // Handle anyOf/oneOf validation manually for better control
    return validateWithAnyOfSupport(data, schema)
  }

  // Standard validation for schemas without anyOf/oneOf
  const ajvInstance = getAjvInstance(fullSpec)
  const validate = ajvInstance.compile(schema)
  const valid = validate(data)

  if (valid) {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (validate.errors || []).map((error: any) => ({
    path: error.instancePath || error.schemaPath || 'root',
    message: error.message || 'Validation failed',
    expected: error.schema,
    actual: error.data
  }))
}

/**
 * Validate data against Zod Schema
 */
function validateWithZodSchema(
  data: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
): ValidationErrorDetail[] {
  try {
    // Lazy load Zod only when needed
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('zod')
    } catch {
      throw new Error(
        'Zod is required for Zod schema validation. Install with: npm install zod'
      )
    }

    schema.parse(data)
    return []
  } catch (error) {
    // Try to access ZodError for error handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ZodError: any = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const zod = require('zod')
      ZodError = zod.ZodError
    } catch {
      // Zod not available, handle gracefully
    }

    if (ZodError && error instanceof ZodError) {
      // Handle both Zod v3 and v4 compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const issues = (error as any).issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return issues.map((zodError: any) => ({
        path: zodError.path.join('.') || 'root',
        message: zodError.message,
        expected: zodError.code,
        actual: 'invalid'
      }))
    }

    return [
      {
        path: 'root',
        message:
          error instanceof Error ? error.message : 'Unknown validation error',
        expected: 'valid data',
        actual: 'invalid'
      }
    ]
  }
}

/**
 * File-based schema processor (JSON/YAML files)
 */
class FileSchemaProcessor implements SchemaProcessor {
  async validate(
    data: unknown,
    schema: string,
    options: SchemaProcessingOptions
  ): Promise<SchemaProcessingResult> {
    try {
      // Security: Validate input before processing
      validateInput(data)
    } catch (error) {
      return {
        validationErrors: [
          createStandardValidationError(error, 'File Schema', 'input')
        ],
        processedSchema: {},
        schemaForResult: undefined
      }
    }

    const loadedSchema = await loadSchemaFromFile(schema)

    // Check if it's an OpenAPI file
    const schemaObj = loadedSchema as Record<string, unknown>
    const isOpenApi = schemaObj.openapi || schemaObj.swagger

    if (isOpenApi) {
      const targetPath = options.path || options.endpoint
      const processedSchema = extractOpenApiSchema(
        schemaObj,
        targetPath,
        options.method,
        options.status
      )

      const validationErrors = validateWithJsonSchema(
        data,
        processedSchema,
        schemaObj
      )

      return {
        validationErrors,
        processedSchema,
        schemaForResult: processedSchema
      }
    } else {
      // Regular JSON Schema file
      const validationErrors = validateWithJsonSchema(data, loadedSchema)

      return {
        validationErrors,
        processedSchema: loadedSchema,
        schemaForResult: loadedSchema
      }
    }
  }
}

/**
 * Zod schema processor
 */
class ZodSchemaProcessor implements SchemaProcessor {
  async validate(
    data: unknown,
    schema: SupportedSchema,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: SchemaProcessingOptions
  ): Promise<SchemaProcessingResult> {
    try {
      // Security: Validate input before processing
      validateInput(data)
    } catch (error) {
      return {
        validationErrors: [
          createStandardValidationError(error, 'Zod Schema', 'input')
        ],
        processedSchema: {},
        schemaForResult: undefined
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zodSchema = schema as any
    const validationErrors = validateWithZodSchema(data, zodSchema)

    return {
      validationErrors,
      processedSchema: zodSchema,
      schemaForResult: { type: 'ZodSchema', shape: 'See Zod definition' }
    }
  }
}

/**
 * OpenAPI object processor
 */
class OpenApiSchemaProcessor implements SchemaProcessor {
  async validate(
    data: unknown,
    schema: SupportedSchema,
    options: SchemaProcessingOptions
  ): Promise<SchemaProcessingResult> {
    // Security: Validate input before processing
    validateInput(data)
    const openApiSpec = schema as Record<string, unknown>
    const targetPath = options.path || options.endpoint

    const processedSchema = extractOpenApiSchema(
      openApiSpec,
      targetPath,
      options.method,
      options.status
    )

    const validationErrors = validateWithJsonSchema(
      data,
      processedSchema,
      openApiSpec
    )

    return {
      validationErrors,
      processedSchema,
      schemaForResult: processedSchema
    }
  }
}

/**
 * JSON Schema object processor
 */
class JsonSchemaProcessor implements SchemaProcessor {
  async validate(
    data: unknown,
    schema: SupportedSchema,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: SchemaProcessingOptions
  ): Promise<SchemaProcessingResult> {
    // Security: Validate input before processing
    validateInput(data)
    const processedSchema = schema as object
    const validationErrors = validateWithJsonSchema(data, processedSchema)

    return {
      validationErrors,
      processedSchema,
      schemaForResult: processedSchema
    }
  }
}

/**
 * Schema processor registry
 */
const processors = {
  file: new FileSchemaProcessor(),
  zod: new ZodSchemaProcessor(),
  openapi: new OpenApiSchemaProcessor(),
  json: new JsonSchemaProcessor()
} as const

/**
 * Convenience function to process any schema type
 */
export async function processSchema(
  data: unknown,
  schema: SupportedSchema,
  schemaFormat: string,
  options: SchemaProcessingOptions = {}
): Promise<SchemaProcessingResult> {
  // Special handling for file paths
  if (typeof schema === 'string') {
    return processors.file.validate(data, schema, options)
  }

  // Handle object schemas based on format
  if (schemaFormat === 'JSON OpenAPI') {
    return processors.openapi.validate(data, schema, options)
  } else if (schemaFormat === 'Zod Schema') {
    return processors.zod.validate(data, schema, options)
  } else {
    return processors.json.validate(data, schema, options)
  }
}
