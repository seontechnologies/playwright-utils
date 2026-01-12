---
title: Installation
description: How to install and configure Playwright Utils
---

# Installation

## Package Installation

Install the package using npm or pnpm:

::: code-group

```bash [npm]
npm install -D @seontechnologies/playwright-utils
```

```bash [pnpm]
pnpm add -D @seontechnologies/playwright-utils
```

:::

::: tip Peer Dependency
This package requires `@playwright/test` as a peer dependency. It should already be installed in your repository.
:::

## Optional Peer Dependencies

Some utilities require additional peer dependencies:

| Utility                  | Required Package | Purpose                  |
| ------------------------ | ---------------- | ------------------------ |
| Schema Validation (JSON) | `ajv`            | JSON Schema validation   |
| Schema Validation (Zod)  | `zod`            | Zod schema validation    |
| Schema Validation (YAML) | `js-yaml`        | YAML schema file support |

Install only what you need:

```bash
# For JSON Schema validation
npm install -D ajv

# For Zod schema validation
npm install -D zod

# For YAML schema files
npm install -D js-yaml
```

## Module Format Support

This package supports both **CommonJS** and **ES Modules**:

- **CommonJS**: For projects using `require()` syntax
- **ES Modules**: For projects using `import` syntax

The package automatically detects which format to use based on your project's configuration.

## Usage Patterns

All utilities support two usage patterns:

### 1. Direct Import

```typescript
import { apiRequest, log, recurse } from '@seontechnologies/playwright-utils'

// Use directly in your tests
test('example', async ({ request }) => {
  const { body } = await apiRequest({
    request,
    method: 'GET',
    path: '/api/users'
  })
})
```

### 2. Playwright Fixtures

```typescript
import { test } from '@seontechnologies/playwright-utils/fixtures'

// Use as fixtures (no need to pass request context)
test('example', async ({ apiRequest }) => {
  const { body } = await apiRequest({
    method: 'GET',
    path: '/api/users'
  })
})
```

## Subpath Imports

Each utility can be imported individually to reduce bundle size:

```typescript
// Import specific utilities
import { apiRequest } from '@seontechnologies/playwright-utils/api-request'
import { recurse } from '@seontechnologies/playwright-utils/recurse'
import { log } from '@seontechnologies/playwright-utils/log'

// Import fixtures
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures'
import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'
```

## Merging Fixtures

Combine multiple fixture sources using Playwright's `mergeTests`:

```typescript
// playwright/support/fixtures.ts
import { mergeTests } from '@playwright/test'
import { test as apiRequestFixture } from '@seontechnologies/playwright-utils/api-request/fixtures'
import { test as networkRecorderFixture } from '@seontechnologies/playwright-utils/network-recorder/fixtures'
import { test as networkErrorMonitorFixture } from '@seontechnologies/playwright-utils/network-error-monitor/fixtures'

export const test = mergeTests(
  apiRequestFixture,
  networkRecorderFixture,
  networkErrorMonitorFixture
)

export { expect } from '@playwright/test'
```

Then use in your tests:

```typescript
import { test, expect } from '../support/fixtures'

test('my test', async ({ apiRequest, networkRecorder, page }) => {
  // All fixtures available
})
```

::: tip TypeScript Autocomplete
When using merged fixtures, your IDE will provide autocomplete for all fixture properties (`apiRequest`, `networkRecorder`, etc.) in your test parameters.
:::

## Next Steps

- [API Request](/api-request) - HTTP client with schema validation
- [Auth Session](/auth-session) - Authentication management
- [Network Recorder](/network-recorder) - HAR-based recording/playback
