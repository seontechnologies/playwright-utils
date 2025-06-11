# Thoughts on Admin Auth-session Implementation

## Current Implementation Overview

The Admin React app currently uses a custom authentication implementation for its Playwright tests that follows some industry best practices but lacks certain advanced features available in the auth-session library. This report analyzes the current implementation and identifies opportunities for enhancement using our auth-session library.

## Current Authentication Architecture

### Key Components

1. **LoginRequest Class** (`api/auth/login.ts`)

   - Handles API-based authentication
   - Saves storage state to the file system
   - Uses environment variables for credentials

2. **RenewEndpoint Class** (`api/auth/renew.ts`)

   - Handles token renewal
   - Updates storage state with fresh tokens

3. **AdminUserLoginHandler Class** (`utils/loginHandler.ts`)

   - Manages the authentication lifecycle
   - Checks for token expiration
   - Handles login and token renewal logic
   - Provides the storage state for tests

4. **Auth Configuration** (`utils/auth.ts`)

   - Defines storage state paths for different user roles
   - Provides a `notAuthenticatedState` for testing unauthenticated flows
   - Includes password generation/retrieval functions

5. **Worker Initialization** (`fixtures/automaticFixtures.ts`)

   - Uses worker fixtures for authentication before tests run
   - Creates authenticated states for all predefined user roles at test startup
   - Limited to fixed user roles: mainAdmin, settingsAdmin, freeUser, shopifyUser

6. **Environment Configuration** (`configuration/*.config.ts`)
   - Environment-specific configurations with different base URLs and users
   - Uses storage states in each environment's config

### Authentication Workflow

1. **Initialization Phase**:

   - Worker fixtures run before tests for each worker
   - `AdminUserLoginHandler` is instantiated for each user role
   - Storage state files are checked for existence and validity

2. **Authentication Logic**:

   - If storage state doesn't exist → Login via API
   - If refresh token is expired → Login via API
   - If JWT token is expired but refresh token is valid → Renew token
   - Otherwise → Use existing storage state

3. **Test Execution**:
   - Tests use the storage state configured in the base config
   - Different user roles can be selected using configuration overrides

## Strengths of Current Implementation

1. **Token Expiration Handling**: Checks expiration times and renews tokens when needed
2. **Multi-user Role Support**: Handles different user roles (mainAdmin, settingsAdmin, freeUser, shopifyUser)
3. **Environment-specific Configuration**: Supports different environments through configuration files
4. **Storage State Management**: Manages authentication state through Playwright's storage state mechanism
5. **Automatic Authentication**: Initializes authentication before test execution

## Limitations of Current Implementation

1. **Custom Implementation**: Authentication logic is tightly coupled to the specific implementation (Admin only)
2. **Limited Programmatic Control**: No simple API for managing tokens during test execution
3. **Fixed Storage Structure**: Hardcoded file paths with rigid `.auth/${TEST_ENV}/userRole.json` pattern and no support for multiple users with the same role
4. **No In-memory Caching**: Relies solely on file storage, requiring disk I/O for every test
5. **Token Validation**: Limited to expiration time checks, not allowing custom validation (ex: signature validation)
6. **No Unified API/UI Approach**: Different approaches needed for API vs UI authentication (ok for Admin, not ok in a service)
7. **Limited Error Handling**: Basic error handling without robust recovery strategies or structured error types.
8. **No Session Storage Support**: Limited to cookies for authentication state

## How Auth-Session Library Can Enhance Admin Testing

### Immediate Benefits of Integration

1. **Provider-Based Architecture**: The auth-session library's provider interface allows for a clean separation between token acquisition logic and token management, making it adaptable to Admin, as well as any UI app or backend service. This architecture enables customization of authentication without changing test code.

2. **Robust Token Storage**: Structured environment and role-based token directory management with standardized `storage-state.json` files replaces hardcoded paths and enables multi-user support with the same role.

3. **Performance Optimization**: In-memory caching significantly reduces disk I/O operations during test runs, making tests execute faster.

4. **Enhanced Token Validation**: Support for validating JWT tokens beyond just expiration checks, ensuring more reliable authentication.

5. **Unified API for Token Management**: Clear, consistent API for token acquisition, validation, clearing, and applying to both API and browser contexts - one approach for all test types.

6. **On-the-fly User Creation**: Support for ephemeral test users created during test execution, enabling testing of multi-user interactions without preset accounts. This is particularly valuable for testing scenarios involving newly created users with specific attributes.

7. **Better Testing Patterns**:
   - Easy switching between authenticated/unauthenticated states
   - Testing with multiple user roles in the same test
   - Parallel testing with worker-specific accounts
   - Dynamic role selection during test execution

### Implementation Approach

Hypothetically, we can reuse a lot of the existing code in Admin, and plug it into the Provider customization of the plugin.

The current Admin app already has most of the authentication logic needed (login, token renewal, expiration checking) - it's just structured differently. By adapting this existing code to implement the interface, we can:

