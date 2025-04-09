/** File output handler for logging */
import * as fs from 'node:fs'
import type { LogLevel, LoggingConfig } from '../types'
import type { LogContext } from './context'
import { getLogContext, populateTestOptions } from './context'
import { addTestHeader } from './add-test-header'
import { createLogFilePath } from './create-log-file-path'
import { getLoggingConfig } from '../config'
import { formatLogMessage } from '../formatters/format-message'
import path from 'node:path'

// Tracks which files have been written to in the current test run
const writtenFiles = new Set<string>()

/** Tracks which files have been written to in the current test run
 * Returns true if this is the first write to this file in the current run */
const trackFirstWrite = (filePath: string): boolean => {
  if (writtenFiles.has(filePath)) return false

  writtenFiles.add(filePath)

  return true
}

/** Strip ANSI color codes from a string, for better readability in a text file */
const stripAnsiCodes = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\u001b\[\d{1,2}m/g, '')
}

/** Appends a newline to the file if the message doesn't already start with one */
const appendNewlineIfNeeded = async (
  filePath: string,
  message: string
): Promise<boolean> => {
  if (message && !message.startsWith('\n')) {
    try {
      await fs.promises.appendFile(filePath, '\n')
      return true
    } catch (error) {
      console.error(`Error writing newline to log file: ${filePath}`, error)
      return false
    }
  }
  return true
}

/** Create a header for a new log file */
const writeLogFileHeader = async (
  filePath: string,
  header: string
): Promise<void> => {
  try {
    // Check if this is the first write to the file
    if (trackFirstWrite(filePath)) {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Write header to the file
      await fs.promises.writeFile(filePath, header)
    }
  } catch (error) {
    console.error(`Error writing log header: ${error}`)
  }
}

/** Writes the header if this is the first write to the file */
const writeHeaderIfNecessary = async (
  filePath: string,
  context: LogContext,
  cleanMessage: string
): Promise<boolean> => {
  if (trackFirstWrite(filePath)) {
    try {
      // Create header content
      const header = [
        '='.repeat(80),
        `Test Log: ${context.testName || 'Consolidated Test Log'}`,
        `Test File: ${context.testFile || 'Multiple Files'}`,
        `Started: ${new Date().toISOString()}`,
        '='.repeat(80),
        ''
      ].join('\n')

      await writeLogFileHeader(filePath, header)

      // Append a newline after the header if needed
      return await appendNewlineIfNeeded(filePath, cleanMessage)
    } catch (error) {
      console.error(`Error writing header to log file: ${filePath}`, error)
      return false
    }
  }
  return true
}

/** Appends the fully formatted message to the file */
const appendFormattedMessage = async (
  filePath: string,
  formattedMessage: string
): Promise<boolean> => {
  try {
    await fs.promises.appendFile(filePath, formattedMessage + '\n')
    return true
  } catch (error) {
    console.error(`Error writing to log file: ${filePath}`, error)
    return false
  }
}

/**
 * Writes a message to a log file.
 * This function decomposes the process into small steps:
 * 1. Clean the message.
 * 2. Write the header if necessary.
 * 3. Format the message.
 * 4. Append the formatted message to the file.
 *
 * @param filePath - The path to the log file.
 * @param message - The raw log message.
 * @param context - The logging context.
 * @returns A promise that resolves to true if the operation was successful.
 */
const writeToLogFile = async (
  filePath: string,
  message: string,
  context: LogContext
): Promise<boolean> => {
  // Step 1: Clean the message.
  const cleanMessage = stripAnsiCodes(message)

  // Step 2: Write header if this is the first write.
  const headerOk = await writeHeaderIfNecessary(filePath, context, cleanMessage)
  if (!headerOk) return false

  // Step 3: Format the message. (formatLogMessage is assumed pure)
  const formattedMessage = formatLogMessage(cleanMessage, context)

  // Step 4: Append the formatted message.
  return await appendFormattedMessage(filePath, formattedMessage)
}

/**
 * Logs a message to the file system, handling both organized and consolidated logging modes.
 *
 * This function manages the complete file logging process:
 * 1. Prepares the message by stripping ANSI codes
 * 2. Resolves test context information and adds appropriate headers
 * 3. Determines the proper file path based on logging configuration
 *    - For organized logs: Creates test-specific log files in dated folders
 *    - For consolidated logs: Writes to a single shared log file
 * 4. Formats and writes the message with proper timestamps and context
 *
 * The behavior is controlled by the global logging configuration and per-call options.
 *
 * @param message - The message content to log to the file
 * @param _level - The log level (info, debug, etc.) - reserved for future filtering capabilities
 * @param options - Configuration options that can override global settings:
 *                  Can use boolean or detailed object configuration for flexibility
 * @returns Promise<boolean> - Resolves to true if logging was successful, false otherwise
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
  const { message: updatedMessage } = addTestHeader(
    undefined,
    message,
    options,
    testFile
  )

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
