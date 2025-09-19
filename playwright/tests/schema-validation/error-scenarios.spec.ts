/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_URL } from '@playwright/config/local.config'
import { test, expect } from '../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../support/utils/movie-factories'
import { log } from 'src/log'
import { z } from 'zod'

// Enable UI mode to see validation errors visually
process.env.API_E2E_UI_MODE = 'true'

test.describe('Schema Validation - Error Scenarios', () => {
  const validMovieData = generateMovieWithoutId()
  // Server expects auth in a cookie, not Authorization header
  const commonHeaders = (token: string) => ({
    Cookie: `seon-jwt=${token}`
  })

  test('Schema validation failure with detailed context', async ({
    apiRequest,
    authToken
  }) => {
    // Define a strict schema that will fail
    const strictSchema = z.object({
      status: z.literal(201), // Expect 201 but will get 200
      data: z.object({
        id: z.string().min(10), // Expect long ID
        name: z.string().min(20), // Expect long name
        year: z.number().min(2025), // Expect future year
        rating: z.number().max(5), // Expect low rating
        director: z.string().startsWith('Director:') // Expect prefixed director
      })
    })

    let caughtError: any = null

    try {
      await apiRequest({
        method: 'POST',
        path: '/movies',
        baseUrl: API_URL,
        body: validMovieData,
        headers: commonHeaders(authToken)
      }).validateSchema(strictSchema, {
        shape: {
          status: 201, // This will also fail since API returns 200
          data: {
            name: (name: string) => name.startsWith('Epic:') // Shape validation will fail
          }
        }
      })

      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      caughtError = error

      // Type guard: ensure error is an Error object with validation properties
      const validationError = error as Error & {
        name: string
        validationResult: {
          success: boolean
          errors: Array<{ path: string; message: string }>
        }
        requestContext: {
          method: string
          path: string
          body: unknown
          headers: Record<string, string>
        }
        responseContext: {
          status: number
          body: unknown
        }
      }

      expect(validationError).toBeInstanceOf(Error)

      await log.info('Validate error structure and context')
      expect(validationError.message).toContain('Schema validation failed')
      expect(validationError.name).toBe('ValidationError')

      await log.info('Check validation result details')
      expect(validationError.validationResult).toBeDefined()
      expect(validationError.validationResult.success).toBe(false)
      expect(validationError.validationResult.errors).toBeDefined()
      expect(Array.isArray(validationError.validationResult.errors)).toBe(true)
      expect(validationError.validationResult.errors.length).toBeGreaterThan(0)

      await log.info('Check request context preservation')
      expect(validationError.requestContext).toBeDefined()
      expect(validationError.requestContext.method).toBe('POST')
      expect(validationError.requestContext.path).toBe('/movies')
      expect(validationError.requestContext.body).toEqual(validMovieData)
      expect(validationError.requestContext.headers).toBeDefined()

      await log.info('Check response context preservation')
      expect(validationError.responseContext).toBeDefined()
      expect(validationError.responseContext.status).toBe(200)
      expect(validationError.responseContext.body).toBeDefined()
    }

    expect(caughtError).toBeTruthy()
  })

  test('Non-existent YAML file error handling', async ({
    apiRequest,
    authToken
  }) => {
    let caughtError: any = null

    try {
      await apiRequest({
        method: 'GET',
        path: '/movies',
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      }).validateSchema('./non-existent-schema.yaml')
    } catch (error) {
      caughtError = error
      const errorObj = error as Error
      expect(errorObj.message.toLowerCase()).toContain('schema')
    }

    expect(caughtError).toBeTruthy()
  })

  test('Shape validation failures with functions', async ({
    apiRequest,
    authToken
  }) => {
    let caughtError: any = null

    try {
      await apiRequest({
        method: 'POST',
        path: '/movies',
        baseUrl: API_URL,
        body: validMovieData,
        headers: commonHeaders(authToken)
      }).validateSchema(
        z.object({
          status: z.number(),
          data: z.any()
        }),
        {
          shape: {
            status: 200,
            data: {
              name: (_name: string) => {
                // This function will throw an error
                throw new Error('Custom shape validation failed')
              }
            }
          }
        }
      )
    } catch (error) {
      caughtError = error
      const errorObj = error as Error
      expect(errorObj.message).toContain('validation')
    }

    expect(caughtError).toBeTruthy()
  })

  test('Multiple validation errors aggregation', async ({
    apiRequest,
    authToken
  }) => {
    const multipleErrorSchema = z.object({
      status: z.literal(999), // Will fail
      data: z.object({
        id: z.string().uuid(), // Will fail - not UUID format
        name: z.string().length(100), // Will fail - wrong length
        year: z.number().min(3000), // Will fail - too low
        rating: z.literal(11), // Will fail - out of range
        director: z.string().email() // Will fail - not email format
      }),
      extraField: z.string() // Will fail - field doesn't exist
    })

    let caughtError: any = null

    try {
      await apiRequest({
        method: 'POST',
        path: '/movies',
        baseUrl: API_URL,
        body: validMovieData,
        headers: commonHeaders(authToken)
      }).validateSchema(multipleErrorSchema)
    } catch (error) {
      caughtError = error

      // Type assertion for validation error
      const validationError = error as Error & {
        validationResult: {
          errors: Array<{ path: string; message: string }>
        }
      }

      // Should aggregate multiple validation errors
      expect(validationError.validationResult.errors).toBeDefined()
      expect(validationError.validationResult.errors.length).toBeGreaterThan(1)

      // Each error should have path and message
      validationError.validationResult.errors.forEach(
        (err: { path: string; message: string }) => {
          expect(err.path).toBeDefined()
          expect(err.message).toBeDefined()
          expect(typeof err.message).toBe('string')
        }
      )
    }

    expect(caughtError).toBeTruthy()
  })

  test('Return mode validation (non-throwing)', async ({
    apiRequest,
    authToken
  }) => {
    // Test return mode where validation doesn't throw
    const response = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: validMovieData,
      headers: commonHeaders(authToken)
    }).validateSchema(
      z.object({
        status: z.literal(999), // This will fail
        data: z.any()
      }),
      {
        mode: 'return' // Don't throw on failure
      }
    )

    // Response should indicate validation failure
    expect(response.validationResult.success).toBe(false)
    expect(response.validationResult.errors).toBeDefined()
    expect(response.validationResult.errors.length).toBeGreaterThan(0)

    // Type assertion for response body
    const responseBody = response.body as {
      status: number
      data: { id?: string; name?: string }
    }

    // Clean up if movie was created
    if (responseBody.data?.id) {
      await apiRequest({
        method: 'DELETE',
        path: `/movies/${responseBody.data.id}`,
        headers: { Authorization: `Bearer ${authToken}` }
      })
    }
  })

  test('UI error display integration', async ({ apiRequest, authToken }) => {
    let caughtError: any = null

    try {
      await apiRequest({
        method: 'POST',
        path: '/movies',
        baseUrl: API_URL,
        body: validMovieData,
        headers: { Authorization: `Bearer ${authToken}` }
      }).validateSchema(
        z.object({
          status: z.literal(404),
          data: z.null()
        }),
        {
          uiMode: true, // Ensure UI shows error details
          shape: {
            status: 404,
            data: null
          }
        }
      )
    } catch (error) {
      caughtError = error

      // UI should display validation error details:
      // ❌ Schema validation: FAILED
      // 📄 Schema format: Zod Schema
      // ⏱️ Validation time: <5ms
      // 🚨 Validation errors: [list of errors]
      // 🎯 Shape assertions: failed

      const validationError = error as Error & {
        validationResult: {
          uiData: {
            statusIcon: string
            validationSummary: string
          }
        }
      }
      expect(validationError.validationResult.uiData).toBeDefined()
      expect(validationError.validationResult.uiData.statusIcon).toBe('❌')
      expect(
        validationError.validationResult.uiData.validationSummary
      ).toContain('FAILED')
    }

    expect(caughtError).toBeTruthy()
  })
})
