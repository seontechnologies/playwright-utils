# Playwright Utils

A collection of utilities for Playwright tests at SEON Technologies, designed to make testing more efficient and maintainable.

All utilities can be used as Playwright fixtures by importing the test object

- [Playwright Utils](#playwright-utils)
  - [Installation](#installation)
  - [Development](#development)
    - [Testing Strategy](#testing-strategy)
  - [Available Utilities](#available-utilities)
    - [API Request](#api-request)
    - [Recurse (Polling)](#recurse-polling)
    - [Logging](#logging)
    - [Network Interception](#network-interception)
    - [Auth Session](#auth-session)
      - [Implementation Steps](#implementation-steps)
  - [Testing the Package Locally](#testing-the-package-locally)
  - [Release and Publishing](#release-and-publishing)
    - [Publishing via GitHub UI (Recommended)](#publishing-via-github-ui-recommended)
    - [Publishing Locally](#publishing-locally)

## Installation

```bash
npm i -D @seontechnologies/playwright-utils
pnpm i -D @seontechnologies/playwright-utils
```

> **Note:** This package requires `@playwright/test` as a peer dependency. It should already be installed in your repository.

## Development

```bash
# Install dependencies
npm i

# Development commands
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript checks
npm run fix:format    # Fix code formatting with Prettier
npm run test          # Run unit tests
npm run validate      # Run all the above in parallel

# Start the sample app (for testing apiRequest, recurse, auth-session)
npm run start:sample-app

# Playwright tests
npm run test:pw       # Run Playwright tests
npm run test:pw-ui    # Run Playwright tests with UI
```

### Testing Strategy

The overall testing approach:

1. **Deployed Apps Tests** - Some tests use Playwright's deployed apps to keep things familiar (`log`, `interceptNetworkCall`):

   - `playwright/tests/network-mock-original.spec.ts`
   - `playwright/tests/todo-with-logs.spec.ts`
   - `playwright/tests/network-mock-intercept-network-call.spec.ts`

1. **Sample App Tests** - The `./sample-app` provides a more complex environment to test:
   - API request automation
   - Recursion and retry patterns
   - Authentication flows
   - Future: feature flag testing, email testing, etc.

See [sample-app/README.md](./sample-app/README.md) for details on running and testing the sample app. TL, DR; `npm run start:sample-app`.

The sample app uses `"@seontechnologies/playwright-utils": "*"` in its package.json so that changes to the library are immediately available for testing without requiring republishing or package updates.

## Available Utilities

The library provides the following utilities, each with both direct function imports and Playwright fixtures:

### [API Request](./docs/api-request.md)

A typed, flexible HTTP client for making API requests in tests.

```typescript
// Direct import
import { apiRequest } from '@seon/playwright-utils'

test('example', async ({ request }) => {
  const { status, body } = await apiRequest({
    request, // need to pass in request context when using this way
    method: 'GET',
    path: '/api/users/123'
  })
})

// As a fixture
import { test } from '@seon/playwright-utils/fixtures'
// or use your own main fixture (with mergeTests) and import from there

test('example', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/api/users/123'
  })
})
```

[→ API Request Documentation](./docs/api-request.md)

### [Recurse (Polling)](./docs/recurse.md)

A powerful polling utility for waiting on asynchronous conditions.

```typescript
// note that there is no need to pass in request or page context from Playwright

// Direct import
import { recurse } from 'playwright-utils/recurse'

test('example', async ({}) => {
  const result = await recurse(
    () => fetchData(),
    (data) => data.status === 'ready',
    { timeout: 30000 }
  )
})

// As a fixture
import { test } from '@seon/playwright-utils/fixtures'
// or use your own main fixture (with mergeTests) and import from there

test('example', async ({ recurse }) => {
  const result = await recurse({
    command: () => fetchData(),
    predicate: (data) => data.status === 'ready',
    options: { timeout: 30000 }
  })
})
```

[→ Recurse Documentation](./docs/recurse.md)

### [Logging](./docs/log.md)

A specialized logging utility that integrates with Playwright's test reports.

```typescript
// Direct import
import { log } from '@seon/playwright-utils'

await log.info('Information message')
await log.step('Starting a new test step')
await log.error('Something went wrong', false) // Disable console output
```

```typescript
// As a fixture
import { test } from '@seon/playwright-utils/log/fixtures'

test('example', async ({ log }) => {
  await log({
    message: 'Starting test',
    level: 'step'
  })
})
```

[→ Logging Documentation](./docs/log.md)

### [Network Interception](./docs/intercept-network-call.md)

A powerful utility for intercepting, observing, and mocking network requests in Playwright tests.

```typescript
// Direct import
import { interceptNetworkCall } from '@seon/playwright-utils'

test('Spy on the network', async ({ page }) => {
  // Set up the interception before navigating
  const networkCall = interceptNetworkCall({
    page,
    method: 'GET', // GET is optional
    url: '**/api/users'
  })

  await page.goto('/users-page')

  // Wait for the intercepted response and access the result
  const { responseJson, status } = await networkCall

  expect(responseJson.length).toBeGreaterThan(0)
  expect(status).toBe(200)
})
```

```typescript
// As a fixture
import { test } from '@seon/playwright-utils/fixtures'

test('Stub the network', async ({ page, interceptNetworkCall }) => {
  // With fixture, you don't need to pass the page object
  const mockResponse = interceptNetworkCall({
    method: 'GET',
    url: '**/api/users',
    fulfillResponse: {
      status: 200,
      body: { data: [{ id: 1, name: 'Test User' }] }
    }
  })

  await page.goto('/users-page')

  // Wait for the intercepted response
  await mockResponse

  expect(responseJson.data[0].name).toBe('Test User')
})
```

```typescript
// Conditional request handling
test('Modify responses', async ({ page, interceptNetworkCall }) => {
  await interceptNetworkCall({
    url: '/api/data',
    handler: async (route, request) => {
      if (request.method() === 'POST') {
        // Handle POST requests
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        })
      } else {
        // Continue with other requests
        await route.continue()
      }
    }
  })
})
```

[→ Network Interception Documentation](./docs/intercept-network-call.md)

### [Auth Session](./docs/auth-session.md)

A robust authentication session management system for Playwright tests that persists tokens between test runs:

- Significantly faster tests with persistent token storage
- Role-based authentication support
- Environment-specific configuration
- Support for both UI and API testing
- Session storage management

#### Implementation Steps

1. **Configure Global Setup** - Create `playwright/support/global-setup.ts` and add it to your Playwright config
   - Sets up authentication storage and initializes the auth provider
   - Nearly identical across all applications

```typescript
// 1. Configure Global Setup (playwright/support/global-setup.ts)
import {
  authStorageInit,
  setAuthProvider,
  configureAuthSession,
  authGlobalInit
} from '@seontechnologies/playwright-utils/auth-session'
import myCustomProvider from './auth/custom-auth-provider'

async function globalSetup() {
  // Ensure storage directories exist
  authStorageInit()

  // STEP 1: Configure auth storage settings
  configureAuthSession({
    // store auth tokens anywhere you want, and remember to gitignore the directory
    authStoragePath: process.cwd() + '/playwright/auth-sessions',
    debug: true
  })

  // STEP 2: Set up custom auth provider
  // This defines HOW authentication tokens are acquired and used
  setAuthProvider(myCustomProvider)

  // Optional: pre-fetch all tokens in the beginning
  await authGlobalInit()
}

export default globalSetup
```

> **⚠️ IMPORTANT:** The order of function calls in your global setup is critical. Always register your auth provider with `setAuthProvider()` after configuring the session. This ensures the auth provider is properly initialized.

1. **Create Auth Fixture** - Add `playwright/support/auth/auth-fixture.ts` to your merged fixtures

   - Provides standardized Playwright test fixtures for authentication
   - Generally reusable across applications without modification
   - **CRITICAL: Register auth provider early to ensure it's always available**

```typescript
// 1. Create Auth Fixture (playwright/support/auth/auth-fixture.ts)
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions,
  type AuthFixtures,
  setAuthProvider // Import the setAuthProvider function
} from '@seontechnologies/playwright-utils/auth-session'

// Import your custom auth provider
import myCustomProvider from './custom-auth-provider'

// Register the auth provider early
setAuthProvider(myCustomProvider)

export const test = base.extend<AuthFixtures>({
  // For authOptions, we need to define it directly using the Playwright array format
  authOptions: [defaultAuthOptions, { option: true }],

  // Use the other fixtures directly
  ...createAuthFixtures()
// In your tests, use the auth token
test('authenticated API request', async ({ authToken, request }) => {
  const response = await request.get('https://api.example.com/protected', {
    headers: { Authorization: `Bearer ${authToken}` }
  })

  expect(response.ok()).toBeTruthy()
})

// 1. Create Auth Fixture - Add `playwright/support/auth/auth-fixture.ts` to your merged fixtures

// 2. Create Custom Auth Provider - Implement token management with modular utilities:

```typescript
// playwright/support/auth/custom-auth-provider.ts
import {
  type AuthProvider,
  authStorageInit,
  getTokenFilePath,
  saveStorageState
} from '@seontechnologies/playwright-utils/auth-session'
import { log } from '@seontechnologies/playwright-utils/log'
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

  // Extract cookies from token data for browser context
  extractCookies,

  // Check if token is expired
  isTokenExpired,

  // Main token management method
  async manageAuthToken(request, options = {}) {
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      tokenFileName: 'storage-state.json'
    })

    // Check for existing valid token
    const validToken = await checkTokenValidity(tokenPath)
    if (validToken) return validToken

    // Initialize storage and acquire new token if needed
    authStorageInit({ environment, userRole })
    const storageState = await acquireToken(
      request,
      environment,
      userRole,
      options
    )

    // Save and return the new token
    saveStorageState(tokenPath, storageState)
    return storageState
  },

  // Clear token when needed
  clearToken(options = {}) {
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

// 3. Use the Auth Session in Your Tests

// 1. Update Your Playwright Config

// 2. Configure Authentication Options

// Usage in your tests
import { test } from '../support/auth/auth-fixture'

test('access protected resources', async ({ page, authToken }) => {
  // API calls with token
  const response = await request.get('/api/protected', {
    headers: { Authorization: `Bearer ${authToken}` }
  })

  // Or use the pre-authenticated page
  await page.goto('/protected-area')
})

// Ephemeral user authentication
import { applyUserCookiesToBrowserContext } from '@seontechnologies/playwright-utils/auth-session'

test('ephemeral user auth', async ({ context, page }) => {
  // Apply user auth directly to browser context (no disk persistence)
  const user = await createTestUser({ role: 'admin' })
  await applyUserCookiesToBrowserContext(context, user)

  // Page is now authenticated with the user's token
  await page.goto('/protected-page')
})
```

[→ Auth Session Documentation](./docs/auth-session.md)

## Testing the Package Locally

```bash
# Build the package
npm run build

# Create a tarball package
npm pack

# Install in a target repository
# For npm projects:
npm install /path/to/playwright-utils-1.0.0.tgz

# For pnpm projects:
pnpm add file:/path/to/playwright-utils-1.0.0.tgz
```

## Release and Publishing

This package is published to the GitHub Packages registry under the `@seontechnologies` scope.

### Publishing via GitHub UI (Recommended)

You can trigger a release directly from GitHub's web interface:

1. Go to the repository → Actions → "Publish Package" workflow
2. Click "Run workflow" button (dropdown on the right)
3. Select options in the form:
   - **Branch**: main
   - **Version type**: patch/minor/major/custom
   - **Custom version**: Only needed if you selected "custom" type
4. Click "Run workflow"

**Important**: You must review and merge the PR to complete the process

### Publishing Locally

You can also publish the package locally using the provided script:

```bash
# 1. If not already set, set your GitHub token as an environment variable
export GITHUB_TOKEN=your_personal_access_token

# 2. Run the publish script
npm run publish:local
```
