# SEON Playwright Utils Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the SEON Playwright Utils codebase, including technical debt, workarounds, and real-world patterns. It serves as a reference for AI agents working on enhancements.

### Document Scope

Comprehensive documentation of entire system - TypeScript utility library for Playwright testing with modular utilities and fixtures.

### Change Log

| Date       | Version | Description                           | Author |
| ---------- | ------- | ------------------------------------- | ------ |
| 2025-08-05 | 1.0     | Initial brownfield analysis           | Mary   |
| 2025-08-06 | 1.1     | Added network-recorder feature        | Mary   |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry**: `src/index.ts` (exports plain functions only)
- **Configuration**: `playwright.config.ts`, `tsconfig*.json` (multiple TypeScript configs)
- **Core Business Logic**: `src/api-request/`, `src/auth-session/`, `src/log/`, `src/recurse/`, `src/intercept-network-call/`, `src/file-utils/`
- **API Specifications**: `sample-app/backend/src/api-docs/openapi.yml`
- **Database Models**: `sample-app/backend/prisma/schema.prisma`
- **Sample Application**: `sample-app/` (full-stack testing environment)

## High Level Architecture

### Technical Summary

This is a **TypeScript utility library for Playwright testing** that provides modular utilities as both standalone functions and Playwright fixtures. The library follows a "functional core, fixture shell" pattern where all utilities can be used directly or as fixtures.

### Actual Tech Stack (from package.json)

| Category           | Technology       | Version  | Notes                                          |
| ------------------ | ---------------- | -------- | ---------------------------------------------- |
| Runtime            | Node.js          | >=20.0.0 | Required engine version                        |
| Test Framework     | Playwright       | 1.54.1   | Peer dependency                                |
| Language           | TypeScript       | 5.8.3    | Strict mode enabled                            |
| Package Format     | Dual CJS/ESM     | -        | Supports both CommonJS and ES Modules         |
| Build System       | TypeScript       | -        | Multiple tsconfig files for different targets |
| Testing (Backend)  | Jest             | 29.7.0   | Unit tests for backend logic                   |
| Testing (Frontend) | Vitest           | -        | Component testing for React components         |
| File Processing    | unpdf            | 1.1.0    | PDF reading                                    |
| File Processing    | exceljs          | 4.4.0    | XLSX processing                                |
| File Processing    | papaparse        | 5.5.3    | CSV parsing                                    |
| File Processing    | adm-zip          | 0.5.16   | ZIP file handling                              |
| HAR Processing     | Native           | -        | Network traffic recording/playback             |
| Auth Management    | proper-lockfile  | 4.1.2    | Token storage locking                          |
| Sample App Backend | Express + Prisma | -        | SQLite database, Kafka events                  |
| Sample App Frontend| React + Vite     | -        | React 19, Styled Components, React Query      |

### Repository Structure Reality Check

- **Type**: Monorepo with workspaces (`sample-app/*`)
- **Package Manager**: npm (package-lock.json present)
- **Notable**: Dual CommonJS/ESM build with subpath exports, comprehensive sample application for testing

## Source Tree and Module Organization

### Project Structure (Actual)

```text
playwright-utils/
├── src/                         # Core library utilities
│   ├── index.ts                 # Main entry (plain functions only)
│   ├── api-request/             # HTTP client for typed API requests
│   ├── auth-session/            # Authentication session management
│   │   └── internal/            # Internal auth implementation details
│   ├── file-utils/              # File reading/validation (CSV, XLSX, PDF, ZIP)
│   │   └── core/                # Core file processing logic
│   ├── intercept-network-call/  # Network request interception and mocking
│   │   └── core/                # Network interception implementation
│   ├── network-recorder/        # HAR-based network traffic recording/playback
│   │   └── core/                # Network recorder implementation
│   ├── log/                     # Structured logging integrated with Playwright
│   │   ├── formatters/          # Message formatting logic
│   │   ├── outputs/             # Console and file output handlers
│   │   └── utils/               # Logging utilities
│   ├── recurse/                 # Polling utility for async conditions
│   └── internal/                # Shared internal utilities
├── playwright/                  # Playwright test configuration and tests
│   ├── config/                  # Environment-specific configs
│   ├── support/                 # Test fixtures and helpers
│   │   ├── auth/                # Authentication test setup
│   │   │   └── token/           # Token management utilities
│   │   ├── fixtures/            # Custom fixtures
│   │   └── ui-helpers/          # UI automation helpers
│   └── tests/                   # Integration tests using the utilities
├── sample-app/                  # Full-stack testing environment
│   ├── backend/                 # Express.js API with Prisma ORM
│   │   ├── src/                 # Backend source code
│   │   │   ├── api-docs/        # OpenAPI specification
│   │   │   ├── events/          # Kafka event handling
│   │   │   └── middleware/      # Express middleware
│   │   └── prisma/              # Database schema and migrations
│   ├── frontend/                # React/Vite application
│   │   └── src/                 # Frontend source code
│   │       ├── components/      # React components with Vitest tests
│   │       ├── hooks/           # Custom React hooks
│   │       └── services/        # Frontend services
│   └── shared/                  # Common types between frontend/backend
├── docs/                        # Module documentation
└── dist/                        # Build output (CJS, ESM, types)
    ├── cjs/                     # CommonJS build
    ├── esm/                     # ES Modules build
    └── types/                   # TypeScript declarations
```

