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
    // Update current user whenever the component mounts or token service changes
    const updateUser = () => {
      const user = tokenService.getCurrentUser()
      setCurrentUser(user)
    }

    // Initial update
    updateUser()

    // Set up an interval to check for updates
    // This is a simple solution; in production, you'd use an event system
    const interval = setInterval(updateUser, 1000)

    return () => clearInterval(interval)
  }, [])

  /**
   * Handle user login
   * @param credentials User credentials with username, password and optional userIdentifier
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

      // Update current user state
      setCurrentUser(response.identity)

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
  const logout = async (): Promise<void> => {
    try {
      // Call the backend logout endpoint to clear httpOnly cookies
      await fetch('http://localhost:3001/auth/logout', {
        method: 'POST',
        credentials: 'include' // Important: include cookies in the request
      })
    } catch (error) {
      console.error('Error during logout:', error)
    }

    // Clear local storage and tokens
    tokenService.clearTokens()
    setCurrentUser(null)
  }

  return {
    isLoading,
    error,
    currentUser,
    handleLogin,
    logout
  }
}
