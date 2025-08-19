import type { BurnInConfig } from '../../src/burn-in'

const config: BurnInConfig = {
  // File patterns that should trigger smart burn-in
  commonBurnInPatterns: ['**/support/**'],
  // File patterns that should skip burn-in entirely
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
  maxDepthForRunAll: 4,
  burnIn: {
    repeatEach: process.env.CI ? 2 : 3,
    retries: process.env.CI ? 0 : 1
  },
  commonBurnInTestPercentage: process.env.CI ? 0.5 : 1,
  commonBurnInTestTag: '@smoke',
  maxFilesForSmartMode: 10
}

export default config
