/**
 * Type definitions for network traffic recording and playback operations
 *
 * This file contains shared type definitions used by the network recorder:
 * - har-manager.ts
 * - mode-detector.ts
 * - network-recorder.ts
 */

// =========================================================================
// Network Recording Mode Types
// =========================================================================

/**
 * Supported network recording modes
 */
export type NetworkMode = 'record' | 'playback' | 'disabled'

/**
 * Environment variable name for network mode
 */
export const NETWORK_MODE_ENV_VAR = 'PW_NET_MODE' as const

// =========================================================================
// HAR File Types
// =========================================================================

/**
 * HAR file configuration options
 */
export type HarFileOptions = {
  /**
   * Directory where HAR files are stored
   * @default 'har-files'
   */
  harDir?: string
  /**
   * Base name for HAR files (test name will be appended)
   */
  baseName?: string
  /**
   * Whether to create subdirectories by test file
   * @default true
   */
  organizeByTestFile?: boolean
}

/**
 * HAR recording options
 */
export type HarRecordingOptions = {
  /**
   * Whether to record response content
   * @default true
   */
  content?: 'embed' | 'attach'
  /**
   * Mode for recording
   * @default 'minimal'
   */
  mode?: 'full' | 'minimal'
  /**
   * URL patterns to include in recording
   */
  urlFilter?: string | RegExp
  /**
   * Whether to update existing HAR files
   * @default false
   */
  update?: boolean
}

/**
 * HAR playback options
 */
export type HarPlaybackOptions = {
  /**
   * Whether to fall back to live requests if HAR entry not found
   * @default false
   */
  fallback?: boolean
  /**
   * URL patterns to include in playback
   */
  urlFilter?: string | RegExp
  /**
   * Whether to update HAR files during playback for missing entries
   * @default false
   */
  updateMode?: boolean
}

// =========================================================================
// Network Recorder Configuration
// =========================================================================

/**
 * Network recorder configuration
 */
export type NetworkRecorderConfig = {
  /**
   * HAR file options
   */
  harFile?: HarFileOptions
  /**
   * Recording options (used in record mode)
   */
  recording?: HarRecordingOptions
  /**
   * Playback options (used in playback mode)
   */
  playback?: HarPlaybackOptions
  /**
   * Force a specific mode regardless of environment
   */
  forceMode?: NetworkMode
  /**
   * Automatically switch to record mode when HAR file is missing in playback mode
   * @default true
   */
  autoRecordFallback?: boolean
}

// =========================================================================
// Network Recorder Context
// =========================================================================

/**
 * Network recorder context passed to tests
 */
export type NetworkRecorderContext = {
  /**
   * Current network mode
   */
  mode: NetworkMode
  /**
   * Path to HAR file for this test
   */
  harFilePath: string
  /**
   * Whether recording/playback is active for this test
   */
  isActive: boolean
  /**
   * Configuration used for this test
   */
  config: NetworkRecorderConfig
}

// =========================================================================
// Error Types
// =========================================================================

/**
 * Custom error for network recording operations
 */
export class NetworkRecorderError extends Error {
  constructor(
    message: string,
    public readonly operation?: 'record' | 'playback' | 'setup',
    public readonly harFilePath?: string
  ) {
    super(message)
    this.name = 'NetworkRecorderError'
  }
}

/**
 * Custom error for HAR file operations
 */
export class HarFileError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly operation?: 'read' | 'write' | 'validate'
  ) {
    super(message)
    this.name = 'HarFileError'
  }
}

/**
 * Custom error for mode detection
 */
export class ModeDetectionError extends Error {
  constructor(
    message: string,
    public readonly envValue?: string
  ) {
    super(message)
    this.name = 'ModeDetectionError'
  }
}
