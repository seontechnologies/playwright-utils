import { UserHeader } from './user-header'
import {
  wrappedRender,
  describe,
  it,
  screen,
  expect
} from '@vitest-utils/utils'
import { vi } from 'vitest'

const username = 'testuser'
const userIdentifier = 'admin'
// Define mock before the test - vi.mock is hoisted to the top
vi.mock('../../hooks/use-auth', () => ({
  useAuth: () => ({
    currentUser: { username, userIdentifier },
    logout: vi.fn()
  })
}))

describe('<UserHeader />', () => {
  it('renders with user information', () => {
    wrappedRender(<UserHeader />)

    expect(screen.getByText(username)).toBeInTheDocument()
    expect(screen.getByText(userIdentifier)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})
