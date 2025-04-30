import type { Movie } from '@prisma/client'
import { Prisma, PrismaClient } from '@prisma/client'
import type { DeepMockProxy } from 'jest-mock-extended'
import { mockDeep } from 'jest-mock-extended'
import { MovieAdapter } from './movie-adapter'
import {
  generateMovieWithId,
  generateMovieWithoutId
} from './test-helpers/factories'

// In this test suite, we are testing the Adapter,
// which is responsible for interacting with the data source (Prisma).

// Since this is an adapter in the hexagonal architecture (ports & adapters),
// its primary role is to handle data persistence and retrieval,
// and the tests here ensure that it behaves correctly in terms of data handling and error management.
//
// By mocking PrismaClient, we isolate the tests to focus solely on the adapter's logic and its interaction with Prisma's API.
// This allows us to test how the adapter handles different scenarios,
// like successfully retrieving or creating data, and how it manages errors (e.g., database connection issues).
//
// These tests do not touch the real database, making them unit tests that ensure correctness
// of the adapter's interaction with the mocked data layer.

jest.mock('@prisma/client', () => {
  const actualPrisma = jest.requireActual('@prisma/client')
  return {
    ...actualPrisma,
    PrismaClient: jest.fn(() => mockDeep<PrismaClient>())
  }
})

