import merge from 'lodash/merge'
import { defineConfig } from '@playwright/test'
import { baseConfig } from './base.config'
import { log, setupTestContextCapture } from '../../src'

// 1. Configure logging
log.configure({
  fileLogging: {
    enabled: true
  }
})

// 2. Enable automatic test context capture for organized logs
// This is all you need to add to get logs organized by test file and name
const testContextProject = setupTestContextCapture()

export default defineConfig(
  merge({}, baseConfig, { 
    use: { baseUrl: 'https://test-api.k6.io' },
    // 3. Add the special project to your config
    projects: [...(baseConfig.projects || []), testContextProject]
  })
)
