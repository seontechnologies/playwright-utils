import type { BurnInConfig } from '../../src/burn-in'

const config: BurnInConfig = {
  // Files that should trigger smart burn-in (smoke tests or percentage)
  // Best Practice: Keep these patterns minimal - consolidate utilities into fewer folders
  commonBurnInPatterns: ['**/support/**'],

  // Files that should skip burn-in entirely (config, constants, types
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

  // Maximum files before falling back to run-all mode
  maxFilesForSmartMode: 15,

  // Maximum dependency depth for run-all fallback (advanced)
  maxDepthForRunAll: 4,

  // Burn-in execution settings
  burnIn: {
    repeatEach: process.env.CI ? 2 : 3, // Fewer repeats in CI for speed
    retries: process.env.CI ? 0 : 1 // No retries in CI to fail fast
  },

  // For common burn-in files, run tests with this tag
  // commonBurnInTestTag: '@smoke',

  // Alternative: run this percentage of tests for common files (0.5 = 50%)
  // If both tag and percentage are set, tag takes precedence
  commonBurnInTestPercentage: process.env.CI ? 0.5 : 1
}

export default config