describe('MovieAdapter', () => {
  let prismaMock: DeepMockProxy<PrismaClient>
  let movieAdapter: MovieAdapter

  const mockMovie: Movie = generateMovieWithId()

  beforeEach(() => {
    prismaMock = new PrismaClient() as DeepMockProxy<PrismaClient>
    movieAdapter = new MovieAdapter(prismaMock)
  })

  describe('getMovies', () => {
    it('should get all movies', async () => {
      prismaMock.movie.findMany.mockResolvedValue([mockMovie])

      const { data } = await movieAdapter.getMovies()

      expect(data).toEqual([mockMovie])
      expect(prismaMock.movie.findMany).toHaveBeenCalledTimes(1)
    })

    it('should handle errors in getMovies', async () => {
      prismaMock.movie.findMany.mockRejectedValue(
        new Error('Error fetching all movies')
      )

      const result = await movieAdapter.getMovies()
      expect(result.data).toBe(null) // empty array on error
      expect(prismaMock.movie.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('getMovieById', () => {
    it('should get a movie by id', async () => {
      prismaMock.movie.findUnique.mockResolvedValue(mockMovie)

      // @ts-expect-error TypeScript should chill for tests here
      const { data } = await movieAdapter.getMovieById(mockMovie.id)

      expect(data).toEqual(mockMovie)
      expect(prismaMock.movie.findUnique).toHaveBeenCalledWith({
        where: { id: mockMovie.id }
      })
    })

    it('should return null if movie by id not found', async () => {
      prismaMock.movie.findUnique.mockResolvedValue(null)
      const id = 999

      // @ts-expect-error TypeScript should chill for tests here
      const { data } = await movieAdapter.getMovieById(id)

      expect(data).toBeNull()
      expect(prismaMock.movie.findUnique).toHaveBeenCalledWith({
        where: { id }
      })
    })

    it('should handle errors in getMovieById', async () => {
      prismaMock.movie.findUnique.mockRejectedValue(
        new Error('Error fetching movie by id')
      )

      // @ts-expect-error TypeScript should chill for tests here
      const { data } = await movieAdapter.getMovieById(1)

      expect(data).toBeNull()
      expect(prismaMock.movie.findUnique).toHaveBeenCalledTimes(1)
    })
  })

  describe('getMovieByName', () => {
    it('should get a movie by name', async () => {
      prismaMock.movie.findFirst.mockResolvedValue(mockMovie)

      const { data } = await movieAdapter.getMovieByName(mockMovie.name)

      expect(data).toEqual(mockMovie)
      expect(prismaMock.movie.findFirst).toHaveBeenCalledWith({
        where: { name: mockMovie.name }
      })
    })

    it('should return null if movie by name not found', async () => {
      prismaMock.movie.findFirst.mockResolvedValue(null)
      const name = 'Non-existent Movie'

      const { data } = await movieAdapter.getMovieByName(name)

      expect(data).toBeNull()
      expect(prismaMock.movie.findFirst).toHaveBeenCalledWith({
        where: { name }
      })
    })

    it('should handle errors in getMovieByName', async () => {
      prismaMock.movie.findFirst.mockRejectedValue(
        new Error('Error fetching movie by name')
      )

      const { data } = await movieAdapter.getMovieByName('Inception')

      expect(data).toBeNull() // Expect null on error
      expect(prismaMock.movie.findFirst).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteMovieById', () => {
    it('should delete a movie by id', async () => {
      prismaMock.movie.delete.mockResolvedValue(mockMovie)

      const result = await movieAdapter.deleteMovieById(mockMovie.id)

      const expectedResult = {
        status: 200,
        message: `Movie ${mockMovie.id} has been deleted`
      }
      expect(result).toStrictEqual(expectedResult)
      expect(prismaMock.movie.delete).toHaveBeenCalledWith({
        where: { id: mockMovie.id }
      })
    })

    it('should delete a movie and return false if the movie is not found', async () => {
      prismaMock.movie.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Movie not found', {
          code: 'P2025',
          clientVersion: '1'
        })
      )
      const id = 999

      const result = await movieAdapter.deleteMovieById(id)

      const expectedResult = {
        status: 404,
        error: `Movie with ID ${id} not found`
      }
      expect(result).toStrictEqual(expectedResult)
      expect(prismaMock.movie.delete).toHaveBeenCalledWith({ where: { id } })
    })

    it('should call handleError and rethrow unexpected errors in deleteMovieById', async () => {
      // Mock an unexpected error (not a P2025 error)
      const unexpectedError = new Error('Unexpected error')
      prismaMock.movie.delete.mockRejectedValue(unexpectedError)
      const id = 999

      // Spy on the handleError method to ensure it's called
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleErrorSpy = jest.spyOn(movieAdapter as any, 'handleError')

      // Expect the method to throw the error
      await expect(movieAdapter.deleteMovieById(id)).rejects.toThrow(
        'Unexpected error'
      )
      expect(handleErrorSpy).toHaveBeenCalledWith(unexpectedError)
      expect(prismaMock.movie.delete).toHaveBeenCalledTimes(1)
    })
  })

  describe('addMovie', () => {
    const movieData = { ...generateMovieWithoutId(), name: 'Inception' }
    const id = 1
    const movie = { id, ...movieData }

    it('should successfully add a movie without specifying an id', async () => {
      prismaMock.movie.findFirst.mockResolvedValue(null) // no existing movie
      prismaMock.movie.create.mockResolvedValue(movie)

      const result = await movieAdapter.addMovie(movieData)
      expect(result).toEqual({
        status: 200,
        data: movie
      })
      expect(prismaMock.movie.create).toHaveBeenCalledWith({ data: movieData })
    })

    it('should successfully add a movie specifying id', async () => {
      prismaMock.movie.findFirst.mockResolvedValue(null) // no existing movie
      prismaMock.movie.create.mockResolvedValue(movie)

      const result = await movieAdapter.addMovie(movieData, id)

      expect(result).toEqual(
        expect.objectContaining({
          status: 200,
          data: movie
        })
      )
      expect(prismaMock.movie.create).toHaveBeenCalledWith({
        data: movie
      })
    })

    it('should return 409 if the movie already exists', async () => {
      prismaMock.movie.findFirst.mockResolvedValue(movie) // existing movie

      const result = await movieAdapter.addMovie(movieData)

      expect(result).toEqual(
        expect.objectContaining({
          status: 409,
          error: `Movie ${movie.name} already exists`
        })
      )
    })

    it('should return 500 if an unexpected error occurs', async () => {
      prismaMock.movie.findFirst.mockResolvedValue(null) // No existing movie
      const error = 'Unexpected error'
      prismaMock.movie.create.mockRejectedValue(new Error(error))

      // Spy on the handleError method to ensure it's called
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleErrorSpy = jest.spyOn(movieAdapter as any, 'handleError')

      const result = await movieAdapter.addMovie(movieData)
      expect(result).toEqual(
        expect.objectContaining({ status: 500, error: 'Internal server error' })
      )
      expect(handleErrorSpy).toHaveBeenCalledWith(new Error(error))
    })
  })

  describe('updateMovie', () => {
    const id = 1
    const existingMovie = {
      name: 'Inception',
      year: 2020,
      id,
      rating: 7.5,
      director: 'Christopher Nolan'
    }
    const updateMovieData = {
      name: 'The Dark Knight',
      year: 2008,
      rating: 8.5,
      director: 'Steven Spielberg'
    }
    const updatedMovie = { id, ...updateMovieData }

    it('should successfully update a movie', async () => {
      prismaMock.movie.findUnique.mockResolvedValue(existingMovie)
      prismaMock.movie.update.mockResolvedValue(updatedMovie)

      const result = await movieAdapter.updateMovie(updateMovieData, id)
      expect(result).toEqual({
        status: 200,
        data: updatedMovie
      })

      expect(prismaMock.movie.findUnique).toHaveBeenCalledWith({
        where: { id }
      })
      expect(prismaMock.movie.update).toHaveBeenCalledWith({
        where: { id },
        data: updateMovieData
      })
    })

    it('should return 404 if the movie is not found', async () => {
      prismaMock.movie.findUnique.mockResolvedValue(null)

      const result = await movieAdapter.updateMovie(updateMovieData, id)

      expect(result).toEqual({
        status: 404,
        error: `Movie with ID ${id} not found`
      })

      expect(prismaMock.movie.findUnique).toHaveBeenCalledWith({
        where: { id }
      })
      expect(prismaMock.movie.update).not.toHaveBeenCalled()
    })

    it('should return 500 if an unexpected error occurs', async () => {
      // Mock the movie to be found in the database
      prismaMock.movie.findUnique.mockResolvedValue(existingMovie)
      // Mock an unexpected error during the update
      const error = new Error('Unexpected error')
      prismaMock.movie.update.mockRejectedValue(error)

      // Spy on the handleError method to ensure it's called
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleErrorSpy = jest.spyOn(movieAdapter as any, 'handleError')

      const result = await movieAdapter.updateMovie(updateMovieData, id)

      // Assertions
      expect(result).toEqual({
        status: 500,
        error: 'Internal server error'
      })
      expect(handleErrorSpy).toHaveBeenCalledWith(error)
    })
  })
})
