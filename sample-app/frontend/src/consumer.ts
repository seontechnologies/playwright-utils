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
  baseURL: API_URL, // this is really the API url where the requests are going to
  withCredentials: true // Required for sending cookies with cross-origin requests
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

/**
 * Token state tracking
 */
let tokenAcquisitionPromise: Promise<void> | null = null
let isAcquiringToken = false

/**
 * Acquire an initial token from the server
 * This should be called before making any protected API requests
 */
export const acquireInitialToken = async (): Promise<void> => {
  // If we already have a valid token, no need to acquire a new one
  if (tokenService.isTokenValid(tokenService.getToken())) {
    console.log('Using existing valid token')
    return
  }

  // If we're already acquiring a token, return the existing promise
  if (isAcquiringToken && tokenAcquisitionPromise) {
    console.log('Token acquisition already in progress, waiting...')
    return tokenAcquisitionPromise
  }

  console.log('Acquiring initial token...')
  isAcquiringToken = true

  // Create a new token acquisition promise
  tokenAcquisitionPromise = new Promise<void>((resolve, reject) => {
    // Call the fake token endpoint to get an initial token
    axios
      .post(
        `${API_URL}/auth/fake-token`,
        {},
        {
          withCredentials: true // Needed to store cookies
        }
      )
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`Failed to acquire token, status: ${response.status}`)
        }

        console.log('Initial token acquired successfully')

        // Since the backend sets httpOnly cookies, we can't access them directly with JavaScript
        // Instead, we'll use the token data from the response to update our token service
        if (
          response.data &&
          response.data.token &&
          response.data.refreshToken
        ) {
          // Create a storage state from the response data
          const tokenState = {
            cookies: [
              {
                name: 'seon-jwt',
                value: response.data.token,
                domain: window.location.hostname,
                path: '/',
                expires: new Date(response.data.expiresAt).getTime() / 1000,
                httpOnly: false, // Note: this is just for our internal tracking
                secure: window.location.protocol === 'https:',
                sameSite: 'Lax' as const // Type assertion to match Cookie.sameSite
              },
              {
                name: 'seon-refresh',
                value: response.data.refreshToken,
                domain: window.location.hostname,
                path: '/',
                expires:
                  new Date(response.data.refreshExpiresAt).getTime() / 1000,
                httpOnly: false, // Note: this is just for our internal tracking
                secure: window.location.protocol === 'https:',
                sameSite: 'Lax' as const // Type assertion to match Cookie.sameSite
              }
            ],
            origins: []
          }

          // Update the token service with the token data from the response
          // This works even though the actual cookies are httpOnly
          tokenService.setToken(tokenState)
          console.log('Token state updated from API response')
          return Promise.resolve()
        }

        console.warn('No token data in response')
        return Promise.resolve()
      })
      .then(() => {
        resolve()
      })
      .catch((error) => {
        console.error('Failed to acquire initial token:', error)
        reject(error)
      })
      .finally(() => {
        isAcquiringToken = false
      })
  })

  return tokenAcquisitionPromise
}

/**
 * Ensure we have a valid token before making API requests
 * @returns Promise that resolves when a valid token is available
 */
const ensureValidToken = async (): Promise<void> => {
  try {
    await acquireInitialToken()
  } catch (error) {
    console.error('Failed to ensure valid token:', error)
    throw error
  }
}

// Helper function to extract data from Axios response
const yieldData = <T>(res: AxiosResponse<T>): T => res.data

// Helper function to handle errors
const handleError = (err: AxiosError): ErrorResponse => {
  if (err.response?.data) return err.response.data as ErrorResponse
  return { error: 'Unexpected error occurred' }
}

// Fetch all movies
export const getMovies = async (): Promise<GetMovieResponse> => {
  // Ensure we have a valid token before making the request
  await ensureValidToken()
  return axiosInstance.get('/movies').then(yieldData).catch(handleError)
}

// Fetch a single movie by ID
export const getMovieById = async (
  id: number
): Promise<GetMovieResponse | MovieNotFoundResponse> => {
  await ensureValidToken()
  return axiosInstance.get(`/movies/${id}`).then(yieldData).catch(handleError)
}

// Fetch a movie by name
export const getMovieByName = async (
  name: string
): Promise<GetMovieResponse | MovieNotFoundResponse> => {
  await ensureValidToken()
  return axiosInstance
    .get(`/movies?name=${encodeURIComponent(name)}`)
    .then(yieldData)
    .catch(handleError)
}

// Create a new movie
export const addMovie = async (
  data: Omit<Movie, 'id'>
): Promise<CreateMovieResponse | ConflictMovieResponse> => {
  await ensureValidToken()
  return axiosInstance.post('/movies', data).then(yieldData).catch(handleError)
}

// Delete movie by ID
export const deleteMovieById = async (
  id: number
): Promise<DeleteMovieResponse | MovieNotFoundResponse> => {
  await ensureValidToken()
  return axiosInstance
    .delete(`/movies/${id}`)
    .then(yieldData)
    .catch(handleError)
}

// Update movie by ID
export const updateMovie = async (
  id: number,
  data: Partial<Omit<Movie, 'id'>>
): Promise<UpdateMovieResponse | MovieNotFoundResponse> => {
  await ensureValidToken()
  return axiosInstance
    .put(`/movies/${id}`, data)
    .then(yieldData)
    .catch(handleError)
}
