/** Message formatting utilities  */

import { colors } from './colors'
import type { LogLevel, FormatOptions, FormatConfigMap } from '../types'
import type { LogContext } from '../outputs/context'
import { getTestContextInfo } from '../config'
import { formatMessageBase } from './format-message-base'

/** Configuration for formatting messages based on log level */
const formatConfig: FormatConfigMap = {
  step: {
    prefix: '==== ',
    suffix: ' ====',
    color: colors.cyan
  },
  success: {
    prefix: '✓ ',
    suffix: '',
    color: colors.green
  },
  warning: {
    prefix: '⚠ ',
    suffix: '',
    color: colors.yellow
  },
  error: {
    prefix: '✖ ',
    suffix: '',
    color: colors.red
  },
  debug: {
    prefix: '🔍 ',
    suffix: '',
    color: colors.gray
  },
  info: {
    prefix: '',
    suffix: '',
    color: colors.white
  }
}

/** Formats a message for logging with appropriate formatting based on log level */
export function formatMessage(
  message: string,
  level: LogLevel = 'info',
  options: FormatOptions = {
    timestamps: true,
    colorize: true,
    maxLineLength: 120
  },
  workerIdConfig?: { enabled: boolean; format: string }
): string {
  // Get configuration for this log level
  const config = formatConfig[level]

  // Use the base formatter with console-appropriate options
  return formatMessageBase(message, {
    addTimestamp: options.timestamps,
    workerIdConfig: workerIdConfig && {
      enabled: workerIdConfig.enabled,
      format: workerIdConfig.format,
      context: getTestContextInfo()
    },
    prefix: options.prefix,
    colorize: options.colorize,
    levelConfig: {
      color: config.color,
      prefix: config.prefix,
      suffix: config.suffix
    },
    maxLength: options.maxLineLength,
    addNewLine: options.addNewLine
  })
}

/** Format a log message with timestamp, worker ID, etc. (for log files) */
export function formatLogMessage(message: string, context: LogContext): string {
  const {
    testName,
    testFile,
    config,
    options,
    workerIDEnabled,
    workerIDFormat
  } = context

  // Get log organization configuration
  const fileLoggingObj = config.fileLogging
  const isEnabled =
    typeof fileLoggingObj === 'boolean'
      ? fileLoggingObj
      : typeof fileLoggingObj === 'object' && fileLoggingObj?.enabled !== false

  const isForceConsolidated =
    typeof fileLoggingObj === 'object' &&
    fileLoggingObj?.forceConsolidated === true

  const isAllTestsInOne =
    typeof fileLoggingObj === 'object' &&
    fileLoggingObj?.testFolder === 'all-tests-in-one'

  const isOrganizedByTest =
    isEnabled && !isForceConsolidated && !isAllTestsInOne

  // Use the base message formatter with file-log specific options
  return formatMessageBase(message, {
    addTimestamp: true,
    workerIdConfig: {
      enabled: workerIDEnabled,
      format: workerIDFormat,
      context: {
        workerIndex: (options as { workerIndex?: number })?.workerIndex
      }
    },
    stripExistingFormatting: true,
    testInfo: !isOrganizedByTest ? { testName, testFile } : undefined,
    organizationMode: isOrganizedByTest ? 'organized' : 'consolidated'
  })
}
