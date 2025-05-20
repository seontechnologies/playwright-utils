/**
 * @jest-environment node
 */

import nock, { cleanAll } from 'nock'
import {
  getMovies,
  getMovieById,
  getMovieByName,
  addMovie,
  deleteMovieById,
  updateMovie
} from './consumer'
import type { ErrorResponse } from './consumer'
import type {
  DeleteMovieResponse,
  GetMovieResponse,
  Movie
} from '@shared/types/movie-types'

const API_URL = import.meta.env.VITE_API_URL

// Nock can be used to test modules that make HTTP requests to external APIs in isolation.
// For example, if a module sends HTTP requests to an external API, you can test that module independently of the actual API.
/*
Key differences between Nock and Pact:

1) **Error handling**:
   - **Nock**: You can and should cover error scenarios in your code, regardless of the provider's actual behavior.
   - **Pact**: You cover error scenarios only if it is important for your consumer contract.

2) **Provider states**:
   - **Nock**: There are no provider states, as Nock focuses on testing in isolation without interacting with the provider.
   - **Pact**: Introduces provider states, enabling you to simulate various conditions (e.g., empty or non-empty databases) 
	 and verify contracts by running tests directly against the provider (at the provider repo, while locally serving the provider).

3) **Response flexibility**:
   - **Nock**: Mocked responses must be concrete and predefined.
   - **Pact**: Allows for loose matchers, enabling more flexibility by focusing on the shape of the data rather than exact values.
*/

// baseURL in axiosInstance: Axios uses a fixed base URL for all requests,
// and Nock must intercept that exact URL for the tests to work.

describe('Consumer API functions', () => {
  afterEach(() => {
    cleanAll()
  })

  const movieWithId: Movie = {
    id: 1,
    name: 'My movie',
    year: 1999,
    rating: 8.5,
    director: 'John Doe'
  }
  const movieWithoutId: Omit<Movie, 'id'> = {
    name: 'New movie',
    year: 1999,
    rating: 8.5,
    director: 'John Doe'
  }

  describe('getMovies, getMovieByName', () => {
    // this is 1:1 with the pacttest version
    it('should return all movies', async () => {
      nock(API_URL)
        .get('/movies')
        .reply(200, { status: 200, data: [movieWithId] })

      const res = await getMovies()
      expect(res.data).toEqual([movieWithId])
    })

    // a key difference in nock vs pact is covering the error cases in our code
    // in reality, the provider never errors; it just returns an empty array,
    // but our code can handle an error, so we can test it...
    it('should handle errors correctly', async () => {
      const errorRes: ErrorResponse = { error: 'Not found' }
      nock(API_URL).get('/movies').reply(404, errorRes)

      const res = await getMovies()
      expect(res).toEqual(errorRes)
    })

    it('should return a specific movie by name', async () => {
      nock(API_URL)
        .get(`/movies?name=${movieWithId.name}`)
        .reply(200, { status: 200, data: movieWithId })

      const res = (await getMovieByName(movieWithId.name)) as GetMovieResponse
      expect(res.data).toEqual(movieWithId)
    })
  })

  describe('getMovieById', () => {
    // this is similar to its pacttest version
    // a key difference in pact is using provider states, to fully simulate the provider side
    // in nock, we are not concerned with running our tests against the provider...
    it('should return a specific movie by id', async () => {
      // in pact the provider state would be specified here
      nock(API_URL)
        .get(`/movies/${movieWithId.id}`)
        .reply(200, { status: 200, data: movieWithId })

      const res = (await getMovieById(1)) as GetMovieResponse
      expect(res.data).toEqual(movieWithId)
    })

    it('should handle errors when movie not found', async () => {
      const testId = 999
      const errorRes: ErrorResponse = { error: 'Movie not found' }
      nock(API_URL).get(`/movies/${testId}`).reply(404, errorRes)

      const res = await getMovieById(testId)
      expect(res).toEqual(errorRes)
    })
  })

  describe('addMovie', () => {
    // this is similar to its pacttest version
    it('should add a new movie', async () => {
      // with pact we can keep the response generic
      // with nock it has to be concrete response
      nock(API_URL)
        .post('/movies', movieWithoutId)
        .reply(200, {
          status: 200,
          data: {
            id: 1,
            ...movieWithoutId
          }
        })

      const res = await addMovie(movieWithoutId)
      expect(res).toEqual({
        status: 200,
        data: {
          id: expect.any(Number),
          ...movieWithoutId
        }
      })
    })

    // this is similar to its pacttest version
    // a key difference in pact is using provider states, to fully simulate the provider side
    it('should not add a movie that already exists', async () => {
      const errorRes: ErrorResponse = {
        error: `Movie ${movieWithoutId.name} already exists`
      }

      // in pact the provider state would be specified here
      nock(API_URL).post('/movies', movieWithoutId).reply(409, errorRes)

      const res = await addMovie(movieWithoutId)
      expect(res).toEqual(errorRes)
    })
  })

  describe('updateMovie', () => {
    const updatedMovieData = {
      name: 'Updated movie',
      year: 2000,
      rating: 8.5,
      director: 'Steven Spielberg'
    }
    it('should update an existing movie successfully', async () => {
      const testId = 1

      const EXPECTED_BODY: Movie = {
        id: testId,
        ...updatedMovieData
      }

      nock(API_URL)
        .put(`/movies/${testId}`, updatedMovieData)
        .reply(200, { status: 200, movie: EXPECTED_BODY })

      const res = await updateMovie(testId, updatedMovieData)

      expect(res).toEqual({ status: 200, movie: EXPECTED_BODY })
    })

    it('should return an error if movie to update does not exist', async () => {
      const testId = 999
      const errorRes: ErrorResponse = {
        error: `Movie with ID ${testId} no found`
      }

      nock(API_URL)
        .put(`/movies/${testId}`, updatedMovieData)
        .reply(404, errorRes)

      const res = await updateMovie(testId, updatedMovieData)

      expect(res).toEqual(errorRes)
    })
  })

  describe('deleteMovieById', () => {
    // this is similar to its pacttest version
    // a key difference in pact is using provider states, to fully simulate the provider side
    it('should delete an existing movie successfully', async () => {
      const testId = 100
      const message = `Movie ${testId} has been deleted`

      // in pact the provider state would be specified here
      nock(API_URL)
        .delete(`/movies/${testId}`)
        .reply(200, { message, status: 200 })

      const res = (await deleteMovieById(testId)) as DeleteMovieResponse
      expect(res.message).toEqual(message)
    })

    it('should throw an error if movie to delete does not exist', async () => {
      const testId = 123456789
      const message = `Movie with ID ${testId} not found`

      // in pact the provider state would be specified here
      nock(API_URL)
        .delete(`/movies/${testId}`)
        .reply(404, { message, status: 404 })

      const res = (await deleteMovieById(testId)) as DeleteMovieResponse
      expect(res.message).toEqual(message)
    })
  })
})
