import type { BurnInConfig } from '../../src/burn-in'

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

  // Run this percentage of tests for common files (0.5 = 50%)
  // This controls test volume when non-skip files change
  commonBurnInTestPercentage: process.env.CI ? 0.2 : 1
}

export default config
