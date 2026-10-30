import { API_URL } from '@playwright/config/local.config'
import * as path from 'path'
import { log } from 'src/log'
import openApiJson from '../../../sample-app/backend/src/api-docs/openapi.json'
import { expect, test } from '../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../support/utils/movie-factories'
import { nestedRefSpecPath } from '../../support/utils/nested-ref-openapi'

type MovieBody = {
  status: number
  data: { id: number; name: string }
}

const openApiYamlPath = path.join(
  __dirname,
  '../../../sample-app/backend/src/api-docs/openapi.yml'
)

const fallbackSchema = {
  type: 'object',
  properties: {
    status: { type: 'number' },
    data: { type: 'object' }
  },
  required: ['status']
}

const legacyMovieSchema = openApiJson.components.schemas.GetMovieResponse

const sampleSpecs = [
  { name: 'JSON object', spec: openApiJson, format: 'JSON OpenAPI' },
  { name: 'YAML file', spec: openApiYamlPath, format: 'YAML OpenAPI' }
] as const

test.describe('OpenAPI default behavior without strictOpenApi', () => {
  const headers = (token: string) => ({ Cookie: `app-jwt=${token}` })
  let movieId: number

  test.beforeEach(async ({ apiRequest, authToken }) => {
    await log.step('Create movie')
    const { body } = await apiRequest<MovieBody>({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: generateMovieWithoutId(),
      headers: headers(authToken)
    })
    movieId = body.data.id
  })

  test.afterEach(async ({ apiRequest, authToken }) => {
    await log.step('Delete movie')
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${movieId}`,
      baseUrl: API_URL,
      headers: headers(authToken)
    })
  })

  test('undocumented path keeps the fallback schema', async ({
    apiRequest,
    authToken
  }) => {
    await log.step('Get movie')
    const response = await apiRequest({
      method: 'GET',
      path: `/movies/${movieId}`,
      baseUrl: API_URL,
      headers: headers(authToken)
    })

    await log.step('Validate against an undocumented path by default')
    const lenient = await response.validateSchema(nestedRefSpecPath, {
      path: '/actors',
      method: 'GET',
      status: 200
    })

    expect(lenient.validationResult.success).toBe(true)
    expect(lenient.validationResult.schemaFormat).toBe('YAML OpenAPI')
    expect(lenient.validationResult.schema).toEqual(fallbackSchema)

    await log.step('Validate again with strictOpenApi false')
    const explicitFalse = await response.validateSchema(nestedRefSpecPath, {
      path: '/actors',
      method: 'GET',
      status: 200,
      strictOpenApi: false
    })

    expect(explicitFalse.validationResult.success).toBe(true)
    expect(explicitFalse.validationResult.schema).toEqual(fallbackSchema)
  })

  sampleSpecs.forEach(({ name, spec, format }) => {
    test(`sample app ${name} spec keeps default results`, async ({
      apiRequest,
      authToken
    }) => {
      await log.step('Get movie')
      const response = await apiRequest<MovieBody>({
        method: 'GET',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: headers(authToken)
      })

      await log.step(`Validate against the ${name} spec by default`)
      const options = { path: '/movies/{id}', method: 'GET', status: 200 }
      const byDefault = await response.validateSchema(spec, options)

      expect(byDefault.validationResult.success).toBe(true)
      expect(byDefault.validationResult.schemaFormat).toBe(format)
      expect(byDefault.validationResult.schema).toEqual(legacyMovieSchema)
      expect(byDefault.body).toEqual(response.body)
      expect(byDefault.originalResponse.body).toEqual(response.body)

      await log.step('Validate again with strictOpenApi false')
      const explicitFalse = await response.validateSchema(spec, {
        ...options,
        strictOpenApi: false
      })

      expect(explicitFalse.validationResult.success).toBe(true)
      expect(explicitFalse.validationResult.schemaFormat).toBe(format)
      expect(explicitFalse.validationResult.schema).toEqual(legacyMovieSchema)
      expect(explicitFalse.body).toEqual(byDefault.body)
    })

    test(`sample app ${name} spec still rejects an invalid body by default`, async ({
      validateSchema
    }) => {
      const invalidBody = { status: 'not-a-number' }
      const options = { path: '/movies/{id}', method: 'GET', status: 200 }

      await log.step('Validate an invalid body with the option omitted')
      const byDefault = await validateSchema(spec, invalidBody, {
        ...options,
        mode: 'return'
      })
      expect(byDefault.success).toBe(false)
      expect(byDefault.schemaFormat).toBe(format)

      await log.step('Validate an invalid body with strictOpenApi false')
      const explicitFalse = await validateSchema(spec, invalidBody, {
        ...options,
        strictOpenApi: false,
        mode: 'return'
      })
      expect(explicitFalse.success).toBe(false)
      expect(explicitFalse.errors).toEqual(byDefault.errors)
    })
  })
})
