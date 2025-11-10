/**
 * OpenAPI Schema Handler
 *
 * This module handles OpenAPI specification parsing, schema extraction,
 * and $ref resolution for API response validation.
 *
 * @module OpenApiHandler
 */

import { getLogger } from '../../../internal'

/**
 * Fallback schema when extraction fails or no endpoint specified
 */
const FALLBACK_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'number' },
    data: { type: 'object' }
  },
  required: ['status']
} as const

/**
 * Validate OpenAPI specification structure
 *
 * @param openApiSpec - OpenAPI specification object to validate
 * @throws Error if specification is invalid
 */
function validateOpenApiSpec(openApiSpec: Record<string, unknown>): void {
  if (!openApiSpec || typeof openApiSpec !== 'object') {
    throw new Error('Invalid OpenAPI specification: must be a non-null object')
  }

  const paths = (openApiSpec as Record<string, unknown>).paths
  if (!paths || typeof paths !== 'object') {
    throw new Error(
      'Invalid OpenAPI specification: missing or invalid "paths" object'
    )
  }
}

/**
 * Find path definition in OpenAPI spec, handling parameterized paths
 *
 * @param paths - Paths object from OpenAPI spec
 * @param endpoint - Endpoint path to find
 * @returns Path definition object
 * @throws Error if path not found
 */
function findPathDefinition(
  paths: Record<string, unknown>,
  endpoint: string
): Record<string, unknown> {
  const pathDef =
    paths[endpoint] || paths[endpoint.replace(/\{[^}]+\}/g, '{id}')]

  if (!pathDef) {
    throw new Error(`Endpoint ${endpoint} not found in OpenAPI spec`)
  }

  return pathDef as Record<string, unknown>
}

/**
 * Extract response schema from method definition
 *
 * @param methodDef - Method definition from OpenAPI spec
 * @param status - HTTP status code
 * @returns Schema object or undefined
 */
function extractResponseSchema(
  methodDef: Record<string, unknown>,
  status: number
): object | undefined {
  const responses = methodDef.responses as Record<string, unknown>
  const statusKey = String(status)
  const responseDef = responses[statusKey] || responses['default']

  if (!responseDef) {
    return undefined
  }

  const content = (responseDef as Record<string, unknown>).content as Record<
    string,
    unknown
  >
  const jsonContent = content?.['application/json'] as Record<string, unknown>
  return jsonContent?.schema as object | undefined
}

/**
 * Resolve $ref references in OpenAPI schema
 *
 * @param ref - Reference string (e.g., "#/components/schemas/User")
 * @param openApiSpec - Complete OpenAPI specification object
 * @returns Resolved schema object
 * @throws Error if reference is external or not found
 */
export function resolveOpenApiRef(
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

/**
 * Extract schema from OpenAPI spec for specific endpoint
 *
 * This function navigates through the OpenAPI specification to find
 * the response schema for a specific endpoint, method, and status code.
 * It handles parameterized paths and $ref resolution.
 *
 * @param openApiSpec - Complete OpenAPI specification object
 * @param endpoint - API endpoint path (e.g., "/users/{id}")
 * @param method - HTTP method (GET, POST, etc.)
 * @param status - HTTP status code (defaults to 200)
 * @returns JSON Schema object for validation
 *
 * @example
 * ```typescript
 * const schema = extractOpenApiSchema(
 *   openApiSpec,
 *   "/users/{id}",
 *   "GET",
 *   200
 * )
 * // Returns the JSON schema for GET /users/{id} 200 response
 * ```
 */
export function extractOpenApiSchema(
  openApiSpec: Record<string, unknown>,
  endpoint?: string,
  method?: string,
  status = 200
): object {
  // Early return for missing endpoint/method
  if (!endpoint || !method) {
    return FALLBACK_SCHEMA
  }

  try {
    validateOpenApiSpec(openApiSpec)

    const paths = (openApiSpec as Record<string, unknown>).paths as Record<
      string,
      unknown
    >
    const pathDef = findPathDefinition(paths, endpoint)

    const methodDef = pathDef[method.toLowerCase()] as
      | Record<string, unknown>
      | undefined
    if (!methodDef) {
      throw new Error(`Method ${method} not found for endpoint ${endpoint}`)
    }

    let schema = extractResponseSchema(methodDef, status)

    // Resolve $ref if present
    if (schema && typeof schema === 'object' && '$ref' in schema) {
      const ref = (schema as Record<string, unknown>)['$ref'] as string
      schema = resolveOpenApiRef(ref, openApiSpec)
    }

    return schema || FALLBACK_SCHEMA
  } catch (error) {
    void getLogger().warning(
      `OpenAPI schema extraction failed: ${error instanceof Error ? error.message : String(error)}`
    )
    return FALLBACK_SCHEMA
  }
}
