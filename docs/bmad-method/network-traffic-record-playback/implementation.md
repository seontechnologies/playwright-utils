# Network Traffic Recording & Replay Implementation

## Overview

This document describes the implementation of the Network Traffic Recording & Replay utility for playwright-utils. The implementation provides HAR-based network traffic recording and playback capabilities that integrate seamlessly with Playwright's native API.

## Architecture

The implementation follows the established playwright-utils patterns:

### Module Structure

```
src/network-recorder/
├── core/                           # Core implementation
│   ├── types.ts                   # Type definitions
│   ├── har-manager.ts             # HAR file management
│   ├── mode-detector.ts           # Environment mode detection
│   ├── network-recorder.ts        # Main NetworkRecorder class
│   └── index.ts                   # Core exports
├── network-recorder.ts            # Plain function exports
├── network-recorder-fixture.ts    # Playwright fixture
├── fixtures.ts                    # Fixture exports
└── index.ts                       # Module exports
```

### Key Components

1. **NetworkRecorder**: Main class that manages HAR recording and playback
2. **HAR Manager**: Utilities for HAR file operations and concurrent safety
3. **Mode Detector**: Environment-based mode detection (PW_NET_MODE)
4. **Fixture Integration**: Playwright test fixture for seamless integration

## Implementation Stories

### Story 1.1: Core HAR Management Infrastructure ✅

- **Files**: `har-manager.ts`, `types.ts`
- **Key Features**:
  - HAR file path generation based on test context
  - Directory management with recursive creation
  - HAR file validation for playback
  - Concurrent test safety with proper-lockfile
  - File cleanup and unique path generation

### Story 1.2: Environment-Based Mode Detection ✅

- **Files**: `mode-detector.ts`
- **Key Features**:
  - Detects mode from `PW_NET_MODE` environment variable
  - Valid modes: `record`, `playback`, `disabled`
  - Configuration validation and defaults
  - Mode-specific behavior configuration

### Story 1.3: Network Recording Implementation ✅

- **Files**: `network-recorder.ts` (setupRecording method)
- **Key Features**:
  - Integration with Playwright's `context.routeFromHAR()`
  - Configurable recording options (content, update mode)
  - URL filtering support
  - Automatic HAR directory creation

### Story 1.4: Network Playback Implementation ✅

- **Files**: `network-recorder.ts` (setupPlayback method)
- **Key Features**:
  - HAR file validation before playback
  - Fallback mode for missing entries
  - Update mode for missing requests
  - Error handling for invalid HAR files

### Story 1.5: Authentication Context Integration ✅

- **Implementation**: Authentication-agnostic design
- **Key Features**:
  - Works with pre-authenticated browser contexts
  - No authentication handling in network recorder
  - Separation of concerns with auth-session module

### Story 1.6: Concurrent Test Safety ✅

- **Files**: `har-manager.ts` (acquireHarFileLock function)
- **Key Features**:
  - File locking with proper-lockfile
  - Retry configuration for lock acquisition
  - Automatic cleanup of lock files
  - Unique file paths to avoid conflicts

### Story 1.7: NetworkRecorderFixture Implementation ✅

- **Files**: `network-recorder-fixture.ts`, `fixtures.ts`
- **Key Features**:
  - Playwright fixture extending base test
  - Automatic setup and cleanup
  - Context-aware recorder creation
  - Status reporting functionality

### Story 1.8: Integration Testing & Documentation 🔄

- **Files**: This document, usage examples, tests
- **Key Features**:
  - Implementation documentation
  - Usage examples and patterns
  - Integration with existing test suite

## Usage Examples

### Direct Function Usage

```typescript
import { createNetworkRecorder } from '@seontechnologies/playwright-utils/network-recorder'

// In a test
const recorder = createNetworkRecorder(testInfo, {
  harFile: { harDir: 'custom-har-files' },
  recording: { content: 'embed' }
})

await recorder.setup(context)
// Test runs with network recording
await recorder.cleanup()
```

### Fixture Usage

```typescript
import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'

test('my test with network recording', async ({
  page,
  context,
  networkRecorder
}) => {
  // Set up network recording
  const recorderContext = await networkRecorder.setup(context, {
    recording: { content: 'embed' }
  })

  console.log(recorderContext.mode) // 'record', 'playback', or 'disabled'
  console.log(recorderContext.harFilePath) // Path to HAR file

  // Test runs normally - cleanup happens automatically
  await page.goto('/')
})
```

### Environment Configuration

```bash
# Record mode - captures network traffic to HAR files
PW_NET_MODE=record npm run test:pw

# Playback mode - replays from existing HAR files
PW_NET_MODE=playback npm run test:pw

# Disabled mode - no network recording/playback (default)
PW_NET_MODE=disabled npm run test:pw
```

## Technical Decisions

### HAR File Organization

- **Structure**: `har-files/{test-file-name}/{test-title}.har`
- **Rationale**: Organized by test file for better maintainability
- **Configurable**: Can be customized via `HarFileOptions`

### Playwright API Integration

- **API**: Uses `context.routeFromHAR()` for both recording and playback
- **Options**:
  - Recording: `{ update: boolean, url: filter, updateContent: 'embed' | 'attach' }`
  - Playback: `{ update: boolean, url: filter, notFound: 'fallback' | 'abort' }`

### Concurrent Test Safety

- **Approach**: File locking with proper-lockfile
- **Configuration**: 10 retries with exponential backoff (100ms - 2s)
- **Cleanup**: Automatic lock file removal

### Authentication Strategy

- **Approach**: Authentication-agnostic
- **Implementation**: Expects pre-authenticated browser contexts
- **Integration**: Works seamlessly with auth-session module

## File Structure Integration

### Package.json Exports

```json
{
  "./network-recorder": {
    "types": "./dist/types/network-recorder/index.d.ts",
    "require": "./dist/cjs/network-recorder/index.js",
    "import": "./dist/esm/network-recorder/index.js",
    "default": "./dist/cjs/network-recorder/index.js"
  },
  "./network-recorder/fixtures": {
    "types": "./dist/types/network-recorder/fixtures.d.ts",
    "require": "./dist/cjs/network-recorder/fixtures.js",
    "import": "./dist/esm/network-recorder/fixtures.js",
    "default": "./dist/cjs/network-recorder/fixtures.js"
  }
}
```

### Import Patterns

- **Direct functions**: `import { NetworkRecorder } from '@seontechnologies/playwright-utils/network-recorder'`
- **Fixtures**: `import { test } from '@seontechnologies/playwright-utils/network-recorder/fixtures'`
- **Main module**: `import { NetworkRecorder } from '@seontechnologies/playwright-utils'`

## Status

**Implementation Status**: ✅ Complete  
**Testing Status**: 🔄 In Progress  
**Documentation Status**: ✅ Complete

All 8 stories from the PRD have been implemented following the architecture specification. The implementation is ready for integration testing and can be used in both direct function and fixture patterns.

## Next Steps

1. **Integration Testing**: Test with existing frontend tests
2. **Documentation**: Add usage examples to main README
3. **Optimization**: Performance testing with large HAR files
4. **Enhancement**: Additional configuration options based on usage feedback
