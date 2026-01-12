---
title: Burn-in Testing
description: Smart test burn-in utility with intelligent filtering based on file changes
---

# Burn-in Test Runner

A smart test burn-in utility for Playwright that intelligently filters which tests to run based on file changes, reducing unnecessary test execution while maintaining reliability.

- [Burn-in Test Runner](#burn-in-test-runner)
  - [The Problem](#the-problem)
  - [The Solution](#the-solution)
  - [Installation \& Usage](#installation--usage)
    - [Create Burn-in Script](#create-burn-in-script)
    - [Package.json Script](#packagejson-script)
    - [Create a Configuration File](#create-a-configuration-file)
  - [Debugging and Troubleshooting](#debugging-and-troubleshooting)
    - [Debug Mode](#debug-mode)
    - [Common Issues and Solutions](#common-issues-and-solutions)
      - [1. Config File Not Found](#1-config-file-not-found)
      - [2. Patterns Not Matching](#2-patterns-not-matching)
  - [Best Practices](#best-practices)
    - [**Organize Code to Avoid Accidental Skips**](#organize-code-to-avoid-accidental-skips)
  - [CI Integration](#ci-integration)
    - [GitHub Actions Integration](#github-actions-integration)
      - [Step 1: Create Your Burn-in Workflow](#step-1-create-your-burn-in-workflow)
      - [Step 2: Create Your E2E Workflow](#step-2-create-your-e2e-workflow)
    - [How It Works](#how-it-works)
    - [Key Configuration Points](#key-configuration-points)

## The Problem

Playwright's built-in `--only-changed` feature triggers all affected tests when any file changes, leading to:

- **Excessive test runs**: Changes to config files or type definitions trigger hundreds of tests unnecessarily
- **Slow CI/CD pipelines**: Full test suites run even for changes that don't affect test behavior
- **No volume control**: It's all or nothing - you can't run a subset for safety

## The Solution

The burn-in utility uses custom dependency analysis with two simple controls:

1. **Build dependency graph** via `madge` and map changed files to affected tests (direct and transitive imports). This is more precise than `--only-changed` because it follows real dependency edges instead of assuming every touched file should trigger all tests.

2. **Skip patterns** (`skipBurnInPatterns`) → Files that should never trigger tests (configs, types, docs)
3. **Volume control** (`burnInTestPercentage`) → Run a percentage of affected tests after dependency analysis

> Under the hood, dependency analysis uses `madge` to build a project-wide import graph (including type imports). The burn-in runner walks that graph to find tests that directly or indirectly depend on changed files, then filters with `skipBurnInPatterns`. If dependency analysis fails, it falls back to Playwright's `--only-changed` mode.

## Installation & Usage

### Create Burn-in Script

Create `scripts/burn-in-changed.ts`:

```typescript
import { runBurnIn } from '@seontechnologies/playwright-utils/burn-in'

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const baseBranchArg = args.find((arg) => arg.startsWith('--base-branch='))
  const shardArg = args.find((arg) => arg.startsWith('--shard='))

  const options: Parameters<typeof runBurnIn>[0] = {
    // Always use the same config file - one source of truth
    configPath: 'playwright/config/.burn-in.config.ts'
    baseBranch: 'master' // if it's not main by default
  }

  if (baseBranchArg) {
    options.baseBranch = baseBranchArg.split('=')[1]
  }

  // Store shard info in environment for the burn-in runner to use
  if (shardArg) {
    process.env.PW_SHARD = shardArg.split('=')[1]
  }

  await runBurnIn(options)
}

main().catch(console.error)
```

**CLI Arguments Supported**:

- `--base-branch=main` - Specify the base branch for comparison
- `--config-path=./config/.burn-in.config.ts` - Custom config file location
- `--shard=1/2` - Apply sharding (used by CI workflows)

**Usage Examples**:

```bash
# Default usage (uses 'main' branch, auto-discovers config)
tsx scripts/burn-in-changed.ts

# Custom branch and config
tsx scripts/burn-in-changed.ts --base-branch=master --config-path=./custom/.burn-in.config.ts

# With sharding (CI usage)
tsx scripts/burn-in-changed.ts --base-branch=main --shard=1/2
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
  // Files that should skip burn-in entirely (config, constants, types)
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

  // Test file patterns (optional - defaults to *.spec.ts, *.test.ts)
  testPatterns: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e.ts'],

  // Burn-in execution settings
  burnIn: {
    repeatEach: process.env.CI ? 2 : 3, // Fewer repeats in CI for speed
    retries: process.env.CI ? 0 : 1 // No retries in CI to fail fast
  },

  // Run this percentage of tests AFTER dependency analysis (0.5 = 50%)
  burnInTestPercentage: process.env.CI ? 0.5 : 1,

  // Enable verbose debug output for pattern matching (optional)
  debug: false
}

export default config
```

## Debugging and Troubleshooting

### Debug Mode

If your skip patterns aren't working as expected, enable debug mode to see detailed pattern matching information:

**Option 1 - Via Configuration:**

```typescript
const config: BurnInConfig = {
  skipBurnInPatterns: [
    '**/some-folder/**'
    // ... other patterns
  ],
  debug: true // Enable verbose debug output
}
```

**Option 2 - Via Environment Variable:**

```bash
BURN_IN_DEBUG=true npm run test:pw:burn-in-changed
```

Debug mode will show:

- Which patterns are being checked against each file
- Which patterns match
- Final skip decisions for each file

### Common Issues and Solutions

#### 1. Config File Not Found

**Problem**: Skip patterns from default config are being used instead of your custom patterns.

**Solution**: Ensure your config path in the burn-in script matches the actual location:

```typescript
// If your config is at project-root/.burn-in.config.ts
configPath: '.burn-in.config.ts'

// If it's in a subdirectory
configPath: 'config/.burn-in.config.ts'
```

#### 2. Patterns Not Matching

**Problem**: Files aren't being skipped even though they seem to match the pattern.

**Common causes and solutions:**

- **Wrong glob syntax**: Use `**/folder/**` to match all files in a folder and subfolders
- **Missing variations**: Include both `**/folder/**` and `**/folder/*` to cover all cases
- **Path format**: Patterns are matched against relative paths from the repository root

**Example patterns:**

```typescript
skipBurnInPatterns: [
  '**/node_modules/**', // Skip all node_modules
  '**/dist/**', // Skip built files
  '**/*.config.ts', // Skip all config files
  '**/tests/experimental/**', // Skip experimental test folder
  'specific-file.ts' // Skip a specific file
]
```

## Best Practices

### **Organize Code to Avoid Accidental Skips**

Since the system now analyzes actual dependencies, be careful not to skip files that your tests frequently import. **Best practice**: Keep commonly used utilities in a shared location that won't be accidentally skipped.

```typescript
// ❌ Avoid: Scattering common utilities that might get skipped
src / components / utils / helper.ts // Tests import this
pages / constants / urls.ts // Tests import this
config / test - helpers.ts // Tests import this (but might be skipped!)

// ✅ Better: Consolidate shared utilities in a clear location
src /
  support / // Clear it's for testing support
  utils /
  helper.ts // Won't be skipped by accident
constants / urls.ts // Clear purpose
test - helpers.ts // Obviously test-related
```

**Why this matters**: The dependency analyzer will find tests that depend on changed files. If you accidentally skip a widely-used utility file, no tests will run even when that utility changes.

## CI Integration

### GitHub Actions Integration

Here's the simple, real workflow pattern used in this repository:

#### Step 1: Create Your Burn-in Workflow

Create `.github/workflows/burn-in.yml` in your repository:

```yaml
name: Smart Burn-in Tests
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  burn-in:
    runs-on: ubuntu-latest
    # Key: Use matrix for parallel sharding
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2]
        shardTotal: [2]
    permissions:
      contents: read
      packages: read # Add if you need private packages
    outputs:
      runE2E: ${{ steps.burn-in-result.outputs.runE2E }}

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Important: Need full history for git diff

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci # or yarn/pnpm install

      - name: Run Smart Burn-in
        id: burn-in-step
        working-directory: playwright/ # Adjust to your test directory
        env:
          CI: 'true'
          PW_BURN_IN: true
          # Add any other environment variables your tests need
        run: |
          # Key: Ensure base branch is available for git diff
          git branch -f main origin/main

          # Key: Use your burn-in script with sharding
          npm run test:pw:burn-in-changed -- --base-branch=main --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}

      - name: Set burn-in result
        id: burn-in-result
        run: |
          # Set output based on your needs - this determines if E2E tests run
          echo "runE2E=true" >> $GITHUB_OUTPUT
```

#### Step 2: Create Your E2E Workflow

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests
on:
  workflow_run:
    workflows: ['Smart Burn-in Tests']
    types: [completed]

jobs:
  e2e-tests:
    if: ${{ github.event.workflow_run.outputs.runE2E == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup and run E2E tests
        run: |
          npm ci
          npm run test:e2e  # Your actual E2E test command
```

### How It Works

Your burn-in workflow will:

1. **Check out code** with full git history (`fetch-depth: 0`)
2. **Set up environment** and install dependencies
3. **Ensure base branch exists** for git diff comparison
4. **Run burn-in script** with sharding: `npm run test:pw:burn-in-changed -- --base-branch=main --shard=1/2`
5. **Build dependency graph** via `madge` and map changed files to affected tests (direct and transitive imports)
6. **Filter + sample** affected tests using skip patterns and `burnInTestPercentage`
7. **Set output** to determine if E2E tests should run

### Key Configuration Points

| Setting                 | Purpose                                  | Example                    |
| ----------------------- | ---------------------------------------- | -------------------------- |
| `fetch-depth: 0`        | Git needs full history for diff analysis | Required for git diff      |
| `shardIndex/shardTotal` | Parallel test execution                  | `[1,2]/[2]` = run 2 shards |
| `working-directory`     | Where your test scripts are              | `playwright/`              |
| `git branch -f`         | Ensures base branch exists               | Prevents git diff errors   |
