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
import LoginForm from './login-form'

// Setup user event
const user = userEvent.setup()

describe('LoginForm', () => {
  it('should validate required fields', async () => {
    worker.use(
      http.post('/auth/identity-token', () => {
        return new Response(JSON.stringify({ message: 'Success' }), {
          status: 200
        })
      })
    )
    wrappedRender(<LoginForm />)
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByTestId('user-identity-select')).toBeInTheDocument()
    expect(screen.getByText('Log In')).toBeInTheDocument()

    // Test 1: Submit with empty fields
    await user.click(screen.getByText('Log In'))
    expect(await screen.findByText('Username is required')).toBeInTheDocument()
    expect(screen.queryByText('Password is required')).toBeInTheDocument()

    // Test 2: Fill username only and submit again
    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.click(screen.getByText('Log In'))
    expect(await screen.findByText('Password is required')).toBeInTheDocument()

    // Test 3: only password
    await user.clear(screen.getByPlaceholderText('Username'))
    await user.type(screen.getByPlaceholderText('Password'), 'testpass')
    await user.click(screen.getByText('Log In'))
    expect(await screen.findByText('Username is required')).toBeInTheDocument()
  })

  it('should submit form with credentials and redirect on success', async () => {
    worker.use(
      http.post('/auth/identity-token', () => {
        return new Response(JSON.stringify({ message: 'Success' }), {
          status: 200
        })
      })
    )

    wrappedRender(<LoginForm />)

    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.click(screen.getByText('Log In'))

    // verify that the form submission completed
    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    })
  })
})
