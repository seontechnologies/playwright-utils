import { expect, test } from '@playwright/support/merged-fixtures'
import { addMovie } from '@playwright/support/ui-helpers/add-movie'
import { editMovie } from '@playwright/support/ui-helpers/edit-movie'
import { log } from 'src/log'

process.env.PW_NET_MODE = 'playback'

test.describe('movie crud e2e - browser only (network recorder)', () => {
  test.beforeEach(async ({ page, networkRecorder, context }) => {
    // Setup network recorder based on PW_NET_MODE
    await networkRecorder.setup(context)
    await page.goto('/')
  })

  test('should add, edit and delete a movie using only browser interactions', async ({
    page,
    interceptNetworkCall
  }) => {
    const { name, year, rating, director } = {
      name: 'centum solutio suscipit',
      year: 2009,
      rating: 6.3,
      director: 'ancilla crebro crux'
    }

    await log.step('add a movie using the UI')
    await addMovie(page, name, year, rating, director)
    await page.getByTestId('add-movie-button').click()

    await log.step('click on movie to edit')
    await page.getByText(name).click()

    await log.step('Edit the movie')
    const { editedName, editedYear, editedRating, editedDirector } = {
      editedName: 'angustus antepono crapula',
      editedYear: 2002,
      editedRating: 3.4,
      editedDirector: 'cognatus avarus aeger'
    }

    const loadUpdateMovie = interceptNetworkCall({
      method: 'PUT',
      url: '/movies/*'
    })
    await log.step('edit movie using the UI')
    await editMovie(page, editedName, editedYear, editedRating, editedDirector)
    await loadUpdateMovie

    // Go back and verify edit
    await page.getByTestId('back').click()
    await expect(page).toHaveURL('/movies')
    await page.getByText(editedName).waitFor()

    await log.step('delete movie from list')
    await page.getByTestId(`delete-movie-${editedName}`).click()
    await expect(
      page.getByTestId(`delete-movie-${editedName}`)
    ).not.toBeVisible()
  })
})
