import { UserHeader } from './user-header'
import {
  wrappedRender,
  describe,
  it,
  screen,
  expect,
  beforeEach
} from '@vitest-utils/utils'
import { vi } from 'vitest'

const username = 'testuser'
const userIdentifier = 'admin'

describe('<UserHeader />', () => {
  beforeEach(() => {
    // Set up localStorage with user data
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => {
          if (key === 'seon-user-identity') {
            return JSON.stringify({ username, userIdentifier })
          }
          return null
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    })
  })

  it('renders with user information', () => {
    wrappedRender(<UserHeader />)

    expect(screen.getByText(username)).toBeInTheDocument()
    expect(screen.getByText(userIdentifier)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })
})
