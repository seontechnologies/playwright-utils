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

2. **Sample App Tests** - The `./sample-app` provides a more complex environment to test:
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

  // STEP 1: Configure minimal auth storage settings
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

2. **Create Auth Fixture** - Add `playwright/support/auth/auth-fixture.ts` to your merged fixtures

   - Provides standardized Playwright test fixtures for authentication
   - Generally reusable across applications without modification

```typescript
// 2. Create Auth Fixture (playwright/support/auth/auth-fixture.ts)
import { test as base } from '@playwright/test'
import {
  createAuthFixtures,
  type AuthOptions,
  type AuthFixtures
} from '@seontechnologies/playwright-utils/auth-session'

// Default auth options using the current environment
const defaultAuthOptions: AuthOptions = {
  environment: process.env.TEST_ENV || 'local',
  userRole: 'default'
}

// Get the fixtures from the factory function
const fixtures = createAuthFixtures()

// Export the test object with auth fixtures
export const test = base.extend<AuthFixtures>({
  // For authOptions, we need to define it directly using the Playwright array format
  authOptions: [defaultAuthOptions, { option: true }],

  // Use the other fixtures directly
  authToken: fixtures.authToken,
  context: fixtures.context,
  page: fixtures.page
})
```

3. **Implement Custom Auth Provider** - Create `playwright/support/auth/custom-auth-provider.ts`
   - Application-specific implementation with your custom token acquisition logic
   - The main customization point where you implement your auth flow

```typescript
// 3. Implement Custom Auth Provider (playwright/support/auth/custom-auth-provider.ts)
import {
  type AuthProvider,
  loadTokenFromStorage,
  saveTokenToStorage,
  getTokenFilePath,
  authStorageInit
} from '@seontechnologies/playwright-utils/auth-session'
import { acquireToken } from './acquire-token'

const myCustomProvider: AuthProvider = {
  // Get environment from options, env vars or default
  getEnvironment(options = {}) {
    return options.environment || process.env.TEST_ENV || 'local'
  },

  // Get user role based on environment and options
  getUserRole(options = {}) {
    const environment = this.getEnvironment(options)
    let defaultRole = 'regular'
    if (environment === 'staging') defaultRole = 'tester'
    if (environment === 'production') defaultRole = 'readonly'
    return options.userRole || process.env.TEST_USER_ROLE || defaultRole
  },

  /**
   * Manage the complete authentication token lifecycle
   * This method handles the entire token management process
   */
  async manageAuthToken(request, options = {}) {
    // Get environment and role consistently
    const environment = this.getEnvironment(options)
    const userRole = this.getUserRole(options)
    const tokenPath = getTokenFilePath({
      environment,
      userRole,
      tokenFileName: 'custom-auth-token.json'
    })

    // STEP 1: Check for existing token first
    const existingToken = loadTokenFromStorage(tokenPath, true)
    if (existingToken) {
      return existingToken
    }

    // STEP 2: Initialize storage directories if needed
    authStorageInit({ environment, userRole })

    // STEP 3: Acquire a new token using our custom auth flow
    const token = await acquireToken(request, environment, userRole, options)

    // STEP 4: Save the token with metadata for future reuse
    saveTokenToStorage(
      tokenPath,
      token,
      { environment, userRole, source: 'custom-provider' },
      true
    )
    return token
  }

  // Other required methods - applyToBrowserContext, clearToken...
}

export default myCustomProvider
```

4. **Use the Auth Session in Your Tests**

```typescript
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
