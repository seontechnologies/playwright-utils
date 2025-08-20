# Burn-in Test Runner

A smart test burn-in utility for Playwright that intelligently filters which tests to run based on file changes, reducing unnecessary test execution while maintaining reliability.

## The Problem

Playwright's built-in `--only-changed` feature triggers all affected tests when common files change, leading to:

- **Excessive test runs**: Changes to widely-used files like `featureFlags.ts` or helper utilities trigger hundreds of unnecessary tests
- **Slow CI/CD pipelines**: Full test suites run even for minor configuration changes

## The Solution

The burn-in utility provides **intelligent test filtering** using TypeScript configuration:

- **Config files** (`skipBurnInPatterns`) → Skip entirely
- **Helper files** (`commonBurnInPatterns`) → Run tests with @smoke tag or a configurable percentage (default 50% on CI, 100% locally)
- **Test files** → Run only those tests
- **Source code** → Use run-all mode

## Installation & Usage

### Create Burn-in Script

Create `scripts/burn-in-changed.ts`:

```typescript
import { runBurnIn } from '@seontechnologies/playwright-utils/burn-in'

async function main() {
  await runBurnIn()
}

main().catch(console.error)
```

If working with a monorepo, or you have named default folders differently, the location is customizable.

The base branch is also customizable.

```typescript
await runBurnIn({
  configPath: './playwright-tests/config/.burn-in.config.ts',
  baseBranch: 'master'
})
```

### Package.json Script

Recommended to use `tsx` to run the script: `npm i -D tsx` at your repository.

```json
{
  "scripts": {
    "test:pw:burn-in-changed": "tsx playwright/scripts/burn-in-changed.ts"
  }
}
```

### Create a Configuration File

The utility looks for `.burn-in.config.ts` in several locations (in order of preference):

1. `config/.burn-in.config.ts` (recommended - keeps configs organized)
2. `.burn-in.config.ts` (project root)
3. `burn-in.config.ts` (project root)
4. `playwright/.burn-in.config.ts` (playwright folder)

Manually create a configuration file to customize behavior.

```typescript
import type { BurnInConfig } from '@seontechnologies/playwright-utils/burn-in'

const config: BurnInConfig = {
  // Files that should trigger smart burn-in
  // Best Practice: Consolidate commonly used utilities under fewer folders
  // This reduces pattern complexity and encourages better code organization
  commonBurnInPatterns: [
    '**/support/**', // Recommended: move commonly used utilities here
    '**/utils/**' // Alternative: keep minimal shared utilities

    // Avoid too many patterns - consider reorganizing your code instead:
    // '**/fn-helpers/**',   // → Move to support/
    // '**/pageObjects/**',  // → Move to support/
    // '**/fixtures/**',     // → Move to support/
    // '**/api-helpers/**',  // → Move to utils/
  ],
  // Files that should skip burn-in entirely
  skipBurnInPatterns: [
    '**/config/**',
    '**/configuration/**',
    '**/playwright.config.ts',
    '**/*featureFlags*',
    '**/*constants*',
    '**/*config*',
    '**/*types*',
    '**/*interfaces*',
    '**/package.json',
    '**/tsconfig.json',
    '**/*.md'
  ],
  maxDepthForRunAll: 2,
  burnIn: {
    repeatEach: process.env.CI ? 5 : 3,
    retries: process.env.CI ? 1 : 0
  },
  commonBurnInTestPercentage: process.env.CI ? 0.5 : 1,
  commonBurnInTestTag: '@smoke',
  maxFilesForSmartMode: 5
}

export default config
```

## Best Practices

### **Keep Common Patterns Minimal**

The fewer `commonBurnInPatterns` you have, the more effective the burn-in becomes. Instead of adding many folder patterns, **reorganize your code**:

```typescript
// ❌ Avoid: Too many scattered patterns
commonBurnInPatterns: [
  '**/fn-helpers/**',
  '**/pageObjects/**',
  '**/fixtures/**',
  '**/api-helpers/**',
  '**/test-utils/**',
  '**/shared/**'
]

// ✅ Better: Consolidate into fewer, organized folders
commonBurnInPatterns: [
  '**/support/**', // Move pageObjects, fixtures, test-utils here
  '**/utils/**' // Move fn-helpers, api-helpers here
]
```

## Troubleshooting

### Common Issues

#### 1. Too many tests still running

Adjust `maxFilesForSmartMode` or move files to appropriate patterns:

```typescript
{
  maxFilesForSmartMode: 2,
  skipBurnInPatterns: ['**/*your-config-files*'],
  commonBurnInPatterns: ['**/*your-helper-files*']
}
```

#### 2. TypeScript config not loading

Ensure `tsx` is available for `.ts` config files.
