import { useState } from 'react'
import styled from 'styled-components'
import { SButton, SInput } from '@styles/styled-components'
import ValidationErrorDisplay from '@components/validation-error-display'
import { z } from 'zod'
import { useAuth } from '@hooks/use-auth'
import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Login form component that allows users to authenticate with username, password and role.
 *
 * @returns {JSX.Element} The rendered login form
 */
export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('admin')
  const [validationError, setValidationError] = useState<z.ZodError | null>(
    null
  )

  // Use React Router hooks for navigation
  const navigate = useNavigate()
  const location = useLocation()

  // Get the intended destination from location state or default to home
  const from = (location.state as { from?: string } | undefined)?.from || '/'

  // Use our centralized auth hook instead of component-level state
  const { isLoading, error: loginError, handleLogin: authLogin } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset validation errors
    setValidationError(null)

    // Define validation schema using Zod
    const loginSchema = z.object({
      username: z.string().min(1, { message: 'Username is required' }),
      password: z.string().min(1, { message: 'Password is required' }),
      role: z.string()
    })

    // Validate the form data
    const result = loginSchema.safeParse({ username, password, role })
    if (!result.success) {
      setValidationError(result.error)
      return
    }

    // Use the auth hook to handle login
    const { success } = await authLogin({ username, password, role })

    // If login is successful, redirect to the intended destination
    if (success) {
      // Use React Router's navigate instead of window.location for better SPA experience
      await Promise.resolve(navigate(from, { replace: true }))
    }
  }

  return (
    <SLoginFormContainer data-testid="login-form-comp">
      <SSubtitle>User Authentication</SSubtitle>

      {/* Display validation errors */}
      <ValidationErrorDisplay validationError={validationError} />

      {/* Display login errors */}
      {loginError && <SErrorMessage>{loginError}</SErrorMessage>}

      <SForm onSubmit={handleLogin}>
        <SInput
          type="text"
          value={username}
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          data-testid="username-input"
        />

        <SInput
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          data-testid="password-input"
        />

        <SSelect
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={isLoading}
          data-testid="role-select"
        >
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="guest">Guest</option>
          <option value="readonly">Read Only</option>
        </SSelect>

        <SButton type="submit" disabled={isLoading} data-testid="login-button">
          {isLoading ? 'Logging in...' : 'Log In'}
        </SButton>
      </SForm>
    </SLoginFormContainer>
  )
}

const SLoginFormContainer = styled.div`
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f9f9f9;
`

const SForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
`

const SSubtitle = styled.h2`
  color: #333;
  font-size: 2rem;
  margin-bottom: 20px;
  text-align: center;
`

const SSelect = styled.select`
  padding: 10px;
  margin: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
  font-size: 1rem;
  width: 220px;
`

const SErrorMessage = styled.div`
  color: #e74c3c;
  margin: 10px 0;
  padding: 10px;
  background-color: #fadbd8;
  border-radius: 4px;
  text-align: center;
`
