# Frontend Token Acquisition Overhaul Gameplan

## Implementation Progress Tracking

### Phase 1: Backend Changes

- [ ] Update auth middleware for cookie support
- [ ] Add identity-based authentication endpoint
- [ ] Implement token validation with identity support

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
  - [x] Added request interceptor for Authorization header
  - [x] Added response interceptor for token refresh with automatic retry
- [x] Update API client methods
  - [x] Token handling abstracted via interceptors, no direct changes needed

### Phase 3: Test Framework Integration

- [ ] Implement identity-aware token storage
- [ ] Create custom auth provider for Playwright
- [ ] Update test fixtures with identity support
- [ ] Add test environment detection

### Phase 4: Testing

- [ ] Unit tests for token service
- [ ] Integration tests for API client
- [ ] E2E tests for complete flow

## Current Issues Identified

1. **Token Generation Mechanism**:

   - Currently generates a new token for each request using `generateAuthToken = (): string => \`Bearer ${new Date().toISOString()}\``
   - This results in unique tokens per request with ISO timestamps (e.g., `Bearer 2025-05-22T10:33:00.000Z`)

2. **Backend Validation**:

   - Backend validates tokens by extracting the timestamp and checking if it's within the last hour
   - Authentication middleware in `/backend/src/middleware/auth-middleware.ts` enforces this validation

3. **Problem with Test Automation**:
   - When using Playwright's auth-session library, token acquisition, storage, and reuse mechanisms are not compatible with the app's token format
   - Automated tests fail with 401 Unauthorized errors when adding/updating movies
   - Manual testing works fine because each request gets a fresh timestamp-based token

## Recommended Solution Approach

### 1. Standardize Token Format to Match Admin App

To ensure compatibility with the auth-session library and the existing Admin App implementation, update the token format to match the Playwright storage state format used in the Admin App:

```typescript
// Token format compatible with Playwright's storage state format
interface StorageState {
  cookies: Cookie[]
  origins: Origin[]
}

interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

interface Origin {
  origin: string
  localStorage: LocalStorageItem[]
}

interface LocalStorageItem {
  name: string
  value: string
}
```

With this structure, the token generation should create a token that looks like:

```json
{
  "cookies": [
    {
      "name": "sample-app-token",
      "value": "2025-05-22T10:39:18.000Z", // Using the current timestamp approach
      "domain": "localhost",
      "path": "/",
      "expires": 1747746720.352, // One hour from now
      "httpOnly": true,
      "secure": false, // Set to false for localhost
      "sameSite": "Lax"
    }
  ],
  "origins": []
}
```

### 2. Create a Token Management Service

Following SEON's functional programming principles, create a dedicated token service:

```typescript
// src/services/token-service.ts
export interface TokenService {
  getToken(): StorageState
  refreshToken(): StorageState
  isTokenValid(token: StorageState): boolean
  getAuthorizationHeader(): string
}

export class StorageStateTokenService implements TokenService {
  private currentToken: StorageState | null = null

  constructor() {
    // Check if running in a Playwright test context with an injected token
    if (typeof window !== 'undefined' && window.authToken) {
      try {
        this.currentToken =
          typeof window.authToken === 'string'
            ? JSON.parse(window.authToken)
            : window.authToken
      } catch (e) {
        console.error('Failed to parse injected auth token', e)
      }
    }
  }

  getToken(): StorageState {
    if (!this.currentToken || !this.isTokenValid(this.currentToken)) {
      return this.refreshToken()
    }
    return this.currentToken
  }

  refreshToken(): StorageState {
    const timestamp = new Date().toISOString()
    const expires = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

    this.currentToken = {
      cookies: [
        {
          name: 'sample-app-token',
          value: timestamp,
          domain: 'localhost',
          path: '/',
          expires,
          httpOnly: true,
          secure: false, // Set to false for localhost
          sameSite: 'Lax'
        }
      ],
      origins: []
    }

    return this.currentToken
  }

  isTokenValid(token: StorageState): boolean {
    try {
      const cookie = token.cookies.find((c) => c.name === 'sample-app-token')
      if (!cookie) return false

      const tokenDate = new Date(cookie.value)
      const currentTime = new Date().getTime()
      const tokenTime = tokenDate.getTime()
      const diffInSeconds = (currentTime - tokenTime) / 1000

      return diffInSeconds >= 0 && diffInSeconds < 3000 // Valid for 50 minutes
    } catch (e) {
      return false
    }
  }

  // This method provides backward compatibility with the existing API
  getAuthorizationHeader(): string {
    const token = this.getToken()
    const cookie = token.cookies.find((c) => c.name === 'sample-app-token')
    return cookie ? `Bearer ${cookie.value}` : ''
  }
}
```

### 2. Update Axios Instance Configuration

Refactor the consumer.ts file to use the token service:

