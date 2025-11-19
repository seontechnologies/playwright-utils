# Contributing to playwright-utils

Welcome to playwright-utils! This comprehensive TypeScript utility library transforms Playwright testing from imperative complexity to declarative simplicity. We're building the **de facto standard for Playwright testing** in enterprise environments.

## Project Vision

playwright-utils bridges the DX gap between Cypress's ease-of-use and Playwright's powerful but verbose API. Our goal is to provide declarative APIs that rival Cypress's developer experience while maintaining Playwright's superior browser automation capabilities.

## Getting Started

### Prerequisites

- Node.js (version specified in `.nvmrc`)
- npm
- Docker (for sample app testing)
- `@playwright/test` (peer dependency)

### Initial Setup

```bash
git clone https://github.com/seontechnologies/playwright-utils.git
cd playwright-utils
nvm use
npm install

# Start the sample app (required for integration testing)
npm run start:sample-app

# In a new terminal, run tests to verify setup
npm run test:pw
npm run test:pw-ui  # Run with UI mode
```

### Quick Development Commands

```bash
npm run validate      # Run all checks (typecheck, lint, test, format)
npm run build        # Build CJS, ESM, and type definitions
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint with auto-fix
npm run test         # Unit tests (Jest + Vitest)
npm run test:pw      # Playwright integration tests
```

## Development Workflow

1. **Start the sample app**: `npm run start:sample-app` (runs both backend and frontend)
2. **Make your changes** following our architecture principles
3. **Run validation**: `npm run validate` (runs all checks in parallel)
4. **Test thoroughly**: Use both unit tests and Playwright integration tests
5. **Submit PR** following our review guidelines

### Sample Application

The `./sample-app` provides a full-stack testing environment:

- **Backend**: Express.js API with Prisma ORM and authentication
- **Frontend**: React/Vite application with comprehensive components
- **Shared**: Common types and utilities

This environment tests real-world usage patterns for all utilities.

## Architecture & Design Principles

### Core Philosophy: "Functional Core, Fixture Shell"

Every utility must work both as a **standalone function** (composable) and as a **Playwright fixture** (convenient):

```typescript
// ✅ Direct function import (functional core)
import { apiRequest } from '@seontechnologies/playwright-utils'

test('example', async ({ request }) => {
  const { status, body } = await apiRequest({
    request, // need to pass request context
    method: 'GET',
    path: '/api/users/123'
  })
})

// ✅ Fixture usage (fixture shell)
import { test } from '@seontechnologies/playwright-utils/fixtures'

test('example', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'GET',
    path: '/api/users/123' // no need to pass request context
  })
})
```

### Key Design Patterns

- **Modular Architecture**: Each utility is independently importable via subpath exports
- **Dual Module Support**: Full CommonJS and ES Modules compatibility
- **Type Safety**: Strict TypeScript coverage with explicit return types
- **Minimal Dependencies**: Keep external dependencies minimal
- **Playwright Integration**: Seamless integration with Playwright's assertion and reporting systems

## Adding New Utilities

### Utility Structure

Each new utility must follow this structure:

```
src/new-utility/
├── index.ts          # Main function export
├── fixtures.ts       # Playwright fixture integration
├── types.ts          # TypeScript definitions
└── __tests__/        # Comprehensive tests
    ├── unit.spec.ts
    └── integration.spec.ts
```

### Implementation Requirements

1. **Dual Interface Pattern**:

   ```typescript
   // Core function (functional core)
   export const myUtility = (params: UtilityParams): Promise<Result> => {
     // Implementation
   }

   // Fixture wrapper (fixture shell)
   export const createMyUtilityFixtures = () => ({
     myUtility: async (params: Omit<UtilityParams, 'context'>) => {
       // Fixture implementation with context injection
     }
   })
   ```

2. **Subpath Export**: Add to `package.json`:

   ```json
   {
     "exports": {
       "./new-utility": {
         "import": "./dist/esm/new-utility/index.js",
         "require": "./dist/cjs/new-utility/index.js",
         "types": "./dist/types/new-utility/index.d.ts"
       }
     }
   }
   ```

3. **Documentation**: Create `docs/new-utility.md` with:
   - Usage examples (both direct and fixture)
   - API reference
   - Real-world scenarios
   - Integration patterns

### Current Utilities

Our established utilities demonstrate the patterns:

- **api-request**: Typed HTTP client for API testing
- **auth-session**: Authentication session management with token persistence
- **burn-in**: Smart test filtering based on file changes
- **file-utils**: CSV, XLSX, PDF, ZIP file validation
- **intercept-network-call**: Network request interception and mocking
- **log**: Structured logging integrated with Playwright reports
- **network-recorder**: HAR-based network recording/playback with CRUD detection
- **recurse**: Polling utility for asynchronous conditions

## Code Standards

### TypeScript Requirements

- **Strict typing**: All functions must have explicit return types
- **Type exports**: Prefer `type` over `interface` for consistency
- **Discriminated unions**: Use for complex state management
- **No any**: Avoid `any` type; use proper generics or unknown

```typescript
// ✅ Good: Explicit types and discriminated unions
export type UtilityResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

export const myUtility = <T>(
  params: UtilityParams
): Promise<UtilityResult<T>> => {
  // Implementation
}
```

### File Organization

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `stringUtils.ts`)
- **Types**: Descriptive names (e.g., `ApiRequestTypes.ts`)
- **Constants**: UPPER_SNAKE_CASE

### Code Quality

