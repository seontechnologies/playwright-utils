/**
 * Token validation utilities
 * Provides functions to check if tokens are valid or need renewal
 */
import { log } from '../../../../src/log'
import { loadStorageState } from '../../../../src/auth-session'
import { extractToken } from './extract'
import { isTokenExpired } from './is-expired'
import { needsTokenRenewal, renewToken } from './renew'

/**
 * Check if a token exists and is valid, renewing it if needed
 * @param tokenPath Path to the token storage file
 * @returns The storage state object if a valid token exists, null otherwise
 */
export async function checkTokenValidity(
  tokenPath: string
): Promise<Record<string, unknown> | null> {
  // Check if we already have a valid token
  const existingStorageState = loadStorageState(tokenPath, true)
  if (!existingStorageState) {
    return null
  }

  // Check if token needs renewal (JWT expired but refresh token valid)
  if (needsTokenRenewal(existingStorageState)) {
    log.infoSync(
      'ℹ️ JWT token expired, attempting to renew token using refresh token'
    )
    try {
      // Call our renewal helper function with the storage path
      await renewToken({ storageState: tokenPath })

      // Load the updated storage state after successful renewal
      const renewedStorageState = loadStorageState(tokenPath, false)
      if (!renewedStorageState) {
        throw new Error('Failed to load renewed storage state')
      }

      // Verify the renewed token is valid
      const token = extractToken(renewedStorageState)
      if (!token || isTokenExpired(token)) {
        throw new Error('Renewed token is invalid or already expired')
      }

      log.infoSync(`✓ Successfully renewed token from ${tokenPath}`)
      return renewedStorageState
    } catch (error) {
      // If renewal fails, we'll proceed to get a new token via full login
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      log.infoSync(`⚠️ Failed to renew token: ${errorMessage}`)
      log.infoSync('⚠️ Will attempt to acquire a new token')
      return null
    }
  } else {
    // Token is still valid, use it
    log.infoSync(`✓ Using existing token from ${tokenPath}`)
    return existingStorageState
  }
}
