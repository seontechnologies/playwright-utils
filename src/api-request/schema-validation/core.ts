/** Core schema validation engine */

import Ajv from 'ajv'
import { type ZodSchema, ZodError } from 'zod'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { getLogger } from '../../internal'
import type {
  SupportedSchema,
  ValidationResult,
  ValidationErrorDetail,
  ShapeAssertion
} from './types'

/** AJV instance for JSON Schema validation */
const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false // Allow unknown formats for OpenAPI compatibility
})

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

/** Load schema from file path */
async function loadSchemaFromFile(filePath: string): Promise<object> {
  try {
    const resolvedPath = path.resolve(filePath)

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Schema file not found: ${resolvedPath}`)
    }

    const content = fs.readFileSync(resolvedPath, 'utf8')

    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return yaml.load(content) as object
    } else {
      return JSON.parse(content)
    }
  } catch (error) {
    throw new Error(
      `Failed to load schema file: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/** Resolve $ref references in OpenAPI schema */
function resolveOpenApiRef(
  ref: string,
  openApiSpec: Record<string, unknown>
): object {
  if (!ref.startsWith('#/')) {
    throw new Error(`External references not supported: ${ref}`)
  }

  const pathParts = ref.substring(2).split('/')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = openApiSpec

  for (const part of pathParts) {
    current = current[part]
    if (!current) {
      throw new Error(`Reference not found: ${ref}`)
    }
  }

  // Return the full resolved schema, preserving anyOf/oneOf structures
  return current
}

/** Extract schema from OpenAPI spec for specific endpoint */
function extractOpenApiSchema(
  openApiSpec: Record<string, unknown>,
  endpoint?: string,
  method?: string,
  status?: number
): object {
  if (!endpoint || !method) {
    // If no endpoint/method specified, validate against basic OpenAPI structure
    return {
      type: 'object',
      properties: {
        status: { type: 'number' },
        data: { type: 'object' }
      },
      required: ['status']
    }
  }

  try {
    const paths = (openApiSpec as Record<string, unknown>).paths as Record<
      string,
      unknown
    >
    const pathDef =
      paths[endpoint] || paths[endpoint.replace(/\{[^}]+\}/g, '{id}')] // Handle parameterized paths

    if (!pathDef) {
      throw new Error(`Endpoint ${endpoint} not found in OpenAPI spec`)
    }

    const methodDef = (pathDef as Record<string, unknown>)[method.toLowerCase()]
    if (!methodDef) {
      throw new Error(`Method ${method} not found for endpoint ${endpoint}`)
    }

    const responses = (methodDef as Record<string, unknown>)
      .responses as Record<string, unknown>
    const statusKey = status ? String(status) : '200'
    const responseDef = responses[statusKey] || responses['default']

    if (!responseDef) {
      throw new Error(
        `Response ${statusKey} not found for ${method} ${endpoint}`
      )
    }

    // Extract JSON schema from OpenAPI response
    const content = (responseDef as Record<string, unknown>).content as Record<
      string,
      unknown
    >
    const jsonContent = content?.['application/json'] as Record<string, unknown>
    let schema = jsonContent?.schema

    // Resolve $ref if present
    if (schema && typeof schema === 'object' && '$ref' in schema) {
      const ref = (schema as Record<string, unknown>)['$ref'] as string
      schema = resolveOpenApiRef(ref, openApiSpec)
    }

    if (schema) {
      return schema as object
    }

    // Fallback to basic structure
    return {
      type: 'object',
      properties: {
        status: { type: 'number' },
        data: { type: 'object' }
      },
      required: ['status']
    }
  } catch (error) {
    void getLogger().warning(
      `OpenAPI schema extraction failed: ${error instanceof Error ? error.message : String(error)}`
    )

    // Fallback to basic validation
    return {
      type: 'object',
      properties: {
        status: { type: 'number' },
        data: { type: 'object' }
      },
      required: ['status']
    }
  }
}

/** Validate data against JSON Schema */
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
    return validateWithAnyOfSupport(data, schema, fullSpec)
  }

  // Standard validation for schemas without anyOf/oneOf
  const ajvInstance =
    fullSpec && fullSpec.components
      ? new Ajv({
          strict: false,
          schemas: [fullSpec] // Add the full spec for reference resolution
        })
      : ajv

  const validate = ajvInstance.compile(schema)
  const valid = validate(data)

  if (valid) {
    return []
  }

  return (validate.errors || []).map((error) => ({
    path: error.instancePath || error.schemaPath || 'root',
    message: error.message || 'Validation failed',
    expected: error.schema,
    actual: error.data
  }))
}

