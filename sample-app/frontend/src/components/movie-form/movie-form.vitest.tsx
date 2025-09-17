import {
  wrappedRender,
  screen,
  waitFor,
  worker,
  http,
  describe,
  it,
  expect,
  userEvent
} from '@vitest-utils/utils'
import MovieForm from './movie-form'
import { generateMovieWithoutId } from '../../test-utils/factories'
import type { Movie } from '@shared/types/movie-types'

describe('<MovieForm />', () => {
  const user = userEvent.setup()

  const fillYear = async (year: number) => {
    const yearInput = screen.getByPlaceholderText('Movie year')
    await user.clear(yearInput)
    await user.type(yearInput, String(year))
  }

  const fillName = async (name: string) => {
    const nameInput = screen.getByPlaceholderText('Movie name')
    await user.type(nameInput, name)
  }

  const fillRating = async (rating: number) => {
    const ratingInput = screen.getByPlaceholderText('Movie rating')
    await user.clear(ratingInput)
    await user.type(ratingInput, String(rating))
  }

  const fillDirector = async (director: string) => {
    const directorInput = screen.getByPlaceholderText('Movie director')
    await user.type(directorInput, director)
  }

  it('should fill the form and add the movie', async () => {
    const { name, year, rating, director } = generateMovieWithoutId()
    const movie: Omit<Movie, 'id'> = { name, year, rating, director }

    wrappedRender(<MovieForm />)
    await fillName(name)
    await fillYear(year)
    await fillRating(rating)
    await fillDirector(director)

    let postRequest
    worker.use(
      http.post('http://localhost:3001/movies', async ({ request }) => {
        postRequest = await request.json()
        return new Response(undefined, {
          status: 200
        })
      })
    )

    await user.click(screen.getByText('Add Movie'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Movie name')).toHaveValue('')
      expect(screen.getByPlaceholderText('Movie year')).toHaveValue(2023)
      expect(screen.getByPlaceholderText('Movie rating')).toHaveValue(0)
    })
    expect(postRequest).toEqual(movie)
  })

  it('should exercise validation errors', async () => {
    wrappedRender(<MovieForm />)

    await fillYear(2026)
    await user.click(screen.getByText('Add Movie'))

    const validationError = screen.getAllByTestId('validation-error')
    expect(validationError).toHaveLength(2)

    await fillYear(1899)
    screen.getByText('Add Movie').click()
    expect(validationError).toHaveLength(2)

    await fillYear(2025)
    await fillName('4')
    await fillDirector('Christopher Nolan')
    screen.getByText('Add Movie').click()
    await waitFor(() => {
      expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument()
    })

    await fillYear(1900)
    await fillName('4')
    await fillDirector('Christopher Nolan')
    screen.getByText('Add Movie').click()
    await waitFor(() => {
      expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument()
    })
  })
})
