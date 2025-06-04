/** Log level types for different severity of messages */
export type LogLevel =
  | 'info'
  | 'step'
  | 'success'
  | 'warning'
  | 'error'
  | 'debug'

/** Log level hierarchy for filtering (lowest to highest priority) */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  step: 2,
  success: 3,
  warning: 4,
  error: 5
}

/** Options for formatting log messages */
export type FormatOptions = {
  timestamps: boolean
  colorize: boolean
  maxLineLength: number
  // Format-specific options
  prefix?: string
  addNewLine?: boolean
}

/** Global Configuration options for the logging utility
 * Supports both simple boolean values and detailed configuration objects */
export type LoggingConfig = {
  // Console output configuration - either boolean or object with settings
  console?:
    | boolean
    | {
        enabled: boolean
        colorize?: boolean
        timestamps?: boolean
      }

  // File logging configuration - either boolean or object with settings
  fileLogging?:
    | boolean
    | {
        enabled: boolean
        outputDir?: string
        // Default folder name for logs when no test context is available
        defaultTestFolder?: string
        // Strip ANSI color codes from log output
        stripAnsiCodes?: boolean
        // Include timestamps in log entries
        timestamp?: boolean
        // Prepend test file name to log entries
        prependTestFile?: boolean
        // Force all logs into a single consolidated file, even with test context
        forceConsolidated?: boolean
      }

  // Worker ID configuration - either boolean or object with settings
  workerID?:
    | boolean
    | {
        enabled: boolean
        format?: string
      }

  // Source file tracking configuration - either boolean or object with settings
  sourceFileTracking?:
    | boolean
    | {
        enabled: boolean
        showInLogs?: boolean
      }

  // Formatting options
  format?: {
    // Add a prefix to the message (perfect for worker IDs)
    prefix?: string
    // Add a new line after the message
    addNewLine?: boolean
    // Maximum line length for formatted logs
    maxLineLength?: number
  }

  // Additional metadata for structured logging
  context?: Record<string, unknown>

  // Test file path (usually set automatically)
  testFile?: string

  // Test name (usually set automatically)
  testName?: string

  // Minimum log level to display (filters out messages below this level)
  level?: LogLevel

  // Whether to run logging as part of a Playwright test.step()
  testStep?: string
}

/** Parameters for the log fixture */
export type LogParams = {
  /** Log level to use (info, step, success, warning, error, debug) */
  level?: LogLevel
  /** Message to log */
  message: string
  /** Whether to log to console (simplified boolean option for backward compatibility) */
  console?: boolean
  /** Additional options for more complex logging configuration */
  options?: Partial<LoggingConfig>
  /** Test file name for file logging context */
  testFile?: string
  /** Test name for file logging context */
  testName?: string
}

export type LogContext = {
  config: LoggingConfig // Global configuration from getLoggingConfig()
  options: LoggingConfig // Per-call options with context enrichment
  testFile?: string
  testName?: string
  workerIDEnabled: boolean
  workerIDFormat: string
}

/** Configuration for formatting messages based on log level */
type FormatConfig = {
  prefix: string
  suffix: string
  color: string
}

/** Map of log levels to their formatting configuration */
export type FormatConfigMap = Record<LogLevel, FormatConfig>
