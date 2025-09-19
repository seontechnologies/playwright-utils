import { API_URL } from '@playwright/config/local.config'
import * as path from 'path'
import { log } from 'src/log'
import openApiJson from '../../../sample-app/backend/src/api-docs/openapi.json'
import { expect, test } from '../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../support/utils/movie-factories'
const openApiYamlPath = path.join(
  __dirname,
  '../../../sample-app/backend/src/api-docs/openapi.yml'
)

process.env.API_E2E_UI_MODE = 'true'

test.describe('Multi-Format Schema Validation', () => {
  const movieData = generateMovieWithoutId()
  const commonHeaders = (token: string) => ({
    Cookie: `seon-jwt=${token}`
  })

  test('YAML OpenAPI schema validation with path parameter', async ({
    apiRequest,
    authToken
  }) => {
    const response = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movieData,
      headers: commonHeaders(authToken)
    }).validateSchema(openApiYamlPath, {
      path: '/movies', // Using 'path' parameter
      method: 'POST',
      status: 200,
      shape: {
        status: 200,
        data: { name: movieData.name }
      }
    })

    // Type assertion for response body
    const responseBody = response.body as {
      status: number
      data: { id: string; name: string }
    }

    expect(responseBody.data.id).toBeDefined()
    expect(responseBody.data.name).toBe(movieData.name)

    await log.step('Clean up movie')
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${responseBody.data.id}`,
      baseUrl: API_URL,
      headers: commonHeaders(authToken)
    })
  })

  test('OpenAPI specification validation with endpoint parameter', async ({
    apiRequest,
    authToken
  }) => {
    // Test OpenAPI schema validation using 'endpoint' parameter (interchangeable with 'path')
    const response = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movieData,
      headers: commonHeaders(authToken)
    }).validateSchema(openApiJson, {
      endpoint: '/movies', // Using 'endpoint' parameter (same as 'path')
      method: 'POST',
      status: 200,
      shape: {
        status: 200,
        data: {
          name: movieData.name,
          year: movieData.year
        }
      }
    })

    // Type assertion for response body
    const responseBody = response.body as {
      status: number
      data: { id: string; name: string }
    }

    // Guaranteed to match OpenAPI specification
    expect(responseBody.data.id).toBeDefined()
    expect(responseBody.data.name).toBe(movieData.name)

    await log.step('Clean up movie')
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${responseBody.data.id}`,
      baseUrl: API_URL,
      headers: commonHeaders(authToken)
    })
  })

  test('Format auto-detection validation for different input types', async ({
    apiRequest,
    authToken
  }) => {
    await log.step('1. Object input -> JSON Schema detection')
    const jsonSchemaResponse = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movieData,
      headers: commonHeaders(authToken)
    }).validateSchema({
      type: 'object',
      properties: {
        status: { type: 'number' },
        data: { type: 'object' }
      }
    })

    const jsonResponseBody = jsonSchemaResponse.body as {
      status: number
      data: { id: string }
    }
    const movieId1 = jsonResponseBody.data.id

    await log.step(
      '2. String path -> YAML OpenAPI detection (using real sample-app YAML)'
    )
    const yamlSchemaResponse = await apiRequest({
      method: 'GET',
      path: '/movies',
      baseUrl: API_URL,
      headers: commonHeaders(authToken)
    }).validateSchema(openApiYamlPath, {
      path: '/movies',
      method: 'GET',
      status: 200
    })

    const yamlResponseBody = yamlSchemaResponse.body as {
      status: number
      data: unknown[]
    }
    expect(yamlResponseBody.status).toBe(200)
    expect(Array.isArray(yamlResponseBody.data)).toBe(true)

    await log.step('Clean up')
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${movieId1}`,
      baseUrl: API_URL,
      headers: commonHeaders(authToken)
    })
  })

  test('Cross-format validation consistency - all formats produce consistent validation behavior', async ({
    apiRequest,
    authToken
  }) => {
    const movieDataForTest = generateMovieWithoutId()

    await log.step('Create movie once')
    const createResponse = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movieDataForTest,
      headers: commonHeaders(authToken)
    })

    const createResponseBody = createResponse.body as {
      status: number
      data: { id: string }
    }
    const movieId = createResponseBody.data.id

    await log.step('Test same endpoint with different schema formats')
    const responses = []

    await log.step('1. JSON Schema format')
    responses.push(
      await apiRequest({
        method: 'GET',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      }).validateSchema({
        type: 'object',
        properties: {
          status: { type: 'number' },
          data: { type: 'object' }
        }
      })
    )

    await log.step('2. YAML OpenAPI format (using real sample-app YAML)')
    responses.push(
      await apiRequest({
        method: 'GET',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      }).validateSchema(openApiYamlPath, {
        path: '/movies/{id}',
        method: 'GET',
        status: 200
      })
    )

    await log.step('3. JSON OpenAPI format (using real sample-app JSON)')
    responses.push(
      await apiRequest({
        method: 'GET',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      }).validateSchema(openApiJson, {
        path: '/movies/{id}',
        method: 'GET',
        status: 200
      })
    )

    await log.step(
      'All formats should return consistent enhanced response structure'
    )
    responses.forEach((response, _index) => {
      const responseBody = response.body as {
        status: number
        data: unknown
      }

      expect(responseBody.status).toBe(200)
      expect(responseBody.data).toBeDefined()
      expect(response.validationResult).toBeDefined()
      expect(response.originalResponse).toBeDefined()
    })

    await log.step('Clean up')
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${movieId}`,
      baseUrl: API_URL,
      headers: commonHeaders(authToken)
    })
  })
})
