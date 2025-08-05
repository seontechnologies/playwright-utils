/**
 * Network recorder main export - provides direct function access
 *
 * This module provides functional access to network recording capabilities
 * for users who prefer direct function calls over fixtures.
 */

// Re-export main functionality
export { NetworkRecorder, createNetworkRecorder } from './core'

// Re-export utility functions
export {
  generateHarFilePath,
  ensureHarDirectory,
  validateHarFileForPlayback,
  acquireHarFileLock,
  removeHarFile,
  createUniqueHarFilePath,
  getHarFileStats
} from './core'

// Re-export mode detection functions
export {
  detectNetworkMode,
  isValidNetworkMode,
  getEffectiveNetworkMode,
  isNetworkModeActive,
  getModeDefaults,
  validateModeConfiguration,
  getModeDescription
} from './core'

// Re-export types
export type {
  NetworkMode,
  NETWORK_MODE_ENV_VAR,
  HarFileOptions,
  HarRecordingOptions,
  HarPlaybackOptions,
  NetworkRecorderConfig,
  NetworkRecorderContext,
  NetworkRecorderError,
  HarFileError,
  ModeDetectionError
} from './core'
