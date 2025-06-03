import { test, expect } from '../../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../../support/utils/movie-factories'
import { parseKafkaEvent } from '../../../support/utils/parse-kafka-event'
import { recurse } from '../../../../src/recurse'
import type { Movie } from '@shared/types/movie-types'
import { runCommand } from '../../../support/utils/run-command'
import { log } from 'src/log'

test.describe('CRUD movie', () => {
  const movie = generateMovieWithoutId()
  const updatedMovie = generateMovieWithoutId()

  const movieProps: Omit<Movie, 'id'> = {
    name: movie.name,
    year: movie.year,
    rating: movie.rating,
    director: movie.director
  }

  const movieEventProps = {
    name: expect.any(String),
    year: expect.any(Number),
    rating: expect.any(Number),
    director: expect.any(String)
  }

  let isKafkaWorking: boolean
  test.beforeAll(() => {
    const responseCode = runCommand(
      `curl -s -o /dev/null -w "%{http_code}" ${process.env.KAFKA_UI_URL}`
    )
    if (responseCode !== '200') {
      isKafkaWorking = false
    }
  })

  test('should crud', async ({
    addMovie,
    getAllMovies,
    getMovieById,
    getMovieByName,
    updateMovie,
    deleteMovie,
    authToken
  }) => {
    await log.info(authToken)
    // Add a movie
    const { body: createResponse, status: createStatus } = await addMovie(
      authToken,
      movie
    )

    // Get the movie ID from the response or fallback to 1 if not found
    const movieId = createResponse.data?.id || 1

    expect(createStatus).toBe(200)
    expect(createResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    if (isKafkaWorking) {
      // Wait for 'movie-created' Kafka event using recurse
      await recurse(
        async () => {
          const topic = 'movie-created'
          const event = await parseKafkaEvent(movieId, topic)
          return event
        },
        (event) =>
          expect(event).toEqual([
            {
              topic: 'movie-created',
              key: String(movieId),
              movie: {
                id: movieId,
                ...movieEventProps
              }
            }
          ]),
        {
          timeout: 10000,
          interval: 500,
          log: 'Waiting for movie-created event'
        }
      )
    }

    // Get all movies and verify that the movie exists
    const { body: getAllResponse, status: getAllStatus } =
      await getAllMovies(authToken)
    expect(getAllStatus).toBe(200)
    expect(getAllResponse).toMatchObject({
      status: 200,
      data: expect.arrayContaining([
        expect.objectContaining({ id: movieId, name: movie.name })
      ])
    })

    // Get the movie by ID
    const { body: getByIdResponse, status: getByIdStatus } = await getMovieById(
      authToken,
      movieId
    )
    expect(getByIdStatus).toBe(200)
    expect(getByIdResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    // Get the movie by name
    const { body: getByNameResponse, status: getByNameStatus } =
      await getMovieByName(authToken, movie.name)
    expect(getByNameStatus).toBe(200)
    expect(getByNameResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    // Update the movie
    const { body: updateResponse, status: updateStatus } = await updateMovie(
      authToken,
      movieId,
      updatedMovie
    )
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

    if (isKafkaWorking) {
      await recurse(
        async () => {
          const topic = 'movie-updated'
          const event = await parseKafkaEvent(movieId, topic)

          return event
        },
        (event) => {
          expect(event).toEqual([
            {
              topic: 'movie-updated',
              key: String(movieId),
              movie: {
                id: movieId,
                ...movieEventProps
              }
            }
          ])
        },
        {
          timeout: 10000,
          interval: 500,
          log: 'Waiting for movie-updated event'
        }
      )
    }

    // Delete the movie
    const {
      status: deleteStatus,
      body: { message }
    } = await deleteMovie(authToken, movieId)
    expect(deleteStatus).toBe(200)
    expect(message).toBe(`Movie ${movieId} has been deleted`)

    if (isKafkaWorking) {
      await recurse(
        async () => {
          const topic = 'movie-deleted'
          const event = await parseKafkaEvent(movieId, topic)

          return event
        },
        (event) => {
          expect(event).toEqual([
            {
              topic: 'movie-deleted',
              key: String(movieId),
              movie: {
                id: movieId,
                ...movieEventProps
              }
            }
          ])
        },
        {
          timeout: 10000,
          interval: 500,
          log: 'Waiting for movie-deleted event'
        }
      )
    }

    // Verify the movie no longer exists
    const { body: allMoviesAfterDelete } = await getAllMovies(authToken)
    expect(allMoviesAfterDelete).toMatchObject({
      status: 200,
      data: expect.not.arrayContaining([
        expect.objectContaining({ id: movieId })
      ])
    })

    // Attempt to delete the non-existing movie
    const { status: deleteNonExistentStatus, body: deleteNonExistentBody } =
      await deleteMovie(authToken, movieId)
    expect(deleteNonExistentStatus).toBe(404)
    expect(deleteNonExistentBody).toMatchObject({
      error: `Movie with ID ${movieId} not found`
    })
  })
})
