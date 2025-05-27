import type { AxiosResponse, AxiosError } from 'axios'
import axios from 'axios'
import type {
  ConflictMovieResponse,
  CreateMovieResponse,
  DeleteMovieResponse,
  GetMovieResponse,
  Movie,
  MovieNotFoundResponse,
  UpdateMovieResponse
} from '@shared/types/movie-types'
import { tokenService } from './services/token-service'

const API_URL = 'http://localhost:3001'

// Movie type from the provider, in the real world this would come from a published package

export type ErrorResponse = {
  error: string
}
// baseURL in axiosInstance: Axios uses a fixed base URL for all requests,
// and Nock must intercept that exact URL for the tests to work
const axiosInstance = axios.create({
  baseURL: API_URL // this is really the API url where the requests are going to
})

// Axios request interceptor to apply authentication token
axiosInstance.interceptors.request.use((config) => {
  // Get authorization header using the token service
  if (!config.headers.Authorization) {
    config.headers.Authorization = tokenService.getAuthorizationHeader()
  }
  return config
})

// Add response interceptor to handle token refresh on 401 responses
axiosInstance.interceptors.response.use(
  (response) => response, // Return successful responses as-is
  async (error) => {
    const originalRequest = error.config

    // If the error is 401 Unauthorized and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Mark this request as retried to prevent infinite loops
      originalRequest._retry = true

      try {
        // Refresh the token
        tokenService.refreshToken()

        // Update the authorization header with the new token
        originalRequest.headers.Authorization =
          tokenService.getAuthorizationHeader()

        // Retry the original request with the new token
        return axiosInstance(originalRequest)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_refreshError) {
        // If token refresh fails, return the original error
        return Promise.reject(error)
      }
    }

    // For other errors or if retry failed, return the original error
    return Promise.reject(error)
  }
)

// function to override the baseURL, used during pact tests
// It allows to change the baseURL of axiosInstance dynamically
// By changing the baseURL during tests, we can direct the requests
// to the Pact mock server instead of the actual API
export const setApiUrl = (url: string) => {
  axiosInstance.defaults.baseURL = url
}

// Helper function to extract data from Axios response
const yieldData = <T>(res: AxiosResponse<T>): T => res.data

// Helper function to handle errors
const handleError = (err: AxiosError): ErrorResponse => {
  if (err.response?.data) return err.response.data as ErrorResponse
  return { error: 'Unexpected error occurred' }
}

// Fetch all movies
export const getMovies = (): Promise<GetMovieResponse> =>
  axiosInstance.get('/movies').then(yieldData).catch(handleError)

// Fetch a single movie by ID
export const getMovieById = (
  id: number
): Promise<GetMovieResponse | MovieNotFoundResponse> =>
  axiosInstance.get(`/movies/${id}`).then(yieldData).catch(handleError)

export const getMovieByName = (
  name: string
): Promise<GetMovieResponse | MovieNotFoundResponse> =>
  axiosInstance.get(`/movies?name=${name}`).then(yieldData).catch(handleError)

// Create a new movie
export const addMovie = (
  data: Omit<Movie, 'id'>
): Promise<CreateMovieResponse | ConflictMovieResponse> =>
  axiosInstance.post('/movies', data).then(yieldData).catch(handleError)

// Delete movie by ID
export const deleteMovieById = (
  id: number
): Promise<DeleteMovieResponse | MovieNotFoundResponse> =>
  axiosInstance.delete(`/movies/${id}`).then(yieldData).catch(handleError)

// Update movie by ID
export const updateMovie = (
  id: number,
  data: Partial<Omit<Movie, 'id'>>
): Promise<UpdateMovieResponse | MovieNotFoundResponse> =>
  axiosInstance.put(`/movies/${id}`, data).then(yieldData).catch(handleError)
