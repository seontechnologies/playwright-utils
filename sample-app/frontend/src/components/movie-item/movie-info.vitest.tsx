import {
  wrappedRender,
  screen,
  describe,
  it,
  expect
} from '@vitest-utils/utils'
import MovieInfo from './movie-info'

describe('<MovieInfo />', () => {
  it('should render the movie info', () => {
    const id = 1
    const name = 'Inception'
    const year = 2010
    const rating = 8.5
    const director = 'Christopher Nolan'
    const movie = { id, name, year, rating, director }

    wrappedRender(<MovieInfo movie={movie} />)

    expect(screen.getByText(`ID: ${id}`)).toBeVisible()
    expect(screen.getByText(name)).toBeVisible()
    expect(screen.getByText(`Year: ${year}`)).toBeVisible()
    expect(screen.getByText(`Rating: ${rating}`)).toBeVisible()
  })
})
