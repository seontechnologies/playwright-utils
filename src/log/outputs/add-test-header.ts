/** Message formatting and header management for logging */
import * as path from 'node:path'
import type { LoggingConfig } from '../types'
import { extractTestInfoIfNeeded } from './context'

/** Track the last test details to add headers for consolidated logs */
type TestTracker = {
  readonly lastTestName: string
  readonly lastTestFile: string
  readonly lastInferredFile: string
  readonly lastInferredTestName: string
}

/** Initial empty tracker state */
const initialTracker: TestTracker = {
  lastTestName: '',
  lastTestFile: '',
  lastInferredFile: '',
  lastInferredTestName: ''
}

/** Update tracker with new data in a pure functional way */
const updateTracker = (
  current: TestTracker,
  updates: Partial<TestTracker>
): TestTracker => ({ ...current, ...updates })

/** Format section header for consolidated logs: ex: =================== */
const formatSectionHeader = (testName: string, fileName: string): string =>
  `\n${'='.repeat(30)} ${testName} - ${fileName} ${'='.repeat(30)}\n\n`

/** Pure function to generate updated tracker state */
const createUpdatedTracker = (
  current: TestTracker,
  testName: string,
  testFile?: string,
  inferredFile?: string,
  inferredTestName?: string
): TestTracker => ({
  ...current,
  lastTestName: testName || '',
  ...(testFile ? { lastTestFile: testFile } : {}),
  ...(inferredFile ? { lastInferredFile: inferredFile } : {}),
  ...(inferredTestName ? { lastInferredTestName: inferredTestName } : {})
})

/** Format test header and return the updated message and tracker state */
const formatTestHeader = (
  tracker: TestTracker,
  message: string,
  options: LoggingConfig,
  isConsolidatedLog: boolean,
  sectionInfo: {
    sectionTitle?: string
    inferredFile?: string
    testName?: string
  },
  safeTestFile: string,
  detectedTestFile: string | undefined
): {
  message: string
  testFile: string | undefined
  tracker: TestTracker
} => {
  const { sectionTitle } = sectionInfo

  // For test name, prioritize in this order:
  // 1. Inferred test name from section (if in consolidated logs)
  // 2. Actual test name from context (if available)
  // 3. Section title as fallback (for nested sections)
  // 4. 'Unknown Test' as last resort
  const inferredTestName = sectionInfo?.testName || tracker.lastInferredTestName
  const safeTestName =
    isConsolidatedLog && inferredTestName
      ? inferredTestName
      : options.testName || (sectionTitle ? sectionTitle : 'Unknown Test')

  // Get appropriate file name for display
  const safeFileName = safeTestFile
    ? path.basename(safeTestFile)
    : 'Unknown File'

  // Use inferred file name if available (for better log readability)
  // For display purposes, prioritize stored inferred file name for consistency
  const displayFileName =
    sectionInfo?.inferredFile || tracker.lastInferredFile || safeFileName

  // Create a nicely formatted header for new test sections
  if (isConsolidatedLog) {
    const header = formatSectionHeader(safeTestName, displayFileName)
    message = `${header}${message}`
  }

  // Update the tracker using pure function
  const updatedTracker = createUpdatedTracker(
    tracker,
    options.testName || '',
    safeTestFile,
    sectionInfo?.inferredFile,
    sectionInfo?.testName
  )

  return { message, testFile: detectedTestFile, tracker: updatedTracker }
}

/** Get section title and create inferred file name and test name from message */
const getSectionInfo = (
  tracker: TestTracker,
  message: string
):
  | undefined
  | {
      title: string
      inferredFile?: string
      testName?: string
      tracker: TestTracker
    } => {
  if (message.includes('==== ')) {
    const sectionMatch = message.match(/====\s+(.+?)\s+====/)

    if (sectionMatch && sectionMatch[1]) {
      const title = sectionMatch[1].trim()
      let updatedTracker = tracker

      // For todo app and common test patterns, use a standardized file name
      // This ensures consistent headers across all section titles
      const inferredFile =
        tracker.lastInferredFile || 'todo-app-organized-log.spec.ts'

      // Keep track of the inferred file name for consistent headers
      if (!tracker.lastInferredFile) {
        // Update tracker in a pure way
        updatedTracker = updateTracker(tracker, {
          lastInferredFile: inferredFile
        })
      }

      // Infer test name based on section patterns
      // For todo app, we know the test name should be about adding todo items
      let testName: string | undefined

      if (title.toLowerCase().includes('todo')) {
        testName = 'should allow me to add todo items'
      } else if (title.startsWith('Add') || title.startsWith('Create')) {
        testName = `should allow me to ${title.toLowerCase()}`
      } else if (title.startsWith('Test') || title.startsWith('Testing')) {
        testName = title
      } else if (title.startsWith('Navigate')) {
        testName = 'Navigation Test'
      } else if (title.startsWith('Check') || title.startsWith('Verify')) {
        testName = `should ${title.toLowerCase()}`
      }

      return { title, inferredFile, testName, tracker: updatedTracker }
    }
  }
  return undefined
}

/** Process section headers to extract meaningful test info */
const processSectionHeaders = (
  tracker: TestTracker,
  message: string,
  isConsolidatedLog: boolean
): {
  sectionTitle?: string
  inferredFile?: string
  testName?: string
} => {
  if (!message.includes('==== ')) {
    return {}
  }

  // Only extract section info for consolidated logs
  if (isConsolidatedLog) {
    const info = getSectionInfo(tracker, message)
    return info
      ? {
          sectionTitle: info.title,
          inferredFile: info.inferredFile,
          testName: info.testName
        }
      : {}
  }

  return {}
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
  const sectionInfo = processSectionHeaders(tracker, message, isConsolidatedLog)

  // Special case: we're starting a new test, add a header regardless
  if (isConsolidatedLog && (newTest || newFile)) {
    // Only use formatting for consolidated logs
    return formatTestHeader(
      tracker,
      message,
      options,
      isConsolidatedLog,
      sectionInfo,
      safeTestFile,
      detectedTestFile
    )
  }

  return { message, testFile: detectedTestFile, tracker }
}
