// Export the main log object
export { log } from './log'

export type {
  LogLevel,
  LoggingConfig as LoggingConfig,
  LogParams
} from './types'

// decorator and function wrapper
export { methodTestStep, functionTestStep } from './decorators/test-step'

// re-export the test hooks and utilities for use in test files
export { captureTestContext } from './log-organizer'
