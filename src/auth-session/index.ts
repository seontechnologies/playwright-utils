/**
 * Playwright Auth Session Library
 * A reusable authentication session management system for Playwright
 */

// Public Types
export type {
  AuthTokenData,
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
  applyAuthToBrowserContext,
  defaultTokenFormatter,
  // Token utility functions
  loadTokenFromStorage,
  saveTokenToStorage
} from './core'

// Global setup helper (optional)
export { initializeAuthForGlobalSetup } from './global-setup-helper'

// Storage utilities
export {
  getStorageStatePath,
  getTokenFilePath
} from './internal/auth-storage-utils'

// Global initialization utilities
export { authStorageInit, authGlobalInit } from './internal/auth-global-setup'

// Auth Provider API
export {
  type AuthProvider,
  setAuthProvider,
  getAuthProvider
} from './internal/auth-provider'

// Test fixtures
export { createAuthFixtures, createRoleSpecificTest } from './fixtures'
