/**
 * Core network recorder exports
 */

// Main classes and functions
export { NetworkRecorder, createNetworkRecorder } from './network-recorder'

// HAR management utilities
export {
  generateHarFilePath,
  ensureHarDirectory,
  validateHarFileForPlayback,
  acquireHarFileLock,
  removeHarFile,
  createUniqueHarFilePath,
  getHarFileStats
} from './har-manager'

// Mode detection utilities
export {
  detectNetworkMode,
  isValidNetworkMode,
  getEffectiveNetworkMode,
  isNetworkModeActive,
  getModeDefaults,
  validateModeConfiguration,
  getModeDescription
} from './mode-detector'

// HAR builder utilities
export {
  createHarFile,
  requestToHarEntry,
  addPageToHar,
  addEntryToHar
} from './har-builder'

// Types
export type * from './types'
