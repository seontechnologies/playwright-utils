import {
  describe,
  expect,
  it,
  screen,
  wrappedRender
} from '@vitest-utils/utils'
import LoadingMessage from './loading-message'

describe('<LoadingMessage />', () => {
  it('should render a loading message', () => {
    wrappedRender(<LoadingMessage />)

    expect(screen.getByTestId('loading-message-comp')).toBeVisible()
  })
})
