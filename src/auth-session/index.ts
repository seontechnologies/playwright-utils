/**
 * Playwright Auth Session Library
 * A reusable authentication session management system for Playwright
 */

// Public Types
export type {
  TokenDataFormatter,
  AuthSessionOptions,
  AuthOptions,
  AuthFixtures
} from './internal/types'

// Core API functions
export {
  configureAuthSession,
  getAuthToken,
  clearAuthToken,
  loadStorageState
} from './core'

// Global setup helper (optional)
export { initializeAuthForGlobalSetup } from './global-setup-helper'

// Ephemeral auth
export { applyUserCookiesToBrowserContext } from './apply-user-cookies-to-browser-context'

// Storage utilities
export {
  getStorageStatePath,
  getTokenFilePath,
  getStorageDir,
  saveStorageState
} from './internal/auth-storage-utils'

// Global initialization utilities
export { authStorageInit, authGlobalInit } from './internal/auth-global-setup'

// Token management
export { AuthSessionManager } from './internal/auth-session'

// Auth Provider API
export {
  type AuthProvider,
  setAuthProvider,
  getAuthProvider
} from './internal/auth-provider'

// Test fixtures
export { createAuthFixtures, createRoleSpecificTest } from './fixtures'
