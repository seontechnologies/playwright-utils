/**
 * Core network recorder implementation
 *
 * This module provides the main NetworkRecorder class that:
 * - Manages HAR recording and playback based on detected mode
 * - Integrates with Playwright's browser context
 * - Handles authentication-agnostic setup
 * - Provides concurrent test safety
 */

import type { BrowserContext, TestInfo } from '@playwright/test'
import { promises as fs } from 'fs'
import {
  addPageToHar,
  createHarFile,
  requestToHarEntry,
  type HarFile
} from './har-builder'
import {
  acquireHarFileLock,
  ensureHarDirectory,
  generateHarFilePath,
  getHarFileStats,
  validateHarFileForPlayback
} from './har-manager'
import { setupCustomHarPlayback } from './har-playback-handler'
import { createStatefulApiMock } from './stateful-api-mock'
import {
  getEffectiveNetworkMode,
  getModeDefaults,
  getModeDescription,
  isNetworkModeActive,
  validateModeConfiguration
} from './mode-detector'
import type {
  HarPlaybackOptions,
  HarRecordingOptions,
  NetworkMode,
  NetworkRecorderConfig,
  NetworkRecorderContext
} from './types'
import { NetworkRecorderError } from './types'
import { log } from '../../log'

/**
 * Main network recorder class
 */
export class NetworkRecorder {
  private mode: NetworkMode
  private config: NetworkRecorderConfig
  private harFilePath: string
  private releaseLock?: () => Promise<void>
  private isSetup = false
  private harData?: HarFile
  private recordedRequests: Map<string, { startTime: number }> = new Map()

  constructor(
    private testInfo: TestInfo,
    config: NetworkRecorderConfig = {}
  ) {
    // Detect effective mode and merge with defaults
    this.mode = getEffectiveNetworkMode(config)
    const modeDefaults = getModeDefaults(this.mode)
    this.config = { ...modeDefaults, ...config }

    // Generate HAR file path
    this.harFilePath = generateHarFilePath(testInfo, this.config.harFile)

    // Validate configuration
    const validation = validateModeConfiguration(this.config, this.mode)
    if (!validation.isValid) {
      throw new NetworkRecorderError(
        `Invalid configuration for mode '${this.mode}': ${validation.issues.join(', ')}`,
        'setup'
      )
    }
  }

  /**
   * Gets the current network recorder context
   */
  getContext(): NetworkRecorderContext {
    return {
      mode: this.mode,
      harFilePath: this.harFilePath,
      isActive: isNetworkModeActive(this.mode),
      config: this.config
    }
  }

  /**
   * Sets up network recording/playback on the browser context
   *
   * @param context - Playwright browser context (must be authenticated if needed)
   */
  async setup(context: BrowserContext): Promise<void> {
    if (this.isSetup) {
      throw new NetworkRecorderError(
        'NetworkRecorder is already set up. Call cleanup() before setting up again.',
        'setup'
      )
    }

    if (!isNetworkModeActive(this.mode)) {
      // Mode is disabled, nothing to do
      this.isSetup = true
      return
    }

    try {
      // Acquire file lock for concurrent test safety
      this.releaseLock = await acquireHarFileLock(this.harFilePath)

      if (this.mode === 'record') {
        await log.step(`🎬 Recording network traffic to: ${this.harFilePath}`)
        await this.setupRecording(context)
      } else if (this.mode === 'playback') {
        await log.step(
          `📼 Playing back network traffic from: ${this.harFilePath}`
        )
        await this.setupPlayback(context)
      }

      this.isSetup = true
    } catch (error) {
      // Clean up lock if setup fails
      if (this.releaseLock) {
        await this.releaseLock()
        this.releaseLock = undefined
      }

      throw new NetworkRecorderError(
        `Failed to setup network recorder in ${this.mode} mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'setup',
        this.harFilePath
      )
    }
  }

  /**
   * Cleans up network recorder resources
   *
   * Flushes recorded network data to disk and cleans up memory:
   * - Writes HAR file (if recording mode with entries)
   * - Releases file locks for concurrent safety
   * - Clears in-memory HAR data and recorded requests
   * - Resets internal state flags
   *
   * Note: This does NOT delete HAR files - only cleans up memory/state
   */
  async cleanup(): Promise<void> {
    // Write HAR file if we were recording
    if (
      this.mode === 'record' &&
      this.harData &&
      this.harData.log.entries.length > 0
    ) {
      await log.step(
        `💾 Saving ${this.harData.log.entries.length} recorded requests to: ${this.harFilePath}`
      )
      try {
        await fs.writeFile(
          this.harFilePath,
          JSON.stringify(this.harData, null, 2),
          'utf-8'
        )
      } catch (error) {
        throw new NetworkRecorderError(
          `Failed to write HAR file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'record',
          this.harFilePath
        )
      }
    }

    if (this.releaseLock) {
      await this.releaseLock()
      this.releaseLock = undefined
    }

