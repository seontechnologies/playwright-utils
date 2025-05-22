import type {Page} from '@playwright/test'

export const addMovie = async (
  page: Page,
  name: string,
  year: number,
  rating: number,
  director: string,
) => {
  await page.getByPlaceholder('Movie name').fill(name)
  await page.getByPlaceholder('Movie year').fill(String(year))
  await page.getByPlaceholder('Movie rating').fill(String(rating))
  await page.getByPlaceholder('Movie director').fill(director)
}
