import merge from 'lodash/merge'
import { defineConfig } from '@playwright/test'
import { baseConfig } from './base.config'
import { log } from '../../src'

// IMPORTANT:the setup for logging to files needs to be uniform between test files
// best place to put it is in a config file

// SINGLE LOG FILE
// log.configure({
//   fileLogging: {
//     enabled: true,
//     // Force all tests to use this specific folder regardless of test context
//     defaultTestFolder: 'all-tests-in-one',
//     forceConsolidated: true,
//     outputDir: 'playwright-logs/'
//   }
// })
// Check environment variables for log configuration
const DISABLE_LOGS = process.env.DISABLE_LOGS === 'true'

const DISABLE_FILE_LOGS =
  process.env.DISABLE_FILE_LOGS === 'true' || DISABLE_LOGS

const DISABLE_CONSOLE_LOGS =
  process.env.DISABLE_CONSOLE_LOGS === 'true' || DISABLE_LOGS

// ORGANIZED LOGS
log.configure({
  console: {
    enabled: !DISABLE_CONSOLE_LOGS
  },
  fileLogging: {
    enabled: !DISABLE_FILE_LOGS,
    defaultTestFolder: 'before-hooks', // all hooks go to the default folder
    forceConsolidated: false, // Explicitly disable consolidation
    outputDir: 'playwright-logs/'
  }
})

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
export const API_URL = process.env.VITE_API_URL || 'http://localhost:3001'

export default defineConfig(
  merge({}, baseConfig, {
    use: {
      baseURL: BASE_URL // case sensitive
    },
    webServer: [
      // Backend
      {
        command: 'npm run start:backend',
        url: API_URL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 180000
      },
      // Frontend server
      {
        command: 'npm run start:frontend',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 180000
      }
    ],
    // Add the special project to your config
    projects: [...(baseConfig.projects || [])]
  })
)
