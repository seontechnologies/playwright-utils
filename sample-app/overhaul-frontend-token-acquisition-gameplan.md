# Frontend Token Acquisition Overhaul Gameplan

## Implementation Progress Tracking

### Phase 1: Backend Changes

- [x] Implement cookie-based authentication middleware
  - [x] Extract authentication token from cookies
  - [x] Validate token structure and expiration
  - [x] Support identity information in tokens (structure added)
- [x] Update token endpoint to set cookies instead of returning tokens
  - [x] Implemented in `/auth/fake-token` endpoint to set cookies via HTTP headers
  - [x] Updated to use "Bearer" prefix in the token value: `Bearer ${timestamp}`
  - [x] Set cookie with name `seon-jwt` instead of `sample-app-token`
- [x] Remove header-based authentication code
  - [x] Updated auth middleware to look for `seon-jwt` cookie instead of Authorization header
  - [x] Modified token validation to handle the "Bearer" prefix appropriately
- [x] Fix unit tests for auth middleware to match new cookie-based approach
- [x] Add renewal endpoint
  - [x] Create `/auth/renew` endpoint to issue new JWT tokens using refresh tokens
  - [x] Update `/auth/fake-token` to provide both JWT and refresh tokens
  - [x] Implement refresh token validation and security checks
- [ ] Add identity-based authentication endpoint

### Phase 2: Frontend Changes

- [x] Create TokenService with storage state support
  - Implemented `StorageStateTokenService` class
  - Added token management methods (get, refresh, validate)
  - Integrated with Playwright's storage state format
- [x] Implement cookie-based authentication
  - Created cookie utility functions (setCookie, getCookie, deleteCookie)
  - Added browser cookie synchronization with storage state
  - Implemented token restoration from existing cookies
- [x] Refactor Axios configuration
  - [x] Added withCredentials to send cookies with cross-origin requests
  - [x] Added response interceptor for token refresh with automatic retry
- [x] Update API client methods
  - [x] Token handling abstracted via interceptors, no direct changes needed
- [x] Update frontend TokenService to use new cookie name
  - [x] Changed references from `sample-app-token` to `seon-jwt`
  - [x] Updated `getAuthorizationHeader()` method to match new token format
  - [x] Ensured `isTokenValid()` method handles the new token format
- [ ] Add feature set for cookie-based authentication
  - [ ] Update TokenService to manage both token types
  - [ ] Add automatic token refresh when JWT expires
  - [ ] Create token refresh interceptor for API requests
- [ ] Add feature set for identity-based authentication

### Phase 3: Test Framework Integration

- [x] Implement token storage in Playwright
  - [x] Updated `acquireToken` to return complete Playwright storage state
  - [x] Modified `extractToken` to get token value from cookie
  - [x] Added improved error handling and validation
- [x] Create custom auth provider for Playwright
  - [x] Implemented and configured in the auth-session system
  - [x] Added support for environment and role management
- [x] Update API helper functions for tests
  - [x] Updated to use cookie-based authentication in headers
  - [x] Modified request format to match backend expectations
- [ ] refactor @custom-auth-provider.ts ; either we FIT things into the interface, or we simplify the interface
- [ ] Implement identity-aware token storage
- [ ] Update test fixtures with identity support
- [ ] Add test environment detection

### Phase 4: Testing

- [x] Backend tests for token acquisition
  - [x] Updated tests in `get-token.spec.ts` to match new token format
  - [x] Added tests for cookie validation
- [x] Unit tests for token service
  - [x] Verified token validation with the new format
  - [x] Tested cookie synchronization methods
- [x] Integration tests for API client
  - [x] Verified cross-origin cookie handling
  - [x] Tested token refresh mechanism
- [x] Enable and validate frontend E2E tests
  - [x] Verified movie CRUD operations work with cookie-based auth
  - [x] Tested token persistence and renewal

## Current Implementation Status

1. **Token Generation and Storage**:

   - ✅ Backend now sets tokens as cookies in the HTTP response headers
   - ✅ Token format standardized with "Bearer" prefix: `Bearer ${timestamp}`
   - ✅ Cookie name changed from `sample-app-token` to `seon-jwt` for consistency
   - ✅ Playwright auth-session is now configured to work with cookie-based authentication

2. **Backend Authentication**:

   - ✅ Auth middleware updated to extract tokens from cookies instead of headers
   - ✅ Token validation logic modified to handle the "Bearer" prefix
   - ✅ Unit tests updated to match the new cookie-based approach
   - ✅ Cookie expiration and clearing implemented for invalid tokens

3. **Frontend Implementation**:

   - ✅ TokenService updated to use the new `seon-jwt` cookie name
   - ✅ Token validation methods now correctly handle the "Bearer" prefix
   - ✅ Axios client configured with `withCredentials: true` for cross-origin cookie sending
   - ✅ Manual Authorization header management removed in favor of automatic cookie handling

4. **Test Framework Integration**:
   - ✅ Token extraction method in auth provider updated to get value from cookies
   - ✅ API helper functions updated to work with cookie-based authentication
   - ✅ Backend tests now successfully validate the token flow
   - ✅ E2E tests enabled and verified with the new cookie-based authentication

