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
// ORGANIZED LOGS
log.configure({
  fileLogging: {
    enabled: true,
    defaultTestFolder: 'before-hooks', // all hooks go to the default folder
    forceConsolidated: false, // Explicitly disable consolidation
    outputDir: 'playwright-logs/'
  }
})

const BASE_URL = 'http://localhost:3001'

export default defineConfig(
  merge({}, baseConfig, {
    use: {
      baseURL: BASE_URL // case sensitive
    },
    webServer: {
      command: 'npm run start:sample-app',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      timeout: 600000 // Increase timeout to 10 minutes to handle container downloads
    },
    // Add the special project to your config
    projects: [...(baseConfig.projects || [])]
  })
)
