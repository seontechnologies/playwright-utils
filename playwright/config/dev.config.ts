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
//     testFolder: 'all-tests-in-one',
//     forceConsolidated: true,
//     outputDir: 'playwright-logs/consolidated-logs'
//   }
// })
// ORGANIZED LOGS
log.configure({
  fileLogging: {
    enabled: true,
    testFolder: 'before-hooks', // Set explicitly different from 'consolidated-logs'
    forceConsolidated: false, // Explicitly disable consolidation
    outputDir: 'playwright-logs/organized-logs'
  }
})

export default defineConfig(
  merge({}, baseConfig, {
    use: { baseUrl: 'https://test-api.k6.io' },
    // Add the special project to your config
    projects: [...(baseConfig.projects || [])]
  })
)
