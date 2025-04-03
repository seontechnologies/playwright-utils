/**
 * Async utilities for logging
 */

/**
 * Wraps a synchronous function in a Promise and resolves after I/O processing
 * Used for asynchronous console logging
 */
export const asPromise = (fn: () => void): Promise<void> =>
  new Promise((resolve) => {
    fn()
    // Use setImmediate to ensure I/O processing completes
    // before the promise resolves
    setImmediate(() => resolve())
  })

/**
 * Get a consistent test run ID for the entire test session
 */
export const getTestRunId = (): string => {
  // Using process start time as test run ID
  // More reliable than storing in memory which might be lost on restarts
  if (!process.env.TEST_RUN_ID) {
    // Format: YYYYMMDD-HHMMSS (based on process start time)
    const now = new Date()
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '-',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('')

    process.env.TEST_RUN_ID = timestamp
  }

  return process.env.TEST_RUN_ID
}
