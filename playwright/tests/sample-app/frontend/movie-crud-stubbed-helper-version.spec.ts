import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { editMovie } from '@playwright/support/ui-helpers/edit-movie'
import { generateMovieWithoutId } from '@playwright/support/utils/movie-factories'
import type { Movie } from '@shared/types/movie-types'
import { log } from 'src/log'

test.describe('movie crud e2e stubbed (playwright-utils helpers)', () => {
  const { name, year, rating, director } = generateMovieWithoutId()
  const id = 1
  const movie: Movie = { id, name, year, rating, director }

  const {
    name: editedName,
    year: editedYear,
    rating: editedRating,
    director: editedDirector
  } = generateMovieWithoutId()

  test('should add a movie (playwright-utils helpers)', async ({
    page,
    interceptNetworkCall
  }) => {
    const loadNoMovies = interceptNetworkCall({
      method: 'GET',
      url: '/movies',
      fulfillResponse: {
        status: 200,
        body: { data: [] }
      }
    })

    await page.goto('/')
    await loadNoMovies

    await log.step('add a movie using the UI')
    await addMovie(page, name, year, rating, director)

    const loadPostOrGetMovies = interceptNetworkCall({
      url: '/movies',
      handler: async (route, request) => {
        if (request.method() === 'POST') {
          return route.fulfill({
            status: 200,
            body: JSON.stringify(movie),
            headers: { 'Content-Type': 'application/json' }
          })
        } else if (request.method() === 'GET') {
          return route.fulfill({
            status: 200,
            body: JSON.stringify({ data: [movie] }),
            headers: { 'Content-Type': 'application/json' }
          })
        } else {
          return route.continue()
        }
      }
    })

    await page.getByTestId('add-movie-button').click()
    await loadPostOrGetMovies
    await loadPostOrGetMovies
  })

  test('should edit movie (playwright-utils helpers)', async ({
    page,
    interceptNetworkCall
  }) => {
    const loadGetMovies = interceptNetworkCall({
      method: 'GET',
      url: '/movies',
      fulfillResponse: {
        status: 200,
        body: { data: [movie] }
      }
    })

    const loadGetMovieById = interceptNetworkCall({
      method: 'GET',
      url: '/movies/*',
      fulfillResponse: {
        status: 200,
        body: { data: movie }
      }
    })

    await page.goto('/')
    await loadGetMovies

    await page.getByTestId(`link-${id}`).click()
    await expect(page).toHaveURL(`/movies/${id}`)
    const {
      responseJson: { data: getMovieByIdData }
    } = (await loadGetMovieById) as { responseJson: { data: Movie } }
    expect(getMovieByIdData).toEqual(movie)

    const loadUpdateMovieById = interceptNetworkCall({
      method: 'PUT',
      url: '/movies/*',
      fulfillResponse: {
        status: 200,
        body: {
          data: {
            id: movie.id,
            name: editedName,
            year: editedYear,
            rating: editedRating,
            director: editedDirector
          }
        }
      }
    })

    await editMovie(page, editedName, editedYear, editedRating, editedDirector)
    const { responseJson: data } = await loadUpdateMovieById
    expect((data as { data: Movie }).data.name).toBe(editedName)
  })

  test('should delete a movie (playwright-utils helpers)', async ({
    page,
    interceptNetworkCall
  }) => {
    const loadGetMovies = interceptNetworkCall({
      method: 'GET',
      url: '/movies',
      fulfillResponse: {
        status: 200,
        body: { data: [movie] }
      }
    })

    await page.goto('/')
    await loadGetMovies

    const loadDeleteMovie = interceptNetworkCall({
      method: 'DELETE',
      url: '/movies/*',
      fulfillResponse: {
        status: 200
      }
    })

    const loadGetMoviesAfterDelete = interceptNetworkCall({
      method: 'GET',
      url: '/movies',
      fulfillResponse: {
        status: 200,
        body: { data: [] }
      }
    })

    await page.getByTestId(`delete-movie-${name}`).click()
    await loadDeleteMovie
    await loadGetMoviesAfterDelete

    await expect(page.getByTestId(`delete-movie-${name}`)).not.toBeVisible()
  })
})
