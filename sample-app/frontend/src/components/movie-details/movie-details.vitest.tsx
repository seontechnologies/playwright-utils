/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  describe,
  expect,
  it,
  screen,
  wrappedRender,
  http,
  worker,
  waitFor
} from '@vitest-utils/utils'
import MovieDetails from './movie-details'
import { generateMovieWithoutId } from '../../test-utils/factories'

describe('<MovieDetails />', () => {
  const id = 123
  const movieName = 'The Godfather 123'
  const movie = { id, ...generateMovieWithoutId(), name: movieName }
  const baseUrl = 'http://localhost:3001'

  it('should display the default error with delay', async () => {
    const error = 'Unexpected error occurred'
    let responseData: any

    worker.use(
      http.get(`${baseUrl}/movies/${id}`, () => {
        responseData = { error }
        return new Response(JSON.stringify(responseData), {
          status: 400
        })
      })
    )

    wrappedRender(<MovieDetails />, { path: '/:id', route: `/${id}` })

    await waitFor(() => {
      expect(responseData).toMatchObject({ error })
    })

    expect(await screen.findByText(error)).toBeVisible()
  })

  it('should display a specific error', async () => {
    const error = 'Movie not found'
    let responseData: any

    worker.use(
      http.get(`${baseUrl}/movies/${id}`, () => {
        responseData = {
          error: {
            error
          }
        }
        return new Response(JSON.stringify(responseData), {
          status: 400
        })
      })
    )

    wrappedRender(<MovieDetails />, { path: '/:id', route: `/${id}` })

    await waitFor(() => {
      expect(responseData).toMatchObject({
        error: {
          error
        }
      })
    })

    expect(await screen.findByText(error)).toBeVisible()
  })

  it('should make a unique network call when the route takes an id', async () => {
    let responseData: any

    worker.use(
      http.get(`${baseUrl}/movies/${id}`, () => {
        responseData = { data: movie }
        return new Response(JSON.stringify(responseData), { status: 200 })
      })
    )

    wrappedRender(<MovieDetails />, { path: '/:id', route: `/${id}` })

    await waitFor(() => {
      expect(responseData).toMatchObject({ data: movie })
    })
  })

  it('should make a unique network call when the route takes a query parameter', async () => {
    const route = `/movies?name=${encodeURIComponent(movieName)}`
    let responseData: any

    worker.use(
      http.get(`${baseUrl}/movies`, () => {
        responseData = { data: movie }
        return new Response(JSON.stringify(responseData), {
          status: 200
        })
      })
    )

    wrappedRender(<MovieDetails />, {
      route,
      path: '/movies'
    })

    await waitFor(() => {
      expect(responseData).toMatchObject({ data: movie })
    })
  })
})
