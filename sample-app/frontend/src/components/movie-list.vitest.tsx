import {
  describe,
  expect,
  it,
  vi,
  screen,
  wrappedRender
} from '@vitest-utils/utils'
import { generateMovieWithoutId } from '../test-utils/factories'
import MovieList from './movie-list'

describe('<MovieList />', () => {
  const onDelete = vi.fn()

  it('should show nothing with no movies', () => {
    wrappedRender(<MovieList movies={[]} onDelete={onDelete} />)

    expect(screen.queryByTestId('movie-list-comp')).not.toBeInTheDocument()
  })

  it('should show error with error', () => {
    wrappedRender(<MovieList movies={{ error: 'boom' }} onDelete={onDelete} />)

    expect(screen.queryByTestId('movie-list-comp')).not.toBeInTheDocument()
    expect(screen.getByTestId('error')).toBeInTheDocument()
  })

  it('should verify the movie and delete', () => {
    const movie1Id = 7
    const movie2Id = 42
    const movie1 = { id: movie1Id, ...generateMovieWithoutId() }
    const movie2 = { id: movie2Id, ...generateMovieWithoutId() }

    wrappedRender(<MovieList movies={[movie1, movie2]} onDelete={onDelete} />)

    expect(screen.getByTestId('movie-list-comp')).toBeVisible()

    const movieItems = screen.getAllByTestId('movie-item-comp')
    expect(movieItems).toHaveLength(2)
    movieItems.forEach((movieItem) => expect(movieItem).toBeVisible())

    screen.getByTestId(`delete-movie-${movie1.name}`).click()
    screen.getByTestId(`delete-movie-${movie2.name}`).click()
    expect(onDelete).toBeCalledTimes(2)
    expect(onDelete).toBeCalledWith(movie1Id)
    expect(onDelete).toBeCalledWith(movie2Id)
  })
})
