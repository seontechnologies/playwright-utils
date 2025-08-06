/**
 * Network recorder Playwright fixture
 *
 * This fixture provides seamless integration with Playwright tests by:
 * - Automatically detecting network mode from environment
 * - Setting up recording/playback on browser context
 * - Handling cleanup automatically
 * - Being authentication-agnostic (works with pre-authenticated contexts)
 */

import { test as base } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import { NetworkRecorder } from './core'
import type { NetworkRecorderConfig, NetworkRecorderContext } from './core'

/**
 * Network recorder fixture type
 */
export type NetworkRecorderFixtures = {
  networkRecorder: {
    /**
     * Sets up network recording/playback on the browser context
     *
     * @param context - Playwright browser context (should be pre-authenticated if needed)
     * @param config - Optional configuration override
     * @returns Network recorder context
     */
    setup: (
      context: BrowserContext,
      config?: NetworkRecorderConfig
    ) => Promise<NetworkRecorderContext>

    /**
     * Gets the current network recorder context without setup
     *
     * @param config - Optional configuration override
     * @returns Network recorder context
     */
    getContext: (config?: NetworkRecorderConfig) => NetworkRecorderContext

    /**
     * Creates a network recorder instance
     *
     * @param config - Optional configuration override
     * @returns NetworkRecorder instance
     */
    create: (config?: NetworkRecorderConfig) => NetworkRecorder

    /**
     * Gets the status message for the current recorder
     *
     * @returns Human-readable status message
     */
    getStatus: () => string

    /**
     * Manually cleanup the active recorder
     *
     * Flushes recorded data to disk and clears memory/state.
     * Note: This is automatically called after the test completes.
     * Does NOT delete HAR files - only cleans up memory.
     *
     * @returns Promise that resolves when cleanup is complete
     */
    cleanup: () => Promise<void>

    /**
     * Gets HAR file statistics
     *
     * @returns Promise with HAR file stats
     */
    getHarStats: () => Promise<{
      exists: boolean
      size: number
      entriesCount: number
      modified: Date | null
      version: string
      error?: string
    }>

    /**
     * Gets the status message for the current recorder
     *
     * @returns Human-readable status message
     */
    getStatusMessage: () => string
  }
}

export const test = base.extend<NetworkRecorderFixtures>({
  networkRecorder: async ({}, use, testInfo) => {
    let activeRecorder: NetworkRecorder | undefined

    const fixture = {
      async setup(
        context: BrowserContext,
        config?: NetworkRecorderConfig
      ): Promise<NetworkRecorderContext> {
        // Clean up any existing recorder
        if (activeRecorder) {
          await activeRecorder.cleanup()
        }

        // Create new recorder
        activeRecorder = new NetworkRecorder(testInfo, config)

        // Set up recording/playback on the context
        await activeRecorder.setup(context)

        return activeRecorder.getContext()
      },

      getContext(config?: NetworkRecorderConfig): NetworkRecorderContext {
        if (activeRecorder) {
          return activeRecorder.getContext()
        }

        // Create temporary recorder just to get context
        const tempRecorder = new NetworkRecorder(testInfo, config)
        return tempRecorder.getContext()
      },

      create(config?: NetworkRecorderConfig): NetworkRecorder {
        return new NetworkRecorder(testInfo, config)
      },

      getStatus(): string {
        if (activeRecorder) {
          return activeRecorder.getStatusMessage()
        }
        return 'Network recorder: not initialized'
      },

      async cleanup(): Promise<void> {
        if (activeRecorder) {
          await activeRecorder.cleanup()
        }
      },

      async getHarStats(): Promise<{
        exists: boolean
        size: number
        entriesCount: number
        modified: Date | null
        version: string
        error?: string
      }> {
        if (activeRecorder) {
          return activeRecorder.getHarStats()
        }
        return {
          exists: false,
          size: 0,
          entriesCount: 0,
          modified: null,
          version: 'unknown',
          error: 'No active recorder'
        }
      },

      getStatusMessage(): string {
        if (activeRecorder) {
          return activeRecorder.getStatusMessage()
        }
        return 'Network recorder: not initialized'
      }
    }

    await use(fixture)

    // Cleanup after test
    if (activeRecorder) {
      await activeRecorder.cleanup()
    }
  }
})
