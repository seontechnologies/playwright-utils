import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { editMovie } from '@playwright/support/ui-helpers/edit-movie'
import { generateMovieWithoutId } from '@playwright/support/utils/movie-factories'
import type { Movie } from '@shared/types/movie-types'

test.describe('movie crud e2e stubbed (vanilla playwright)', () => {
  // Generate initial movie data
  const { name, year, rating, director } = generateMovieWithoutId()
  const id = 1
  const movie: Movie = { id, name, year, rating, director }

  // Generate edited movie data
  const {
    name: editedName,
    year: editedYear,
    rating: editedRating,
    director: editedDirector
  } = generateMovieWithoutId()

  test('should add a movie (vanilla playwright)', async ({ page }) => {
    await page.route('**/movies', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const loadNoMovies = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    )

    await page.goto('/')
    await loadNoMovies

    await addMovie(page, name, year, rating, director)

    await page.route('**/movies', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify(movie),
          headers: { 'Content-Type': 'application/json' }
        })
      } else if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [movie] }),
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        return route.continue()
      }
    })

    const loadAddMovie = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'POST' &&
        response.status() === 200
    )
    const loadGetMovies = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    )

    await page.getByTestId('add-movie-button').click()
    await loadAddMovie
    await loadGetMovies
  })

  test('should edit a movie (vanilla playwright)', async ({ page }) => {
    await page.route('**/movies', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [movie] }),
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const loadGetMovies = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    )

    await page.route('**/movies/*', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: movie }),
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const loadGetMovieById = page.waitForResponse(
      (response) =>
        response.url().includes(`/movies/${id}`) &&
        response.request().method() === 'GET' &&
        response.status() === 200
    )

    await page.goto('/')
    await loadGetMovies

    await page.getByTestId(`link-${id}`).click()
    await expect(page).toHaveURL(`/movies/${id}`)
    const getMovieByIdResponse = await loadGetMovieById

    const { data } = await getMovieByIdResponse.json()
    expect(data).toEqual(movie)

    await page.route(`**/movies/${id}`, async (route) => {
      if (route.request().method() === 'PUT') {
        const updatedMovie: Movie = {
          id: movie.id,
          name: editedName,
          year: editedYear,
          rating: editedRating,
          director: editedDirector
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedMovie)
        })
      } else {
        await route.continue()
      }
    })

    const loadUpdateMovieById = page.waitForResponse(
      (response) =>
        response.url().includes(`/movies/${id}`) &&
        response.request().method() === 'PUT' &&
        response.status() === 200
    )

    await editMovie(page, editedName, editedYear, editedRating, editedDirector)
    const updateMovieByIdRes = await loadUpdateMovieById
    const updatedMovieData = await updateMovieByIdRes.json()
    expect(updatedMovieData.name).toBe(editedName)
  })

  test('should delete a movie', async ({ page }) => {
    await page.route('**/movies', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [movie] }),
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const loadGetMovies = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    )

    await page.goto('/')
    await loadGetMovies

    await page.route(`**/movies/${id}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200
        })
      } else {
        await route.continue()
      }
    })
    const loadDeleteMovie = page.waitForResponse(
      (response) =>
        response.url().includes(`/movies/${id}`) &&
        response.request().method() === 'DELETE' &&
        response.status() === 200
    )

    await page.route('**/movies', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const loadGetMoviesAfterDelete = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    )

    await page.getByTestId(`delete-movie-${name}`).click()
    await loadDeleteMovie
    await loadGetMoviesAfterDelete

    await expect(page.getByTestId(`delete-movie-${name}`)).not.toBeVisible()
  })
})
