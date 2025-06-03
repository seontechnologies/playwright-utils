import { useState, useEffect } from 'react'
import type { AuthRequest, AuthResponse } from '../consumer'
import { login } from '../consumer'
import { tokenService } from '../services/token-service'

/**
 * Custom hook for handling authentication
 * Follows SEON's functional programming principles with:
 * - Pure functions
 * - Immutable state
 * - Separation of concerns
 */
export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState(tokenService.getCurrentUser())

  // Keep currentUser in sync with token service
  useEffect(() => {
    const user = tokenService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  /**
   * Handle user login
   * @param credentials User credentials with username, password and optional role
   * @returns Success status and any error message
   */
  const handleLogin = async (
    credentials: AuthRequest
  ): Promise<{ success: boolean }> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await login(credentials)

      // Check if the response is an error
      if ('error' in response) {
        throw new Error(response.error)
      }

      // Store the token info in the token service
      // In a real app, this would properly store the JWT
      storeAuthData(response)

      return { success: true }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Authentication failed'
      setError(errorMessage)
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Store authentication data in the token service
   * @param authData Authentication response data
   */
  const storeAuthData = (authData: AuthResponse): void => {
    // In a real app, this would properly store tokens in the token service
    console.log('Storing auth data in token service', authData.identity)

    // The token service handles storing the user identity
    tokenService.setCurrentUser(authData.identity)

    // Verify that cookies were set by checking the response status
    if (authData.status !== 200) {
      throw new Error('Failed to set authentication cookies')
    }
  }

  /**
   * Log the user out
   */
  const logout = (): void => {
    tokenService.clearTokens()
    // In a real app, we might invalidate the token on the server too
  }

  return {
    isLoading,
    error,
    currentUser,
    handleLogin,
    logout
  }
}
