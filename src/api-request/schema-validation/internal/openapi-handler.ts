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
