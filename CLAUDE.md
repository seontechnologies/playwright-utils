# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development and Build

- `npm run build` - Build the package (CJS, ESM, and type definitions)
- `npm run clean` - Remove dist directory
- `npm run typecheck` - Run TypeScript type checking without emitting files
- `npm run lint` - Run ESLint with auto-fix
- `npm run fix:format` - Format code with Prettier
- `npm run validate` - Run all checks in parallel (typecheck, lint, test, fix:format)

### Testing

- `npm run test` - Run unit tests (Jest) for backend and frontend
- `npm run test:pw` - Run Playwright tests
- `npm run test:pw-ui` - Run Playwright tests with UI mode
- `npm run test:pw:burn-in` - Run traditional burn-in tests with multiple repeats (see burn-in/ module for smart filtering)
- `npm run start:sample-app` - Start both backend and frontend servers for testing

### Package Management

- `npm run publish:local` - Publish package locally using the publish script

## Architecture Overview

This is a **TypeScript utility library for Playwright testing** that provides modular utilities as both standalone functions and Playwright fixtures. The library follows a "functional core, fixture shell" pattern where all utilities can be used directly or as fixtures.

### Core Modules (src/)

- **api-request/** - HTTP client for making typed API requests in tests
- **auth-session/** - Authentication session management with token persistence
- **burn-in/** - Smart test burn-in utility for intelligent test filtering based on file changes
- **file-utils/** - Utilities for reading/validating CSV, XLSX, PDF, ZIP files
- **intercept-network-call/** - Network request interception and mocking
- **log/** - Structured logging that integrates with Playwright reports
- **network-recorder/** - HAR-based network recording/playback with intelligent CRUD detection
- **recurse/** - Polling utility for waiting on asynchronous conditions

### Package Structure

The library is built with dual CommonJS/ESM support:

- **dist/cjs/** - CommonJS build output
- **dist/esm/** - ES Modules build output
- **dist/types/** - TypeScript declaration files
- Each module exports both direct functions and fixtures via subpath exports

### Sample Application (sample-app/)

A full-stack testing environment with:

- **Backend** - Express.js API with Prisma ORM, authentication middleware, and event handling
- **Frontend** - React/Vite application with comprehensive component testing
- **Shared** - Common types and utilities between frontend/backend

### Testing Strategy

- **Unit Tests** - Jest for backend logic, Vitest for frontend components
- **Integration Tests** - Playwright tests using the library's own utilities
- **Sample App Tests** - End-to-end testing of auth flows, CRUD operations, and file handling
- Tests are organized by utility type and demonstrate real-world usage patterns

### Key Design Patterns

- **Subpath Exports** - Each utility can be imported individually to reduce bundle size
- **Fixture Pattern** - All utilities provide both direct function and Playwright fixture interfaces
- **Modular Auth** - Authentication system uses composable provider pattern
- **Type Safety** - Full TypeScript coverage with strict type checking enabled
- **Intelligent Mocking** - Network recorder auto-detects CRUD patterns and switches to stateful mocking

## Environment Configuration

Tests use `TEST_ENV` environment variable (defaults to 'local'). The sample app requires both backend and frontend servers running simultaneously.

### Test Environment Variables

- `SILENT=true` - Disable all logging
- `DISABLE_FILE_LOGS=true` - Disable file-based logging only
- `DISABLE_CONSOLE_LOGS=true` - Disable console logging only
- `PW_NET_MODE=record|playback|disabled` - Control network recorder mode (see network-recorder module)

### Development Workflow

1. Start sample app with `npm run start:sample-app`
2. Run tests with `npm run test:pw` or `npm run test:pw-ui`
3. Use `npm run validate` before committing changes