### Key Modules and Their Purpose

- **API Request**: `src/api-request/` - Typed HTTP client with retry logic and UI display utilities
- **Auth Session**: `src/auth-session/` - Persistent token management with provider pattern
- **File Utils**: `src/file-utils/` - File processing utilities (CSV, XLSX, PDF, ZIP) with download support
- **Network Interception**: `src/intercept-network-call/` - Network mocking and observation utilities
- **Network Recorder**: `src/network-recorder/` - HAR-based network traffic recording and playback with intelligent stateful mocking
- **Logging**: `src/log/` - Structured logging with Playwright report integration
- **Recurse**: `src/recurse/` - Polling utility for waiting on asynchronous conditions
- **Sample App**: `sample-app/` - Full-stack application for testing utilities in realistic scenarios

## Data Models and APIs

### Data Models

**Main Library Types**: See `src/*/index.ts` files for exported types

**Sample App Models**: 
- **Movie Model**: See `sample-app/backend/prisma/schema.prisma`
- **Frontend Types**: See `sample-app/shared/types/`

### API Specifications

- **OpenAPI Spec**: `sample-app/backend/src/api-docs/openapi.yml`
- **Generated Spec**: `sample-app/backend/src/api-docs/openapi.json`
- **Backend Routes**: `sample-app/backend/src/routes.ts`

## Technical Debt and Known Issues

### Critical Technical Debt

1. **Build Complexity**: Multiple TypeScript configurations (tsconfig-build-types.json, tsconfig-cjs.json, tsconfig-esm.json) - required for dual module support but adds complexity
2. **Auth Provider Validation**: Recently removed provider verification (commit f7cbcee) - may need monitoring for compatibility issues
3. **Sample App Dependencies**: Sample app uses `"@seontechnologies/playwright-utils": "*"` for local testing - works but non-standard approach
4. **File Path Handling**: Auth session uses absolute paths with proper-lockfile - platform-specific behavior needs testing

### Workarounds and Gotchas

- **Module Resolution**: Uses `moduleResolution: "Bundler"` - modern but may not work with older tools
- **Subpath Exports**: Comprehensive subpath export map - requires Node.js 12.20+ and modern bundlers
- **Test Environment**: `TEST_ENV=local` required for Playwright tests - defaults to local but must be set in CI
- **Sample App Startup**: Requires both backend and frontend servers running simultaneously for full testing

## Integration Points and External Dependencies

### External Services (Production Dependencies)

| Service     | Purpose           | Integration Type | Key Files                    |
| ----------- | ----------------- | ---------------- | ---------------------------- |
| File System | PDF Processing    | Library          | `src/file-utils/core/`       |
| File System | XLSX Processing   | Library          | `exceljs` package            |
| File System | CSV Processing    | Library          | `papaparse` package          |
| File System | ZIP Processing    | Library          | `adm-zip` package            |
| File System | Token Storage     | Library          | `proper-lockfile` package    |

### Internal Integration Points

- **Fixture Pattern**: All utilities provide both direct function and Playwright fixture interfaces
- **Network Recording**: Authentication-agnostic HAR recording that works with pre-authenticated contexts
- **Logging Integration**: Internal logger configured to use log module instead of console
- **Type Safety**: Comprehensive TypeScript coverage with strict type checking
- **Module Independence**: Each utility is self-contained with minimal cross-dependencies

### Sample App Integration Points