## Token Refresh Implementation (Priority)

### Overview

To better align with the Admin app's authentication approach and improve security, we need to implement a token refresh mechanism using separate JWT and refresh tokens.

### Current Structure

Currently, our sample app has:

- One cookie: `seon-jwt` with a simple timestamp token
- No refresh mechanism or token separation

### Target Structure (Admin App Pattern)

The Admin app uses:

- `seon-jwt`: Short-lived JWT token (5 minutes) for authentication
- `seon-refresh`: Long-lived refresh token (1 day) for obtaining new JWT tokens

### Implementation Tasks

1. **Backend Changes**

   - Create `/auth/renew` endpoint to issue new JWT tokens using refresh tokens
   - Update `/auth/fake-token` to provide both JWT and refresh tokens
   - Implement refresh token validation and security checks

2. **Frontend Changes**

   - Update TokenService to manage both token types
   - Add automatic token refresh when JWT expires
   - Create token refresh interceptor for API requests

3. **Test Framework Integration**
   - Update auth provider to handle refresh tokens
   - Ensure proper token refresh during long-running tests

### 1. Implement Identity-Based Authentication

- Add user identity information to token structure (e.g., roles, permissions)
- Create new authentication endpoints with identity support
- Update token validation to check identity claims
- Implement role-specific access controls

### 2. Enhance Test Framework with Identity Support

- Verify that tests can successfully authenticate with the backend
- Ensure all CRUD operations work as expected with the new authentication approach

### 3. Detailed Identity Authentication Implementation Plan

#### 3.1 Backend Changes

- Extend the token structure to include identity information:

  ```typescript
  type Token = {
    issuedAt: Date
    identity: {
      userId: string
      roles: string[] // e.g., ['admin', 'user', 'guest']
      permissions: string[] // e.g., ['read:movies', 'write:movies']
    }
  }
  ```

- Create new authentication endpoints:

  - `/auth/login` - Username/password authentication
  - `/auth/role/:roleName` - Quick role-based test authentication
  - `/auth/refresh` - Token refresh with identity preservation

- Implement identity validation in the auth middleware:
  ```typescript
  function validateUserAccess(
    token: Token,
    requiredRoles: string[] = []
  ): boolean {
    if (!token.identity) return false
    if (requiredRoles.length === 0) return true
    return requiredRoles.some((role) => token.identity.roles.includes(role))
  }
  ```

#### 3.2 Frontend Changes

- Update TokenService to store and retrieve identity information
- Add role-based UI elements and conditional rendering
- Create a user context provider for React components
- Implement permission checking utilities

#### 3.3 Test Framework Integration

- Extend auth provider to support role-based authentication:

  ```typescript
  async manageAuthToken(request, options) {
    const { userRole } = options
    return request.get(`/auth/role/${userRole}`)
  }
  ```

- Add test fixtures for different user roles
- Create helper functions for permission verification
- Update test scenarios to cover role-specific features

## Identity-Based Authentication Implementation Plan

### Core Requirements

1. Support user identities with roles and permissions in the token structure
2. Allow Playwright tests to authenticate with different user identities
3. Implement role-based access control in the backend
4. Support identity preservation during token refresh
5. Create a clean interface for identity management in frontend components

To improve test isolation and prevent destructive test interference, implement proper role and user identity management:

```typescript
// Enhanced token service with user identity support
export interface UserIdentity {
  email?: string
  role?: string
  id?: string | number
}

export interface TokenServiceOptions {
  userIdentity?: UserIdentity
  environment?: string
}

export class EnhancedStorageStateTokenService implements TokenService {
  private currentToken: StorageState | null = null
  private userIdentity: UserIdentity
  private environment: string

  constructor(options: TokenServiceOptions = {}) {
    this.userIdentity = options.userIdentity || { role: 'default' }
    this.environment = options.environment || 'local'

    // Token path will incorporate userIdentity for isolation
    // e.g., .auth-sessions/local/admin/user@example.com/storage-state.json
  }

  // Generate token storage path based on identity
  private getTokenPath(): string {
    const { role = 'default', email = 'default' } = this.userIdentity
    return `.auth-sessions/${this.environment}/${role}/${email.replace('@', '_at_')}`
  }

  // Other methods with identity-aware implementations
}
```

Update the auth provider to handle user identities:

```typescript
const sampleAppAuthProvider: AuthProvider = {
  // Existing methods...

  // Enhanced token acquisition with user identity
  async manageAuthToken(request: APIRequestContext, options = {}) {
    const userIdentity = options.userIdentity || { role: 'default' }
    const environment = this.getEnvironment(options)

    // Use identity to generate a unique fake user if needed
    const userEmail =
      userIdentity.email ||
      `test-${environment}-${userIdentity.role}@example.com`

    // Request token with identity information
    const response = await request.post('http://localhost:3001/auth/login', {
      data: {
        email: userEmail,
        role: userIdentity.role
      }
    })

    const data = await response.json()
    return this.formatTokenWithIdentity(data.token, userIdentity)
  },

  // Store identity with token for proper isolation
  formatTokenWithIdentity(token, userIdentity) {
    // Token formatting with identity metadata...
  }
}
```

