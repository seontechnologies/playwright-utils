import { test, expect } from '../../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../../support/utils/movie-factories'
import type { OperationShape } from '../../../../src/api-request'
import { API_URL } from '@playwright/config/local.config'
import {
  CreateMovieResponseSchema,
  GetMovieResponseUnionSchema,
  DeleteMovieResponseSchema
} from '../../../../sample-app/shared/types/schema'
import type {
  CreateMovieResponse,
  GetMovieResponse,
  DeleteMovieResponse,
  Movie
} from '../../../../sample-app/shared/types'

// --- Inline operation definitions matching sample app movie endpoints ---
// These mimic what a code generator would produce, using structural typing
// (no imports from playwright-utils needed for the shape)

const commonHeaders = (token: string) => ({
  Cookie: `seon-jwt=${token}`
})

const createMovieOp = {
  path: '/movies',
  method: 'POST' as const,
  response: null as unknown as CreateMovieResponse,
  request: null as unknown as Omit<Movie, 'id'>,
  query: undefined as unknown as never
} satisfies OperationShape

const getAllMoviesOp = {
  path: '/movies',
  method: 'GET' as const,
  response: null as unknown as GetMovieResponse,
  request: null as unknown as never,
  query: null as unknown as { name?: string }
} satisfies OperationShape

const getMovieByIdOp = (id: number) =>
  ({
    path: `/movies/${id}`,
    method: 'GET' as const,
    response: null as unknown as GetMovieResponse,
    request: null as unknown as never,
    query: undefined as unknown as never
  }) satisfies OperationShape

const deleteMovieOp = (id: number) =>
  ({
    path: `/movies/${id}`,
    method: 'DELETE' as const,
    response: null as unknown as DeleteMovieResponse,
    request: null as unknown as never,
    query: undefined as unknown as never
  }) satisfies OperationShape

test.describe('apiRequest operation-based overload', () => {
  test(
    'should perform CRUD with operation overload',
    { annotation: { type: 'skipNetworkMonitoring' } },
    async ({ apiRequest, authToken }) => {
      const movie = generateMovieWithoutId()

      // CREATE with operation overload + typed body
      const { status: createStatus, body: createBody } = await apiRequest({
        operation: createMovieOp,
        baseUrl: API_URL,
        headers: commonHeaders(authToken),
        body: movie
      })

      expect(createStatus).toBe(200)
      expect(createBody.data.name).toBe(movie.name)
      const movieId = createBody.data.id

      // GET by ID with operation overload
      const { status: getStatus, body: getBody } = await apiRequest({
        operation: getMovieByIdOp(movieId),
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      })

      expect(getStatus).toBe(200)
      expect(getBody).toMatchObject({
        status: 200,
        data: { id: movieId, name: movie.name }
      })

      // GET all with query params via operation (name filter)
      const { status: queryStatus, body: queryBody } = await apiRequest({
        operation: getAllMoviesOp,
        baseUrl: API_URL,
        headers: commonHeaders(authToken),
        query: { name: movie.name }
      })

      expect(queryStatus).toBe(200)
      expect(queryBody).toMatchObject({
        status: 200,
        data: expect.objectContaining({ name: movie.name })
      })

      // DELETE with operation overload
      const { status: deleteStatus, body: deleteBody } = await apiRequest({
        operation: deleteMovieOp(movieId),
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      })

      expect(deleteStatus).toBe(200)
      expect(deleteBody.message).toBe(`Movie ${movieId} has been deleted`)
    }
  )

  test(
    'should support params escape hatch alongside operation',
    { annotation: { type: 'skipNetworkMonitoring' } },
    async ({ apiRequest, authToken }) => {
      const movie = generateMovieWithoutId()

      // Create a movie first
      const { body: createBody } = await apiRequest({
        operation: createMovieOp,
        baseUrl: API_URL,
        headers: commonHeaders(authToken),
        body: movie
      })

      const movieId = createBody.data.id

      // Use raw params escape hatch for the name query
      const { status, body } = await apiRequest({
        operation: getAllMoviesOp,
        baseUrl: API_URL,
        headers: commonHeaders(authToken),
        params: { name: movie.name }
      })

      expect(status).toBe(200)
      expect(body).toMatchObject({
        status: 200,
        data: expect.objectContaining({ name: movie.name })
      })

      // Cleanup
      await apiRequest({
        operation: deleteMovieOp(movieId),
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      })
    }
  )

  test(
    'should chain validateSchema with operation overload',
    { annotation: { type: 'skipNetworkMonitoring' } },
    async ({ apiRequest, authToken }) => {
      const movie = generateMovieWithoutId()

      // CREATE with operation + schema validation
      const { body: createBody } = await apiRequest({
        operation: createMovieOp,
        baseUrl: API_URL,
        headers: commonHeaders(authToken),
        body: movie
      }).validateSchema(CreateMovieResponseSchema, {
        shape: {
          status: 200,
          data: {
            name: movie.name,
            year: movie.year,
            rating: movie.rating,
            director: movie.director
          }
        }
      })

      const movieId = createBody.data.id

      // GET with operation + schema-only validation (union schemas use schema-only)
      const { body: getBody } = await apiRequest({
        operation: getMovieByIdOp(movieId),
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      }).validateSchema(GetMovieResponseUnionSchema)

      expect(getBody).toMatchObject({
        status: 200,
        data: { id: movieId, name: movie.name }
      })

      // DELETE with operation + schema validation
      await apiRequest({
        operation: deleteMovieOp(movieId),
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      }).validateSchema(DeleteMovieResponseSchema, {
        shape: { message: `Movie ${movieId} has been deleted` }
      })
    }
  )

  test(
    'classic style still works alongside operation tests',
    { annotation: { type: 'skipNetworkMonitoring' } },
    async ({ apiRequest, authToken }) => {
      const movie = generateMovieWithoutId()

      // Classic style: method + path
      const { status, body } = await apiRequest<CreateMovieResponse>({
        method: 'POST',
        path: '/movies',
        baseUrl: API_URL,
        body: movie,
        headers: commonHeaders(authToken)
      })

      expect(status).toBe(200)
      expect(body.data.name).toBe(movie.name)

      // Cleanup with classic style
      await apiRequest<DeleteMovieResponse>({
        method: 'DELETE',
        path: `/movies/${body.data.id}`,
        baseUrl: API_URL,
        headers: commonHeaders(authToken)
      })
    }
  )
})
