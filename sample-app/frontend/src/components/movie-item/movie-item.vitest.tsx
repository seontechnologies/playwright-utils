import {
  wrappedRender,
  screen,
  describe,
  it,
  expect
} from '@vitest-utils/utils'
import { vi } from 'vitest'

import MovieItem from './movie-item'

describe('<MovieItem />', () => {
  const onDelete = vi.fn()

  it('should verify the movie and delete', async () => {
    const id = 3
    wrappedRender(
      <MovieItem
        id={id}
        name={'my movie'}
        year={2023}
        rating={8.5}
        director={'my director'}
        onDelete={onDelete}
      />
    )

    const link = screen.getByText('my movie (2023) 8.5 my director')
    expect(link).toBeVisible()
    expect(link).toHaveAttribute('href', `/movies/${id}`)

    screen.getByRole('button', { name: /delete/i }).click()
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(id)
  })
})
