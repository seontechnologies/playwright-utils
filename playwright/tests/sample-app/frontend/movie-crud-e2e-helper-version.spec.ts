import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { editMovie } from '@playwright/support/ui-helpers/edit-movie'
import { generateMovieWithoutId } from '@playwright/support/utils/movie-factories'
import { log } from 'src/log'

test.describe('movie crud e2e (playwright-utils helpers)', () => {
  test.beforeEach(async ({ page, interceptNetworkCall }) => {
    const loadGetMovies = interceptNetworkCall({
      method: 'GET',
      url: '/movies'
    })

    await page.goto('/')
    const { status: responseStatus } = await loadGetMovies
    expect(responseStatus).toBeGreaterThanOrEqual(200)
    expect(responseStatus).toBeLessThan(400)
  })

  test('should add and delete a movie from movie list ((playwright-utils helpers))', async ({
    page,
    interceptNetworkCall
  }) => {
    const { name, year, rating, director } = generateMovieWithoutId()

    await log.step('add a movie using the UI')
    await addMovie(page, name, year, rating, director)

    const loadAddMovie = interceptNetworkCall({
      method: 'POST',
      url: '/movies'
    })

    await page.getByTestId('add-movie-button').click()

    const { responseJson: addMovieResponseBody } = await loadAddMovie
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

    await log.step('delete a movie using the UI')
    const loadDeleteMovie = interceptNetworkCall({
      method: 'DELETE',
      url: '/movies/*'
    })

    await page.getByTestId(`delete-movie-${name}`).click()

    const { responseJson: deleteMovieResponseBody } = await loadDeleteMovie
    expect(deleteMovieResponseBody).toEqual({
      status: 200,
      message: expect.any(String)
    })

    await expect(page.getByTestId(`delete-movie-${name}`)).not.toBeVisible()
  })

  test('should update and delete a movie at movie manager ((playwright-utils helpers))', async ({
    page,
    addMovie,
    authToken
  }) => {
    const movie = generateMovieWithoutId()
    const {
      name: editedName,
      year: editedYear,
      rating: editedRating,
      director: editedDirector
    } = generateMovieWithoutId()

    await log.step('create a movie using the API')
    const { body: createResponse } = await addMovie(authToken, movie)

    const id = createResponse.data.id

    await log.step(`direct-navigation to movie ${id} page and edit`)
    await page.goto(`/movies/${id}`)

    await log.step('edit movie using the UI')
    await editMovie(page, editedName, editedYear, editedRating, editedDirector)

    await page.getByTestId('back').click()
    await expect(page).toHaveURL('/movies')
    await page.getByText(editedName).waitFor()

    await log.step(`direct-navigation to movie ${id} page and delete`)
    await page.goto(`/movies/${id}`)

    await log.step('delete movie using the UI')
    await page.getByTestId('delete-movie').click()

    await expect(page).toHaveURL('/movies')
    await page.waitForSelector(`text=${editedName}`, { state: 'detached' })
  })
})