```typescript
// consumer.ts
import {
  TokenService,
  StorageStateTokenService
} from './services/token-service'

// Create singleton token service
const tokenService: TokenService = new StorageStateTokenService()

// Configure axios instance
const axiosInstance = axios.create({
  baseURL: API_URL
})

// Add request interceptor to handle authentication
axiosInstance.interceptors.request.use((config) => {
  // Get authorization header using the token service
  config.headers.Authorization = tokenService.getAuthorizationHeader()
  return config
})

// Remove the old token generation code
// const generateAuthToken = (): string => `Bearer ${new Date().toISOString()}`
// const commonHeaders = { headers: { Authorization: generateAuthToken() } }

// Update the API methods to not need commonHeaders
export const getMovies = (): Promise<GetMovieResponse> =>
  axiosInstance.get('/movies').then(yieldData).catch(handleError)

// Update other methods similarly...
```

### 3. Add Auth Session Integration

Create an adapter for Playwright auth-session that works with the timestamp-based tokens:

```typescript
// playwright/support/auth/sample-app-auth-provider.ts
import type { AuthProvider } from '@seontechnologies/playwright-utils/auth-session'
import type { APIRequestContext, BrowserContext } from '@playwright/test'

interface StorageState {
  cookies: Cookie[]
  origins: Origin[]
}

interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

interface Origin {
  origin: string
  localStorage: LocalStorageItem[]
}

interface LocalStorageItem {
  name: string
  value: string
}

const sampleAppAuthProvider: AuthProvider = {
  getEnvironment(options = {}) {
    return (options.environment as string) || process.env.TEST_ENV || 'local'
  },

  getUserRole(options = {}) {
    return (options.userRole as string) || 'default'
  },

  // Extract the token from the response - now returns the full storage state
  extractToken(tokenData: Record<string, unknown>): StorageState | null {
    // If tokenData is already a StorageState object, return it
    if (tokenData.cookies && Array.isArray(tokenData.cookies)) {
      return tokenData as unknown as StorageState
    }

    // If it's the older format with just a token string, convert it
    if (tokenData.token && typeof tokenData.token === 'string') {
      const timestamp = (tokenData.token as string).replace('Bearer ', '')
      const expires = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

      return {
        cookies: [
          {
            name: 'sample-app-token',
            value: timestamp,
            domain: 'localhost',
            path: '/',
            expires,
            httpOnly: true,
            secure: false,
            sameSite: 'Lax'
          }
        ],
        origins: []
      }
    }

    return null
  },

  // Check if the token is expired - now works with StorageState
  isTokenExpired(token: StorageState): boolean {
    try {
      const cookie = token.cookies.find((c) => c.name === 'sample-app-token')
      if (!cookie) return true

      // Check if cookie is expired by timestamp
      const currentTime = Math.floor(Date.now() / 1000)
      if (cookie.expires < currentTime) return true

      // Also check the value itself which contains the timestamp
      const tokenDate = new Date(cookie.value)
      const tokenTime = tokenDate.getTime()
      const diffInSeconds = (Date.now() - tokenTime) / 1000

      return diffInSeconds < 0 || diffInSeconds >= 3000
    } catch (e) {
      return true
    }
  },

  // Token acquisition - now returns StorageState
  async manageAuthToken(request: APIRequestContext) {
    // Get a token from the fake-token endpoint
    const response = await request.get('http://localhost:3001/auth/fake-token')
    const data = await response.json()

    // Generate a proper storage state
    const timestamp = data.token.replace('Bearer ', '')
    const expires = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

    return {
      cookies: [
        {
          name: 'sample-app-token',
          value: timestamp,
          domain: 'localhost',
          path: '/',
          expires,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax'
        }
      ],
      origins: []
    }
  },

  // Apply token to browser context - now handles StorageState
  async applyToBrowserContext(context: BrowserContext, token: StorageState) {
    // Apply cookies directly to the browser context
    await context.addCookies(token.cookies)

    // Also set the token in window for the API requests
    await context.addInitScript(`
      window.authToken = ${JSON.stringify(token)};
    `)
  }
}

export default sampleAppAuthProvider
```

### 4. Update the Frontend to Support Both Manual and Automated Testing

Implement a mechanism to detect if running in a test environment and use the appropriate token source:

```typescript
// src/services/token-service.ts (updated)
export class TimestampTokenService implements TokenService {
  // ... existing code

  constructor() {
    // Check if running in a Playwright test context with an injected token
    if (typeof window !== 'undefined' && window.authToken) {
      this.currentToken = window.authToken
    }
  }
}
```

### 5. Implement Cookie-Based Authentication in Frontend

To better align with the SEON Admin app approach, transition from header-based authentication to cookie-based authentication:

