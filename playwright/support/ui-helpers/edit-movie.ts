import type {Page} from '@playwright/test'

export const editMovie = async (
  page: Page,
  editedName: string,
  editedYear: number,
  editedRating: number,
  editedDirector: string,
) => {
  await page.getByTestId('edit-movie').click()

  const editForm = page.getByTestId('movie-edit-form-comp')

  await editForm.getByPlaceholder('Movie name').fill(editedName)
  await editForm.getByPlaceholder('Movie year').fill(String(editedYear))
  await editForm.getByPlaceholder('Movie rating').fill(String(editedRating))
  await editForm.getByPlaceholder('Movie director').fill(editedDirector)

  await editForm.getByTestId('update-movie').click()
}
