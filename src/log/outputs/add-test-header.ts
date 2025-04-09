// import * as path from 'node:path' - Not needed after simplifying headers
import type { LoggingConfig } from '../types'
import { extractTestInfoIfNeeded } from './context'

/** Track the last test details to add headers for consolidated logs */
type TestTracker = {
  readonly lastTestName: string
  readonly lastTestFile: string
}

/** Initial empty tracker state */
const initialTracker: TestTracker = {
  lastTestName: '',
  lastTestFile: ''
}

/** For consolidated logs, format section header with a consistent divider */
const formatSectionHeader = (): string =>
  `\n${'='.repeat(40)} TEST SECTION ${'='.repeat(40)}\n\n`

/** Pure function to generate updated tracker state */
const createUpdatedTracker = (
  current: TestTracker,
  testName: string,
  testFile?: string
): TestTracker => ({
  ...current,
  lastTestName: testName || '',
  ...(testFile ? { lastTestFile: testFile } : {})
})

/** Result of the test header formatting */
type TestHeaderResult = {
  message: string
  testFile: string | undefined
  tracker: TestTracker
}

/** Input data for test header formatting */
type TestHeaderInput = {
  tracker: TestTracker
  message: string
  options: LoggingConfig
  isConsolidatedLog: boolean
}

/** Test information for display */
type TestInfo = {
  sectionInfo: {
    sectionTitle?: string
  }
  safeTestFile: string
  detectedTestFile?: string
}

/** For consolidated logs, creates a formatted header for test logs
 * If consolidated logging is disabled, the original message is returned unchanged.
 * Generates a section header based on available test information and prepends it to the original message. */
const createFormattedHeader = ({
  message,
  isConsolidatedLog
}: TestHeaderInput &
  Pick<TestInfo, 'sectionInfo' | 'safeTestFile'>): string => {
  if (!isConsolidatedLog) return message

  const header = formatSectionHeader()

  return `${header}${message}`
}

/** Format test header and return the updated message and tracker state
 * Works with both consolidated and non-consolidated logs, but only adds headers for consolidated logs */
const formatTestHeader = (
  input: TestHeaderInput,
  testInfo: TestInfo
): TestHeaderResult => {
  const { tracker, message, options, isConsolidatedLog } = input
  const { sectionInfo, safeTestFile, detectedTestFile } = testInfo

  const formattedMessage = createFormattedHeader({
    message,
    isConsolidatedLog,
    sectionInfo,
    options,
    tracker,
    safeTestFile
  })

  // Update the tracker using pure function
  const updatedTracker = createUpdatedTracker(
    tracker,
    options.testName || '',
    safeTestFile
  )

  return {
    message: formattedMessage,
    testFile: detectedTestFile,
    tracker: updatedTracker
  }
}

/** Extract a section title from a log message using a regex */
const extractSectionTitle = (message: string): string | undefined => {
  if (!message.includes('==== ')) return undefined
  const match = message.match(/====\s+(.+?)\s+====/)
  return match && match[1] ? match[1].trim() : undefined
}

/** For consolidated logs, process section headers to extract meaningful test info */
const processSectionHeaders = (
  message: string,
  isConsolidatedLog: boolean
): {
  sectionTitle?: string
} => {
  if (!message.includes('==== ') || !isConsolidatedLog) return {}

  // Extract title from section header
  const title = extractSectionTitle(message)
  return title ? { sectionTitle: title } : {}
}

/** Add test header to message when needed */
export function addTestHeader(
  tracker: TestTracker = initialTracker,
  message: string,
  options: LoggingConfig,
  testFile?: string
): {
  message: string
  testFile: string | undefined
  tracker: TestTracker
} {
  // Get the detected test file
  const detectedTestFile = testFile

  // Try to extract test info from log message if not provided
  const updatedTestFile = extractTestInfoIfNeeded(
    message,
    options,
    detectedTestFile
  )

  // Use safe values with fallbacks
  const safeTestFile = updatedTestFile ?? detectedTestFile ?? ''
  const newTest = options.testName !== tracker.lastTestName
  const newFile = safeTestFile !== tracker.lastTestFile

  // Check if this is a default folder consolidated log
  const isConsolidatedLog = !options.testFile && !testFile

  // Extract section info from message for consolidated logs
  const sectionInfo = processSectionHeaders(message, isConsolidatedLog)

  // Special case: we're starting a new test, add a header regardless
  if (isConsolidatedLog && (newTest || newFile)) {
    return formatTestHeader(
      {
        tracker,
        message,
        options,
        isConsolidatedLog
      },
      {
        sectionInfo,
        safeTestFile,
        detectedTestFile
      }
    )
  }

  return { message, testFile: detectedTestFile, tracker }
}