1. Minimize new code development
2. Preserve the existing authentication behaviors and rules
3. Leverage the structure and benefits of the auth-session library
4. Maintain compatibility with existing tests

```typescript
// Example custom auth provider implementation for SEON Admin
import { type AuthProvider } from '@seon/playwright-utils/auth-session'
import * as fs from 'fs'

const seonAdminAuthProvider: AuthProvider = {
  // Environment management
  getEnvironment(options = {}) {
    return options.environment || TEST_ENV
  },

  getUserRole(options = {}) {
    return options.userRole || 'mainAdmin'
  },

  // Token extraction and validation
  extractToken(tokenData: Record<string, unknown>): string | null {
    // Extract JWT token from Playwright storage state
    if ('cookies' in tokenData && Array.isArray(tokenData.cookies)) {
      const jwtCookie = tokenData.cookies.find((c) => c.name === 'jwt')
      if (jwtCookie && 'value' in jwtCookie) {
        return jwtCookie.value
      }
    }
    return null
  },

  isTokenExpired(rawToken: string): boolean {
    // Decode JWT and check expiration
    try {
      const payload = JSON.parse(atob(rawToken.split('.')[1]))
      return Date.now() >= payload.exp * 1000
    } catch (e) {
      console.error('Error checking token expiration:', e)
      return true // If we can't decode, assume expired
    }
  },

  // Token acquisition and application
  async manageAuthToken(request, options = {}) {
    // Implementation would use LoginRequest class logic from admin app
    // Example implementation pattern:
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)

    // Get token path for storage
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      tokenFileName: 'auth-token.json'
    })

    // Check for existing valid token
    const existingToken = loadTokenFromStorage(tokenPath, true)
    if (existingToken) {
      return existingToken
    }

    // No valid token found, acquire new one
    console.log(`Fetching new token for ${environment}/${userRole}`)

    // Would integrate with admin's LoginRequest class here
    // const token = await loginWithAdminAPI(request, environment, userRole);

    // Save token for future use
    // saveTokenToStorage({ tokenPath, token, debug: true });
    // return token;
  },

  clearToken(options = {}) {
    // Clear token for specific environment/role
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      tokenFileName: 'auth-token.json'
    })

    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath)
      return true
    }
    return false
  }
}
```

### Comparison: Admin Auth vs Auth-Session Library

| **Category**             | **Current Admin Implementation**                                                  | **Benefits of Auth-Session Library**                                                                    |
| ------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Architecture**         | **Custom Implementation** – Hand-rolled authentication code specific to Admin app | **Standardized Library** – Tested, maintained library with documentation and consistent API             |
|                          | **No Provider Abstraction** – Logic tightly coupled to implementation             | **Provider Interface** – Clean separation between token acquisition and management                      |
| **Storage**              | **Limited Structure** – Fixed paths with environment-specific folders             | **Flexible Storage** – Configurable paths with automatic environment/role directories                   |
|                          | **No in-memory Caching** – Reads from disk for each test                          | **Performance Optimization** – In-memory caching with disk fallback                                     |
|                          | **No Session Storage** – Limited to cookies for authentication                    | **Complete Storage Support** – Handles cookies, localStorage, and sessionStorage                        |
| **Token Management**     | **Basic Expiration** – Simple timestamp comparison                                | **Advanced Management** – Full customizable JWT validation, selective refresh, and programmatic control |
|                          | **Limited API** – No standard API for token operations                            | **Rich API** – Consistent methods for token operations including refreshing and validating              |
| **Test Integration**     | **Worker Setup Required** – Fixed authentication before tests                     | **Automatic Setup** – Built-in fixtures handle authentication transparently                             |
|                          | **Fixed User Roles** – Hardcoded roles in configuration                           | **Dynamic Roles** – Support for arbitrary user roles and dynamic role selection                         |
| **Feature Flag Testing** | **Fixed User Identity** – Predefined users with unchangeable attributes           | **Dynamic User Creation** – Create ephemeral test users with any required attributes on-the-fly         |
|                          | **Limited Attribute Control** – No custom user attributes for targeting           | **Flexible Attribute Management** – Pass any attributes needed for flag targeting                       |
|                          | **No Multi-User Support** – Single authenticated state per test                   | **Multiple Auth States** – Auth as different users in the same test                                     |
|                          | **Worker Initialization** – Auth happens before tests run                         | **On-Demand Authentication** – Can authenticate at any point during test execution                      |
| **Advanced Features**    | **Manual Parallel Testing** – Limited worker-specific auth support                | **Built-in Parallel Support** – Automatic handling of worker-specific accounts                          |

## Stateless Feature Flag Testing with Auth-Session

One significant benefit of the auth-session library is its ability to enable stateless feature flag testing. Testing all flag combinations traditionally requires complex state management or deployment configurations.

### Current Feature Flag Testing Challenges

