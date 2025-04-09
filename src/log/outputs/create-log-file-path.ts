import * as fs from 'node:fs'
import * as path from 'node:path'
import type { LogContext, LoggingConfig } from '../types'

/** Ensures a directory exists, creating it if necessary */
const ensureDirectoryExists = (directory: string): void => {
  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { recursive: true })
    } catch (error) {
      console.error(`Error creating directory: ${directory}`, error)
    }
  }
}

/** Gets current date formatted as YYYY-MM-DD */
const getFormattedDate = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Creates a file name for test-organized logs */
const createTestBasedFileName = (
  testName: string | undefined,
  workerIndex: number | string
): string => {
  const safeName = testName
    ? testName.replace(/[^a-zA-Z0-9]/g, '-') // replace non-alphanumeric characters with hyphens
    : 'unnamed-test'

  return `${safeName}-worker-${workerIndex}.log`
}

/* PURE HELPERS */

/** Extracts a safe test file name from the provided file path. */
const getTestFileName = (testFile?: string): string =>
  testFile
    ? path.basename(testFile, path.extname(testFile))
    : 'unknown-test-file'

/** Extracts the worker information from the options. */
const getWorkerString = (options: unknown): string => {
  const logContextOptions = options as { workerIndex?: number }
  return typeof logContextOptions?.workerIndex === 'number'
    ? logContextOptions.workerIndex.toString()
    : 'unknown'
}

/** Computes the subdirectory and file name for test-organized logs. */
const getSubDirAndFileNameForTestContext = (
  outputDir: string,
  dateString: string,
  testFile: string | undefined,
  testName: string | undefined,
  options: unknown
): { subDir: string; fileName: string } => {
  const testFileName = getTestFileName(testFile)
  const subDir = path.join(outputDir, dateString, testFileName)
  const workerString = getWorkerString(options)
  const fileName = createTestBasedFileName(testName, workerString)
  return { subDir, fileName }
}

/** Returns the folder name used for consolidated logs. */
const getConsolidatedFolderName = (config: LoggingConfig): string =>
  (typeof config.fileLogging === 'object' &&
    config.fileLogging?.defaultTestFolder) ||
  'consolidated'

/** * Computes the subdirectory and file name for consolidated logs. */
const getSubDirAndFileNameForConsolidated = (
  outputDir: string,
  dateString: string,
  config: LoggingConfig
): { subDir: string; fileName: string } => {
  const defaultFolder = getConsolidatedFolderName(config)
  const subDir = path.join(outputDir, dateString, defaultFolder)
  const fileName = 'test-logs.log'
  return { subDir, fileName }
}

/** Determines the base output directory for logs using the config,
 * or falls back to 'playwright-logs'. */
const getOutputDir = (config: LoggingConfig): string =>
  (typeof config.fileLogging === 'object' && config.fileLogging?.outputDir) ||
  'playwright-logs'

/** Determines if log consolidation is forced by config. */
const isForceConsolidated = (config: LoggingConfig): boolean =>
  typeof config.fileLogging === 'object' &&
  config.fileLogging.forceConsolidated === true

/** Determines if test context (test file or test name) is available
 * and should be used to organize logs. */
const hasTestContext = (
  config: LoggingConfig,
  testFile?: string,
  testName?: string
): boolean => !isForceConsolidated(config) && Boolean(testFile || testName)

/* FINAL IMPURE FUNCTION */

/** Creates a file path for logs based on test context.
 * This function uses pure helper functions for decision logic,
 * while managing side effects (directory creation) as needed. */
export function createLogFilePath(context: LogContext): string {
  const { config, testFile, testName, options } = context

  const outputDir = getOutputDir(config)
  ensureDirectoryExists(outputDir)

  const dateString = getFormattedDate()

  const { subDir, fileName } = hasTestContext(config, testFile, testName)
    ? getSubDirAndFileNameForTestContext(
        outputDir,
        dateString,
        testFile,
        testName,
        options
      )
    : getSubDirAndFileNameForConsolidated(outputDir, dateString, config)

  ensureDirectoryExists(subDir)
  return path.join(subDir, fileName)
}
