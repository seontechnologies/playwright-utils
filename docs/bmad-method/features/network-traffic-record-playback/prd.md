# SEON Playwright Utils - Network Traffic Recording & Replay Utility PRD

## Introduction

This document captures the CURRENT STATE of the SEON Playwright Utils codebase, including technical debt, workarounds, and real-world patterns. It serves as a reference for AI agents working on enhancements.

### Document Scope

Comprehensive documentation of entire system - TypeScript utility library for Playwright testing with modular utilities and fixtures.

### Change Log

| Change               | Date       | Version | Description                                    | Author |
| -------------------- | ---------- | ------- | ---------------------------------------------- | ------ |
| Initial PRD Creation | 2025-08-05 | 1.0     | Network Traffic Recording & Replay Utility PRD | John   |

## Section 1: Intro Project Analysis and Context

### Analysis Source

Document-project output available at: `docs/bmad-method/brownfield-architecture.md`

### Current Project State

SEON Playwright Utils is a TypeScript utility library providing modular utilities as both standalone functions and Playwright fixtures, following a "functional core, fixture shell" pattern.

### Available Documentation

✅ Tech Stack Documentation ✅ Source Tree/Architecture ✅ API Documentation ✅ External Dependencies ✅ Technical Debt Documentation

### Enhancement Scope Definition

**Enhancement Type**: ☑️ New Feature Addition

**Enhancement Description**: Create a network traffic recording and replay utility that captures HTTP requests/responses to HAR files during "record" mode and replays them from disk during "playback" mode. This enables frontend tests to run in complete isolation from backend services while maintaining realistic network data, similar to Gleb Bahmutov's Cypress magic network plugin.

**Impact Assessment**: ☑️ Moderate Impact (some existing code changes)

- New utility module following existing patterns
- Integration with current fixture system
- Addition to build/export configuration
- Sample app testing scenarios
- Documentation updates

### Goals and Background Context

**Goals**:

- Enable frontend tests to run without live backend dependencies
- Provide recording mode to capture real network traffic to HAR files
- Provide replay mode to serve responses from HAR files instantly
- Achieve significant test speed improvements (similar to Cypress plugin's 6s→500ms gains)
- Maintain full UI component rendering with realistic data
- Support per-route or per-test HAR file organization

**Background Context**:
Currently, playwright-utils provides excellent utilities for API requests, auth sessions, and network interception, but lacks a comprehensive record/replay solution for complete backend isolation. Frontend tests still depend on live backend services, making them slower and less reliable. This enhancement addresses the "holy grail of fast web testing" by implementing HAR-based network recording and replay, allowing teams to run full UI tests with realistic data at near unit-test speeds, without requiring backend availability.

## Requirements

### Functional Requirements

**FR1**: The network recorder shall provide a record mode that captures all HTTP requests and responses to HAR files using Playwright's native `recordHar` functionality
**FR2**: The network recorder shall provide a replay mode that serves responses from HAR files using Playwright's `routeFromHAR()` method  
**FR3**: The utility shall support environment-based mode switching (e.g., `PW_NET_MODE=record` vs `PW_NET_MODE=replay`)
**FR4**: The recorder shall support URL filtering to capture only relevant API calls (e.g., `**/api/**`) while excluding static assets and authentication endpoints
**FR5**: The utility shall organize HAR files by test name, route, or custom identifier to avoid conflicts
**FR6**: The recorder shall provide automatic fallback to record mode when no HAR file exists for a given test
**FR7**: The utility shall integrate with existing playwright-utils fixture patterns, providing both direct function and fixture interfaces
**FR8**: The recorder shall support configurable HAR file storage location with default organization structure

### Non-Functional Requirements

**NFR1**: Enhancement must maintain existing performance characteristics and not add overhead to non-recording tests
**NFR2**: HAR files shall be stored in a structured directory format that can be committed to source control
**NFR3**: Record mode shall complete HAR file writing within 2 seconds of context closure
**NFR4**: Replay mode shall serve responses with <50ms latency from HAR files
**NFR5**: The utility shall handle concurrent test execution without HAR file conflicts
**NFR6**: HAR file size shall be optimized using 'minimal' mode by default unless 'full' mode is explicitly requested

### Compatibility Requirements

**CR1**: Must operate independently of auth-session utilities, assuming authentication is pre-established at browser context level
**CR2**: Must preserve existing dual CJS/ESM build system and subpath exports structure  
**CR3**: Must integrate with current sample app testing architecture without breaking existing tests
**CR4**: Must follow existing TypeScript strict mode requirements and type safety standards
**CR5**: Should exclude authentication-related endpoints from recording to avoid auth token contamination in HAR files

### Design Constraint

**Design Principle**: The network recorder shall be **authentication-agnostic**. It assumes:

- Authentication is handled by existing auth-session utilities before test execution
- Browser context already contains valid authentication state (cookies, tokens, etc.)
- HAR recordings are made with stable authentication context
- Tests using dynamic authentication (ephemeral users, role switching) should NOT use record/replay mode

**Warning Documentation**: The utility should clearly document that record/replay mode is incompatible with:

- Tests that use `applyUserCookiesToBrowserContext` for on-the-fly authentication
- Tests that switch user roles mid-test
- Tests that deliberately test authentication flows

## Technical Constraints and Integration Requirements

### Existing Technology Stack

From the "Actual Tech Stack" analysis:

**Languages**: TypeScript 5.8.3 (strict mode enabled)
**Frameworks**: Playwright 1.54.1 (peer dependency), dual CJS/ESM build system
**Database**: N/A (utility library)
**Infrastructure**: Node.js >=20.0.0, npm package management
**External Dependencies**:

- Core: `uuid` for unique identifiers, `picomatch` for pattern matching
- File System: Built-in Node.js `fs` operations
- Playwright: Native `recordHar` and `routeFromHAR` APIs

### Integration Approach

**Database Integration Strategy**: Not applicable - HAR files stored as JSON on filesystem
**API Integration Strategy**: Operates at Playwright browser context level, intercepting all HTTP traffic through native HAR recording
**Frontend Integration Strategy**: Integrates as both standalone function and Playwright fixture, following existing patterns in `src/intercept-network-call/` and `src/auth-session/`
**Testing Integration Strategy**: Extends sample app testing with network recording scenarios, adds new test specifications for record/replay modes

### Code Organization and Standards

**File Structure Approach**:

```
src/network-recorder/
├── index.ts                    # Main exports (functions and types)
├── fixtures.ts                 # Playwright fixture exports
├── network-recorder-fixture.ts # Fixture implementation
├── network-recorder.ts         # Core recording/replay logic
└── core/
    ├── har-manager.ts          # HAR file management
    ├── mode-detector.ts        # Environment/mode detection
    ├── types.ts               # TypeScript definitions
    └── utils/
        └── file-organizer.ts   # HAR file organization
```

**Naming Conventions**: Follow existing camelCase for functions, PascalCase for types, kebab-case for files
**Coding Standards**: Strict TypeScript, functional programming patterns, comprehensive JSDoc comments
**Documentation Standards**: Module documentation in `docs/network-recorder.md` following existing format

### Deployment and Operations

**Build Process Integration**: Add to existing dual CJS/ESM build via `tsconfig-*.json`, include in subpath exports in `package.json`
**Deployment Strategy**: Published as part of `@seontechnologies/playwright-utils` package to public npm registry
**Monitoring and Logging**: Integration with existing `src/log/` utility for debugging record/replay operations
**Configuration Management**: Environment variables (`PW_NET_MODE`, `PW_NET_RECORD_PATH`) and programmatic options

### Risk Assessment and Mitigation

Based on "Technical Debt and Known Issues" from brownfield analysis:

**Technical Risks**:

- HAR file size growth with extensive API usage
- Concurrent test execution causing HAR file conflicts
- Platform-specific file path handling (similar to auth-session absolute paths)

**Integration Risks**:

- Conflict with existing `intercept-network-call` utility
- Auth token leakage in HAR files if authentication endpoints are recorded
- Replay failures when API contracts change between record and replay

**Deployment Risks**:

- HAR files committed to git causing repository bloat
- Missing HAR files in CI/CD causing test failures
- Node.js version compatibility for file system operations

**Mitigation Strategies**:

- Implement HAR file size limits and cleanup strategies
- Use file locking mechanisms similar to `proper-lockfile` in auth-session
- Provide clear URL filtering to exclude auth endpoints by default
- Add HAR file validation and regeneration workflows
- Include `.gitignore` recommendations for HAR file management

## Epic and Story Structure

**Epic Structure Decision**: Single epic with sequential story delivery, allowing incremental testing and validation while building toward the complete record/replay system.

Based on analysis of the existing project, this enhancement should be structured as a **single comprehensive epic** because:

1. **Cohesive Feature**: Network recording and replay are tightly coupled functionalities that work together as one system
2. **Shared Infrastructure**: Both modes share the same HAR management, file organization, and integration patterns
3. **Atomic Value**: The feature only delivers value when both record and replay capabilities are complete
4. **Consistent with Architecture**: Follows the pattern of other utilities in playwright-utils (each utility is self-contained)
5. **Dependencies**: The stories have clear sequential dependencies that work best within a single epic

## Epic 1: Network Traffic Recording & Replay Utility

**Epic Goal**: Enable frontend tests to capture and replay network traffic using HAR files, providing complete backend isolation while maintaining realistic data and significantly improving test execution speed.

**Integration Requirements**: Must integrate seamlessly with existing playwright-utils architecture, following the "functional core, fixture shell" pattern, supporting dual CJS/ESM builds, and maintaining compatibility with auth-session and other existing utilities.

### Story Sequence for Brownfield Integration

**CRITICAL STORY SEQUENCING RATIONALE**: These stories are sequenced to minimize risk to your existing system by building core functionality first, then layering on advanced features, and finally integrating with existing utilities. Each story includes verification that existing features still work.

### Story 1.1: Core HAR Management Infrastructure

As a **test developer**,
I want **basic HAR file management and organization capabilities**,
so that **I can store and retrieve network recordings in a structured way without conflicts**.

**Acceptance Criteria:**

1. HAR files are organized by test name or custom identifier in configurable directory structure
2. File naming prevents conflicts between parallel test execution
3. HAR files can be created, read, and validated for proper format
4. Directory structure follows playwright-utils conventions (e.g., `network-recordings/`)
5. File operations handle Node.js path differences across platforms

**Integration Verification:**

- IV1: Existing file-utils functionality remains unaffected and operational
- IV2: Sample app backend and frontend continue to function normally
- IV3: No performance impact on non-recording tests (<5ms overhead)

### Story 1.2: Record Mode Implementation

As a **test developer**,
I want **record mode functionality that captures HTTP requests to HAR files**,
so that **I can generate network recordings from real API interactions**.

**Acceptance Criteria:**

1. Environment variable `PW_NET_MODE=record` enables recording mode
2. Browser context configured with `recordHar` captures HTTP traffic
3. URL filtering excludes authentication endpoints and static assets by default
4. HAR files are properly written and closed when browser context ends
5. Configurable options for HAR mode ('minimal' vs 'full') and custom URL filters

**Integration Verification:**

- IV1: Existing auth-session utilities work normally during recording
- IV2: api-request utility functions are not interfered with during recording
- IV3: intercept-network-call utility remains compatible (no conflicts)

### Story 1.3: Replay Mode Implementation

As a **test developer**,
I want **replay mode functionality that serves responses from HAR files**,
so that **my tests can run without live backend dependencies**.

**Acceptance Criteria:**

1. Environment variable `PW_NET_MODE=replay` enables replay mode
2. `routeFromHAR()` properly intercepts requests and serves recorded responses
3. Requests not found in HAR are handled gracefully (abort/continue configurable)
4. Response matching works correctly for identical URLs with different parameters
5. Replay mode provides <50ms response latency from HAR files

**Integration Verification:**

- IV1: Existing sample app frontend components render correctly with HAR data
- IV2: Auth session tokens from HAR files don't interfere with existing auth utilities
- IV3: All existing tests continue to pass when not using record/replay mode

### Story 1.4: Automatic Mode Detection and Fallback

As a **test developer**,
I want **automatic recording when HAR files don't exist**,
so that **I don't need to manually manage initial recording setup**.

**Acceptance Criteria:**

1. System detects missing HAR files and automatically switches to record mode
2. Clear logging indicates when auto-recording is happening
3. Fallback behavior is configurable (auto-record vs fail-fast vs warn)
4. Generated HAR files follow same organization patterns as manual recording
5. Auto-recorded files are properly validated before first replay use

**Integration Verification:**

- IV1: Auto-detection doesn't interfere with existing test discovery mechanisms
- IV2: log utility properly captures and displays mode switching information
- IV3: Sample app tests work with both explicit mode setting and auto-detection

### Story 1.5: Core Functions and TypeScript Integration

As a **test developer**,
I want **standalone functions for network recording/replay operations**,
so that **I can use the utility directly without Playwright fixtures when needed**.

**Acceptance Criteria:**

1. Core functions: `recordNetworkTraffic()`, `replayNetworkTraffic()`, `setupNetworkMode()`
2. Comprehensive TypeScript definitions for all options and return types
3. Functions work independently of Playwright fixtures
4. Error handling provides clear messages for common issues (missing HAR, invalid mode, etc.)
5. Functions integrate with existing log utility for debugging

**Integration Verification:**

- IV1: Functions work alongside existing api-request and recurse utilities
- IV2: TypeScript strict mode compilation succeeds with all existing code
- IV3: Dual CJS/ESM build system processes new module correctly

### Story 1.6: Playwright Fixture Implementation

As a **test developer**,
I want **Playwright fixtures for network recording/replay**,
so that **I can use this utility with the same patterns as other playwright-utils fixtures**.

**Acceptance Criteria:**

1. `networkRecorder` fixture provides access to recording/replay functionality
2. Fixture automatically handles browser context setup based on mode
3. Integration with existing merged fixtures works without conflicts
4. Fixture provides same API surface as standalone functions
5. Test-level configuration options (HAR file name, URL filters, etc.)

**Integration Verification:**

- IV1: Existing fixtures (auth, apiRequest, log, etc.) continue to work normally
- IV2: Merged fixtures in sample app integrate the new fixture successfully
- IV3: Fixture cleanup properly closes contexts and saves HAR files

### Story 1.7: Sample App Integration and Testing

As a **test developer**,
I want **comprehensive examples and tests in the sample app**,
so that **I can understand how to use network recording in real scenarios**.

**Acceptance Criteria:**

1. Sample app includes tests demonstrating record mode with movie CRUD operations
2. Sample app includes tests demonstrating replay mode with stored HAR files
3. Tests cover both successful scenarios and error handling
4. Documentation shows integration with existing auth-session patterns
5. Performance benchmarks comparing live vs replay test execution times

**Integration Verification:**

- IV1: All existing sample app tests continue to pass
- IV2: New network recording tests don't interfere with existing CRUD tests
- IV3: Sample app frontend and backend continue to function independently

### Story 1.8: Documentation and Developer Experience

As a **test developer**,
I want **comprehensive documentation and developer tooling**,
so that **I can efficiently adopt and maintain network recording in my projects**.

**Acceptance Criteria:**

1. Complete documentation in `docs/network-recorder.md` following existing format
2. CLI recommendations for record/replay workflows
3. Best practices for HAR file management and source control
4. Troubleshooting guide for common issues
5. Migration guide for teams adopting from manual mocking approaches

**Integration Verification:**

- IV1: Documentation build process includes new documentation without errors
- IV2: Existing documentation links and structure remain intact
- IV3: README.md updates don't break existing installation or usage instructions

---

This story sequence is designed to minimize risk to your existing system by building incrementally from core file management through advanced fixture integration. Each story delivers value while ensuring existing functionality remains intact.

This comprehensive PRD provides the foundation for implementing a robust network traffic recording and replay utility that integrates seamlessly with the existing SEON Playwright Utils architecture while delivering significant value to frontend testing workflows.