- **Backend**: Express.js with Prisma ORM, Kafka event handling, OpenAPI documentation
- **Frontend**: React with Vite, styled-components, React Query for state management
- **Database**: SQLite for development, Prisma migrations
- **Events**: Kafka cluster for event-driven testing scenarios

## Development and Deployment

### Local Development Setup

1. **Prerequisites**: Node.js >=20.0.0, Docker (for Kafka in sample app)
2. **Installation**: `npm install`
3. **Sample App**: `npm run start:sample-app` (starts both backend and frontend)
4. **Known Issues**: Initial Docker setup may take several minutes for downloads

### Build and Deployment Process

- **Build Command**: `npm run build` (builds CJS, ESM, and TypeScript declarations)
- **Clean Command**: `npm run clean` (removes dist directory)
- **Validation**: `npm run validate` (runs typecheck, lint, test, format in parallel)
- **Publishing**: Published to GitHub Packages registry under `@seontechnologies` scope
- **Local Testing**: `npm run publish:local` script available

### Environment Configuration

- **Development**: `TEST_ENV=local` (default)
- **Logging Control**: 
  - `SILENT=true` - Disable all logging
  - `DISABLE_FILE_LOGS=true` - Disable file logging only
  - `DISABLE_CONSOLE_LOGS=true` - Disable console logging only

## Testing Reality

### Current Test Coverage

- **Unit Tests**: Jest for backend logic, Vitest for frontend components
- **Integration Tests**: Playwright tests using the library's own utilities
- **E2E Tests**: Comprehensive sample app testing with multiple scenarios
- **Test Organization**: Tests organized by utility type with real-world usage patterns

### Running Tests

```bash
npm run test              # Unit tests (backend + frontend)
npm run test:pw           # Playwright tests (requires sample app running)
npm run test:pw-ui        # Playwright tests with UI mode
npm run test:pw:burn-in   # Burn-in tests with multiple repeats
npm run validate          # All checks (typecheck, lint, test, format)
```

### Testing Strategy

1. **Deployed Apps Tests**: Some tests use external apps (`log`, `interceptNetworkCall`)
2. **Sample App Tests**: Complex environment testing API requests, auth flows, file handling
3. **Fixture Testing**: Both direct function usage and fixture patterns tested
4. **Real-world Scenarios**: Authentication flows, CRUD operations, file processing

## Key Design Patterns

### Architectural Patterns

- **Functional Core, Fixture Shell**: Core logic as standalone functions, fixtures provide convenience
- **Subpath Exports**: Each utility can be imported individually to reduce bundle size
- **Dual Module Format**: Supports both CommonJS and ES Modules automatically
- **Provider Pattern**: Authentication uses composable provider pattern for flexibility
- **Intelligent State Detection**: Network recorder auto-detects CRUD patterns for stateful vs stateless mocking
- **Type-First Design**: Full TypeScript coverage with strict type checking

### Module Organization

- **Index Exports**: Each module exports both functions and types from index.ts
- **Fixture Separation**: Fixtures defined in separate files (fixtures.ts, *-fixture.ts)
- **Core/Internal Split**: Complex modules split into core logic and internal utilities
- **Documentation Co-location**: Each module has corresponding documentation in docs/

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
npm run start:sample-app   # Start both backend and frontend servers
npm run build              # Build package (CJS, ESM, and type definitions)
npm run clean              # Remove dist directory
npm run typecheck          # Run TypeScript type checking
npm run lint               # Run ESLint with auto-fix
npm run fix:format         # Format code with Prettier
npm run validate           # Run all checks in parallel
npm run publish:local      # Publish package locally
```

### Development Workflow

1. Start sample app: `npm run start:sample-app`
2. Run tests: `npm run test:pw` or `npm run test:pw-ui`
3. Validate changes: `npm run validate`
4. Build for distribution: `npm run build`

### Debugging and Troubleshooting

- **Logs**: Playwright logs in `playwright-logs/` directory, organized by date and test
- **Sample App Issues**: Check that both backend (localhost:3001) and frontend (localhost:3000) are running
- **Build Issues**: Clear TypeScript cache with `npm run typecheck:clear-cache`
- **Module Resolution**: Ensure Node.js >=20.0.0 for proper subpath export support

---

This document provides a comprehensive overview of the actual state of the SEON Playwright Utils project, including its modular architecture, dual module format support, comprehensive testing approach, and full-stack sample application for realistic testing scenarios.