// Export the main log object
export { log } from './log'

// Import and export config functions with correct names
import {
  configureLogging,
  getLoggingConfig,
  resetLoggingConfig
} from './config'
// Export as 'configure' for simpler API
export const configure = configureLogging
export { getLoggingConfig, resetLoggingConfig }

// Note: We don't add global hooks here because Playwright doesn't allow them
// in configuration files. The log-organizer module handles test context capture.

// Export types for consumers
export type { LogLevel, LogOptions, LogParams } from './types'

// Export test step decorators
export { methodTestStep, functionTestStep } from './decorators/test-step'

// Re-export the test hooks and utilities for use in test files
export { test, captureTestContext } from './log-organizer'
export { setupTestContextCapture } from './setup'
