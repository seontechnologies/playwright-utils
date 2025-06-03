import {
  wrappedRender,
  screen,
  describe,
  it,
  expect,
  userEvent
} from '@vitest-utils/utils'
import { vi } from 'vitest'
import type { MovieManagerProps } from './movie-manager'
import MovieManager from './movie-manager'

describe('<MovieManager />', () => {
  const id = 1
  const name = 'Inception'
  const year = 2010
  const rating = 8.5
  const director = 'Christopher Nolan'

  it('should toggle between movie info and movie edit components', async () => {
    const onDelete = vi.fn()
    const props: MovieManagerProps = {
      movie: {
        id,
        name,
        year,
        rating,
        director
      },
      onDelete
    }

    wrappedRender(<MovieManager {...props} />)

    await userEvent.click(screen.getByTestId('delete-movie'))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledWith(id)

    expect(screen.getByTestId('movie-info-comp')).toBeVisible()
    expect(screen.queryByTestId('movie-edit-form-comp')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('edit-movie'))
    expect(screen.queryByTestId('movie-info-comp')).not.toBeInTheDocument()
    expect(screen.getByTestId('movie-edit-form-comp')).toBeVisible()
  })
})
