import { test as baseApiRequestFixture } from '../../../src/api-request/fixtures'
import type { ApiRequestResponse } from '../../../src/api-request'
import { functionTestStep } from '../../../src/log'
import type {
  DeleteMovieResponse,
  CreateMovieResponse,
  GetMovieResponse,
  UpdateMovieResponse,
  Movie
} from '../../../sample-app/shared/types'
import { API_URL } from '@playwright/config/local.config'

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
    // Create the base function
    const addMovieBase = async (
      token: string,
      body: Omit<Movie, 'id'>,
      baseUrl = API_URL
    ) =>
      apiRequest<CreateMovieResponse>({
        method: 'POST',
        path: '/movies',
        baseUrl,
        body,
        headers: commonHeaders(token)
      })

    // Wrap it with the functionTestStep decorator
    const addMovie = functionTestStep('Add Movie', addMovieBase)

    await use(addMovie)
  },

  getAllMovies: async ({ apiRequest }, use) => {
    const getAllMoviesBase = async (token: string, baseUrl = API_URL) =>
      apiRequest<GetMovieResponse>({
        method: 'GET',
        path: '/movies',
        baseUrl,
        headers: commonHeaders(token)
      })

    const getAllMovies = functionTestStep('Get All Movies', getAllMoviesBase)

    await use(getAllMovies)
  },

  getMovieById: async ({ apiRequest }, use) => {
    const getMovieByIdBase = async (
      token: string,
      id: number,
      baseUrl = API_URL
    ) =>
      apiRequest<GetMovieResponse>({
        method: 'GET',
        path: `/movies/${id}`,
        baseUrl,
        headers: commonHeaders(token)
      })

    const getMovieById = functionTestStep('Get Movie By ID', getMovieByIdBase)
    await use(getMovieById)
  },

  getMovieByName: async ({ apiRequest }, use) => {
    const getMovieByNameBase = async (
      token: string,
      name: string,
      baseUrl = API_URL
    ) =>
      apiRequest<GetMovieResponse>({
        method: 'GET',
        path: '/movies',
        baseUrl,
        params: {
          name
        },
        headers: commonHeaders(token)
      })

    const getMovieByName = functionTestStep(
      'Get Movie By Name',
      getMovieByNameBase
    )
    await use(getMovieByName)
  },

  updateMovie: async ({ apiRequest }, use) => {
    const updateMovieBase = async (
      token: string,
      id: number,
      body: Partial<Movie>,
      baseUrl = API_URL
    ) =>
      apiRequest<UpdateMovieResponse>({
        method: 'PUT',
        path: `/movies/${id}`,
        baseUrl,
        body,
        headers: commonHeaders(token)
      })

    const updateMovie = functionTestStep('Update Movie', updateMovieBase)
    await use(updateMovie)
  },

  deleteMovie: async ({ apiRequest }, use) => {
    const deleteMovieBase = async (
      token: string,
      id: number,
      baseUrl = API_URL
    ) =>
      apiRequest<DeleteMovieResponse>({
        method: 'DELETE',
        path: `/movies/${id}`,
        baseUrl,
        headers: commonHeaders(token)
      })

    const deleteMovie = functionTestStep('Delete Movie', deleteMovieBase)
    await use(deleteMovie)
  }
})
