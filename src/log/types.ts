/** Log level types */
export type LogLevel =
  | 'info'
  | 'step'
  | 'success'
  | 'warning'
  | 'error'
  | 'debug'

/** Options for formatting log messages */
export type FormatOptions = {
  timestamps: boolean
  colorize: boolean
  maxLineLength: number
  // Format-specific options
  prefix?: string
  addNewLine?: boolean
}

/** Options for log calls */
export type LogOptions = {
  /** Enable/disable console output for this log (default: true) */
  console?: boolean

  /** Enable/disable worker ID for this log (overrides global setting) */
  workerID?:
    | boolean
    | {
        enabled?: boolean
        format?: string
      }

  /** Enable/disable file logging for this log (default: based on global config) */
  fileLogging?: boolean

  /** Formatting options */
  format?: {
    /** Add a prefix to the message (perfect for worker IDs) */
    prefix?: string
    /** Add a new line after the message */
    addNewLine?: boolean
  }

  /** Additional metadata for structured logging */
  context?: Record<string, unknown>

  /** Test file path (usually set automatically) */
  testFile?: string

  /** Test name (usually set automatically) */
  testName?: string
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
  options?: Partial<LogOptions>
  /** Test file name for file logging context */
  testFile?: string
  /** Test name for file logging context */
  testName?: string
}

/** Configuration for formatting messages based on log level */
export type FormatConfig = {
  prefix: string
  suffix: string
  color: string
}

/** Map of log levels to their formatting configuration */
export type FormatConfigMap = Record<LogLevel, FormatConfig>
