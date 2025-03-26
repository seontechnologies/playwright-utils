import type { JestConfigWithTsJest } from 'ts-jest'

export const config: JestConfigWithTsJest = {
  clearMocks: true,
  testTimeout: 10000,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/*.json',
    '!?(**)/?(*.|*-)types.ts',
    '!**/models/*',
    '!**/__snapshots__/*',
    '!**/scripts/*'
  ],
  coverageDirectory: './coverage',
  coverageReporters: [
    'clover',
    'json',
    'lcov',
    ['text', { skipFull: true }],
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      lines: 0,
      functions: 0
    }
  },
  moduleDirectories: ['node_modules', 'src'],
  modulePathIgnorePatterns: ['dist'],
  testMatch: ['**/*.test.ts'],
  testEnvironment: 'node'
}

export default config
