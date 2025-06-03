# Playwright Auth Session Library

Playwright is unopinionated by design, providing developers with powerful tools and flexible patterns while leaving the implementation details and developer experience up to you.

This library builds on Playwright's authentication capabilities to create a more structured, efficient developer experience. It implements a session-based storage pattern for authentication that works seamlessly with both API and UI testing, allowing you to fetch an authentication token once and reuse it across multiple tests and test runs.

## Table of Contents

- [Playwright Auth Session Library](#playwright-auth-session-library)
  - [Table of Contents](#table-of-contents)
  - [What is this and why does it exist?](#what-is-this-and-why-does-it-exist)
    - [Playwright's Built-in Authentication](#playwrights-built-in-authentication)
      - [Approach 1: Setup Project with Dependencies](#approach-1-setup-project-with-dependencies)
      - [Approach 2: Global Setup Function](#approach-2-global-setup-function)
      - [Write tests that use the authenticated state](#write-tests-that-use-the-authenticated-state)
    - [Limitations of Playwright’s Approach vs. What This Library Adds](#limitations-of-playwrights-approach-vs-what-this-library-adds)
  - [Quick Start Guide](#quick-start-guide)
    - [Configure Global Setup](#configure-global-setup)
    - [Create Auth Fixture](#create-auth-fixture)
    - [Implement Custom Auth Provider](#implement-custom-auth-provider)
    - [Create Token Acquisition Logic](#create-token-acquisition-logic)
    - [Update Your Playwright Config](#update-your-playwright-config)
    - [Configure Authentication Options](#configure-authentication-options)
    - [Use the Auth Session in Your Tests](#use-the-auth-session-in-your-tests)
      - [Cookie-Based Authentication](#cookie-based-authentication)
    - [Using Multiple User Roles in Tests](#using-multiple-user-roles-in-tests)
    - [Dynamic Role Selection](#dynamic-role-selection)
      - [3. Testing Interactions Between Multiple Roles in a Single Test](#3-testing-interactions-between-multiple-roles-in-a-single-test)
    - [Ephemeral User Authentication](#ephemeral-user-authentication)
      - [How Ephemeral Authentication Works](#how-ephemeral-authentication-works)
    - [UI Testing with Browser Context](#ui-testing-with-browser-context)
      - [OAuth2 Example](#oauth2-example)
      - [Token Pre-fetching](#token-pre-fetching)
    - [Parallel Testing with Worker-Specific Accounts](#parallel-testing-with-worker-specific-accounts)
    - [Testing Unauthenticated States](#testing-unauthenticated-states)
        - [Playwright's Built-in Approach](#playwrights-built-in-approach)
        - [Our Enhanced Approach](#our-enhanced-approach)
    - [Storage/\*\_ Options for the auth session \_/](#storage_-options-for-the-auth-session-_)
    - [Session Storage Support (Extension Recipe)](#session-storage-support-extension-recipe)

## What is this and why does it exist?

### Playwright's Built-in Authentication

Playwright provides a mechanism for saving and reusing authentication state through the [`storageState`](https://playwright.dev/docs/auth) feature. The official documentation outlines two alternative approaches:

#### Approach 1: Setup Project with Dependencies

This approach uses a dedicated setup project that runs before your test projects:

<details><summary><strong>Expand for details:</strong></summary>

1. Create an authentication setup file:

```typescript
// tests/auth.setup.ts - Authentication setup file
import { test as setup } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Navigate to login page and authenticate via UI
  await page.goto('https://example.com/login')
  await page.getByLabel('Username').fill('user')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Wait until the page receives the cookies
  await page.waitForURL('https://example.com/dashboard')

  // Save storage state to a file
  await page.context().storageState({ path: authFile })
})
```

2. Configure your tests to use this authentication state:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  projects: [
    // Setup project that runs first
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Test projects that use the authenticated state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup'] // This project depends on setup project
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    }
  ]
})
```

#### Approach 2: Global Setup Function

Alternatively, you can use a global setup function that runs once before all tests:

<details><summary><strong>Expand for details:</strong></summary>

1. Create a global setup file:

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test'
import path from 'path'

async function globalSetup(config: FullConfig) {
  // Create browser, context, and page
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Navigate to login page and authenticate
  await page.goto('https://example.com/login')
  await page.getByLabel('Username').fill('user')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Wait for login to complete
  await page.waitForURL('https://example.com/dashboard')

  // Save storage state to a file for reuse
  await page.context().storageState({
    path: path.join(process.cwd(), 'playwright/.auth/user.json')
  })

  await browser.close()
}

export default globalSetup
```

2. Reference the global setup in your configuration:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // Reference the global setup file
  globalSetup: './global-setup.ts',

  use: {
    // Use the saved state for all tests
    storageState: 'playwright/.auth/user.json'
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ]
})
```

#### Write tests that use the authenticated state

<details><summary><strong>Expand for details:</strong></summary>

```typescript
// tests/dashboard.spec.**ts**
import { test, expect } from '@playwright/test'

// This test automatically uses the authenticated state
test('access dashboard page', async ({ page }) => {
  // Navigate directly to a protected page without login
  await page.goto('/dashboard')

  // The page should be accessible because we're authenticated
  await expect(page.locator('h1')).toHaveText('Dashboard')
})
```

### Limitations of Playwright’s Approach vs. What This Library Adds

| **No.** | **Limitation of Playwright’s Approach**                                                                                                                                                                          | **What This Library Adds**                                                                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | **Complex setup** – Requires configuration across multiple files and understanding of projects/dependencies.                                                                                                     | **Simplified setup** – Single configuration approach with built-in token expiration checking and programmatic refresh capabilities.                                                 |
| 2       | **Manual token management** – No built-in handling of token expiration or refreshing.                                                                                                                            | **Structured token storage** – Organized acquisition and persistence of tokens with optional validation.                                                                            |
| 3       | **No multi-environment support** – No straightforward way to handle different environments (dev/staging/prod).                                                                                                   | **Multi-environment support** – First-class support for different environments (dev/staging/prod).                                                                                  |
| 4       | **No multi-role support** – No built-in system for managing different user roles (admin/user/guest).                                                                                                             | **Role-based testing** – Built-in system for managing different user roles (admin/user/guest).                                                                                      |
| 5       | **Limited programmatic control** – No simple API for clearing or refreshing tokens during test execution.                                                                                                        | **Rich programmatic control** – Clear APIs for managing tokens during test execution.                                                                                               |
| 6       | **Separate implementations** – Different approaches needed for API vs UI authentication.                                                                                                                         | **Unified implementation** – Same approach works for both API and browser testing.                                                                                                  |
| 7       | **Performance bottleneck** – Relies solely on file storage, requiring disk I/O and JSON parsing for every test run, causing slowdowns.                                                                           | **Performance optimization** – In-memory caching eliminates repeated file reads and JSON parsing operations that slow down Playwright’s approach.                                   |
| 8       | **UI Mode limitations** – UI mode doesn’t run setup projects by default, requiring manual intervention to re-authenticate when tokens expire (enabling filters, running auth.setup.ts, disabling filters again). | **Seamless UI Mode integration** – Works with Playwright UI Mode without manual intervention; no need to enable filters, run setup projects, or re-authenticate when tokens expire. |
| 9       | **Between-run API calls** – Authentication request is made at the start of each test run session, even when a previously acquired token is still valid.                                                          | **Reduced API calls** – Token is fetched only once and reused across all tests, significantly reducing authentication overhead.                                                     |
| 10      | **Manual parallel worker setup** – Requires custom fixtures and significant boilerplate code to implement worker-specific authentication for parallel testing.                                                   | **Automatic parallel worker support** – Handles worker-specific authentication without custom fixtures or boilerplate, automatically managing unique accounts per worker.           |
| 11      | **No session storage support** – Playwright explicitly does not provide APIs to persist session storage, requiring custom scripts for apps that use this storage method.                                         | **Complete storage support** – Automatically handles all storage types including cookies, localStorage, IndexedDB, and sessionStorage without manual scripts.                       |

**Additional Benefits**:

1. **Provider architecture** - Extensible design for custom authentication flows
2. **Single source of truth** - Auth provider centralizes environment and role configuration
3. **Isolated storage** - Tokens are stored by environment and user role, preventing cross-contamination

<details><summary><strong>More on UI mode integration:</strong></summary>

> ### More on UI mode integration:
>
> In Playwright's authentication approach, they use separate "setup projects" that run before your tests to handle authentication. The problem is that UI Mode intentionally skips these setup projects for speed. This forces you to manually authenticate by:
>
> 1. Finding and enabling the setup filter
> 2. Clicking a button to manually run the auth setup
> 3. Disabling the filter again
> 4. Repeating whenever tokens expire
>
> #### How Our Approach Is Different
>
> Our solution bakes authentication directly into the normal test flow instead of using separate setup projects:
>
> 1. **Smarter Token Management**: We store tokens in a central location that works for both normal tests and UI Mode tests.
> 2. **On-Demand Authentication**: Instead of requiring a separate setup step, each test automatically checks if it needs a token:
>    - If a valid token exists, it uses it (fast path)
>    - If no token exists or it's expired, it fetches a new one (transparent to you)
> 3. **Integrated with Test Fixtures**: Authentication is provided through fixtures that UI Mode automatically uses, so there's no separate step to enable or disable.
> 4. **Unified Storage State**: We properly configure Playwright's `storageState` so UI Mode tests automatically get the authentication state without any manual steps.
>
> Essentially, our solution treats authentication as a seamless part of the test execution instead of a separate setup step. Since it's integrated with the normal test fixtures and flow, UI Mode "just works" without any special handling.

<details><summary><strong>More on parallel worker authentication:</strong></summary>

> ### Playwright's Parallel Worker Authentication
>
> When tests run in parallel, Playwright recommends using **one unique account per worker** if your tests modify server-side data. This prevents tests from interfering with each other.
>
> #### What It Does In Simple Terms
>
> 1. **One Login Per Worker**: Instead of logging in for every test, each worker (parallel process) logs in once
> 2. **Worker-Specific Storage**: Each worker gets its own storage file to save cookies/tokens
> 3. **Unique Accounts**: Each worker uses a different account (like user1@example.com, user2@example.com, etc.)
> 4. **Persistent Worker State**: All tests running in the same worker share the same logged-in session
>
> **However, implementing this approach manually requires:**
>
> 1. **Custom fixture code**: Creating and maintaining specialized test fixtures
> 2. **File management**: Setting up the storage state directory structure
> 3. **Storage persistence**: Manually handling the storage state files
> 4. **Code duplication**: Reimplementing this pattern across projects
>
> **Our authentication library provides this worker-specific functionality automatically:**
>
> 1. We use a fixed path at the repo root (.auth) to store authentication data
> 2. We handle the token storage and retrieval without custom fixtures
> 3. Our solution works for both browser tests and API tests with the same code
> 4. We add in-memory caching for better performance
>
> This is a key advantage of our approach - **getting the same benefits with significantly less code and complexity**.

<details><summary><strong>More on performance and simplicity benefits:</strong></summary>

> ### More on performance and simplicity benefits:
>
> Our authentication system provides significant advantages in several areas:
>
> 1. **Reduced API Calls**: Token is fetched only once and persists between separate test runs. This means:
>    - No authentication API calls when starting a new test session if token is still valid
>    - Less load on your authentication servers across development cycles
>    - Faster test execution overall, especially for multiple test runs
>    - No rate limiting issues from your auth provider
> 2. **Speed Optimization**: Tests run substantially faster by:
>    - Avoiding repeated authentication requests
>    - Utilizing in-memory caching to eliminate disk I/O
>    - Removing JSON parsing overhead for each test
> 3. **Persistence**: Token persists between test runs, enabling:
>    - Faster CI/CD pipelines
>    - Quicker local development cycles
>    - Reduced authentication server load, and emails
> 4. **Simplicity**: The API design allows tests to focus on business logic:
>    - Clean test code without authentication boilerplate
>    - Simple fixture-based access to tokens
>    - Consistent patterns across your test suite
>    - Same code works for both API and UI authentication (no separate implementations)
>    - No need for different setup approaches based on authentication method
>
> The system is designed to be compatible with Playwright's recommended patterns for authentication in both API testing and UI testing contexts while solving the performance and usability limitations of the built-in approach.

---

## Quick Start Guide

⚠️ **IMPORTANT**: The authentication system requires explicit configuration before use. You MUST set up authentication in your global setup file with **both** `configureAuthSession` AND `setAuthProvider` in the correct order.

### Configure Global Setup

Create `playwright/support/global-setup.ts` and add it to your Playwright config:

```typescript
// playwright/support/global-setup.ts
import {
  authStorageInit,
  setAuthProvider,
  configureAuthSession,
  authGlobalInit
} from '@seontechnologies/playwright-utils/auth'

import myCustomProvider from './auth/custom-auth-provider'

async function globalSetup() {
  // Initialize storage, config and provider in the correct order
  authStorageInit()

  configureAuthSession({
    // Auth sessions stored in .auth at repo root (.gitignore this)
    debug: true
  })

  setAuthProvider(myCustomProvider)

  // Optional: pre-fetch all tokens for better test startup performance
  await authGlobalInit()
}

export default globalSetup
```

The function call order matters: first storage initialization, then configuration, then provider setup, and optionally token pre-fetching.

### Create Auth Fixture

Add `playwright/support/auth/auth-fixture.ts` to your merged fixtures:

```typescript
// playwright/support/auth/auth-fixture.ts
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthFixtures,
  setAuthProvider
} from '@seontechnologies/playwright-utils/auth'
import myCustomProvider from './custom-auth-provider'

// Register provider here as a safeguard if global setup doesn't run
setAuthProvider(myCustomProvider)

// Create and export fixtures
const fixtures = createAuthFixtures()
export const test = base.extend<AuthFixtures>({
  authOptions: [
    { environment: process.env.TEST_ENV || 'local' },
    { option: true }
  ],
  authToken: fixtures.authToken,
  context: fixtures.context,
  page: fixtures.page
})
```

> **Note**: Register the auth provider in both global setup AND your fixture for reliability when tests run in UI mode or without global setup.

### Implement Custom Auth Provider

Create a custom auth provider to handle token acquisition, validation, and management. Here's the actual implementation used in the codebase:

```typescript
// playwright/support/auth/custom-auth-provider.ts
import type { APIRequestContext } from '@playwright/test'
import {
  type AuthOptions,
  type AuthProvider,
  AuthSessionManager,
  authStorageInit,
  getStorageDir,
  getTokenFilePath,
  saveStorageState
} from '../../../src/auth-session'
import { log } from '../../../src/log'
import { acquireToken } from './token/acquire'
import { checkTokenValidity } from './token/check-validity'
import { isTokenExpired } from './token/is-expired'
import { extractToken, extractCookies } from './token/extract'
import { getEnvironment } from './get-environment'
import { getUserRole } from './get-user-role'

const myCustomProvider: AuthProvider = {
  // Get the current environment to use
  getEnvironment,

  // Get the current user role to use
  getUserRole,

  // Extract token from storage state
  extractToken,

  // Extract cookies from token data
  extractCookies,

  // Check if token is expired
  isTokenExpired,

  // Main token management method
  async manageAuthToken(request: APIRequestContext, options: AuthOptions = {}) {
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    const userIdentifier = options.userIdentifier

    // Get the path for storing the token
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      userIdentifier,
      tokenFileName: 'storage-state.json'
    })

    // Check if we already have a valid token
    const validToken = await checkTokenValidity(tokenPath)
    if (validToken) {
      return validToken
    }

    // No valid token found, initialize storage and get a new one
    authStorageInit({ environment, userRole, userIdentifier })
    const storageState = await acquireToken(
      request,
      environment,
      userRole,
      options
    )

    // Save the token for future use
    saveStorageState(tokenPath, storageState)
    return storageState
  },

  // Clear token when needed
  clearToken(options: AuthOptions = {}) {
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    const storageDir = getStorageDir({ environment, userRole })
    const authManager = AuthSessionManager.getInstance({ storageDir })
    authManager.clearToken()
    return true
  }
}

export default myCustomProvider
```

> **Note**: See the [complete auth provider example](https://github.com/seontechnologies/playwright-utils/tree/main/examples/auth-provider) for detailed implementation including environment handling, token validation, and browser context setup.

### Create Token Acquisition Logic

Implement your application-specific token acquisition logic that handles credentials and API calls. Here's the actual implementation used in the codebase:

```typescript
// playwright/support/auth/token/acquire.ts
import type { APIRequestContext } from '@playwright/test'
import { request } from '@playwright/test'
import { log } from '../../../../src/log'

/**
 * Application-specific auth URL construction based on environment
 */
const getAuthBaseUrl = (environment: string, customUrl?: string) => {
  // Override with custom URL if provided (useful for testing)
  if (customUrl) return customUrl

  // Support for environment variables
  if (process.env.AUTH_BASE_URL) return process.env.AUTH_BASE_URL

  // Environment-specific URL mapping (customize as needed for your application)
  const urlMap: Record<string, string> = {
    local: 'http://localhost:3001',
    dev: 'https://dev.example.com/api',
    staging: 'https://staging.example.com/api',
    qa: 'https://qa.example.com/api',
    production: 'https://api.example.com'
  }

  // Return mapped URL or fallback to local if environment not recognized
  return urlMap[environment] || urlMap.local
}

/**
 * Acquire a token and return a complete Playwright storage state object
 */
export const acquireToken = async (
  _request: APIRequestContext, // We won't use the passed request, we'll create a fresh one
  environment: string,
  userRole: string,
  options: Record<string, string | undefined> = {}
): Promise<Record<string, unknown>> => {
  // Use the application-specific URL construction logic
  const authBaseUrl = getAuthBaseUrl(
    environment.toLowerCase(),
    options.authBaseUrl
  )

  // Get the endpoint (could also be environment-specific if needed)
  const endpoint = process.env.AUTH_TOKEN_ENDPOINT || '/auth/fake-token'
  const authUrl = `${authBaseUrl}${endpoint}`

  // Create a fresh request context that will capture cookies
  const context = await request.newContext()

  try {
    // Make the authentication request
    const response = await context.post(authUrl, {
      data: {
        username: process.env.USER_USERNAME || 'test-user',
        password: process.env.USER_PASSWORD || 'password123',
        role: userRole,
        ...options.credentials // Allow overriding credentials via options
      },
      headers: {
        'Content-Type': 'application/json',
        ...options.headers // Allow custom headers
      }
    })

    if (!response.ok()) {
      const error = await response.text()
      throw new Error(`Auth failed: ${response.status()} - ${error}`)
    }

    // Get the storage state which includes cookies and localStorage
    const storageState = await context.storageState()

    // Add any additional metadata you want to store with the token
    return {
      ...storageState,
      metadata: {
        environment,
        userRole,
        acquiredAt: new Date().toISOString()
      }
    }
  } finally {
    // Always close the context to free up resources
    await context.dispose()
  }
}
```

> **Note**: For more complex token acquisition with role-based auth, refresh tokens, or OAuth flows, see the [authentication recipes](https://github.com/seontechnologies/playwright-utils/tree/main/examples/auth-recipes) directory.

### Update Your Playwright Config

Make sure your config points to your global setup and sets the baseUrl in your auth options:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

export default defineConfig({
  // Other config options...

  // Point to your global setup file
  globalSetup: './playwright/support/global-setup.ts',

  use: {
    baseURL: BASE_URL
  }

  // Other config options...
})
```

### Configure Authentication Options

When setting up your auth fixtures, explicitly include the baseUrl in your auth options:

```typescript
// playwright/support/auth/auth-fixture.ts
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions
} from '@seontechnologies/playwright-utils/auth-session'

// Get BASE_URL from your configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Default auth options with explicit baseUrl
const defaultAuthOptions: AuthOptions = {
  environment: process.env.TEST_ENV || 'local',
  userRole: 'default',
  baseUrl: BASE_URL // Explicitly pass baseUrl to the auth session
}

// Create fixtures as usual
const fixtures = createAuthFixtures()

export const test = base.extend({
  authOptions: [defaultAuthOptions, { option: true }]
  // ... other fixtures
})
```

### Use the Auth Session in Your Tests

#### Cookie-Based Authentication

This library supports cookie-based authentication, which is more secure and aligns with standard web practices. When using the auth session with a server that validates cookies:

```typescript
// Example test using auth fixtures with cookie-based authentication
import { test } from '../support/auth/auth-fixture'

test('authenticated API request', async ({ authToken, request }) => {
  // Use the token as a cookie for API requests
  const response = await request.get('/api/protected', {
    headers: { Cookie: `seon-jwt=${authToken}` }
  })
  expect(response.status()).toBe(200)
})
```

The `authToken` fixture returns the token value extracted from the cookie set by the authentication endpoint. This approach is automatically handled by the auth provider's `extractToken` method, which extracts the token value from the Playwright storage state.

test('authenticated UI test', async ({ page }) => {
// The page is already authenticated!
await page.goto('/protected-area')
await expect(page.locator('h1')).toHaveText('Protected Content')
})

```

// Advanced usage
const data = await response.json()

    // 4. Create a storage state object (supports both API and browser testing)
    const storageState: Record<string, unknown> = {
      // For API testing with a simple token
      token: data.access_token,
      // For UI testing, you might include cookies or localStorage
      // cookies: [...],
      // origins: [...]
    }

    // 5. Save the token using AuthSessionManager for better caching and reliability
    const authManager = AuthSessionManager.getInstance({
      debug: true,
      storageDir: path.dirname(tokenPath)
    })

    authManager.saveToken(JSON.stringify(storageState))

    return storageState

}

async getToken(request, options = {}) {
// Use our own methods to ensure consistency
const environment = this.getEnvironment(options)
const userRole = this.getUserRole(options)
// Use the utility functions to get standardized paths
const tokenPath = getTokenFilePath({
environment,
userRole
})
// Check if we already have a valid token using the core utility
// Add custom logging for this provider implementation
console.log(`[Custom Auth] Checking for existing token at ${tokenPath}`)
}

```

### Using Multiple User Roles in Tests

Test with different user personas to cover various access patterns:

```typescript
import { test } from '@playwright/test'
import { createAuthFixtures } from './auth/fixtures'

// Define role-specific test objects
const userTest = test.extend({
  ...createAuthFixtures({ userRole: 'user' })
})

const adminTest = test.extend({
  ...createAuthFixtures({ userRole: 'admin' })
})

// Test with different roles
userTest('Regular users see limited dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText('User Dashboard')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Admin Panel' })
  ).not.toBeVisible()
})

adminTest('Admins can access advanced features', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: 'Admin Panel' })).toBeVisible()
  await page.getByRole('link', { name: 'User Management' }).click()
  await expect(
    page.getByRole('heading', { name: 'User Management' })
  ).toBeVisible()
})

// Multi-role testing in a single test
test('Complex user journey across roles', async ({
  browser,
  request,
  authOptions
}) => {
  // Create contexts for different user roles
  const contexts = await Promise.all([
    createAuthContext(browser, request, { ...authOptions, userRole: 'admin' }),
    createAuthContext(browser, request, { ...authOptions, userRole: 'user' })
  ])

  const [adminContext, userContext] = contexts
  const adminPage = await adminContext.newPage()
  const userPage = await userContext.newPage()

  // Run parallel workflows to test interactions between roles
  await Promise.all([
    // Admin workflow
    (async () => {
      await adminPage.goto('/admin/users')
      await adminPage.getByRole('button', { name: 'Create User' }).click()
      // Create a new test user
    })(),

    // User workflow
    (async () => {
      await userPage.goto('/dashboard')
      // Verify user-specific content
    })()
  ])

  // Clean up
  await Promise.all(contexts.map((context) => context.close()))
})
```

### Dynamic Role Selection

For more maintainable role-based testing, create a helper function that dynamically selects the appropriate role:

```typescript
// auth-helpers.ts
import { Browser, BrowserContext, Request } from '@playwright/test'
import { getToken, getStorageStatePath } from './auth'

// Create an authenticated context for any role
async function createAuthContext(
  browser: Browser,
  request: Request,
  options: { userRole: string; environment?: string }
): Promise<BrowserContext> {
  // Get token for the specified role
  await getToken(request, options)

  // Create browser context with the role's storage state
  return browser.newContext({
    storageState: getStorageStatePath(options)
  })
}

// Use in tests for flexible role switching
test('Role-based testing', async ({ browser, request }) => {
  // Create context for any role dynamically
  const adminContext = await createAuthContext(browser, request, {
    userRole: 'admin'
  })
  const adminPage = await adminContext.newPage()

  // Test admin-specific functionality
  await adminPage.goto('/admin')
  await expect(adminPage.getByText('Admin Dashboard')).toBeVisible()

  await adminContext.close()
})
import { adminTest } from '../fixtures/role-fixtures'

adminTest('admin can access settings', async ({ authToken, request }) => {
  // This uses the admin token
  const response = await request.get('/api/admin/settings', {
    headers: { Cookie: `seon-jwt=${authToken}` }
  })

  expect(response.ok()).toBeTruthy()
})

// Use user fixture for user-only tests
import { userTest } from '../fixtures/role-fixtures'

userTest('regular user profile access', async ({ authToken, request }) => {
  // This uses the user token
  const response = await request.get('/api/profile', {
    headers: { Cookie: `seon-jwt=${authToken}` }
  })

  expect(response.ok()).toBeTruthy()
})
```

#### 3. Testing Interactions Between Multiple Roles in a Single Test

Sometimes you need to test how different user roles interact with each other. Our authentication library makes this easy by allowing you to explicitly request tokens for different roles within the same test:

```typescript
// example of testing multiple roles in a single test
import { test, expect } from '../support/fixtures'
import { chromium } from '@playwright/test'

test('admin and regular user interaction', async ({ page, request }) => {
  // Get tokens for different roles
  const adminToken = await test.step('Get admin token', async () => {
    return getAuthToken(request, { userRole: 'admin' })
  })

  const userToken = await test.step('Get user token', async () => {
    return getAuthToken(request, { userRole: 'user' })
  })

  // Use tokens for API requests
  const adminResponse = await request.get('/api/admin-only-resource', {
    headers: { Cookie: `seon-jwt=${adminToken}` }
  })
  expect(adminResponse.ok()).toBeTruthy()

  const userResponse = await request.get('/api/user-resource', {
    headers: { Cookie: `seon-jwt=${userToken}` }
  })
  expect(userResponse.ok()).toBeTruthy()

  // For browser testing, you can create multiple contexts
  const browser = await chromium.launch()

  // Admin browser context
  const adminContext = await browser.newContext()
  await applyAuthToContext(adminContext, { userRole: 'admin' })
  const adminPage = await adminContext.newPage()

  // User browser context
  const userContext = await browser.newContext()
  await applyAuthToContext(userContext, { userRole: 'user' })
  const userPage = await userContext.newPage()

  // Now you can interact with both contexts
  await adminPage.goto('/admin-dashboard')
  await userPage.goto('/user-profile')

  // Test interactions between the two roles
  // ...

  // Clean up
  await adminContext.close()
  await userContext.close()
  await browser.close()
})
```

This approach is much simpler than Playwright's built-in solution because:

1. **No manual storage state files** - Our library manages token storage automatically
2. **Consistent API** - Same approach works for both API and UI testing
3. **Type safety** - All functions have proper TypeScript types
4. **Explicit role naming** - Uses semantic role names instead of file paths

You can easily extend this pattern to create Page Object Models with role-specific authentication already applied.

### Ephemeral User Authentication

In some testing scenarios, particularly when testing with temporary test users or in parallel test environments, you may want to apply authentication without persisting tokens to disk. The auth-session library provides a dedicated utility for this purpose:

```typescript
import { applyUserCookiesToBrowserContext } from '@seontechnologies/playwright-utils/auth-session'
import { createTestUser } from '../support/user-factory'

test.describe('ephemeral user tests', () => {
  let adminUser
  let readUser

  test.beforeAll(async () => {
    // Create temporary test users
    adminUser = await createTestUser({ role: 'admin' })
    readUser = await createTestUser({ role: 'read' })
  })

  test.beforeEach(async ({ context }) => {
    // Apply admin user authentication to browser context
    await applyUserCookiesToBrowserContext(context, adminUser)
  })

  test('admin can access restricted features', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible()
  })

  test('read user has limited access', async ({ context, page }) => {
    // Override with read-only user for this specific test
    await applyUserCookiesToBrowserContext(context, readUser)

    await page.goto('/dashboard')
    await expect(
      page.getByRole('button', { name: 'Add Item' })
    ).not.toBeVisible()
  })
})
```

#### How Ephemeral Authentication Works

1. The `applyUserCookiesToBrowserContext` utility extracts authentication cookies from the user data
2. It applies these cookies directly to the Playwright browser context
3. No tokens or cookies are written to the filesystem
4. Each test can use different user credentials without persisting state

This approach is particularly useful for:

- Testing with temporary users created just for tests
- Parallel testing where each worker needs independent authentication
- Tests that require switching between different user roles

### UI Testing with Browser Context

This functionality is already built in and requires no additional code:

````typescript
// No special setup needed - auth is automatically applied
test('authenticated UI test', async ({ page }) => {
  // The page is already authenticated!
  await page.goto('/dashboard')

  // Verify authenticated content is visible
  await expect(page.locator('h1')).toContainText('Welcome Back')
})

#### Custom Authentication Provider

For specialized authentication needs, the custom provider becomes the source of truth for environment and role information.

#### Understanding the Options Flow for Auth Provider Methods

The `AuthProvider` interface methods (like `getEnvironment` and `getUserRole`) accept options parameters that might seem confusing at first. Here's how these options are passed:

1. **In Test Files**: When you call methods on the auth fixture:
   ```typescript
   test('example', async ({ auth }) => {
     // This passes options to getEnvironment() internally
     await auth.useEnvironment('staging');

     // This passes options to getUserRole() internally
     await auth.useRole('admin');
   });
````

2. **Direct API Calls**: When directly calling API functions with options:

   ```typescript
   // Passes options to both getEnvironment() and getUserRole()
   const token = await getAuthToken(request, {
     environment: 'staging',
     userRole: 'admin'
   })
   ```

3. **Default Values**: When no options are explicitly passed, the auth provider should fall back to sensible defaults:
   ```typescript
   // Priority order in getEnvironment():
   // 1. Options passed from test/API (auth.useEnvironment() or direct API call)
   // 2. Environment variables (process.env.TEST_ENV)
   // 3. Default value ('local')
   return options.environment || process.env.TEST_ENV || 'local'
   ```

Understanding this flow helps you implement a robust custom auth provider that works consistently across different usage patterns.

#### OAuth2 Example

Here's how to implement OAuth2 authentication in your custom auth provider:

```typescript
// Inside your custom-auth-provider.ts
import { getEnvironment, getUserRole } from './auth-helpers'

const myCustomProvider: AuthProvider = {
  // Standard methods for environment and role
  getEnvironment(options = {}) {
    return getEnvironment(options)
  },
  getUserRole(options = {}) {
    return getUserRole(options)
  },
	getEnvironment(options = {}) { ... },
	getUserRole(options = {}) { ... },

	// OAuth2-specific token retrieval
	async getToken(request, options = {}) {
		const environment = this.getEnvironment(options)
		const userRole = this.getUserRole(options)

		// Get token path using utility function
		const tokenPath = getTokenFilePath({
			environment,
			userRole,
			tokenFileName: 'oauth-token.json'
		})

		// Check for existing valid token
		const existingToken = loadTokenFromStorage(tokenPath)
		if (existingToken && !isTokenExpired(existingToken)) {
			return existingToken
		}

		// Initialize storage if needed
		authStorageInit({ environment, userRole })

		// Get OAuth config from environment or defaults
		const oauthConfig = {
			clientId: process.env.OAUTH_CLIENT_ID || 'client-id',
			clientSecret: process.env.OAUTH_CLIENT_SECRET || 'client-secret',
			tokenUrl: process.env.OAUTH_TOKEN_URL || 'http://localhost:3000/oauth/token',
			scope: process.env.OAUTH_SCOPE || 'read write'
		}

		// Request a new token using client credentials flow
		const response = await request.post(oauthConfig.tokenUrl, {
			form: {
				grant_type: 'client_credentials',
				client_id: oauthConfig.clientId,
				client_secret: oauthConfig.clientSecret,
				scope: oauthConfig.scope
			},
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		})

		const data = await response.json()
		const token = data.access_token

		// Save token with metadata using core utility
		saveTokenToStorage(
			tokenPath,
			token,
			{
				environment,
				userRole,
				expiresAt: Date.now() + (data.expires_in * 1000 || 3600000),
				scope: data.scope
			},
			true // Debug mode
		)

		return token
	},

	// Rest of the methods...
}
```

#### Token Pre-fetching

For improved test performance, pre-fetch tokens during global setup:

```typescript
// global-setup.ts
import {
  authStorageInit,
  configureAuthSession,
  setAuthProvider,
  authGlobalInit
} from './auth'
import myCustomProvider from './custom-auth-provider'

async function globalSetup() {
  // Initialize storage
  authStorageInit()

  // Configure basic settings
  configureAuthSession({
    environment: process.env.TEST_ENV || 'local',
    userRole: 'default',
    debug: true
  })

  // Set the auth provider
  setAuthProvider(myCustomProvider)

  // Pre-fetch tokens for all configured environments and roles
  // This happens once before all tests run
  await authGlobalInit()
}

export default globalSetup
```

### Parallel Testing with Worker-Specific Accounts

Playwright recommends using one account per parallel worker for tests that modify server-side state. Our authentication system naturally supports this pattern through its environment and role isolation:

```typescript
// pw/support/custom-auth-provider.ts with worker-specific accounts
import { test } from '@playwright/test'

const myCustomProvider = {
  // Use parallelIndex to determine the user role
  getUserRole(options = {}) {
    // If a specific role is requested, use it; otherwise, use the worker index
    if (options.userRole) {
      return options.userRole
    }

    // Get the worker's parallel index (or default to 0 if not available)
    const workerIndex = test.info().parallelIndex ?? 0
    return `worker-${workerIndex}`
  },

  // Get token based on the worker-specific role
  async getToken(request, options = {}) {
    const userRole = this.getUserRole(options)

    // This will automatically use a separate token file for each worker
    // The rest of the implementation remains the same

    // When fetching a token, you can use different credentials per worker:
    const accounts = [
      { username: 'worker0@example.com', password: 'pass0' },
      { username: 'worker1@example.com', password: 'pass1' }
      // Add more accounts as needed for your parallel workers
    ]

    // Extract the worker number from the role
    const workerNumber = parseInt(userRole.replace('worker-', '')) || 0
    const account = accounts[workerNumber % accounts.length]

    // Use the worker-specific account for authentication
    const response = await request.post('/auth/token', {
      data: {
        username: account.username,
        password: account.password
      }
    })

    // Process and return the token...
  }
}
```

With this approach:

1. Each worker automatically gets its own storage file based on the worker index
2. No special fixtures or config changes are needed - it's handled by our provider architecture
3. Tests in the same worker reuse the authentication state
4. Different workers use different accounts

This implementation is more elegant than Playwright's approach because:

- No need to create separate per-worker fixtures
- No manual management of storage state files
- The provider architecture handles all the complexity
- The same approach works in both UI Mode and normal test mode

### Testing Unauthenticated States

There are several approaches to test unauthenticated scenarios:

##### Playwright's Built-in Approach

Playwright's documentation shows this approach for testing without authentication:

```typescript
// Playwright's approach - Reset storage state for specific tests

// Method 1: Use empty storage state for a specific test
test('not signed in test', async ({ browser }) => {
  // Create a new context with no storage state (i.e., no authentication)
  const context = await browser.newContext()
  const page = await context.newPage()
  // Test runs without any authentication state
  await context.close()
})

// Method 2: Use empty storage state for a group of tests
test.describe('unauthenticated tests', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('not signed in test', async ({ page }) => {
    // Test runs without any authentication state
  })
})
```

##### Our Enhanced Approach

Our library offers more flexibility and control over authentication states:

```typescript
// Our approach - Option 1: Clear specific token
test('test with cleared token', async ({ request }) => {
  // Clear just the token for the current environment/role
  clearAuthToken()

  // OR clear for specific environment/role
  clearAuthToken({ environment: 'staging', userRole: 'admin' })

  // Now make unauthenticated requests
  const response = await request.get('/api/public-resource')
})

// Our approach - Option 2: For browser tests, test-level config
test.describe('unauthenticated browser tests', () => {
  // Skip the auth fixture for this group
  test.useOptions({ auth: false })

  test('unauthenticated test', async ({ page }) => {
    // Page will load without authentication
  })
})
```

**Advantages over Playwright's approach**

1. **Granular control** - Clear specific tokens instead of all storage state
2. **Environment/role awareness** - Target specific test configurations
3. **API + UI flexibility** - Works for both API and browser tests
4. **Runtime control** - Clear tokens during test execution, not just at setup
5. **Multiple modes** - Test both authenticated and unauthenticated states in the same file

This makes it much easier to test complex authentication scenarios like authenticated session timeouts, partial authentication, or mixed authenticated/unauthenticated user journeys.

### Storage/\*_ Options for the auth session _/

export type AuthSessionOptions = AuthIdentifiers & {
/\*\* Root directory for auth session storage (default: process.cwd()/.auth)

- Note: The environment and user role will be appended to this path by the provider _/
  storageDir?: string
  /\*\* Token filename (default: storage-state.json) _/
  tokenFileName?: string
  /** Cookie name to use for authentication (default: auth-token) \*/
  cookieName?: string
  /** Custom token data formatter to control how tokens are saved _/
  tokenDataFormatter?: TokenDataFormatter
  /\*\* Debug mode (default: false) _/
  debug?: boolean
  }

/\*\*

- Full auth configuration that extends the base identifiers
- Includes URLs and additional configuration beyond just identifiers
  \*/
  export type AuthOptions = AuthIdentifiers & {
  /\*\* Base URL to use for the browser context (the application URL)
  - This is a critical parameter for enabling proper page navigation with relative URLs.
  - IMPORTANT: You must set this parameter to ensure that page.goto('/') works correctly
  - with authenticated pages. The baseUrl is used to resolve relative URLs during navigation.
  -
  - If not provided, the system will attempt to determine it from these sources (in order):
  - 1.  Explicitly passed authOptions.baseUrl (recommended approach)
  - 2.  Environment variable process.env.BASE_URL
  - 3.  Playwright context options
  -
  - @default process.env.BASE_URL || environment-specific URL \*/
    baseUrl?: string

/\*\* Base URL to use for authentication requests (the auth service URL)

- This is often different from the application baseUrl
- @default process.env.AUTH_BASE_URL || environment-specific auth URL \*/
  authBaseUrl?: string
  }

All tokens are stored in the Playwright-compatible `storage-state.json` format, which can contain cookies and/or localStorage items. This consistent format works seamlessly with both API and UI testing.

When using `userIdentifier` in your authentication options, the library creates a subdirectory with that identifier inside the role directory. This allows for multiple distinct users with the same role type to have their tokens stored and managed independently.

### Session Storage Support (Extension Recipe)

> **Note**: This is an extension recipe showing how you could add session storage support to the auth system. The core library doesn't currently implement this functionality.

Playwright explicitly does not provide APIs to persist session storage, requiring custom scripts for applications that use this storage method. From the Playwright documentation:

> "Session storage is specific to a particular domain and is not persisted across page loads. Playwright does not provide API to persist session storage. However, you can use an init script to implement a custom mechanism to persist session storage."

You can extend our authentication library to handle session storage by adding these capabilities to your custom auth provider:

```typescript
// And in your getToken method, add session storage capture after authentication
// This assumes you're using a page to authenticate rather than an API request
async captureSessionStorage(page, options = {}) {
	const environment = this.getEnvironment(options);
	const userRole = this.getUserRole(options);

	// Extract session storage data
	const sessionStorage = await page.evaluate(() => {
		const data = {};
		for (let i = 0; i < window.sessionStorage.length; i++) {
			const key = window.sessionStorage.key(i);
			data[key] = window.sessionStorage.getItem(key);
		}
		return data;
	});

	// Save it alongside the token
	const sessionStoragePath = getTokenFilePath({
		environment,
		userRole,
		tokenFileName: 'session-storage.json'
	});

	fs.writeFileSync(
		sessionStoragePath,
		JSON.stringify(sessionStorage),
		'utf-8'
	);
}
```