    this.isSetup = false
    this.harData = undefined
    this.recordedRequests.clear()
  }

  /**
   * Gets HAR file statistics
   */
  async getHarStats() {
    return getHarFileStats(this.harFilePath)
  }

  /**
   * Gets a human-readable status message
   */
  getStatusMessage(): string {
    const modeDescription = getModeDescription(this.mode)
    const setupStatus = this.isSetup ? 'active' : 'inactive'

    if (!isNetworkModeActive(this.mode)) {
      return `Network recorder: ${modeDescription}`
    }

    return `Network recorder: ${modeDescription} (${setupStatus}) - HAR: ${this.harFilePath}`
  }

  /**
   * Sets up HAR recording on the browser context
   */
  private async setupRecording(context: BrowserContext): Promise<void> {
    await ensureHarDirectory(this.harFilePath)

    const recordingOptions: HarRecordingOptions = this.config.recording || {}

    // Initialize HAR data structure
    this.harData = createHarFile()
    addPageToHar(this.harData, this.testInfo.testId, this.testInfo.title)

    // Set up route handler to intercept and record all matching requests
    await context.route(recordingOptions.urlFilter || '**/*', async (route) => {
      const request = route.request()
      const requestId = `${request.method()}_${request.url()}_${Date.now()}`

      // Record request start time
      this.recordedRequests.set(requestId, { startTime: Date.now() })

      // Continue the request and capture the response
      try {
        const response = await route.fetch()
        const endTime = Date.now()
        const startTime =
          this.recordedRequests.get(requestId)?.startTime || endTime

        // Create HAR entry from request/response
        if (this.harData && this.harData.log) {
          const harEntry = await requestToHarEntry(
            request,
            response,
            startTime,
            endTime
          )
          this.harData.log.entries.push(harEntry)
        }

        // Fulfill the request with the actual response
        await route.fulfill({
          response,
          body:
            recordingOptions.content === 'embed'
              ? await response.body()
              : undefined
        })
      } catch (error) {
        console.warn('Failed to process response:', error)
        // Handle failed requests
        const endTime = Date.now()
        const startTime =
          this.recordedRequests.get(requestId)?.startTime || endTime

        if (this.harData) {
          const harEntry = await requestToHarEntry(
            request,
            null,
            startTime,
            endTime
          )
          this.harData.log.entries.push(harEntry)
        }

        await route.abort()
      } finally {
        this.recordedRequests.delete(requestId)
      }
    })
  }

  /**
   * Sets up HAR playback on the browser context
   */
  private async setupPlayback(context: BrowserContext): Promise<void> {
    const playbackOptions: HarPlaybackOptions = this.config.playback || {}

    // Validate HAR file exists and is readable
    const isValidHar = await validateHarFileForPlayback(this.harFilePath)
    if (!isValidHar) {
      // Check if auto-record fallback is enabled (default: true)
      if (this.config.autoRecordFallback !== false) {
        await log.info(
          `📼➡️🎬 HAR file missing/invalid - automatically switching to record mode: ${this.harFilePath}`
        )

        // Switch mode and setup recording instead
        this.mode = 'record'
        await this.setupRecording(context)
        return
      }

      if (playbackOptions.fallback) {
        // Fallback mode - let requests go through live
        return
      } else {
        throw new NetworkRecorderError(
          `HAR file not found or invalid for playback: ${this.harFilePath}`,
          'playback',
          this.harFilePath
        )
      }
    }

    // Check if HAR contains CRUD operations that need stateful handling
    const needsStatefulHandling = await this.checkIfNeedsStatefulHandling()

    if (needsStatefulHandling) {
      await log.debug(
        '🎭 Detected CRUD operations - using stateful mock for better reliability'
      )

      // Use stateful mock for CRUD operations
      const mock = createStatefulApiMock()
      await mock.setup(context)

      await log.info('Using intelligent stateful mock for CRUD operations')
    } else {
      // Use custom HAR playback for other cases
      await log.debug(
        `📼 Setting up custom HAR playback from: ${this.harFilePath}`
      )
      await log.debug(`   Fallback mode: ${playbackOptions.fallback}`)

      await setupCustomHarPlayback(context, this.harFilePath, {
        fallback: playbackOptions.fallback
      })
    }
  }

  /**
   * Check if HAR file contains CRUD operations that need stateful handling
   */
  private async checkIfNeedsStatefulHandling(): Promise<boolean> {
    try {
      const harContent = await fs.readFile(this.harFilePath, 'utf-8')
      const harData = JSON.parse(harContent)

      // Look for patterns that indicate CRUD operations
      const entries = harData.log.entries || []
      const methods = entries.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => `${e.request.method} ${e.request.url}`
      )

      // Check for CRUD patterns (multiple GETs to same resource with mutations in between)
      const hasMultipleGets =
        methods.filter(
          (m: string) => m.includes('GET') && m.includes('/movies')
        ).length > 2
      const hasMutations = methods.some(
        (m: string) =>
          m.includes('POST') || m.includes('PUT') || m.includes('DELETE')
      )

      return hasMultipleGets && hasMutations
    } catch {
      return false
    }
  }
}

/**
 * Creates a network recorder instance for the given test
 *
 * @param testInfo - Playwright test info
 * @param config - Network recorder configuration
 * @returns NetworkRecorder instance
 */
export function createNetworkRecorder(
  testInfo: TestInfo,
  config: NetworkRecorderConfig = {}
): NetworkRecorder {
  return new NetworkRecorder(testInfo, config)
}
