/**
 * Network mode detection utilities
 *
 * This module provides utilities for:
 * - Detecting network recording mode from environment variables
 * - Validating mode configuration
 * - Providing mode-specific defaults
 */

import { ModeDetectionError } from './types'
import type { NetworkMode, NetworkRecorderConfig } from './types'

/**
 * Valid network mode values
 */
const VALID_MODES: readonly NetworkMode[] = [
  'record',
  'playback',
  'disabled'
] as const

/**
 * Detects network mode from environment variable
 *
 * @param envVar - Environment variable name (defaults to PW_NET_MODE)
 * @returns Detected network mode
 */
export function detectNetworkMode(envVar: string = 'PW_NET_MODE'): NetworkMode {
  const modeValue = process.env[envVar]?.toLowerCase()

  if (!modeValue) {
    return 'disabled'
  }

  if (isValidNetworkMode(modeValue)) {
    return modeValue
  }

  throw new ModeDetectionError(
    `Invalid network mode '${modeValue}'. Valid modes are: ${VALID_MODES.join(', ')}`,
    modeValue
  )
}

/**
 * Type guard to check if a string is a valid network mode
 *
 * @param mode - Mode string to validate
 * @returns true if mode is valid
 */
export function isValidNetworkMode(mode: string): mode is NetworkMode {
  return (VALID_MODES as readonly string[]).includes(mode)
}

/**
 * Gets the effective network mode considering config overrides
 *
 * @param config - Network recorder configuration
 * @param envVar - Environment variable name
 * @returns Effective network mode
 */
export function getEffectiveNetworkMode(
  config: NetworkRecorderConfig = {},
  envVar: string = 'PW_NET_MODE'
): NetworkMode {
  // Config override takes precedence
  if (config.forceMode && isValidNetworkMode(config.forceMode)) {
    return config.forceMode
  }

  // Otherwise use environment detection
  return detectNetworkMode(envVar)
}

/**
 * Checks if network recording/playback should be active
 *
 * @param mode - Network mode
 * @returns true if network operations should be active
 */
export function isNetworkModeActive(mode: NetworkMode): boolean {
  return mode === 'record' || mode === 'playback'
}

/**
 * Gets mode-specific default configuration
 *
 * @param mode - Network mode
 * @returns Mode-specific configuration defaults
 */
export function getModeDefaults(
  mode: NetworkMode
): Partial<NetworkRecorderConfig> {
  switch (mode) {
    case 'record':
      return {
        recording: {
          content: 'embed',
          mode: 'minimal',
          update: false
        },
        playback: {
          fallback: false,
          updateMode: false
        }
      }

    case 'playback':
      return {
        recording: {
          content: 'embed',
          mode: 'minimal',
          update: false
        },
        playback: {
          fallback: false,
          updateMode: false
        },
        autoRecordFallback: true
      }

    case 'disabled':
    default:
      return {}
  }
}

/**
 * Validates network recorder configuration for the given mode
 *
 * @param config - Network recorder configuration
 * @param mode - Network mode
 * @returns Validation result with any issues
 */
export function validateModeConfiguration(
  config: NetworkRecorderConfig,
  mode: NetworkMode
): { isValid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check for conflicting configurations
  if (
    mode === 'disabled' &&
    config.forceMode &&
    config.forceMode !== 'disabled'
  ) {
    issues.push(`Mode is disabled but config forces mode '${config.forceMode}'`)
  }

  if (mode === 'playback' && config.recording?.update) {
    issues.push(
      'Recording update is enabled in playback mode - this may cause unexpected behavior'
    )
  }

  if (mode === 'record' && config.playback?.fallback) {
    issues.push(
      'Playback fallback is enabled in record mode - this may cause unexpected behavior'
    )
  }

  // Validate URL filters if present
  const recordingFilters = config.recording?.urlFilter
  const playbackFilters = config.playback?.urlFilter

  if (recordingFilters && !isValidUrlFilter(recordingFilters)) {
    issues.push('Invalid recording URL filter configuration')
  }

  if (playbackFilters && !isValidUrlFilter(playbackFilters)) {
    issues.push('Invalid playback URL filter configuration')
  }

  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Validates URL filter configuration
 *
 * @param filter - URL filter to validate
 * @returns true if filter is valid
 */
function isValidUrlFilter(
  filter: string | RegExp | Array<string | RegExp>
): boolean {
  try {
    if (typeof filter === 'string') {
      return filter.length > 0
    }

    if (filter instanceof RegExp) {
      return true
    }

    if (Array.isArray(filter)) {
      return (
        filter.length > 0 &&
        filter.every(
          (f) => (typeof f === 'string' && f.length > 0) || f instanceof RegExp
        )
      )
    }

    return false
  } catch {
    return false
  }
}

/**
 * Gets a human-readable description of the current mode
 *
 * @param mode - Network mode
 * @returns Human-readable mode description
 */
export function getModeDescription(mode: NetworkMode): string {
  switch (mode) {
    case 'record':
      return 'Recording network traffic to HAR files'
    case 'playback':
      return 'Playing back network traffic from HAR files'
    case 'disabled':
      return 'Network recording/playback is disabled'
    default:
      return `Unknown mode: ${mode}`
  }
}