/** Validate schema with anyOf/oneOf support */
// eslint-disable-next-line complexity
function validateWithAnyOfSupport(
  data: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  fullSpec?: Record<string, unknown>
): ValidationErrorDetail[] {
  const errors: ValidationErrorDetail[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataObj = data as any

  // Validate basic structure
  if (schema.type === 'object' && typeof data !== 'object') {
    return [
      {
        path: 'root',
        message: 'Expected object',
        expected: 'object',
        actual: typeof data
      }
    ]
  }

  // Check required fields exist
  if (schema.required) {
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
  }

  // Validate each property
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const value = dataObj[key]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prop = propSchema as any

      // Handle anyOf
      if (prop.anyOf && value !== undefined) {
        let anyMatched = false
        const anyOfErrors: string[] = []

        for (const option of prop.anyOf) {
          const ajvInstance =
            fullSpec && fullSpec.components
              ? new Ajv({ strict: false, schemas: [fullSpec] })
              : ajv

          try {
            const validate = ajvInstance.compile(option)
            if (validate(value)) {
              anyMatched = true
              break
            } else {
              anyOfErrors.push(
                `Option failed: ${JSON.stringify(validate.errors?.[0]?.message || 'unknown')}`
              )
            }
          } catch (e) {
            anyOfErrors.push(`Schema error: ${e}`)
          }
        }

        if (!anyMatched) {
          errors.push({
            path: `/${key}`,
            message: 'Value does not match any of the allowed schemas',
            expected: 'one of anyOf schemas',
            actual:
              typeof value === 'object'
                ? JSON.stringify(value).substring(0, 50)
                : value
          })
        }
      }
      // Handle oneOf similarly
      else if (prop.oneOf && value !== undefined) {
        let matchCount = 0

        for (const option of prop.oneOf) {
          const ajvInstance =
            fullSpec && fullSpec.components
              ? new Ajv({ strict: false, schemas: [fullSpec] })
              : ajv

          const validate = ajvInstance.compile(option)
          if (validate(value)) {
            matchCount++
          }
        }

        if (matchCount !== 1) {
          errors.push({
            path: `/${key}`,
            message:
              matchCount === 0
                ? 'Value does not match any of the oneOf schemas'
                : `Value matches ${matchCount} schemas, but should match exactly one`,
            expected: 'exactly one of oneOf schemas',
            actual: value
          })
        }
      }
      // Standard property validation
      else if (prop.type && value !== undefined) {
        const ajvInstance =
          fullSpec && fullSpec.components
            ? new Ajv({ strict: false, schemas: [fullSpec] })
            : ajv

        const validate = ajvInstance.compile(prop)
        if (!validate(value)) {
          errors.push({
            path: `/${key}`,
            message: validate.errors?.[0]?.message || 'Validation failed',
            expected: prop.type,
            actual: typeof value
          })
        }
      }
    }
  }

  return errors
}

