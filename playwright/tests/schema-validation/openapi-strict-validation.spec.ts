import { API_URL } from '@playwright/config/local.config'
import * as path from 'path'
import { log } from 'src/log'
import { ValidationError } from 'src/api-request/schema-validation'
import { expect, test } from '../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../support/utils/movie-factories'
import {
  loadNestedRefSpec,
  nestedRefSpecPath,
  nestedRefSpecWith
} from '../../support/utils/nested-ref-openapi'

const nullableStringSchemaPath = path.join(
  __dirname,
  '../../support/schemas/nullable-string.schema.json'
)

type MovieBody = {
  status: number
  data: { id: number; name: string }
}

const contractGaps = [
  {
    name: 'undocumented path',
    spec: loadNestedRefSpec(),
    options: { path: '/actors', method: 'GET', status: 200 },
    message: 'Path "/actors" is not documented'
  },
  {
    name: 'undocumented method',
    spec: loadNestedRefSpec(),
    options: { path: '/movies', method: 'DELETE', status: 200 },
    message: 'Method DELETE is not documented for path "/movies"'
  },
  {
    name: 'undocumented status',
    spec: loadNestedRefSpec(),
    options: { path: '/movies', method: 'GET', status: 201 },
    message: 'Status 201 is not documented'
  },
  {
    name: 'response without a schema',
    spec: loadNestedRefSpec(),
    options: { path: '/movies', method: 'POST', status: 400 },
    message: 'No JSON response schema documented'
  },
  {
    name: 'unresolved nested reference',
    spec: nestedRefSpecWith('Director', {
      $ref: '#/components/schemas/Missing'
    }),
    options: { path: '/movies', method: 'GET', status: 200 },
    message: '#/components/schemas/Missing'
  }
]

