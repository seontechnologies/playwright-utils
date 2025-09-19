import type {
  Movie,
  DeleteMovieResponse,
  MovieNotFoundResponse,
  GetMovieResponse
} from '@shared/types/movie-types'
import { API_URL } from '@playwright/config/local.config'
import { log } from 'src/log'
import {
  CreateMovieResponseSchema,
  DeleteMovieResponseSchema,
  GetMovieResponseUnionSchema,
  MovieNotFoundResponseSchema,
  UpdateMovieResponseSchema
} from '@shared/types/schema'
import { test, expect } from '../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../support/utils/movie-factories'

process.env.API_E2E_UI_MODE = 'true'

test.describe('CRUD movie with schema validation', () => {
  const movie = generateMovieWithoutId()
  const updatedMovie = generateMovieWithoutId()

  const movieProps: Omit<Movie, 'id'> = {
    name: movie.name,
    year: movie.year,
    rating: movie.rating,
    director: movie.director
  }

  test('should crud with schema validation', async ({
    addMovie,
    getAllMovies,
    getMovieById,
    authToken, // auth-session fixture provides us with the token
    validateSchema, // schema validation fixture
    apiRequest // api request fixture for direct calls
  }) => {
    await log.info(authToken)
    // Add a movie with schema validation
    const { body: createResponse, status: createStatus } = await addMovie(
      authToken,
      movie
    )
    await validateSchema(CreateMovieResponseSchema, createResponse)

    // Get the movie ID from the response - guaranteed valid by schema
    const movieId = createResponse.data.id

    // Traditional assertions kept for comparison - with validateSchema we get BOTH:
    // 1. Schema validation (above) + 2. Traditional assertions (below) if desired
    expect(createStatus).toBe(200)
    expect(createResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    // Get all movies with schema validation
    const { body: getAllResponse, status: getAllStatus } =
      await getAllMovies(authToken)
    await validateSchema(GetMovieResponseUnionSchema, getAllResponse, {
      shape: {
        status: 200,
        data: expect.arrayContaining([
          expect.objectContaining({ id: movieId, name: movie.name })
        ])
      }
    })
    // classic assertions: we can do either the above or the below
    expect(getAllResponse).toMatchObject({
      status: 200,
      data: expect.arrayContaining([
        expect.objectContaining({ id: movieId, name: movie.name })
      ])
    })
    expect(getAllStatus).toBe(200)

    // Get the movie by ID with schema-only validation (no shape assertions)
    const { body: getByIdResponse, status: getByIdStatus } = await getMovieById(
      authToken,
      movieId
    )
    await validateSchema(GetMovieResponseUnionSchema, getByIdResponse)

    // Traditional assertions kept for comparison - schema validation (above) provides
    // additional schema compliance, these assertions are optional but can coexist
    expect(getByIdStatus).toBe(200)
    expect(getByIdResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    // Get the movie by name - using apiRequest directly with chained validateSchema
    const { body: getByNameResponse, status: getByNameStatus } =
      await apiRequest({
        method: 'GET',
        path: '/movies',
        baseUrl: API_URL,
        params: {
          name: movie.name
        },
        headers: {
          Cookie: `seon-jwt=${authToken}`
        }
      }).validateSchema<GetMovieResponse>(GetMovieResponseUnionSchema)

    // Traditional assertions only - showing you can still use the original approach
    // Note: without validateSchema, you get manual assertions but no schema compliance validation
    expect(getByNameStatus).toBe(200)
    expect(getByNameResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    // Update the movie - using apiRequest directly with chained validateSchema
    const { body: updateResponse, status: updateStatus } = await apiRequest({
      method: 'PUT',
      path: `/movies/${movieId}`,
      baseUrl: API_URL,
      body: updatedMovie,
      headers: {
        Cookie: `seon-jwt=${authToken}`
      }
    }).validateSchema(UpdateMovieResponseSchema, {
      shape: {
        status: 200,
        data: {
          id: movieId,
          name: updatedMovie.name,
          year: updatedMovie.year,
          rating: updatedMovie.rating,
          director: updatedMovie.director
        }
      }
    })
    // classic assertions: we can do either the above or the below
    expect(updateStatus).toBe(200)
    expect(updateResponse).toMatchObject({
      status: 200,
      data: {
        id: movieId,
        name: updatedMovie.name,
        year: updatedMovie.year,
        rating: updatedMovie.rating,
        director: updatedMovie.director
      }
    })

    // Delete the movie - using apiRequest directly with chained validateSchema
    const { status: deleteStatus, body: deleteResponseBody } = await apiRequest(
      {
        method: 'DELETE',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: {
          Cookie: `seon-jwt=${authToken}`
        }
      }
    ).validateSchema<DeleteMovieResponse>(DeleteMovieResponseSchema, {
      shape: {
        message: `Movie ${movieId} has been deleted`
      }
    })
    expect(deleteStatus).toBe(200)
    expect(deleteResponseBody.message).toBe(`Movie ${movieId} has been deleted`)

    // Verify the movie no longer exists with schema validation
    const { body: allMoviesAfterDelete } = await getAllMovies(authToken)
    await validateSchema(GetMovieResponseUnionSchema, allMoviesAfterDelete, {
      shape: {
        status: 200,
        data: expect.not.arrayContaining([
          expect.objectContaining({ id: movieId })
        ])
      }
    })
    // classic assertions: we can do either the above or the below
    expect(allMoviesAfterDelete).toMatchObject({
      status: 200,
      data: expect.not.arrayContaining([
        expect.objectContaining({ id: movieId })
      ])
    })

    // Attempt to delete the non-existing movie - using apiRequest with chained validateSchema
    const { status: deleteNonExistentStatus, body: deleteNonExistentBody } =
      await apiRequest({
        method: 'DELETE',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: {
          Cookie: `seon-jwt=${authToken}`
        }
      }).validateSchema<MovieNotFoundResponse>(MovieNotFoundResponseSchema, {
        shape: {
          error: `Movie with ID ${movieId} not found`
        }
      })
    expect(deleteNonExistentStatus).toBe(404)
    expect(deleteNonExistentBody).toMatchObject({
      error: `Movie with ID ${movieId} not found`
    })
  })
})
