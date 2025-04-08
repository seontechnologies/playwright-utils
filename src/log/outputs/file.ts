/** File output handler for logging */
import * as fs from 'node:fs'
import type { LogLevel, LoggingConfig } from '../types'
import type { LogContext } from './context'
import { getLogContext, populateTestOptions } from './context'
import {
  addTestHeader,
  formatLogMessage,
  stripAnsiCodes,
  writeLogFileHeader
} from './formatter'
import { trackFirstWrite, createLogFilePath } from './file-utils'
import { getLoggingConfig } from '../config'

async function writeToLogFile(
  filePath: string,
  message: string,
  context: LogContext
): Promise<boolean> {
  // Clean the message for file logging
  const cleanMessage = stripAnsiCodes(message)

  // Add header on first write to this file
  if (trackFirstWrite(filePath)) {
    const headerSuccess = await writeLogFileHeader(filePath, context)
    if (!headerSuccess) return false

    // Add a newline after the header if the message doesn't start with one
    if (cleanMessage && !cleanMessage.startsWith('\n')) {
      try {
        await fs.promises.appendFile(filePath, '\n')
      } catch (error) {
        console.error(`Error writing newline to log file: ${filePath}`, error)
        return false
      }
    }
  }

  // Format the message with timestamp, worker ID, etc.
  const formattedMessage = formatLogMessage(cleanMessage, context)

  // Write the message to the file
  try {
    await fs.promises.appendFile(filePath, formattedMessage + '\n')
    return true
  } catch (error) {
    console.error(`Error writing to log file: ${filePath}`, error)
    return false
  }
}

/**
 * Log a message to a file
 * @param message - The message to log
 * @param _level - The log level
 * @param options - Optional configuration including test file and name
 * @returns Promise resolving to true if log was successful
 */
export async function logToFile(
  message: string,
  _level: LogLevel = 'info', // not being used at the moment, but for consistent api with console and future proofing
  options: LoggingConfig = {}
): Promise<boolean> {
  // Strip ANSI color codes from message
  message = stripAnsiCodes(message)

  // Get and populate test context information
  const { testFile } = populateTestOptions(options)

  // Add test headers when needed
  const { message: updatedMessage } = addTestHeader(message, options, testFile)

  // Skip file logging if not enabled
  const config = getLoggingConfig()
  // Check if fileLogging is false or if it's an object with enabled=false
  if (
    config.fileLogging === false ||
    (typeof config.fileLogging === 'object' &&
      config.fileLogging.enabled === false)
  ) {
    return false
  }

  // Get context with configuration and test information
  const context = getLogContext(options)

  // Create the log file path based on context - this determines folder structure
  // IMPORTANT: We're intentionally using the original options here, not extracting from section headers
  // to avoid creating folders for each section in a test
  const filePath = createLogFilePath(context)

  // Write to the log file
  return writeToLogFile(filePath, updatedMessage, context)
}
