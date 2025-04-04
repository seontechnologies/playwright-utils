// Logging configuration manager
// Provides global configuration options for the logging utility

import * as fs from 'node:fs'
import * as path from 'node:path'
import deepmerge from 'deepmerge'

/** Configuration options for the logging utility */
export interface LoggingConfig {
  // Console output configuration
  console?: {
    enabled: boolean
    colorize?: boolean
    timestamps?: boolean
  }

  // File logging configuration (if needed)
  fileLogging?: {
    enabled: boolean
    outputDir?: string
    // Default folder name for logs when no test context is available
    testFolder?: string
    // NOTE: This doesn't actually control test organization fully
    // See README - proper test organization requires test context capture
    organizeByTest?: boolean
  }

  // Worker ID configuration
  workerID?: {
    enabled: boolean
    format?: string
  }

  // Source file tracking configuration
  sourceFileTracking?: {
    enabled: boolean
    showInLogs?: boolean
  }
}

/**
 * Default configuration for the logging utility
 */
const defaultConfig: LoggingConfig = {
  console: {
    enabled: true,
    colorize: true,
    timestamps: true
  },
  fileLogging: {
    enabled: false,
    outputDir: 'playwright-logs',
    testFolder: 'default-test-folder', // Fallback folder when no test context is available
    organizeByTest: true // Organize logs by test file and name by default when context is available
  },
  workerID: {
    enabled: true, // Enabled by default for better debugging
    format: '[W{workerIndex}]'
  },
  sourceFileTracking: {
    enabled: true, // Track source files by default for decorators
    showInLogs: false // But don't show in logs by default to reduce noise
  }
}

/////////////////////////
// Logging Configuration Management
/////////////////////////

// Singleton instance of configuration, with default fallback
let currentConfig: LoggingConfig = { ...defaultConfig }

/**
 * Configure the logging utility
 * @param config - Configuration options to apply
 */
export function configureLogging(config: Partial<LoggingConfig>) {
  // deep merge the new config with the current config in a single step
  currentConfig = deepmerge(currentConfig, config)

  return ensureLogDirectory(currentConfig)
}

/**
 * Function to ensure log directory exists if needed
 * @param config - The logging configuration
 */
function ensureLogDirectory(config: LoggingConfig) {
  if (!config.fileLogging?.enabled) return config

  // If no output directory is specified, use the standard playwright-logs directory
  if (!config.fileLogging.outputDir) {
    // Default to the playwright-logs directory in the project root
    config.fileLogging.outputDir = path.join(process.cwd(), 'playwright-logs')
  }

  const outputDir = config.fileLogging.outputDir

  // Ensure the directory exists
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true })
      console.log(`Created log directory: ${outputDir}`)
    } catch (error) {
      console.error(`Failed to create log directory: ${error}`)
    }
  }

  return config
}

/**
 * Get the current logging configuration
 * @returns The current logging configuration
 */
export function getLoggingConfig(): LoggingConfig {
  return currentConfig
}

/** Reset the logging configuration to defaults */
export const resetLoggingConfig = () => {
  currentConfig = { ...defaultConfig }
}

/////////////////////////
// Test Context Management
/////////////////////////

/**
 * Information about the current test context
 * Used for both logging and worker ID support
 */
export type TestContextInfo = {
  /** Worker ID for parallel execution */
  workerIndex?: number
  /** Test file path */
  testFile?: string
  /** Test name */
  testName?: string
  /** Source file path for detailed logs */
  sourceFilePath?: string
  /** Project name from Playwright config */
  projectName?: string
}

// Keep track of current test context info
let testContextInfo: TestContextInfo = {}

/**
 * Set the current test context information
 * @param info - Object containing test context details
 */
export function setTestContextInfo(info: Partial<TestContextInfo>): void {
  testContextInfo = {
    ...testContextInfo,
    ...info
  }
}

/**
 * Get the current test context information
 * @returns Current test context information
 */
export function getTestContextInfo(): TestContextInfo {
  return { ...testContextInfo }
}
