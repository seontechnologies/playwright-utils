import type { MovieRepository } from './movie-repository'
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
import type { ZodSchema } from 'zod'
import { CreateMovieSchema, UpdateMovieSchema } from './@types/schema'

// In the context of the MovieService, what you care about is the contract/interface
// (i.e., the methods defined by the MovieRepository interface).
// The service doesn't care if it's using Prisma, a REST API, or an in-memory database
// it only cares that the object implements MovieRepository.

/*
  API (Driving Adapter - entry point)
                  |
                  v
    +----------------------------+
    |        MovieService        |
    | (Application Core/Hexagon) |
    +----------------------------+
                  |
                  v
      MovieRepository (Port)
                  |
                  v
MovieAdapter (Driven Adapter - 2ndary, interacts with outside)
                  |
                  v
              Database
*/

export class MovieService {
  constructor(private readonly movieRepository: MovieRepository) {
    this.movieRepository = movieRepository
  }

  async getMovies(): Promise<GetMovieResponse> {
    return this.movieRepository.getMovies()
  }

  async getMovieById(
    id: number
  ): Promise<GetMovieResponse | MovieNotFoundResponse> {
    return this.movieRepository.getMovieById(id)
  }

  async getMovieByName(
    name: string
  ): Promise<GetMovieResponse | MovieNotFoundResponse> {
    return this.movieRepository.getMovieByName(name)
  }

  async deleteMovieById(
    id: number
  ): Promise<DeleteMovieResponse | MovieNotFoundResponse> {
    return this.movieRepository.deleteMovieById(id)
  }

  async addMovie(
    data: CreateMovieRequest,
    id?: number
  ): Promise<CreateMovieResponse | ConflictMovieResponse> {
    // Zod Key feature 3: safeParse
    // Zod note: if you have a frontend, you can use the schema + safeParse there
    // in order to perform form validation before sending the data to the server
    const validationResult = validateSchema(CreateMovieSchema, data)
    if (!validationResult.success)
      return { status: 400, error: validationResult.error }

    return this.movieRepository.addMovie(data, id)
  }

  async updateMovie(
    data: UpdateMovieRequest,
    id: number
  ): Promise<
    UpdateMovieResponse | MovieNotFoundResponse | ConflictMovieResponse
  > {
    // Zod Key feature 3: safeParse
    // Zod note: if you have a frontend, you can use the schema + safeParse there
    // in order to perform form validation before sending the data to the server
    const validationResult = validateSchema(UpdateMovieSchema, data)
    if (!validationResult.success)
      return { status: 400, error: validationResult.error }

    return this.movieRepository.updateMovie(data, id)
  }
}

// helper function for schema validation
function validateSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    const errorMessages = result.error.errors
      .map((err) => `${err.path.join('.')} - ${err.message}`)
      .join(', ')
    return { success: false, error: errorMessages }
  }
}

/*
How would this look in a lambda?

Lambda Function (Driving Adapter)
          |
          v
      MovieService
          |
          v
   MovieRepository (Port)
          |
          v
   MovieAdapter (Driven Adapter)
          |
          v
      Database

// example lambda
// lambda functions replace the Express routes as driving adapters

import { MovieService } from './movie-service'
import { MovieAdapter } from './movie-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const movieRepository = new MovieAdapter(prisma)
const movieService = new MovieService(movieRepository)

export const getMovie = async (event) => {
  const id = parseInt(event.pathParameters.id, 10)
  return movieService.getMovieById(id)
}


*/
