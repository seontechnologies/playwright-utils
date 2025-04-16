# Playwright Utils

A collection of utilities for Playwright tests at SEON Technologies, designed to make testing more efficient and maintainable.

All utilities can be used as Playwright fixtures by importing the test object

- [Playwright Utils](#playwright-utils)
  - [Installation](#installation)
  - [Development](#development)
  - [Available Utilities](#available-utilities)
    - [API Request](#api-request)
    - [Recurse (Polling)](#recurse-polling)
    - [Logging](#logging)
    - [Network Interception](#network-interception)
  - [Testing the Package Locally](#testing-the-package-locally)
  - [Release and Publishing](#release-and-publishing)
    - [Publishing via GitHub UI (Recommended)](#publishing-via-github-ui-recommended)
    - [Publishing from Tags](#publishing-from-tags)
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

# Playwright tests
npm run test:pw       # Run Playwright tests
npm run test:pw-ui    # Run Playwright tests with UI
```

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

test('example', async ({ page }) => {
  // Set up an interception - returns a Promise that resolves when the network call is made
  const networkCall = interceptNetworkCall({
    page,
    method: 'GET',
    url: '/api/users',
    fulfillResponse: {
      status: 200,
      body: { data: [{ id: 1, name: 'Test User' }] }
    }
  })

  // Navigate to page that will trigger the network call
  await page.goto('/users')

  // Await the network call and access the result
  const { responseJson, status } = await networkCall

  // With type assertion for strongly typed access
  const {
    responseJson: { data }
  } = (await networkCall) as { responseJson: { data: User[] } }

  // Conditional request handling
  await interceptNetworkCall({
    page,
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

// As a fixture
import { test } from '@seon/playwright-utils/fixtures'

test('example', async ({ page, interceptNetworkCall }) => {
  // With fixture, you don't need to pass the page object
  const userDataCall = interceptNetworkCall({
    method: 'GET',
    url: '/api/users',
    fulfillResponse: {
      status: 200,
      body: { data: [] }
    }
  })

  await page.goto('/')
  await userDataCall // Wait for the network call to complete
})
```

[→ Network Interception Documentation](./docs/intercept-network-call.md)

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

This will automatically:

- Bump the version according to your selection
- Build and publish the package
- Create a git tag and commit
- Push everything back to the repository

### Publishing from Tags

The package is automatically published when a new version tag is pushed to GitHub:

```bash
# Switch to main branch and ensure it's up to date
git checkout main
git pull

# Manually update the version at package.json

# Create an annotated tag with the version number
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push the tag to GitHub to trigger the publish workflow
git push origin v1.0.0
```

### Publishing Locally

You can also publish the package locally using the provided script:

```bash
# 1. If not already set, set your GitHub token as an environment variable
export GITHUB_TOKEN=your_personal_access_token

# 2. Run the publish script and follow the prompts
npm run publish:local
```

The script will guide you through:

- Selecting a version type (patch/minor/major/custom/date-based)
- Building the package
- Publishing to GitHub Packages
- Creating a git tag and commit
