import { asPromise } from '../utils/async'
import type { LogLevel } from '../types'

/** Maps log levels to appropriate console methods */
const getConsoleMethodForLevel = (
  level: LogLevel
): ((message: string) => void) => {
  // Map log levels to console methods using a functional approach
  const methodMap: Record<LogLevel, (message: string) => void> = {
    info: console.info,
    step: console.info, // Steps are considered informational
    success: console.log, // Success uses log with green formatting
    warning: console.warn,
    error: console.error,
    debug: console.debug
  }

  return methodMap[level] || console.log
}

/** Logs a message to the console using the method corresponding to the log level */
export const logToConsole = async (
  message: string,
  level: LogLevel
): Promise<void> => {
  // Get the appropriate console method for this log level
  const consoleMethod = getConsoleMethodForLevel(level)

  // Use asPromise to ensure I/O operations complete before resolving
  return asPromise(() => consoleMethod(message))
}
