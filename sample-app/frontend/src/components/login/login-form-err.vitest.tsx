import {
  wrappedRender,
  screen,
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

describe('LoginForm err', () => {
  it('should show error message on authentication failure', async () => {
    const errorMessage =
      'Authentication failed: Server did not set authentication cookies'

    worker.use(
      http.post('/api/auth/identity-token', () => {
        return new Response(
          JSON.stringify({
            error: 'auth_failed',
            message: errorMessage
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      })
    )

    wrappedRender(<LoginForm />)

    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword')
    await user.click(screen.getByText('Log In'))

    expect(await screen.findByText(errorMessage)).toBeInTheDocument()
  })
})
