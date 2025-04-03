/**
 * Playwright integration utilities
 */

// Store reference to the test object if available
let testObj:
  | { step: (title: string, body: () => Promise<void>) => Promise<void> }
  | undefined

// Try to load Playwright test, but handle gracefully if unavailable
try {
  // This will succeed in test files but might fail in utility files
  const { test } = require('@playwright/test')
  testObj = test
} catch (error) {
  // We'll handle this gracefully - testObj will remain undefined
  console.info(
    'Note: Running in non-test context, Playwright test API is not available'
  )
}

/**
 * Checks if the Playwright test step API is available in the current context
 */
export const isPlaywrightStepAvailable = (): boolean => !!testObj?.step

/**
 * Executes a Playwright test step with error handling
 */
export const executePlaywrightStep = async (
  stepMessage: string
): Promise<void> => {
  if (!testObj) return

  try {
    // We're using an empty function because we just want to mark the step in the report
    // The actual work should happen outside this step
    await testObj.step(stepMessage, async () => {
      // This is intentionally empty - we're just using test.step for reporting,
      // not for actual execution control, as we've already processed the step
    })
  } catch (error) {
    // If test.step fails, don't crash - just skip using it
    console.debug('Failed to execute Playwright test.step:', error)
  }
}

/**
 * Attempts to execute a Playwright test step if the test API is available
 */
export const tryPlaywrightStep = async (stepMessage: string): Promise<void> => {
  if (isPlaywrightStepAvailable()) {
    await executePlaywrightStep(stepMessage)
  }
}
