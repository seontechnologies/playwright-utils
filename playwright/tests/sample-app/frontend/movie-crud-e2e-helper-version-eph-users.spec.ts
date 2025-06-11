import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { editMovie } from '@playwright/support/ui-helpers/edit-movie'
import { generateMovieWithoutId } from '@playwright/support/utils/movie-factories'
import { log } from 'src/log'
import {
  createTestUser,
  generateUserData,
  type UserData
} from '../../../../sample-app/shared/user-factory'
import { applyUserCookiesToBrowserContext } from 'src/auth-session'
import type { BrowserContext, Page } from '@playwright/test'
import type { InterceptNetworkCallFn } from 'src/intercept-network-call/intercept-network-call'

test.describe('movie crud e2e with ephemeral users (playwright-utils helpers)', () => {
  let AdminUser: UserData
  let ReadUser: UserData

  const AdminUserData = generateUserData('admin')
  const ReadUserData = generateUserData('read')

  test.beforeAll(async ({}) => {
    AdminUser = await createTestUser(AdminUserData)
    ReadUser = await createTestUser(ReadUserData)
  })

  test.use({
    authSessionEnabled: false
  })

  test.describe('admin user', () => {
    test.beforeEach(async ({ page, interceptNetworkCall, context }) => {
      await log.step('KEY FEATURE: apply user auth to browser context')
      await applyUserCookiesToBrowserContext(context, AdminUser)

      const loadGetMovies = interceptNetworkCall({
        method: 'GET',
        url: '/movies'
      })

      await page.goto('/')
      const { status: responseStatus } = await loadGetMovies
      expect(responseStatus).toBeGreaterThanOrEqual(200)
      expect(responseStatus).toBeLessThan(400)
    })

    test('authentication on the fly with admin ephemeral user', async ({
      page
    }) => {
      await expect(page).toHaveURL('/movies')
      await log.step('at movies page')
    })

    test('should add and delete a movie from movie list with ephemeral users (playwright-utils helpers)', async ({
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

    test('should update and delete a movie at movie manager with ephemeral users (playwright-utils helpers)', async ({
      page,
      addMovie
    }) => {
      const movie = generateMovieWithoutId()
      const {
        name: editedName,
        year: editedYear,
        rating: editedRating,
        director: editedDirector
      } = generateMovieWithoutId()

      await log.step('create a movie using the API')
      const { body: createResponse } = await addMovie(AdminUser.token, movie)

      const id = createResponse.data.id

      await log.step(`direct-navigation to movie ${id} page and edit`)
      await page.goto(`/movies/${id}`)

      await log.step('edit movie using the UI')
      await editMovie(
        page,
        editedName,
        editedYear,
        editedRating,
        editedDirector
      )

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

  test.describe('read user', () => {
    const setup = async (
      page: Page,
      context: BrowserContext,
      interceptNetworkCall: InterceptNetworkCallFn
    ) => {
      const loadGetMovies = interceptNetworkCall({
        method: 'GET',
        url: '/movies'
      })

      await log.step(
        'KEY FEATURE: apply user auth to browser context on the fly'
      )
      await applyUserCookiesToBrowserContext(context, ReadUser)
      await page.goto('/')
      const { status: responseStatus } = await loadGetMovies
      expect(responseStatus).toBeGreaterThanOrEqual(200)
      expect(responseStatus).toBeLessThan(400)
    }

    test('authentication on the fly with basic user', async ({
      page,
      context,
      interceptNetworkCall
    }) => {
      await setup(page, context, interceptNetworkCall)

      await expect(page).toHaveURL('/movies')
      await log.step('at movies page')
    })

    test('should not add a movie from movie list with basic user', async ({
      page,
      interceptNetworkCall,
      context
    }) => {
      await setup(page, context, interceptNetworkCall)
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
        status: 403,
        // eslint-disable-next-line quotes
        error: "Access denied: Role 'read' is not authorized for this resource"
      })
    })

    test('should not be able to update or delete a movie with basic user', async ({
      page,
      addMovie,
      context,
      interceptNetworkCall
    }) => {
      await log.step('Use the API as the admin user to seed a movie')

      const movie = generateMovieWithoutId()
      const {
        name: editedName,
        year: editedYear,
        rating: editedRating,
        director: editedDirector
      } = generateMovieWithoutId()

      const { body: createResponse } = await addMovie(AdminUser.token, movie)

      const id = createResponse.data.id

      await log.step(
        `KEY FEATURE: before direct-nav to movie ${id} page and edit, apply basic user cookies (not admin!)`
      )

      await setup(page, context, interceptNetworkCall)

      await log.step('try to delete the movie using the UI as basic user')
      const loadDeleteMovie = interceptNetworkCall({
        method: 'DELETE',
        url: '/movies/*'
      })
      await page.getByTestId(`delete-movie-${movie.name}`).click()

      const { responseJson: deleteMovieResponseBody } = await loadDeleteMovie
      expect(deleteMovieResponseBody).toEqual({
        status: 403,
        // eslint-disable-next-line quotes
        error: "Access denied: Role 'read' is not authorized for this resource"
      })

      await log.step('try to edit movie using the UI as basic user')
      await page.goto(`/movies/${id}`)

      const loadEditMovie = interceptNetworkCall({
        method: 'PUT',
        url: '/movies/*'
      })
      await editMovie(
        page,
        editedName,
        editedYear,
        editedRating,
        editedDirector
      )

      const { responseJson: editMovieResponseBody } = await loadEditMovie
      expect(editMovieResponseBody).toEqual({
        status: 403,
        // eslint-disable-next-line quotes
        error: "Access denied: Role 'read' is not authorized for this resource"
      })

      await log.step(
        'KEY FEATURE: overwrite the user context (as admin) inside the test block and delete the movie'
      )
      await applyUserCookiesToBrowserContext(context, AdminUser)
      await page.goto(`/movies/${id}`)
      await log.step('delete movie using the UI as admin user')
      await page.getByTestId('delete-movie').click()
      await expect(page).toHaveURL('/movies')
      await page.waitForSelector(`text=${editedName}`, { state: 'detached' })
      await log.step('movie deleted successfully')
    })
  })
})
