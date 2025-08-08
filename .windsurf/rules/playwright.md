---
trigger: always_on
---

# Windsurf Playwright Rules

> **Meta Rule**: When applying rules, explicitly state which rules are being followed in the output. You may abbreviate rule descriptions to key phrases.

## Purpose

This is a centralized ruleset for AI assistance across all Playwright projects. These rules define:

- Coding standards and best practices
- Project structure conventions
- Common patterns and anti-patterns
- Interaction preferences with AI

## Scope

- These rules apply to test automation Windsurf projects by default.
- When in doubt, prefer consistency with the project you are contributing to.

## Project-Specific Guidelines

For project-specific commands, environment configurations, and practical examples, refer to:

- [CLAUDE.md](../../CLAUDE.md) - Contains npm scripts, environment details, and project-specific patterns

This file provides:

- Test execution commands for different environments (local, dev, staging, prod)
- Specialized test patterns (burn-in tests, changed tests)
- Project architecture details and utility usage examples
- Environment-specific configurations and URLs

## 1. Core Development Principles

### Code Organization

- Use functional and declarative programming patterns
- Prefer modular code over monoliths
- Follow DRY (Don't Repeat Yourself) principles

### Examples

```typescript
// ✅ Good: Functional and modular
const processItems = (items: Item[]): ProcessedItem[] =>
  items.map(transformItem).filter(isValid)

// ❌ Bad: Imperative and repetitive
const processItems = (items: Item[]) => {
  const results = []
  for (const item of items) {
    // Repetitive transformation logic
    // Repetitive validation logic
  }
  return results
}
```

## 2. Testing Best Practices

Use [Playwright docs](https://playwright.dev/docs) to refer to how to write tests.
Adhere to the [Playwright best practices](https://playwright.dev/docs/best-practices).

**Definition of Done & Test Guidelines**

- No Flaky Tests: Ensure reliability through proper async handling, explicit waits, and atomic test design.
- No Hard Waits/Sleeps: Use dynamic waiting strategies (e.g., polling, event-based triggers).
- Stateless & Parallelizable: Tests run independently; use cron jobs or semaphores only if unavoidable.
- No Order Dependency: Every it/describe/context block works in isolation (supports .only execution).
- Self-Cleaning Tests: test sets up its own data and automatically deletes/deactivates entities created during testing.
- Tests Live Near Source Code: Co-locate test files with the code they validate (e.g., \*.spec.js alongside components).
- Shifted Left:
  - Start with local environments or ephemeral stacks.
  - Validate functionality across all deployment stages (local → dev → stage …).

- Low Maintenance: Minimize manual upkeep (e.g., avoid brittle selectors, do not repeat UI actions and leverage APIs).
- Release Confidence:
  - Happy Path: Core user journeys are prioritized.
  - Edge Cases: Critical error/validation scenarios are covered.
  - Feature Flags: Test both enabled and disabled states where applicable.

- CI Execution Evidence: Integrate into pipelines with clear logs/artifacts.
- Visibility: Generate test reports (e.g., JUnit XML, HTML) for failures and trends.
- Test Design:
  - Assertions: Keep them explicit in tests; avoid abstraction into helpers. Use parametrized tests for soft assertions.
  - Naming: Follow conventions (e.g., describe('Component'), it('should do X when Y')).
  - Size: Aim for files ≤200 lines; split/chunk large tests logically.
  - Speed: Target individual tests ≤1.5 mins; optimize slow setups (e.g., shared fixtures).

- Careful Abstractions: Favor readability over DRY when balancing helper reuse (e.g., page objects are okay, assertion logic is not).
- Test Cleanup: Ensure tests clean up resources they create (e.g., closing browser, deleting test data).
- Tests should refrain from using conditionals (e.g., if/else) to control flow or try catch blocks where possible and aim work deterministically.

### API Testing Best Practices

- Tests must not depend on hardcoded data → use **factories** and **per-test setup**.
- Always test both happy path and negative/error cases.
- API tests should run parallel safely (no global state shared).
- Test idempotency where applicable (e.g. duplicate requests).
- Tests should clean up their data.
- Response logs should only be printed in case of failure.
- Auth tests must validate token expiration and renewal.

## 3. TypeScript Best Practices

### Type Definitions

- Prefer types over interfaces for consistency
- Use explicit return types for functions
- Leverage discriminated unions for complex states
- Prefer "types" to "interfaces" where relevant
- Avoid exporting functions that are only used internally

### Examples

```typescript
// ✅ Good: Discriminated union with explicit types
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

// ✅ Good: Const assertion
const ActionTypes = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
} as const

// ❌ Bad: Avoid enums
enum ActionTypes {
  CREATE,
  UPDATE,
  DELETE
}
```

## 4. File size, module structure, exports, functional purity

- Try to keep a file/module as a cohesive unit, generally trying to keep number of lines under 250
- Avoid exporting functions that are only used internally
- Avoid overly long and complex functions, break them down to smaller, focused functions following a functional style
- Try to avoid mutations and global state wherever possible

## 5. Security

### Security Checklist

- ✅ Sanitize all user inputs
- ✅ Implement proper CSP headers
- ✅ Use HTTPS for all API calls
- ✅ Follow CORS best practices
- ✅ Store secrets only in env vars or secret managers; **never hardcoded**.
- ✅ Ensure error responses (esp. 4xx/5xx) do not leak stack traces or sensitive info.

## 6. Documentation

### Required Documentation

- README.md with setup instructions
- API documentation for public interfaces
- Complex business logic explanations
- Security and permission requirements

### Documentation Authenticity

- Use real codebase examples in documentation wherever possible
- When using generic examples, ensure they accurately represent implementation patterns
- Add commented reference implementations to maintain documentation-code alignment

### Code Comments

- Document "why" not "what"
- Add links to relevant resources
- Explain complex algorithms
