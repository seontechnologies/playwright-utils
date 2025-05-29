import { API_URL } from '@playwright/config/local.config'
import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { editMovie } from '@playwright/support/ui-helpers/edit-movie'
import { generateMovieWithoutId } from '@playwright/support/utils/movie-factories'

test.describe('movie crud e2e (vanilla playwright)', () => {
  test.beforeEach(async ({ page }) => {
    const loadGetMovies = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'GET'
    )

    await page.goto('/')
    const response = await loadGetMovies
    const responseStatus = response.status()
    expect(responseStatus).toBeGreaterThanOrEqual(200)
    expect(responseStatus).toBeLessThan(400)
  })

  test('should add and delete a movie from movie list (vanilla playwright)', async ({
    page
  }) => {
    const { name, year, rating, director } = generateMovieWithoutId()

    await addMovie(page, name, year, rating, director)

    const loadAddMovie = page.waitForResponse(
      (response) =>
        response.url().includes('/movies') &&
        response.request().method() === 'POST'
    )

    await page.getByTestId('add-movie-button').click()

    const addMovieResponse = await loadAddMovie
    const addMovieResponseBody = await addMovieResponse.json()
    expect(addMovieResponseBody).toEqual({
      status: 200,
      data: {
        id: expect.any(Number),
        name,
        year,
        rating,
        director
      }
    })

    const loadDeleteMovie = page.waitForResponse(
      (response) =>
        response.url().includes('/movies/') &&
        response.request().method() === 'DELETE'
    )

    await page.getByTestId(`delete-movie-${name}`).click()

    const deleteMovieResponse = await loadDeleteMovie
    const deleteMovieResponseBody = await deleteMovieResponse.json()
    expect(deleteMovieResponseBody).toEqual({
      status: 200,
      message: expect.any(String)
    })

    await expect(page.getByTestId(`delete-movie-${name}`)).not.toBeVisible()
  })

  test('should update and delete a movie at movie manager (vanilla playwright)', async ({
    page,
    addMovie,
    apiRequest
  }) => {
    const movie = generateMovieWithoutId()
    const {
      name: editedName,
      year: editedYear,
      rating: editedRating,
      director: editedDirector
    } = generateMovieWithoutId()

    const {
      body: { token }
    } = await apiRequest<{ token: string }>({
      method: 'POST',
      path: '/auth/fake-token',
      baseUrl: API_URL
    })

    const { body: createResponseBody } = await addMovie(token, movie)

    const id = createResponseBody.data.id

    await page.goto(`/movies/${id}`)

    await editMovie(page, editedName, editedYear, editedRating, editedDirector)

    await page.getByTestId('back').click()
    await expect(page).toHaveURL('/movies')
    await page.getByText(editedName).waitFor()

    await page.goto(`/movies/${id}`)
    await page.getByTestId('delete-movie').click()
    await expect(page).toHaveURL('/movies')
    await page.waitForSelector(`text=${editedName}`, { state: 'detached' })
  })
})