- **Functional patterns**: Prefer pure functions and immutability
- **Error handling**: Integrate with Playwright's assertion system
- **Performance**: No significant overhead to test execution
- **Documentation**: Document "why" not "what" in code comments

## Testing Requirements

### Definition of Done

All contributions must meet these testing standards:

- ✅ **No Flaky Tests**: Reliable through proper async handling and atomic design
- ✅ **No Hard Waits**: Use dynamic waiting strategies (polling, events)
- ✅ **Stateless & Parallelizable**: Tests run independently
- ✅ **No Order Dependency**: Every test works in isolation
- ✅ **Self-Cleaning**: Tests create and clean up their own data
- ✅ **Low Maintenance**: Minimize brittle selectors and manual upkeep

### Testing Strategy

1. **Unit Tests**: Jest for backend logic, Vitest for frontend components
2. **Integration Tests**: Playwright tests using the library's utilities
3. **Sample App Tests**: End-to-end validation with real applications
4. **Cross-Environment**: Test in both CommonJS and ESM environments

### Test Structure

```typescript
// Unit test example
describe('myUtility', () => {
  it('should handle success cases', async () => {
    const result = await myUtility({ param: 'value' })
    expect(result.success).toBe(true)
  })

  it('should handle error cases', async () => {
    const result = await myUtility({ param: 'invalid' })
    expect(result.success).toBe(false)
  })
})

// Integration test example
test('utility integration', async ({ page, myUtility }) => {
  const result = await myUtility({ param: 'test' })
  // Test integration with Playwright
})
```

## Environment Configuration

### Required Environment Variables

- `TEST_ENV`: Test environment (defaults to 'local')
- `SILENT=true`: Disable all logging
- `DISABLE_FILE_LOGS=true`: Disable file-based logging only
- `DISABLE_CONSOLE_LOGS=true`: Disable console logging only
- `PW_NET_MODE=record|playback|disabled`: Control network recorder mode

### Development Setup

1. Ensure Docker is running for sample app
2. Use `nvm use` to ensure correct Node.js version
3. Run `npm run start:sample-app` before running integration tests
4. Use `npm run validate` before committing changes

## Submitting Changes

### Pull Request Guidelines

1. **Keep PRs focused**: Single feature or fix per PR
2. **Size limit**: Aim for <500 lines changed; explain if larger
3. **Tests required**: Include both unit and integration tests
4. **No breaking changes**: Unless documented and justified
5. **CI must pass**: All checks including E2E tests

### PR Checklist

- [ ] Follows "functional core, fixture shell" pattern
- [ ] Has comprehensive tests (unit + integration)
- [ ] Includes documentation and examples
- [ ] Passes `npm run validate`
- [ ] Maintains backward compatibility
- [ ] Updates package.json exports if needed
- [ ] No flaky tests introduced

### Commit Message Format

```
type: brief description

Detailed explanation if needed
Related to #123
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### Code Review Process

- All PRs require at least 1 review from a maintainer
- Focus on architectural consistency and pattern adherence
- Reviewers check both functionality and documentation quality
- CI/CD pipeline must be green before merge

## Release Process

### Publishing via GitHub UI (Recommended)

1. Go to Actions → "Publish Package" workflow
2. Click "Run workflow"
3. Select version type (patch/minor/major/custom)
4. Review and merge the generated PR

### Local Publishing

```bash
export NPM_TOKEN=your_npm_token
npm run publish:local
```

The package publishes to public npm registry under `@seontechnologies` scope.

## Project Structure

### Core Architecture

```
src/
├── api-request/           # Typed HTTP client
├── auth-session/          # Authentication management
├── burn-in/              # Smart test filtering
├── file-utils/           # File validation utilities
├── intercept-network-call/ # Network interception
├── log/                  # Structured logging
├── network-recorder/     # HAR-based recording
├── recurse/              # Polling utility
└── fixtures.ts           # Main fixture exports

dist/
├── cjs/                  # CommonJS build
├── esm/                  # ES Modules build
└── types/                # TypeScript declarations

sample-app/
├── backend/              # Express.js API
├── frontend/             # React/Vite app
└── shared/               # Common types
```

### Build System

- **Dual builds**: CommonJS and ES Modules
- **Type definitions**: Generated for all exports
- **Subpath exports**: Individual utility imports
- **Package.json exports**: Comprehensive export mapping

## Contributing to Documentation

### Documentation Standards

- **Real examples**: Use actual codebase patterns
- **Comprehensive coverage**: Both direct function and fixture usage
- **Integration patterns**: Show how utilities work together
- **Performance notes**: Mention any performance considerations

### Required Documentation for New Utilities

1. **API documentation**: Complete parameter and return type documentation
2. **Usage examples**: Both standalone and fixture usage patterns
3. **Integration guide**: How it works with other utilities
4. **Error handling**: Expected error conditions and handling

## Community & Support

### Getting Help

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Code Review**: Maintainers provide architectural guidance

### Contribution Philosophy

We welcome contributions that:

- Follow our established architectural patterns
- Maintain high quality and comprehensive testing
- Add genuine value to the Playwright testing ecosystem
- Respect our "functional core, fixture shell" philosophy

### Strategic Vision

This project serves as the foundation for transforming Playwright testing experience across the enterprise ecosystem. Every contribution helps establish playwright-utils as the comprehensive solution for Playwright DX challenges.

---

**Thank you for contributing to playwright-utils!** Your efforts help transform Playwright testing from imperative complexity to declarative simplicity for teams everywhere.