/** Validate data against Zod Schema */
function validateWithZodSchema(
  data: unknown,
  schema: ZodSchema
): ValidationErrorDetail[] {
  try {
    schema.parse(data)
    return []
  } catch (error) {
    if (error instanceof ZodError) {
      return error.errors.map((zodError) => ({
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

/** Execute shape validation assertions */
async function validateShape(
  data: unknown,
  shapeAssertion: ShapeAssertion,
  basePath = ''
): Promise<ValidationErrorDetail[]> {
  const errors: ValidationErrorDetail[] = []

  for (const [key, assertion] of Object.entries(shapeAssertion)) {
    const currentPath = basePath ? `${basePath}.${key}` : key
    const dataObj = data as Record<string, unknown>
    const value = dataObj[key]

    if (typeof assertion === 'function') {
      // Shape validator function
      try {
        const result = assertion(value)
        if (result === false) {
          errors.push({
            path: currentPath,
            message: `Shape validation failed for ${key}`,
            expected: 'validation to pass',
            actual: value
          })
        }
      } catch (error) {
        errors.push({
          path: currentPath,
          message: `Shape validation error: ${error instanceof Error ? error.message : String(error)}`,
          expected: 'validation to pass',
          actual: value
        })
      }
    } else if (
      typeof assertion === 'object' &&
      assertion !== null &&
      !Array.isArray(assertion)
    ) {
      // Nested shape assertion
      if (typeof value === 'object' && value !== null) {
        const nestedErrors = await validateShape(
          value,
          assertion as ShapeAssertion,
          currentPath
        )
        errors.push(...nestedErrors)
      } else {
        errors.push({
          path: currentPath,
          message: 'Expected object for nested shape validation',
          expected: 'object',
          actual: typeof value
        })
      }
    } else {
      // Direct value comparison
      if (value !== assertion) {
        errors.push({
          path: currentPath,
          message: `Shape assertion failed: expected ${assertion}, got ${value}`,
          expected: assertion,
          actual: value
        })
      }
    }
  }

  return errors
}

/** Main validation function */
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
    let validationErrors: ValidationErrorDetail[] = []
    let processedSchema: object | ZodSchema
    let schemaForResult: object | undefined

    // Use path if provided, fallback to endpoint for backward compatibility
    const targetPath = options.path || options.endpoint

    // Handle different schema formats
    if (typeof schema === 'string') {
      // File path - load and process
      const loadedSchema = await loadSchemaFromFile(schema)
      if (schemaFormat === 'YAML OpenAPI' || schemaFormat === 'JSON OpenAPI') {
        processedSchema = extractOpenApiSchema(
          loadedSchema as Record<string, unknown>,
          targetPath,
          options.method,
          options.status
        )
        schemaForResult = processedSchema as object
        // Pass the full OpenAPI spec for reference resolution
        validationErrors = validateWithJsonSchema(
          data,
          processedSchema,
          loadedSchema as Record<string, unknown>
        )
      } else {
        processedSchema = loadedSchema
        schemaForResult = processedSchema as object
        validationErrors = validateWithJsonSchema(data, processedSchema)
      }
    } else if (schemaFormat === 'Zod Schema') {
      // Zod schema
      const zodSchema = schema as ZodSchema
      processedSchema = zodSchema
      // For Zod, store the shape info as best we can
      schemaForResult = { type: 'ZodSchema', shape: 'See Zod definition' }
      validationErrors = validateWithZodSchema(data, zodSchema)
    } else if (schemaFormat === 'JSON OpenAPI') {
      // OpenAPI object
      const openApiSpec = schema as Record<string, unknown>
      processedSchema = extractOpenApiSchema(
        openApiSpec,
        targetPath,
        options.method,
        options.status
      )
      schemaForResult = processedSchema as object
      // Pass the full OpenAPI spec for reference resolution
      validationErrors = validateWithJsonSchema(
        data,
        processedSchema,
        openApiSpec
      )
    } else {
      // JSON Schema object
      processedSchema = schema as object
      schemaForResult = processedSchema
      validationErrors = validateWithJsonSchema(data, processedSchema)
    }

    // Run shape validation if provided
    if (options.shape) {
      const shapeErrors = await validateShape(data, options.shape)
      validationErrors.push(...shapeErrors)
    }

    const validationTime = Date.now() - startTime
    const success = validationErrors.length === 0

    // Log the extracted schema if DEBUG is enabled
    if (process.env.DEBUG === 'true' && schemaForResult) {
      void getLogger().debug(
        `Extracted schema for validation: ${JSON.stringify(schemaForResult, null, 2)}`
      )
    }

    return {
      success,
      errors: validationErrors,
      schemaFormat,
      validationTime,
      schema: schemaForResult,
      uiData: {
        statusIcon: success ? '✅' : '❌',
        validationSummary: success ? 'PASSED' : 'FAILED',
        schemaInfo: `${schemaFormat} (${validationTime}ms)`,
        errorDetails: success
          ? undefined
          : validationErrors.map((e) => `${e.path}: ${e.message}`)
      }
    }
  } catch (error) {
    const validationTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

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
      schemaFormat: detectSchemaFormat(schema),
      validationTime,
      uiData: {
        statusIcon: '❌',
        validationSummary: 'FAILED',
        schemaInfo: `Schema Error (${validationTime}ms)`,
        errorDetails: [errorMessage]
      }
    }
  }
}
