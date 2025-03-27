import { defineConfig, devices } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import path from 'path'

dotenvConfig({
  path: path.resolve(__dirname, '../../.env')
})

export const baseConfig = defineConfig({
  testDir: './playwright/tests',

  testMatch: '**/*.spec.ts',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI
    ? undefined // Let playwright use default (50% of CPU cores) in CI
    : '100%', // Use all CPU cores for local runs

  reporter: process.env.CI
    ? [
        ['line'],
        ['html'],
        ['blob'],
        ['json', { outputFile: 'test-results.json' }],
        ['junit', { outputFile: 'test-results.xml' }]
      ]
    : [['list'], ['html', { open: 'never' }]],

  timeout: 15000,

  expect: {
    timeout: 10000
  },

  /* Shared settings for all the projects below */
  use: {
    // baseURL: 'http://127.0.0.1:3000',

    trace: 'retain-on-first-failure',
    launchOptions: {
      // slowMo: 500, // slows down test execution, useful for debugging
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }
    },

    // Only enable Google Chrome when multi-browser is explicitly enabled
    ...(process.env.PW_MULTI_BROWSER === 'true'
      ? [
          {
            name: 'google-chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chromium' }
          }
        ]
      : [])
  ]
})