1. **User-Based Feature Flag Targeting**: Feature flag services assign flag values based on user attributes (email, ID, role, etc.)
2. **Stateful Testing Problems**:
   - Tests dependent on global feature flag state in the environment
   - Inability to test multiple flag states in parallel
   - Test nondeterminism when flag states change between test runs
   - Difficulty testing combinations of features together
3. **Current Workarounds**:
   - Stubbing network requests to feature flag services
   - Conditional testing based on flag state
   - Separate test suites for each flag state (duplicate code)

### How Auth-Session Can Enable Stateless Feature Flag Testing

#### Dynamic User Identity Management

Auth-session library's provider architecture makes it possible to:

1. **Create Ephemeral Test Users** with specific attributes that target different feature flag states
2. **Authenticate Multiple User Types** in the same test run with different flag exposures
3. **Control Feature Flag Exposure** by user properties rather than global environment state

```typescript
// Example feature flag testing with auth-session
const testUserWithFeature = {
  email: 'feature-enabled-user@seon.io',
  userRole: 'admin',
  featureFlags: {
    'new-dashboard-layout': true,
    'advanced-filters': true
  }
}

const testUserWithoutFeature = {
  email: 'feature-disabled-user@seon.io',
  userRole: 'admin',
  featureFlags: {
    'new-dashboard-layout': false,
    'advanced-filters': false
  }
}

// Auth provider can create users with specific properties that LaunchDarkly targets
const featureFlagAuthProvider: AuthProvider = {
  // Standard auth provider methods
  // ...

  // Custom method to create test users with specific flag attributes
  async createTestUserWithFlags(request, flagConfig) {
    const email = `test-${Date.now()}@seon.io`
    let userId = null

    try {
      // Register user with specific attributes that target desired flags
      const response = await request.post('/api/users', {
        data: {
          email,
          attributes: flagConfig
        }
      })

      const data = await response.json()
      userId = data.id

      // Authenticate as this user
      return this.manageAuthToken(request, { userEmail: email })
    } catch (error) {
      console.error('Failed to create test user:', error)
      throw error
    } finally {
      // Store user ID for later cleanup
      if (userId) {
        this._testUserIds = this._testUserIds || []
        this._testUserIds.push(userId)
      }
    }
  },

  // Helper to clean up test users after tests
  async cleanupTestUsers(request) {
    if (!this._testUserIds || !this._testUserIds.length) return

    console.log(`Cleaning up ${this._testUserIds.length} test users...`)

    for (const userId of this._testUserIds) {
      try {
        await request.delete(`/api/users/${userId}`)
      } catch (error) {
        console.warn(`Failed to clean up test user ${userId}:`, error)
      }
    }

    this._testUserIds = []
  }
}
```

#### Testing Multiple Flag States in One Test

With auth-session, tests can authenticate as different users with different feature flag exposures:

```typescript
test('feature flag A/B testing', async ({ context, page, request }) => {
  // Create auth provider instance
  const authProvider = getAuthProvider()

  // Create and auth as user with feature enabled
  const enabledToken = await authProvider.createTestUserWithFlags(request, {
    featureFlags: { 'new-feature': true }
  })

  // For API testing
  const featureOnResponse = await request.get('/api/data', {
    headers: { Authorization: `Bearer ${enabledToken}` }
  })
  expect(featureOnResponse.data).toContain('new feature data')

  // For UI testing - using storageState to preserve feature flags
  const enabledStorageState = await context.storageState()

  // Create and auth as user with feature disabled
  const disabledToken = await authProvider.createTestUserWithFlags(request, {
    featureFlags: { 'new-feature': false }
  })

  // API testing with disabled feature
  const featureOffResponse = await request.get('/api/data', {
    headers: { Authorization: `Bearer ${disabledToken}` }
  })
  expect(featureOffResponse.data).toContain('legacy data')

  // Clean up test resources when done
  await authProvider.cleanupTestUsers(request)
})
```

#### Benefits

1. **Deterministic Feature Flag Testing**: Test specific flag combinations reliably
2. **Parallel Test Execution**: Different workers can test different flag states simultaneously
3. **Enhanced Coverage**: Test all flag combinations without environment manipulation
4. **Reduced Setup Complexity**: No need for complex flag stubbing or network interception
5. **True End-to-End Testing**: Test real feature flag behavior instead of mocks
6. **Simplified Test Maintenance**: Single test suite can handle many flag variations

This approach can transform feature flag testing from a complex, environment-dependent process to a simple, stateless testing pattern that can be executed reliably across any environment.

## Conclusion

The current authentication implementation in the Admin app is functional but could benefit significantly from integration with the auth-session library. The library would provide a more robust, maintainable, and feature-rich authentication solution while reducing the amount of custom code needed. Furthermore, the solution would be portable to any other app or service in the Seon domain.

The additional capability to enable stateless feature flag testing represents an advancement in testing methodology that aligns with modern feature delivery practices. Auth-session's flexible user identity management makes it possible to test feature flags reliably without complex environment manipulation or network stubbing.
