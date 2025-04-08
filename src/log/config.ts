// Logging configuration manager
// Provides global configuration options for the logging utility

import * as fs from 'node:fs'
import * as path from 'node:path'
import deepmerge from 'deepmerge'
import type { LoggingConfig } from './types'

// LoggingConfig imported from ./types

/** Default configuration for the logging utility */
const defaultConfig: LoggingConfig = {
  console: {
    enabled: true,
    colorize: true,
    timestamps: true
  },
  fileLogging: {
    enabled: false,
    outputDir: 'playwright-logs',
    testFolder: 'default-test-folder' // Fallback folder when no test context is available
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
 * Normalizes configuration values by converting boolean settings to their object equivalents
 * @param config - Raw configuration with possible boolean values
 * @returns Normalized configuration with all settings in object form
 */
export function normalizeConfig(
  config: Partial<LoggingConfig>
): Partial<LoggingConfig> {
  const normalized: Partial<LoggingConfig> = { ...config }

  // Convert console setting
  if (typeof config.console === 'boolean') {
    normalized.console = { enabled: config.console }
  }

  // Convert fileLogging setting
  if (typeof config.fileLogging === 'boolean') {
    normalized.fileLogging = { enabled: config.fileLogging }
  }

  // Convert workerID setting
  if (typeof config.workerID === 'boolean') {
    normalized.workerID = { enabled: config.workerID }
  }

  // Convert sourceFileTracking setting
  if (typeof config.sourceFileTracking === 'boolean') {
    normalized.sourceFileTracking = { enabled: config.sourceFileTracking }
  }

  return normalized
}

/** Configure the logging utility
 * @param config - Configuration options to apply
 */
export function configureLogging(
  config: Partial<LoggingConfig>
): LoggingConfig {
  // Normalize the config to ensure all properties are in the correct format
  const normalizedConfig = normalizeConfig(config)

  // Deep merge the normalized config with the current config
  currentConfig = deepmerge(currentConfig, normalizedConfig)

  return ensureLogDirectory(currentConfig)
}

/** Function to ensure log directory exists if needed
 * @param config - The logging configuration */
function ensureLogDirectory(config: LoggingConfig): LoggingConfig {
  // Handle both boolean and object fileLogging configurations
  const fileLoggingEnabled =
    typeof config.fileLogging === 'boolean'
      ? config.fileLogging
      : config.fileLogging?.enabled

  if (!fileLoggingEnabled) return config

  // If fileLogging is undefined or a boolean, convert it to an object
  if (
    config.fileLogging === undefined ||
    typeof config.fileLogging === 'boolean'
  ) {
    config.fileLogging = {
      enabled:
        typeof config.fileLogging === 'boolean' ? config.fileLogging : false
    }
  }

  // Now we know fileLogging is an object, not a boolean
  const fileLoggingConfig = config.fileLogging as {
    enabled: boolean
    outputDir?: string
    testFolder?: string
    // other properties
  }

  // If no output directory is specified, use the standard playwright-logs directory
  if (!fileLoggingConfig.outputDir) {
    // Default to the playwright-logs directory in the project root
    fileLoggingConfig.outputDir = path.join(process.cwd(), 'playwright-logs')
  }

  const outputDir = fileLoggingConfig.outputDir

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

/**  @returns The current logging configuration */
export function getLoggingConfig(): LoggingConfig {
  return currentConfig
}

/////////////////////////
// Test Context Management
/////////////////////////

/** Information about the current test context
 * Used for both logging and worker ID support */
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
 * @param info - Object containing test context details */
export function setTestContextInfo(info: Partial<TestContextInfo>): void {
  testContextInfo = {
    ...testContextInfo,
    ...info
  }
}

/** Get the current test context information */
export function getTestContextInfo(): TestContextInfo {
  return { ...testContextInfo }
}
