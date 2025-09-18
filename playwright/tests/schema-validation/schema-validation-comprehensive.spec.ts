import { test, expect } from '../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../support/utils/movie-factories'
import { CreateMovieResponseSchema } from '../../../sample-app/shared/types/schema'
import { API_URL } from '@playwright/config/local.config'
import { log } from 'src/log'

// Enable UI mode for schema validation display
process.env.API_E2E_UI_MODE = 'true'

test.describe('Schema Validation - Comprehensive E2E Tests', () => {
  const movieData = generateMovieWithoutId()
  // Server expects auth in a cookie, not Authorization header
  const commonHeaders = (token: string) => ({
    Cookie: `seon-jwt=${token}`
  })

  test('JSON Schema validation basics', async ({ apiRequest, authToken }) => {
    // Define JSON schema directly
    const jsonSchema = {
      type: 'object',
      properties: {
        status: { type: 'number' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            year: { type: 'number' },
            rating: { type: 'number' },
            director: { type: 'string' }
          },
          required: ['id', 'name', 'year', 'rating', 'director']
        }
      },
      required: ['status', 'data']
    }

    const response = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movieData,
      headers: commonHeaders(authToken)
    }).validateSchema(jsonSchema, {
      shape: {
        status: 200,
        data: {
          name: movieData.name,
          year: movieData.year,
          rating: movieData.rating,
          director: movieData.director
        }
      }
    })

    const responseBody = response.body as {
      status: number
      data: { id: string; name: string }
    }

    // Response is guaranteed valid and type-safe
    expect(responseBody.data.id).toBeDefined()
    expect(responseBody.data.name).toBe(movieData.name)
  })

  test('Zod schema validation with TypeScript inference', async ({
    apiRequest,
    authToken
  }) => {
    const response = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movieData,
      headers: commonHeaders(authToken)
    }).validateSchema(CreateMovieResponseSchema)

    const responseBody = response.body as {
      status: number
      data: { id: string; name: string }
    }

    // TypeScript automatically infers the correct type from Zod schema!
    expect(responseBody.data.id).toBeDefined()
    expect(responseBody.data.name).toBe(movieData.name)
    expect(responseBody.status).toBe(200)

    await log.step('Clean up - delete the created movie')
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${responseBody.data.id}`,
      baseUrl: API_URL,
      headers: commonHeaders(authToken)
    })
  })

  test('Combined schema + shape validation', async ({
    apiRequest,
    authToken
  }) => {
    const response = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movieData,
      headers: commonHeaders(authToken)
    }).validateSchema(CreateMovieResponseSchema, {
      shape: {
        status: 200,
        data: {
          name: (name: string) => name.length > 0,
          year: (year: number) =>
            year >= 1900 && year <= new Date().getFullYear(),
          rating: (rating: number) => rating >= 0 && rating <= 10,
          id: (id: string) => typeof id === 'number'
        }
      }
    })

    // Type assertion for response body
    const responseBody = response.body as {
      status: number
      data: { id: string; name: string; year: number }
    }

    // Both schema compliance AND shape assertions pass
    expect(responseBody.data.name).toBe(movieData.name)
    expect(responseBody.data.year).toBe(movieData.year)

    // Clean up
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${responseBody.data.id}`,
      baseUrl: API_URL,
      headers: commonHeaders(authToken)
    })
  })

  test('Validation error handling and context', async ({
    apiRequest,
    authToken
  }) => {
    // Test validation failure with detailed error context
    let validationError: Error | undefined

    try {
      // This should fail schema validation - sending invalid data
      await apiRequest({
        method: 'POST',
        path: '/movies',
        baseUrl: API_URL,
        body: {
          name: '', // Invalid: empty string
          year: 'invalid-year', // Invalid: should be number
          rating: -1, // Invalid: negative rating
          director: null // Invalid: null director
        },
        headers: commonHeaders(authToken)
      }).validateSchema(CreateMovieResponseSchema, {
        shape: {
          status: 200,
          data: {
            name: (name: string) => name.length > 0 // This should fail
          }
        }
      })

      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      // Type assertion for validation error
      const typedError = error as Error & {
        validationResult?: {
          errors: Array<{ path: string; message: string }>
        }
        requestContext?: {
          path: string
          method: string
        }
        responseContext?: {
          status: number
        }
      }

      validationError = typedError

      // Error includes full validation context
      expect(typedError.message).toContain('Schema validation failed')
      expect(typedError.validationResult?.errors).toBeDefined()
      expect(typedError.requestContext?.path).toBe('/movies')
      expect(typedError.requestContext?.method).toBe('POST')
      expect(typedError.responseContext?.status).toBeDefined()
    }

    // Ensure we caught a validation error
    expect(validationError).toBeDefined()
  })
})
