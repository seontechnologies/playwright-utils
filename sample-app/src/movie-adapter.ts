import { Prisma, type PrismaClient } from '@prisma/client'
import type {
  GetMovieResponse,
  CreateMovieRequest,
  CreateMovieResponse,
  MovieNotFoundResponse,
  ConflictMovieResponse,
  DeleteMovieResponse,
  UpdateMovieRequest,
  UpdateMovieResponse
} from './@types'
import type { MovieRepository } from './movie-repository'

// MovieAdapter: This is the implementation of the MovieRepository interface,
// responsible for interacting with a specific data source (like Prisma).
// It's an adapter in hexagonal architecture.

// The key benefits are improved flexibility and testability:
// 1) Flexibility: the business logic (MovieService) is decoupled from the data access layer (MovieAdapter),
// making it easier to swap or replace adapters (e.g., switch from Prisma to an API or mock implementation)
// without changing the business logic.

// 2) Testability: this separation allows for isolated unit tests of each component,
// meaning you can test the business logic independently from the data layer,
// and mock the repository for more controlled and efficient tests.

export class MovieAdapter implements MovieRepository {
  private readonly prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /*
  General Error Handling with unknown in TypeScript:

    try {
      // Code that might throw an error
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Handle the error as an instance of the Error class
        console.error(error.message);
      } else {
        // Handle the case where the error is not an instance of Error
        console.error("An unknown error occurred:", error);
      }
    }
  */
  // Centralized error handling method
  private handleError(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code, 'Message:', error.message)
    } else if (error instanceof Error) {
      console.error('Error:', error.message)
    } else {
      console.error('An unknown error occurred:', error)
    }
  }

  // Get all movies
  async getMovies(): Promise<GetMovieResponse> {
    try {
      const movies = await this.prisma.movie.findMany()

      if (movies.length > 0) {
        return {
          status: 200,
          data: movies,
          error: null
        }
      } else {
        return {
          status: 200,
          data: [],
          error: null
        }
      }
    } catch (error) {
      this.handleError(error)

      return {
        status: 500,
        data: null,
        error: 'Failed to retrieve movies'
      }
    }
  }

  // Get a movie by its ID
  async getMovieById(
    id: number
  ): Promise<GetMovieResponse | MovieNotFoundResponse> {
    try {
      const movie = await this.prisma.movie.findUnique({ where: { id } })
      if (movie) {
        return {
          status: 200,
          data: movie, // return the movie object
          error: null // no error if successful
        }
      }
      return {
        status: 404,
        data: null, // return null if not found
        error: `Movie with ID ${id} not found`
      }
    } catch (error) {
      this.handleError(error)
      return {
        status: 500,
        data: null, // return null in case of failure
        error: 'Internal server error'
      }
    }
  }

  // Get a movie by its name
  async getMovieByName(name: string): Promise<GetMovieResponse> {
    try {
      const movie = await this.prisma.movie.findFirst({ where: { name } })

      if (movie) {
        return {
          status: 200,
          data: movie,
          error: null
        }
      } else {
        // Return a structured response if no movie is found
        return {
          status: 404,
          data: null,
          error: `Movie with name "${name}" not found`
        }
      }
    } catch (error) {
      this.handleError(error)
      return {
        status: 500,
        data: null,
        error: 'Internal server error'
      }
    }
  }

  // Delete a movie by its ID
  async deleteMovieById(
    id: number
  ): Promise<DeleteMovieResponse | MovieNotFoundResponse> {
    try {
      await this.prisma.movie.delete({
        where: { id }
      })
      return {
        status: 200,
        message: `Movie ${id} has been deleted`
      }
    } catch (error) {
      // Handle specific error codes (e.g., movie not found)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return {
          status: 404,
          error: `Movie with ID ${id} not found`
        }
      }
      this.handleError(error)
      throw error // Re-throw other errors
    }
  }

  // Add a new movie with validation
  async addMovie(
    data: CreateMovieRequest,
    id?: number
  ): Promise<CreateMovieResponse | ConflictMovieResponse> {
    try {
      // Check if the movie already exists
      const existingMovie = await this.prisma.movie.findFirst({
        where: { name: data.name }
      })

      if (existingMovie) {
        return { status: 409, error: `Movie ${data.name} already exists` }
      }

      // Create the new movie
      const movie = await this.prisma.movie.create({
        data: id ? { ...data, id } : data
      })

      return {
        status: 200,
        data: movie
      }
    } catch (error) {
      this.handleError(error)
      return { status: 500, error: 'Internal server error' }
    }
  }

  async updateMovie(
    data: Partial<UpdateMovieRequest>,
    id: number
  ): Promise<
    UpdateMovieResponse | MovieNotFoundResponse | ConflictMovieResponse
  > {
    try {
      const existingMovie = await this.prisma.movie.findUnique({
        where: { id }
      })
      if (!existingMovie)
        return { status: 404, error: `Movie with ID ${id} not found` }

      const updatedMovie = await this.prisma.movie.update({
        where: { id },
        data
      })

      return {
        status: 200,
        data: updatedMovie
      }
    } catch (error) {
      this.handleError(error)
      return { status: 500, error: 'Internal server error' }
    }
  }
}