```typescript
// src/services/auth-cookie.ts
export function setCookieAuth(token: string): void {
  // Set the token as a cookie that will be sent with each request
  document.cookie = `sample-app-token=${token}; path=/; max-age=3600; samesite=lax`
}

export function clearCookieAuth(): void {
  document.cookie = 'sample-app-token=; path=/; max-age=0'
}

export function getCookieAuth(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'sample-app-token') {
      return value
    }
  }
  return null
}
```

Update the backend authentication middleware to also check for cookies:

```typescript
// backend/src/middleware/auth-middleware.ts
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // First try the Authorization header
  let tokenStr = ''
  const authHeader = req.headers.authorization

  if (authHeader) {
    tokenStr = authHeader.replace('Bearer ', '')
  } else {
    // If no Authorization header, try cookie
    const tokenCookie = req.cookies['sample-app-token']
    if (tokenCookie) {
      tokenStr = tokenCookie
    } else {
      return res.status(401).json({
        error: 'Unauthorized; no valid authentication found.',
        status: 401
      })
    }
  }

  const token: Token = { issuedAt: new Date(tokenStr) }

  if (!isValidAuthTimeStamp(token))
    return res
      .status(401)
      .json({ error: 'Unauthorized; not valid timestamp.', status: 401 })

  next() // proceed if valid
}
```

Update the token service to manage cookies:

```typescript
// Update token service to use cookies
export class StorageStateTokenService implements TokenService {
  // ... existing code

  refreshToken(): StorageState {
    const timestamp = new Date().toISOString()
    const expires = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

    // Create the storage state format
    this.currentToken = {
      cookies: [
        {
          name: 'sample-app-token',
          value: timestamp,
          domain: 'localhost',
          path: '/',
          expires,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax'
        }
      ],
      origins: []
    }

    // Also set the browser cookie for API requests
    if (typeof document !== 'undefined') {
      setCookieAuth(timestamp)
    }

    return this.currentToken
  }
}
```

This approach offers several benefits:

1. **Closer alignment with SEON Admin App**: Using the same authentication mechanism makes tests more transferable between applications

2. **Simpler API requests**: No need to explicitly set Authorization headers on every request

3. **Improved security**: Can leverage HttpOnly and secure flags for better security

4. **Better testing compatibility**: Playwright's built-in storage state handling works perfectly with cookies

### 6. Implement Role and Email-Based Authentication

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

## Detailed Implementation Plan

### Phase 1: Backend Changes

#### 1. Update Auth Middleware for Cookie Support

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

#### 2. Add Identity-Based Authentication Endpoint

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

#### 3. Implement Token Validation with Identity Support

- [ ] Extract and verify identity information from tokens
- [ ] Add role-based access control for protected endpoints if needed
- [ ] Update validation to work with new token format

### Phase 2: Frontend Changes

#### 4. Create TokenService Implementation

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

#### 5. Implement Cookie-Based Authentication

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

#### 6. Refactor Axios Configuration

- [ ] Remove token header interceptors
- [ ] Update API client to use cookies for authentication
- [ ] Ensure backward compatibility

#### 7. Update API Client Methods

- [ ] Remove hardcoded Authorization headers
- [ ] Add support for identity-based operations if needed
- [ ] Update error handling for authentication failures

### Phase 3: Test Framework Integration

#### 8. Implement Identity-Aware Token Storage

- [ ] Update token path generation to include identity information
  ```typescript
  private getTokenPath(): string {
    const { role = 'default', email = 'default' } = this.userIdentity
    return `.auth-sessions/${this.environment}/${role}/${email.replace('@', '_at_')}`
  }
  ```
- [ ] Modify token storage to isolate by environment, role, and email
- [ ] Ensure backward compatibility

#### 9. Create Custom Auth Provider for Playwright

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

#### 10. Update Test Fixtures with Identity Support

- [ ] Modify fixtures to accept identity options
- [ ] Add helper functions for common identity patterns
- [ ] Update documentation and examples

#### 11. Add Test Environment Detection

- [ ] Implement browser/Node.js environment detection
- [ ] Add automatic token injection for tests
- [ ] Ensure seamless transition between environments

### Phase 4: Testing

#### Unit Tests

- [ ] Test token service functions in isolation
- [ ] Verify token generation and validation logic

#### Integration Tests

- [ ] Verify Axios interceptors correctly apply tokens
- [ ] Test API client methods with the new token mechanism

#### E2E Tests

- [ ] Confirm the app works with manual interaction
- [ ] Verify Playwright tests can successfully perform all CRUD operations
- [ ] Test token expiration and refresh scenarios

This approach adheres to SEON's principles of:

- Functional and declarative programming patterns
- Modular code with clear separation of concerns
- Type safety with explicit TypeScript interfaces
- DRY principles by centralizing token logic
- Revisit skipped tests (token clearing and ui tests)
