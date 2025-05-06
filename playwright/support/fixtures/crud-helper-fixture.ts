import type { Movie } from '@prisma/client'
import { test as baseApiRequestFixture } from '../../../src/api-request/fixtures'
import type { ApiRequestResponse } from '../../../src/api-request'
import type {
  DeleteMovieResponse,
  CreateMovieResponse,
  GetMovieResponse,
  UpdateMovieResponse
} from '../../../sample-app/src/@types'

type AddMovieParams = {
  addMovie: (
    token: string,
    body: Omit<Movie, 'id'>,
    baseUrl?: string
  ) => Promise<ApiRequestResponse<CreateMovieResponse>>
  getAllMovies: (
    token: string,
    baseUrl?: string
  ) => Promise<ApiRequestResponse<GetMovieResponse>>
  getMovieById: (
    token: string,
    id: number,
    baseUrl?: string
  ) => Promise<ApiRequestResponse<GetMovieResponse>>
  getMovieByName: (
    token: string,
    name: string,
    baseUrl?: string
  ) => Promise<ApiRequestResponse<GetMovieResponse>>
  updateMovie: (
    token: string,
    id: number,
    body: Partial<Movie>,
    baseUrl?: string
  ) => Promise<ApiRequestResponse<UpdateMovieResponse>>
  deleteMovie: (
    token: string,
    id: number,
    baseUrl?: string
  ) => Promise<ApiRequestResponse<DeleteMovieResponse>>
}

const commonHeaders = (token: string) => ({
  Authorization: token
})

export const test = baseApiRequestFixture.extend<AddMovieParams>({
  addMovie: async ({ apiRequest }, use) => {
    const addMovie = async (
      token: string,
      body: Omit<Movie, 'id'>,
      baseUrl?: string
    ) =>
      apiRequest<CreateMovieResponse>({
        method: 'POST',
        path: '/movies',
        baseUrl,
        body,
        headers: commonHeaders(token)
      })
    await use(addMovie)
  },

  getAllMovies: async ({ apiRequest }, use) => {
    const getAllMovies = async (token: string, baseUrl?: string) =>
      apiRequest<GetMovieResponse>({
        method: 'GET',
        path: '/movies',
        baseUrl,
        headers: commonHeaders(token)
      })
    await use(getAllMovies)
  },

  getMovieById: async ({ apiRequest }, use) => {
    const getMovieById = async (token: string, id: number, baseUrl?: string) =>
      apiRequest<GetMovieResponse>({
        method: 'GET',
        path: `/movies/${id}`,
        baseUrl,
        headers: commonHeaders(token)
      })
    await use(getMovieById)
  },

  getMovieByName: async ({ apiRequest }, use) => {
    const getMovieByName = async (
      token: string,
      name: string,
      baseUrl?: string
    ) =>
      apiRequest<GetMovieResponse>({
        method: 'GET',
        path: '/movies',
        params: { name },
        baseUrl,
        headers: commonHeaders(token)
      })
    await use(getMovieByName)
  },

  updateMovie: async ({ apiRequest }, use) => {
    const updateMovie = async (
      token: string,
      id: number,
      body: Partial<Movie>,
      baseUrl?: string
    ) =>
      apiRequest<UpdateMovieResponse>({
        method: 'PUT',
        path: `/movies/${id}`,
        baseUrl,
        body,
        headers: commonHeaders(token)
      })
    await use(updateMovie)
  },

  deleteMovie: async ({ apiRequest }, use) => {
    const deleteMovie = async (token: string, id: number, baseUrl?: string) =>
      apiRequest<DeleteMovieResponse>({
        method: 'DELETE',
        path: `/movies/${id}`,
        baseUrl,
        headers: commonHeaders(token)
      })
    await use(deleteMovie)
  }
})