test.describe('Strict OpenAPI response validation', () => {
  const headers = (token: string) => ({ Cookie: `app-jwt=${token}` })

  test('YAML spec resolves nested refs on POST /movies', async ({
    apiRequest,
    authToken
  }) => {
    const movie = generateMovieWithoutId()

    await log.step('Create movie and validate against the nested-ref YAML spec')
    const response = await apiRequest({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movie,
      headers: headers(authToken)
    }).validateSchema(nestedRefSpecPath, {
      path: '/movies',
      method: 'POST',
      status: 200,
      strictOpenApi: true,
      shape: { data: { name: movie.name } }
    })

    expect(response.validationResult.success).toBe(true)
    expect(response.validationResult.schemaFormat).toBe('YAML OpenAPI')
    const { data } = response.body as MovieBody

    await log.step('Delete created movie')
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${data.id}`,
      baseUrl: API_URL,
      headers: headers(authToken)
    })
  })

  test('JSON spec object resolves array item refs on GET /movies', async ({
    apiRequest,
    authToken
  }) => {
    await log.step('List movies and validate against the nested-ref JSON spec')
    const response = await apiRequest({
      method: 'GET',
      path: '/movies',
      baseUrl: API_URL,
      headers: headers(authToken)
    }).validateSchema(loadNestedRefSpec(), {
      endpoint: '/movies',
      method: 'GET',
      status: 200,
      strictOpenApi: true
    })

    expect(response.validationResult.success).toBe(true)
    expect(response.validationResult.schemaFormat).toBe('JSON OpenAPI')
  })

  test('nested ref constraint violation throws ValidationError', async ({
    apiRequest,
    authToken
  }) => {
    const spec = nestedRefSpecWith('Director', {
      type: 'string',
      enum: ['nobody']
    })
    const movie = generateMovieWithoutId()

    await log.step('Create movie')
    const created = await apiRequest<MovieBody>({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movie,
      headers: headers(authToken)
    })

    await log.step('Validate GET /movies/{id} against a tighter Director')
    const error = await apiRequest({
      method: 'GET',
      path: `/movies/${created.body.data.id}`,
      baseUrl: API_URL,
      headers: headers(authToken)
    })
      .validateSchema(spec, {
        path: '/movies/{id}',
        method: 'GET',
        status: 200,
        strictOpenApi: true
      })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).message).toContain('/data/director')

    await log.step('Delete created movie')
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${created.body.data.id}`,
      baseUrl: API_URL,
      headers: headers(authToken)
    })
  })

  test('contract gaps fail in return mode', async ({
    apiRequest,
    authToken
  }) => {
    await log.step('List movies once')
    const response = await apiRequest({
      method: 'GET',
      path: '/movies',
      baseUrl: API_URL,
      headers: headers(authToken)
    })

    for (const gap of contractGaps) {
      await log.step(`Validate ${gap.name}`)
      const validated = await response.validateSchema(gap.spec, {
        ...gap.options,
        strictOpenApi: true,
        mode: 'return'
      })

      expect(validated.validationResult.success).toBe(false)
      expect(
        validated.validationResult.errors.map((e) => e.message).join('\n')
      ).toContain(gap.message)
    }
  })

  test('404 response validates against ErrorResponse', async ({
    apiRequest,
    authToken
  }) => {
    await log.step('Request a missing movie')
    const response = await apiRequest({
      method: 'GET',
      path: '/movies/999999',
      baseUrl: API_URL,
      headers: headers(authToken)
    }).validateSchema(loadNestedRefSpec(), {
      path: '/movies/{id}',
      method: 'GET',
      status: 404,
      strictOpenApi: true
    })

    expect(response.status).toBe(404)
    expect(response.validationResult.success).toBe(true)
  })

  test('standalone validateSchema fixture supports strictOpenApi', async ({
    apiRequest,
    authToken,
    validateSchema
  }) => {
    await log.step('List movies')
    const { body } = await apiRequest({
      method: 'GET',
      path: '/movies',
      baseUrl: API_URL,
      headers: headers(authToken)
    })

    await log.step('Validate body with the standalone fixture')
    const result = await validateSchema(nestedRefSpecPath, body, {
      path: '/movies',
      method: 'GET',
      status: 200,
      strictOpenApi: true
    })

    expect(result.success).toBe(true)
    expect(result.schemaFormat).toBe('YAML OpenAPI')
  })

  test('null body follows the documented nullability', async ({
    validateSchema
  }) => {
    const spec = loadNestedRefSpec()
    spec.paths = {
      ...(spec.paths as object),
      '/nothing': {
        get: {
          responses: {
            '200': {
              description: 'Nullable body',
              content: {
                'application/json': {
                  schema: { type: 'string', nullable: true }
                }
              }
            }
          }
        }
      }
    }

    await log.step('Validate null against a nullable response')
    const nullable = await validateSchema(spec, null, {
      path: '/nothing',
      method: 'GET',
      strictOpenApi: true,
      mode: 'return'
    })
    expect(nullable.success).toBe(true)

    await log.step('Validate null against a non-nullable response')
    const required = await validateSchema(spec, null, {
      path: '/movies',
      method: 'GET',
      strictOpenApi: true,
      mode: 'return'
    })
    expect(required.success).toBe(false)

    await log.step(
      'Validate null against a non-nullable response in a YAML file'
    )
    const requiredFromFile = await validateSchema(nestedRefSpecPath, null, {
      path: '/movies',
      method: 'GET',
      strictOpenApi: true,
      mode: 'return'
    })
    expect(requiredFromFile.success).toBe(false)

    await log.step('Validate null against a plain JSON Schema file')
    const plainSchemaFile = await validateSchema(
      nullableStringSchemaPath,
      null,
      {
        strictOpenApi: true,
        mode: 'return'
      }
    )
    expect(plainSchemaFile.success).toBe(false)
    expect(plainSchemaFile.errors.map((e) => e.message).join('\n')).toContain(
      'Input cannot be null or undefined'
    )

    await log.step('Validate null without strictOpenApi')
    const lenient = await validateSchema(spec, null, {
      path: '/nothing',
      method: 'GET',
      mode: 'return'
    })
    expect(lenient.success).toBe(false)
    expect(lenient.errors.map((e) => e.message).join('\n')).toContain(
      'Input cannot be null or undefined'
    )
  })
})
