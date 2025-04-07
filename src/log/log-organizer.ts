/** Extends Playwright's test object to organize logs by test file and name.
 *  When tests import the test object from this module,
 * logs will be organized by test file and test name in separate folders. */
import { setTestContextInfo } from './config'
import type { TestInfo } from '@playwright/test'
// import { test as base } from '@playwright/test'
import * as path from 'path'

/** Resolves a test file path relative to the project root. */
const resolveTestFile = (projectRoot: string, testFile?: string) =>
  testFile
    ? path.isAbsolute(testFile)
      ? testFile
      : path.resolve(projectRoot, testFile)
    : undefined

/** Sets the test context information to capture test metadata for logging purposes. */
const setContext = (testInfo: TestInfo): void => {
  // Use file path relative to project root for better organization
  const projectRoot = process.cwd()

  const testFile = testInfo.file
    ? {
        testFile: resolveTestFile(projectRoot, testInfo.file)
      }
    : {}

  setTestContextInfo({
    ...testFile,
    testName: testInfo.title,
    workerIndex: testInfo.workerIndex
  })
}

/**
 * A utility function to capture test context when using the standard Playwright test object
 * This should be imported in test files that use @playwright/test directly but still want organized logs
 *
 * Example usage:
 * ```ts
 * import { test } from '@playwright/test'
 * import { captureTestContext } from '../../src'
 *
 * test.beforeEach(async ({}, testInfo) => {
 *    captureTestContext(testInfo)
 * })
 * ```
 */
export function captureTestContext(testInfo: TestInfo): void {
  setContext(testInfo)
}
