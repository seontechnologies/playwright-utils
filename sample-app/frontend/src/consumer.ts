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

const tokenPath = '/auth/identity-token'

export type ErrorResponse = {
  error: string
  status?: number
}
// baseURL in axiosInstance: Axios uses a fixed base URL for all requests,
// and Nock must intercept that exact URL for the tests to work
const axiosInstance = axios.create({
  baseURL: API_URL, // this is really the API url where the requests are going to
  withCredentials: true // Required for sending cookies with cross-origin requests
})

// Add request interceptor to ensure Authorization header has proper identity
axiosInstance.interceptors.request.use(
  async (config) => {
    // Skip auth header for token acquisition and refresh requests
    const isAuthRequest =
      config.url === tokenPath || config.url?.startsWith('/auth/renew')
    if (isAuthRequest) return config

    // Ensure we have a token
    if (!tokenService.isTokenValid(tokenService.getToken())) {
      await ensureValidToken()
    }

    // Always add the Authorization header with proper token format
    config.headers.Authorization = tokenService.getAuthorizationHeader()
    return config
  },
  (error) => Promise.reject(error)
)

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
        const refreshedToken = await tokenService.refreshToken()

        // Verify the refreshed token is valid before proceeding
        if (!tokenService.isTokenValid(refreshedToken)) {
          return Promise.reject(error)
        }

        // Update the authorization header with the new token
        originalRequest.headers.Authorization =
          tokenService.getAuthorizationHeader()

        // Retry the original request with the new token
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
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

/**
 * Ensure we have a valid token before making API requests
 * This simplified version only checks if we have a token, without auto-acquiring
 * @returns Promise that resolves when a valid token is available
 */
const ensureValidToken = async (): Promise<void> => {
  try {
    // Just check if we have any token - don't auto-acquire
    const token = tokenService.getToken()
    if (!token) {
      console.warn('No token available - user needs to log in')
      // Let the protected route handle redirection instead of throwing
    }
  } catch (error) {
    console.error('Failed to ensure valid token:', error)
    throw error
  }
}

// Helper function to extract data from Axios response
const yieldData = <T>(res: AxiosResponse<T>): T => res.data

// Helper function to handle errors
const handleError = (err: AxiosError): ErrorResponse => {
  // If we have structured error data from the server, use it
  if (err.response?.data && typeof err.response.data === 'object') {
    const errorData = err.response.data as ErrorResponse
    return {
      ...errorData,
      status: errorData.status || err.response.status || 500
    }
  }

  // Otherwise create a generic error with the status from the response if available
  return {
    error: err.message || 'Unexpected error occurred',
    status: err.response?.status || 500
  }
}

// Helper function to make API calls with error handling
const call = <T>(req: Promise<AxiosResponse<T>>): Promise<T | ErrorResponse> =>
  req.then(yieldData).catch(handleError)

// Fetch all movies
export const getMovies = async (): Promise<
  GetMovieResponse | ErrorResponse
> => {
  // Ensure we have a valid token before making the request
  await ensureValidToken()
  return call(axiosInstance.get('/movies'))
}

// Fetch a single movie by ID
export const getMovieById = async (
  id: number
): Promise<GetMovieResponse | MovieNotFoundResponse | ErrorResponse> => {
  await ensureValidToken()
  return call(axiosInstance.get(`/movies/${id}`))
}

// Fetch a movie by name
export const getMovieByName = async (
  name: string
): Promise<GetMovieResponse | MovieNotFoundResponse | ErrorResponse> => {
  await ensureValidToken()
  return call(axiosInstance.get(`/movies?name=${encodeURIComponent(name)}`))
}

// Create a new movie
export const addMovie = async (
  data: Omit<Movie, 'id'>
): Promise<CreateMovieResponse | ConflictMovieResponse | ErrorResponse> => {
  await ensureValidToken()
  return call(axiosInstance.post('/movies', data))
}

// Delete movie by ID
export const deleteMovieById = async (
  id: number
): Promise<DeleteMovieResponse | MovieNotFoundResponse | ErrorResponse> => {
  await ensureValidToken()
  return call(axiosInstance.delete(`/movies/${id}`))
}

// Update movie by ID
export const updateMovie = async (
  id: number,
  data: Partial<Omit<Movie, 'id'>>
): Promise<UpdateMovieResponse | MovieNotFoundResponse | ErrorResponse> => {
  await ensureValidToken()
  return call(axiosInstance.put(`/movies/${id}`, data))
}

// Authentication Types
export type AuthRequest = {
  username: string
  password: string
  role?: string
}

export type AuthResponse = {
  token: string
  expiresAt: string
  refreshToken: string
  refreshExpiresAt: string
  identity: {
    userId: string
    username: string
    role: string
  }
  status: number
  message: string
}

type AuthError = {
  error: string
  status: number
}

// Login with username/password/role
export const login = async (
  credentials: AuthRequest
): Promise<AuthResponse | AuthError> => {
  try {
    // Use explicit response handling for authentication to handle cookies properly
    const response = await axiosInstance.post(tokenPath, credentials)

    // Validate that the response contains the expected data structure
    const data = yieldData(response)

    // Ensure that cookies would have been set by checking status
    if (data.status !== 200) {
      return {
        error:
          'Authentication failed: Server did not set authentication cookies',
        status: data.status || 500
      }
    }

    // Verify that we have identity information
    if (!data.identity || !data.identity.userId) {
      return {
        error: 'Authentication failed: Invalid identity information',
        status: 500
      }
    }

    return data
  } catch (error) {
    // Ensure the error response includes the required status property
    const errorResponse = handleError(error as AxiosError)
    return {
      ...errorResponse,
      status: errorResponse.status || 500
    }
  }
}
