/**
 * Mock Service Worker handlers for authentication endpoints
 * These handlers will intercept authentication-related requests during tests
 */
import { http, HttpResponse } from 'msw'

const API_URL = 'http://localhost:3001'

// Generate fake token response
const generateTokenResponse = () => {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour expiration
  const refreshExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours refresh expiration

  return {
    token: `fake-jwt-token-${Date.now()}`,
    refreshToken: `fake-refresh-token-${Date.now()}`,
    expiresAt: expiresAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString()
  }
}

// Mock auth handlers
export const authHandlers = [
  // POST /auth/fake-token - Initial token acquisition
  http.post(`${API_URL}/auth/fake-token`, () => {
    return HttpResponse.json(generateTokenResponse(), { status: 200 })
  }),

  // POST /auth/renew - Token renewal
  http.post(`${API_URL}/auth/renew`, () => {
    return HttpResponse.json(generateTokenResponse(), { status: 200 })
  }),

  // POST /auth/identity-token - Identity-based authentication
  http.post(`${API_URL}/auth/identity-token`, () => {
    return HttpResponse.json(generateTokenResponse(), { status: 200 })
  })
]
