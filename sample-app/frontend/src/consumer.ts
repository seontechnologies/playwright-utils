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

const API_URL = import.meta.env.VITE_API_URL

// Movie type from the provider, in the real world this would come from a published package

export type ErrorResponse = {
  error: string
}
// baseURL in axiosInstance: Axios uses a fixed base URL for all requests,
// and Nock must intercept that exact URL for the tests to work
const axiosInstance = axios.create({
  baseURL: API_URL // this is really the API url where the requests are going to
})

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

const generateAuthToken = (): string => `Bearer ${new Date().toISOString()}`

const commonHeaders = {
  headers: { Authorization: generateAuthToken() }
}

// Fetch all movies
export const getMovies = (): Promise<GetMovieResponse> =>
  axiosInstance.get('/movies', commonHeaders).then(yieldData).catch(handleError)

// Fetch a single movie by ID
export const getMovieById = (
  id: number
): Promise<GetMovieResponse | MovieNotFoundResponse> =>
  axiosInstance
    .get(`/movies/${id}`, commonHeaders)
    .then(yieldData)
    .catch(handleError)

export const getMovieByName = (
  name: string
): Promise<GetMovieResponse | MovieNotFoundResponse> =>
  axiosInstance
    .get(`/movies?name=${name}`, commonHeaders)
    .then(yieldData)
    .catch(handleError)

// Create a new movie
export const addMovie = (
  data: Omit<Movie, 'id'>
): Promise<CreateMovieResponse | ConflictMovieResponse> =>
  axiosInstance
    .post('/movies', data, commonHeaders)
    .then(yieldData)
    .catch(handleError)

// Delete movie by ID
export const deleteMovieById = (
  id: number
): Promise<DeleteMovieResponse | MovieNotFoundResponse> =>
  axiosInstance
    .delete(`/movies/${id}`, commonHeaders)
    .then(yieldData)
    .catch(handleError)

// Update movie by ID
export const updateMovie = (
  id: number,
  data: Partial<Omit<Movie, 'id'>>
): Promise<UpdateMovieResponse | MovieNotFoundResponse> =>
  axiosInstance
    .put(`/movies/${id}`, data, commonHeaders)
    .then(yieldData)
    .catch(handleError)
