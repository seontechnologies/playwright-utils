/**
 * HAR file management utilities for network traffic recording and playback
 *
 * This module provides utilities for:
 * - Generating HAR file paths based on test context
 * - Creating HAR directories
 * - Validating HAR files for playback
 * - Managing concurrent test safety with file locking
 */

import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import * as lockfile from 'proper-lockfile'
import type { TestInfo } from '@playwright/test'
import { HarFileError } from './types'
import type { HarFileOptions } from './types'

/**
 * Default HAR file options
 */
const DEFAULT_HAR_OPTIONS: Required<HarFileOptions> = {
  harDir: 'har-files',
  baseName: 'network-traffic',
  organizeByTestFile: true
} as const

/**
 * Generates a HAR file path for a given test
 *
 * @param testInfo - Playwright test info
 * @param options - HAR file options
 * @returns HAR file path
 */
export function generateHarFilePath(
  testInfo: TestInfo,
  options: HarFileOptions = {}
): string {
  const config = { ...DEFAULT_HAR_OPTIONS, ...options }

  // Extract test file name without extension and path
  const testFileName = path
    .basename(testInfo.file, '.spec.ts')
    .replace(/[^a-zA-Z0-9-_]/g, '-')

  // Create test-specific identifier from title
  const testTitle = testInfo.title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) // Limit length

  // Build HAR file name
  const harFileName = `${config.baseName}-${testTitle}.har`

  // Build full path
  if (config.organizeByTestFile) {
    return path.join(config.harDir, testFileName, harFileName)
  } else {
    return path.join(config.harDir, harFileName)
  }
}

/**
 * Ensures HAR directory exists for the given file path
 *
 * @param harFilePath - HAR file path
 */
export async function ensureHarDirectory(harFilePath: string): Promise<void> {
  const harDir = path.dirname(harFilePath)

  try {
    await fs.access(harDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.mkdir(harDir, { recursive: true })
    } else {
      throw new HarFileError(
        `Failed to access HAR directory: ${harDir}`,
        harFilePath,
        'read'
      )
    }
  }
}

/**
 * Validates that a HAR file exists and is readable for playback
 *
 * @param harFilePath - HAR file path
 * @returns true if HAR file is valid for playback
 */
export async function validateHarFileForPlayback(
  harFilePath: string
): Promise<boolean> {
  try {
    const stats = await fs.stat(harFilePath)
    if (!stats.isFile()) {
      return false
    }

    // Try to read and parse the HAR file
    const harContent = await fs.readFile(harFilePath, 'utf-8')
    const harData = JSON.parse(harContent)

    // Basic HAR structure validation
    if (!harData.log || !Array.isArray(harData.log.entries)) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Acquires a lock for HAR file operations to ensure concurrent test safety
 *
 * @param harFilePath - HAR file path
 * @returns Promise that resolves to a release function
 */
export async function acquireHarFileLock(
  harFilePath: string
): Promise<() => Promise<void>> {
  const lockFilePath = `${harFilePath}.lock`

  try {
    // Ensure the directory exists before creating lock file
    await ensureHarDirectory(harFilePath)

    // Create lock file if it doesn't exist
    try {
      await fs.access(lockFilePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.writeFile(lockFilePath, '')
      }
    }

    const release = await lockfile.lock(lockFilePath, {
      retries: {
        retries: 10,
        factor: 1.5,
        minTimeout: 100,
        maxTimeout: 2000
      }
    })

    return release
  } catch (error) {
    throw new HarFileError(
      `Failed to acquire lock for HAR file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      harFilePath,
      'write'
    )
  }
}

/**
 * Removes a HAR file and its lock file
 *
 * @param harFilePath - HAR file path
 */
export async function removeHarFile(harFilePath: string): Promise<void> {
  try {
    await fs.unlink(harFilePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new HarFileError(
        `Failed to remove HAR file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        harFilePath,
        'write'
      )
    }
  }

  // Also remove lock file if it exists
  const lockFilePath = `${harFilePath}.lock`
  try {
    await fs.unlink(lockFilePath)
  } catch (error) {
    // Ignore if lock file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new HarFileError(
        `Failed to remove HAR lock file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lockFilePath,
        'write'
      )
    }
  }
}

/**
 * Creates a unique HAR file path to avoid conflicts
 *
 * @param basePath - Base HAR file path
 * @returns Unique HAR file path
 */
export function createUniqueHarFilePath(basePath: string): string {
  const ext = path.extname(basePath)
  const nameWithoutExt = basePath.slice(0, -ext.length)
  const uniqueId = uuidv4().slice(0, 8)

  return `${nameWithoutExt}-${uniqueId}${ext}`
}

/**
 * Gets HAR file stats and metadata
 *
 * @param harFilePath - HAR file path
 * @returns HAR file metadata
 */
export async function getHarFileStats(harFilePath: string) {
  try {
    const stats = await fs.stat(harFilePath)
    const harContent = await fs.readFile(harFilePath, 'utf-8')
    const harData = JSON.parse(harContent)

    return {
      exists: true,
      size: stats.size,
      modified: stats.mtime,
      entriesCount: harData.log?.entries?.length || 0,
      version: harData.log?.version || 'unknown'
    }
  } catch (error) {
    return {
      exists: false,
      size: 0,
      modified: null,
      entriesCount: 0,
      version: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
