/**
 * Shared logger interface and utility for internal use
 * This avoids circular dependencies between modules
 *
 * Usage:
 * - Configure at startup from index.ts
 * - Use getLogger() in other modules
 */

export interface Logger {
  info: (message: string) => Promise<void>
  step: (message: string) => Promise<void>
  success: (message: string) => Promise<void>
  warning: (message: string) => Promise<void>
  error: (message: string) => Promise<void>
  debug: (message: string) => Promise<void>
}

// Singleton instance to be configured at startup, with default fallback to console
let logger: Logger = {
  info: async (message: string) => console.log(message),
  step: async (message: string) => console.log(message),
  success: async (message: string) => console.log(message),
  warning: async (message: string) => console.warn(message),
  error: async (message: string) => console.error(message),
  debug: async (message: string) => console.debug(message)
}

/**
 * Configure the shared logger instance
 * Called once at app initialization from index.ts */
export const configureLogger = (loggerImplementation: Logger): void => {
  logger = loggerImplementation
}

/**
 * Get the shared logger instance
 * Used by all modules that need logging functionality */
export const getLogger = (): Logger => logger