Update the backend to support user identity in authentication:

```typescript
// Add a new endpoint for identity-based authentication
server.post('/auth/login', (req, res) => {
  const { email, role } = req.body
  const userId = email.split('@')[0]

  // Generate a token that includes identity information
  const timestamp = new Date().toISOString()
  const token = `Bearer ${userId}_${role}_${timestamp}`

  return res.status(200).json({ token, status: 200 })
})
```

Benefits of this approach:

1. **Test Isolation**: Each test can use a unique identity with its own token storage
2. **Parallel Testing**: Tests won't interfere with each other even when clearing tokens
3. **Role-Based Testing**: Easy to test different user permissions and roles
4. **Debugging**: Clear connection between tokens and test identities

### Detailed Implementation Plan

#### Phase 1: Backend Changes

##### 1. Update Auth Middleware for Cookie Support

- [ ] Modify `/backend/src/middleware/auth-middleware.ts` to check for tokens in cookies

  ```typescript
  // Look for token in Authorization header first, then in cookies
  let tokenStr = ''
  const authHeader = req.headers.authorization

  if (authHeader) {
    tokenStr = authHeader.replace('Bearer ', '')
  } else {
    const tokenCookie = req.cookies['sample-app-token']
    if (tokenCookie) {
      tokenStr = tokenCookie
    } else {
      return res.status(401).json({ error: 'Unauthorized', status: 401 })
    }
  }
  ```

- [ ] Add cookie parsing middleware to Express setup
  ```typescript
  import cookieParser from 'cookie-parser'
  app.use(cookieParser())
  ```

##### 2. Add Identity-Based Authentication Endpoint

- [ ] Create `/auth/login` endpoint

  ```typescript
  server.post('/auth/login', (req, res) => {
    const { email, role } = req.body
    const userId = email.split('@')[0]
    const timestamp = new Date().toISOString()
    const token = `Bearer ${userId}_${role}_${timestamp}`

    return res.status(200).json({ token, status: 200 })
  })
  ```

- [ ] Update the `/auth/fake-token` endpoint to support identity parameters
- [ ] Ensure backward compatibility with existing code

##### 3. Implement Token Validation with Identity Support

- [ ] Extract and verify identity information from tokens
- [ ] Add role-based access control for protected endpoints if needed
- [ ] Update validation to work with new token format

#### Phase 2: Frontend Changes

##### 4. Create TokenService Implementation

- [ ] Implement `TokenService` interface with storage state support
  ```typescript
  export interface TokenService {
    getToken(): StorageState
    refreshToken(): StorageState
    isTokenValid(token: StorageState): boolean
    getAuthorizationHeader(): string
  }
  ```
- [ ] Add token validation and refresh mechanisms
- [ ] Handle both manual and automated testing scenarios

##### 5. Implement Cookie-Based Authentication

- [ ] Add cookie management utilities

  ```typescript
  export function setCookieAuth(token: string): void {
    document.cookie = `sample-app-token=${token}; path=/; max-age=3600; samesite=lax`
  }

  export function clearCookieAuth(): void {
    document.cookie = 'sample-app-token=; path=/; max-age=0'
  }
  ```

- [ ] Update token storage to use cookies for API requests
- [ ] Ensure storage state compatibility

##### 6. Refactor Axios Configuration

- [ ] Remove token header interceptors
- [ ] Update API client to use cookies for authentication
- [ ] Ensure backward compatibility

##### 7. Update API Client Methods

- [ ] Remove hardcoded Authorization headers
- [ ] Add support for identity-based operations if needed
- [ ] Update error handling for authentication failures

#### Phase 3: Test Framework Integration

##### 8. Implement Identity-Aware Token Storage

- [ ] Update token path generation to include identity information
  ```typescript
  private getTokenPath(): string {
    const { role = 'default', email = 'default' } = this.userIdentity
    return `.auth-sessions/${this.environment}/${role}/${email.replace('@', '_at_')}`
  }
  ```
- [ ] Modify token storage to isolate by environment, role, and email
- [ ] Ensure backward compatibility

##### 9. Create Custom Auth Provider for Playwright

- [ ] Implement auth provider that supports user identities

  ```typescript
  const sampleAppAuthProvider: AuthProvider = {
    // Enhanced token acquisition with user identity
    async manageAuthToken(request: APIRequestContext, options = {}) {
      const userIdentity = options.userIdentity || { role: 'default' }
      const environment = this.getEnvironment(options)

      // Use identity for token acquisition
      // ...
    }
  }
  ```

- [ ] Add methods to manage tokens with identity context
- [ ] Ensure compatibility with auth-session library

##### 10. Update Test Fixtures with Identity Support

- [ ] Modify fixtures to accept identity options
- [ ] Add helper functions for common identity patterns
- [ ] Update documentation and examples

##### 11. Add Test Environment Detection

- [ ] Implement browser/Node.js environment detection
- [ ] Add automatic token injection for tests
- [ ] Ensure seamless transition between environments
