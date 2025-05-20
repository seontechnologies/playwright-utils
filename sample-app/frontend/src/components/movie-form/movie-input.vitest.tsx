import {
  wrappedRender,
  screen,
  describe,
  it,
  expect,
  vi
} from '@vitest-utils/utils'
import userEvent from '@testing-library/user-event'
import MovieInput from './movie-input'
import { generateMovieWithoutId } from '../../test-utils/factories'

describe('<MovieInput />', () => {
  const movie = generateMovieWithoutId()
  const onChange = vi.fn()
  const user = userEvent.setup()

  it('should render a text input', async () => {
    const { name } = movie

    wrappedRender(
      <MovieInput
        type="text"
        value={name}
        placeholder="place holder"
        onChange={onChange}
      />
    )

    const input = screen.getByPlaceholderText('place holder')
    expect(input).toBeVisible()
    expect(input).toHaveValue(name)

    await user.type(input, 'a')
    expect(onChange).toHaveBeenCalledTimes(1)

    // @ts-expect-error okay
    expect(onChange.mock.calls[0][0].target.value).toBe(`${name}`)
    // alternative
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: name
        })
      })
    )
  })

  it('should render a year input', async () => {
    const { year } = movie
    wrappedRender(
      <MovieInput
        type="number"
        value={year}
        onChange={onChange}
        placeholder="place holder"
      />
    )

    const input = screen.getByTestId('movie-input-comp-number')
    expect(input).toBeVisible()
    expect(input).toHaveValue(year)

    await user.type(input, '1')
  })
})
