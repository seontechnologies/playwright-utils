import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

// Zod Key feature 1: define the schema with Zod (and expand it with zod-to-openapi)

// Generate OpenAPI Docs with Zod step 1) Define Schemas (with zod)
// Each field is annotated with OpenAPI-specific metadata such as example and description.

// extends Zod with OpenAPI support
extendZodWithOpenApi(z)

export const CreateMovieSchema = z
  .object({
    id: z
      .number()
      .int()
      .optional()
      .openapi({ example: 1, description: 'Movie ID ' }),
    name: z
      .string()
      .min(1)
      .openapi({ example: 'Inception', description: 'Movie name' }),
    year: z
      .number()
      .int()
      .min(1900)
      .max(2024)
      .openapi({ example: 2010, description: 'Release year' }),
    rating: z.number().openapi({ example: 7.5, description: 'Rating' }),
    director: z.string().min(1).openapi({
      example: 'Christopher Nolan',
      description: 'Director'
    })
  })
  .openapi('CreateMovieRequest')

export const CreateMovieResponseSchema = z
  .object({
    status: z
      .number()
      .int()
      .openapi({ example: 200, description: 'Response status code' }),
    data: z.object({
      id: z.number().int().openapi({ example: 1, description: 'Movie ID' }),
      name: z
        .string()
        .openapi({ example: 'Inception', description: 'Movie name' }),
      year: z
        .number()
        .int()
        .openapi({ example: 2010, description: 'Release year' }),
      rating: z.number().openapi({ example: 7.5, description: 'Rating' }),
      director: z.string().openapi({
        example: 'Christopher Nolan',
        description: 'Director'
      })
    }),
    error: z
      .string()
      .optional()
      .openapi({ description: 'Error message, if any' })
  })
  .openapi('CreateMovieResponse')

export const ConflictMovieResponseSchema = z.object({
  status: z
    .number()
    .int()
    .openapi({ example: 409, description: 'Conflict status code' }),
  error: z
    .string()
    .openapi({ example: 'Movie already exists', description: 'Error message' })
})

const movieObj = {
  id: z.number().openapi({ example: 1, description: 'Movie ID' }),
  name: z.string().openapi({ example: 'Inception', description: 'Movie name' }),
  year: z.number().openapi({ example: 2010, description: 'Release year' }),
  rating: z.number().openapi({ example: 7.5, description: 'Rating' }),
  director: z.string().openapi({
    example: 'Christopher Nolan',
    description: 'Director'
  })
}

export const GetMovieResponseUnionSchema = z
  .object({
    status: z
      .number()
      .int()
      .openapi({ example: 200, description: 'Response status code' }),
    data: z.union([
      z
        .object(movieObj)
        .nullable()
        .openapi({
          description: 'Movie details or null if not found',
          example: {
            id: 1,
            name: 'Inception',
            year: 2010,
            rating: 7.5,
            director: 'Christopher Nolan'
          }
        }),
      z.array(z.object(movieObj)).openapi({
        description: 'List of movies or an empty array if no movies exist',
        example: []
      })
    ]),
    error: z.string().nullable().optional().openapi({
      description: 'Error message if an error occurred, otherwise null',
      example: null
    })
  })
  .openapi('GetMovieResponse')

export const MovieNotFoundResponseSchema = z.object({
  status: z
    .number()
    .int()
    .openapi({ example: 404, description: 'Response status code' }),
  error: z
    .string()
    .openapi({ example: 'Movie not found', description: 'Error message' })
})

export const DeleteMovieResponseSchema = z.object({
  status: z
    .number()
    .int()
    .openapi({ example: 200, description: 'Response status code' }),
  message: z.string().openapi({
    example: 'Movie {id} has been deleted',
    description: 'Success message for the deleted movie'
  })
})

export const UpdateMovieSchema = z
  .object({
    id: z.number().optional().openapi({ example: 1, description: 'Movie ID' }),
    name: z
      .string()
      .min(1)
      .optional()
      .openapi({ example: 'Inception', description: 'Movie name' }),
    year: z
      .number()
      .int()
      .min(1900)
      .max(2024)
      .optional()
      .openapi({ example: 2010, description: 'Release year' }),
    rating: z
      .number()
      .optional()
      .openapi({ example: 7.5, description: 'Rating' }),
    director: z.string().min(1).optional().openapi({
      example: 'Christopher Nolan',
      description: 'Director'
    })
  })
  .openapi('UpdateMovieRequest')

export const UpdateMovieResponseSchema = z
  .object({
    status: z
      .number()
      .int()
      .openapi({ example: 200, description: 'Response status code' }),
    data: z
      .object({
        id: z.number().openapi({ example: 1, description: 'Movie ID' }),
        name: z
          .string()
          .openapi({ example: 'Inception', description: 'Movie name' }),
        year: z
          .number()
          .openapi({ example: 2010, description: 'Release year' }),
        rating: z.number().openapi({ example: 7.5, description: 'Rating' }),
        director: z.string().openapi({
          example: 'Christopher Nolan',
          description: 'Director'
        })
      })
      .openapi({ description: 'Updated movie data' }),
    error: z
      .string()
      .optional()
      .openapi({ description: 'Error message, if any' })
  })
  .openapi('UpdatedMovieResponse')
