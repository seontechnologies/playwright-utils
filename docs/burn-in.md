# Burn-in Test Runner

A smart test burn-in utility for Playwright that intelligently filters which tests to run based on file changes, reducing unnecessary test execution while maintaining reliability.

- [Burn-in Test Runner](#burn-in-test-runner)
  - [The Problem](#the-problem)
  - [The Solution](#the-solution)
  - [Installation \& Usage](#installation--usage)
    - [Create Burn-in Script](#create-burn-in-script)
    - [Package.json Script](#packagejson-script)
    - [Create a Configuration File](#create-a-configuration-file)
  - [Best Practices](#best-practices)
    - [**Keep Common Patterns Minimal**](#keep-common-patterns-minimal)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
      - [1. Too many tests still running](#1-too-many-tests-still-running)
      - [2. TypeScript config not loading](#2-typescript-config-not-loading)
  - [CI Integration](#ci-integration)
    - [GitHub Actions Integration](#github-actions-integration)
      - [Step 1: Use the Reusable Workflow](#step-1-use-the-reusable-workflow)
      - [Step 2: Adapt for Your Repository](#step-2-adapt-for-your-repository)
    - [How It Works](#how-it-works)
    - [Workflow Inputs](#workflow-inputs)
    - [Workflow Outputs](#workflow-outputs)
    - [Common Issues](#common-issues-1)
      - [E2E tests not running after burn-in](#e2e-tests-not-running-after-burn-in)
      - [Burn-in fails with "tsx not found"](#burn-in-fails-with-tsx-not-found)
      - [Burn-in always runs all tests](#burn-in-always-runs-all-tests)
    - [Skip Label](#skip-label)

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
import { runBurnIn } from '../../src/burn-in'

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const baseBranchArg = args.find((arg) => arg.startsWith('--base-branch='))
  const configPathArg = args.find((arg) => arg.startsWith('--config-path='))
  const shardArg = args.find((arg) => arg.startsWith('--shard='))

  const options: Parameters<typeof runBurnIn>[0] = {}

  if (baseBranchArg) {
    options.baseBranch = baseBranchArg.split('=')[1]
  }

  if (configPathArg) {
    options.configPath = configPathArg.split('=')[1]
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
tsx scripts/burn-in-changed.ts --base-branch=develop --config-path=./custom/.burn-in.config.ts

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
  // Files that should trigger smart burn-in (smoke tests or percentage)
  // Best Practice: Keep these patterns minimal - consolidate utilities into fewer folders
  commonBurnInPatterns: ['**/support/**'],

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

  // Maximum dependency depth for run-all fallback (advanced)
  maxDepthForRunAll: 4,

  // Burn-in execution settings
  burnIn: {
    repeatEach: process.env.CI ? 2 : 3, // Fewer repeats in CI for speed
    retries: process.env.CI ? 0 : 1 // No retries in CI to fail fast
  },

  // Run this percentage of tests for common files (0.5 = 50%)
  commonBurnInTestPercentage: process.env.CI ? 0.5 : 1
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

Move files to appropriate patterns:

```typescript
{
  skipBurnInPatterns: ['**/*your-config-files*'],
  commonBurnInPatterns: ['**/*your-helper-files*']
}
```

#### 2. TypeScript config not loading

Ensure `tsx` is available for `.ts` config files.

## CI Integration

### GitHub Actions Integration

Here's the simple, real workflow pattern used in this repository:

#### Step 1: Use the Reusable Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: Run E2E Tests
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

jobs:
  # Optional: Check for skip labels
  vars:
    runs-on: ubuntu-latest
    outputs:
      skip_burn_in: ${{ steps.check_skip_label.outputs.skip_burn_in || 'false' }}
    steps:
      - name: Check for skip_burn_in label
        id: check_skip_label
        if: github.event_name == 'pull_request'
        run: |
          if [[ "${{ contains(github.event.pull_request.labels.*.name, 'skip_burn_in') }}" == "true" ]]; then
            echo "skip_burn_in=true" >> $GITHUB_OUTPUT
          else
            echo "skip_burn_in=false" >> $GITHUB_OUTPUT
          fi

  # Smart burn-in using reusable workflow
  burn-in:
    needs: vars
    if: github.event_name == 'pull_request' && needs.vars.outputs.skip_burn_in != 'true'
    uses: seontechnologies/playwright-utils/.github/workflows/rwf-burn-in.yml@main
    with:
      base-ref: 'main'
      test-directory: 'playwright/'
      install-command: 'npm ci'

  # E2E tests run based on burn-in result
  e2e-tests:
    needs: [vars, burn-in]
    if: |
      always() && 
      (needs.vars.outputs.skip_burn_in == 'true' || 
       (needs.burn-in.result == 'success' && needs.burn-in.outputs.runE2E == 'true') ||
       (needs.burn-in.result == 'skipped'))
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run E2E Tests
        run: npm run test:e2e
```

#### Step 2: Adapt for Your Repository

1. **Replace the workflow reference** - Change `seontechnologies/playwright-utils/.github/workflows/rwf-burn-in.yml@main` to point to your fork or use a specific version
2. **Update paths** - Change `test-directory: 'playwright/'` to match your test directory
3. **Update commands** - Change `install-command: 'npm ci'` and test commands as needed

### How It Works

The reusable workflow runs your burn-in script:

```bash
npx tsx scripts/burn-in-changed.ts --base-branch=main --shard=1/2
```

The script analyzes changed files and decides whether to run E2E tests based on your configuration patterns.

### Workflow Inputs

| Input             | Description                                        | Default         |
| ----------------- | -------------------------------------------------- | --------------- |
| `base-ref`        | Base branch to compare changes against             | `'main'`        |
| `test-directory`  | Directory containing your tests and burn-in script | `'playwright/'` |
| `install-command` | Package manager install command                    | `'npm ci'`      |

### Workflow Outputs

| Output   | Description                  | Values                |
| -------- | ---------------------------- | --------------------- |
| `runE2E` | Whether E2E tests should run | `'true'` \| `'false'` |

### Common Issues

#### E2E tests not running after burn-in

- Check: `if: needs.burn-in.outputs.runE2E == 'true'`

#### Burn-in fails with "tsx not found"

- Install: `npm install -D tsx`

#### Burn-in always runs all tests

- Check your `.burn-in.config.ts` skip patterns

### Skip Label

Add `skip_burn_in` label to any PR to bypass burn-in and run E2E tests directly.
