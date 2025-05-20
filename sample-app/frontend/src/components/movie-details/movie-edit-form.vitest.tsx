import {
  wrappedRender,
  screen,
  worker,
  http,
  describe,
  it,
  expect,
  userEvent,
  vi,
  waitFor
} from '@vitest-utils/utils'
import MovieEditForm from './movie-edit-form'
import { generateMovieWithoutId } from '../../test-utils/factories'
import type { Movie } from '@shared/types/movie-types'

describe('<MovieEditForm />', () => {
  const id = 7
  const movie: Movie = { id, ...generateMovieWithoutId() }

  it('should cancel and submit a movie update', async () => {
    const onCancel = vi.fn()

    wrappedRender(<MovieEditForm movie={movie} onCancel={onCancel} />)

    await userEvent.click(screen.getByTestId('cancel'))
    expect(onCancel).toHaveBeenCalledOnce()

    let putRequest: Record<string, unknown> | undefined
    worker.use(
      http.put(`http://localhost:3001/movies/${id}`, async ({ request }) => {
        const requestBody = await request.json()
        putRequest = requestBody as Record<string, unknown>
        return new Response(undefined, { status: 200 })
      })
    )

    await userEvent.click(screen.getByTestId('update-movie'))

    await waitFor(() => {
      expect(putRequest).toMatchObject({
        name: movie.name,
        year: movie.year,
        rating: movie.rating,
        director: movie.director
      })
    })
  })
})
