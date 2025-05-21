import {
  describe,
  expect,
  it,
  screen,
  wrappedRender
} from '@vitest-utils/utils'
import ErrorComponent from './error-component'

describe('<ErrorComponent />', () => {
  it('should render an error message', () => {
    wrappedRender(<ErrorComponent />)
    expect(screen.getByTestId('error')).toBeVisible()
    expect(screen.getByText('Try reloading the page.'))
  })
})
