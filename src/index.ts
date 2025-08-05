/**
 * Main entry point for playwright-utils plain functions
 *
 * IMPORTANT: This file only exports plain functions, NOT fixtures.
 * For fixtures, import from 'playwright-utils/fixtures'
 */

// Export core API request functionality (plain functions only)
export * from './api-request'
export * from './recurse'
export * from './log/index'
export * from './intercept-network-call'
export * from './file-utils'
export * from './network-recorder/network-recorder'

///////////////////////
// Internal logger to use our log implementation instead of console.log
// This avoids circular dependencies between modules
///////////////////////

import { configureLogger } from './internal'
import { log } from './log/index'

// Shared logger interface for internal use
configureLogger({
  info: (message: string) => log.info(message),
  step: (message: string) => log.step(message),
  success: (message: string) => log.success(message),
  warning: (message: string) => log.warning(message),
  error: (message: string) => log.error(message),
  debug: (message: string) => log.debug(message)
})
