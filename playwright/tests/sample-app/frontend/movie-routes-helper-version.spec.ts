import { expect, test } from '@playwright/support/merged-fixtures'
import { generateMovieWithoutId } from '@playwright/support/utils/movie-factories'
import type { Movie } from '@shared/types/movie-types'
import { type InterceptNetworkCall } from '../../../../src/intercept-network-call'
import { log } from 'src/log'

test.describe('App routes (playwright-utils helpers)', () => {
  const movies = [
    { id: 1, ...generateMovieWithoutId() },
    { id: 2, ...generateMovieWithoutId() },
    { id: 3, ...generateMovieWithoutId() }
  ]
  const movie = movies[0]
  let loadGetMovies: InterceptNetworkCall

  test.beforeEach(({ interceptNetworkCall }) => {
    loadGetMovies = interceptNetworkCall({
      method: 'GET',
      url: '/movies',
      fulfillResponse: {
        status: 200,
        body: { data: movies }
      }
    })
  })

  test('should redirect to /movies (playwright-utils helpers)', async ({
    page
  }) => {
    await page.goto('/')

    await expect(page).toHaveURL('/movies')
    const {
      responseJson: { data: moviesResponse }
    } = (await loadGetMovies) as { responseJson: { data: typeof movies } }
    expect(moviesResponse).toEqual(movies)

    await expect(page.getByTestId('movie-list-comp')).toBeVisible()
    await expect(page.getByTestId('movie-form-comp')).toBeVisible()
    await expect(page.getByTestId('movie-item-comp')).toHaveCount(movies.length)

    await log.info(
      'with PW you have to use for await of, since you have to await the expect'
    )
    const movieItemComps = page.getByTestId('movie-item-comp').all()
    const items = await movieItemComps
    for (const item of items) {
      await expect(item).toBeVisible()
    }
  })

  test('should direct nav to by query param (playwright-utils helpers)', async ({
    page,
    interceptNetworkCall
  }) => {
    const movieName = encodeURIComponent(movie?.name as Movie['name'])

    const loadGetMovies2 = interceptNetworkCall({
      method: 'GET',
      url: '/movies?*',
      fulfillResponse: {
        status: 200,
        body: movie
      }
    })

    await page.goto(`/movies?name=${movieName}`)

    const { responseJson: resBody } = await loadGetMovies2
    expect(resBody).toEqual(movie)

    await expect(page).toHaveURL(`/movies?name=${movieName}`)
  })
})
