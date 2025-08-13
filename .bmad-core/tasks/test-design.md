# test-design

Create comprehensive test scenarios with appropriate test level recommendations for story implementation.

## Inputs

```yaml
required:
  - story_id: "{epic}.{story}" # e.g., "1.3"
  - story_path: "docs/stories/{epic}.{story}.*.md"
  - story_title: "{title}" # If missing, derive from story file H1
  - story_slug: "{slug}" # If missing, derive from title (lowercase, hyphenated)
```

## Purpose

Design a complete test strategy that identifies what to test, at which level (unit/integration/e2e), and why. This ensures efficient test coverage without redundancy while maintaining appropriate test boundaries.

## Test Level Decision Framework

### Unit Tests

**When to use:**

- Testing pure functions and business logic
- Algorithm correctness
- Input validation and data transformation
- Error handling in isolated components
- Complex calculations or state machines

**Characteristics:**

- Fast execution (immediate feedback)
- No external dependencies (DB, API, file system)
- Highly maintainable and stable
- Easy to debug failures

**Example scenarios:**

```yaml
unit_test:
  component: "PriceCalculator"
  scenario: "Calculate discount with multiple rules"
  justification: "Complex business logic with multiple branches"
  mock_requirements: "None - pure function"
```

### Integration Tests

**When to use:**

- Testing component interactions
- Database operations and queries
- API endpoint behavior
- Service layer orchestration
- External service integration (with test doubles)

**Characteristics:**

- Moderate execution time
- May use test databases or containers
- Tests multiple components together
- Validates contracts between components

**Example scenarios:**

```yaml
integration_test:
  components: ["UserService", "UserRepository", "Database"]
  scenario: "Create user with duplicate email check"
  justification: "Tests transaction boundaries and constraint handling"
  test_doubles: "Mock email service, real test database"
```

### End-to-End Tests

**When to use:**

- Critical user journeys
- Cross-system workflows
- UI interaction flows
- Full stack validation
- Production-like scenario testing

**Characteristics:**

- Keep under 90 seconds per test
- Tests complete user scenarios
- Uses real or production-like environment
- Higher maintenance cost
- More prone to flakiness

**Example scenarios:**

```yaml
e2e_test:
  flow: "Complete purchase flow"
  scenario: "User browses, adds to cart, and completes checkout"
  justification: "Critical business flow requiring full stack validation"
  environment: "Staging with test payment gateway"
```

## Test Design Process

### 1. Analyze Story Requirements

Break down each acceptance criterion into testable scenarios:

```yaml
acceptance_criterion: "User can reset password via email"
test_scenarios:
  - level: unit
    what: "Password validation rules"
    why: "Complex regex and business rules"

  - level: integration
    what: "Password reset token generation and storage"
    why: "Database interaction with expiry logic"

  - level: integration
    what: "Email service integration"
    why: "External service with retry logic"

  - level: e2e
    what: "Complete password reset flow"
    why: "Critical security flow needing full validation"
```

### 2. Apply Test Level Heuristics

Use these rules to determine appropriate test levels:

```markdown
## Test Level Selection Rules

### Favor Unit Tests When:

- Logic can be isolated
- No side effects involved
- Fast feedback needed
- High cyclomatic complexity

### Favor Integration Tests When:

- Testing persistence layer
- Validating service contracts
- Testing middleware/interceptors
- Component boundaries critical

### Favor E2E Tests When:

- User-facing critical paths
- Multi-system interactions
- Regulatory compliance scenarios
- Visual regression important

### Anti-patterns to Avoid:

- E2E testing for business logic validation
- Unit testing framework behavior
- Integration testing third-party libraries
- Duplicate coverage across levels

### Duplicate Coverage Guard

**Before adding any test, check:**

1. Is this already tested at a lower level?
2. Can a unit test cover this instead of integration?
3. Can an integration test cover this instead of E2E?

**Coverage overlap is only acceptable when:**

- Testing different aspects (unit: logic, integration: interaction, e2e: user experience)
- Critical paths requiring defense in depth
- Regression prevention for previously broken functionality
```

### 3. Design Test Scenarios

**Test ID Format:** `{EPIC}.{STORY}-{LEVEL}-{SEQ}`

- Example: `1.3-UNIT-001`, `1.3-INT-002`, `1.3-E2E-001`
- Ensures traceability across all artifacts

**Naming Convention:**

- Unit: `test_{component}_{scenario}`
- Integration: `test_{flow}_{interaction}`
- E2E: `test_{journey}_{outcome}`

**Risk Linkage:**

- Tag tests with risk IDs they mitigate
- Prioritize tests for high-risk areas (P0)
- Link to risk profile when available

For each identified test need:

```yaml
test_scenario:
  id: "1.3-INT-002"
  requirement: "AC2: Rate limiting on login attempts"
  mitigates_risks: ["SEC-001", "PERF-003"] # Links to risk profile
  priority: P0 # Based on risk score

  unit_tests:
    - name: "RateLimiter calculates window correctly"
      input: "Timestamp array"
      expected: "Correct window calculation"

  integration_tests:
    - name: "Login endpoint enforces rate limit"
      setup: "5 failed attempts"
      action: "6th attempt"
      expected: "429 response with retry-after header"

  e2e_tests:
    - name: "User sees rate limit message"
      setup: "Trigger rate limit"
      validation: "Error message displayed, retry timer shown"
```

## Deterministic Test Level Minimums

**Per Acceptance Criterion:**

- At least 1 unit test for business logic
- At least 1 integration test if multiple components interact
- At least 1 E2E test if it's a user-facing feature

**Exceptions:**

- Pure UI changes: May skip unit tests
- Pure logic changes: May skip E2E tests
- Infrastructure changes: May focus on integration tests

**When in doubt:** Start with unit tests, add integration for interactions, E2E for critical paths only.

## Test Quality Standards

### Core Testing Principles

**No Flaky Tests:** Ensure reliability through proper async handling, explicit waits, and atomic test design.

**No Hard Waits/Sleeps:** Use dynamic waiting strategies (e.g., polling, event-based triggers).

**Stateless & Parallel-Safe:** Tests run independently; use cron jobs or semaphores only if unavoidable.

**No Order Dependency:** Every it/describe/context block works in isolation (supports .only execution).

**Self-Cleaning Tests:** Test sets up its own data and automatically deletes/deactivates entities created during testing.

**Tests Live Near Source Code:** Co-locate test files with the code they validate (e.g., `*.spec.js` alongside components).

### Execution Strategy

**Shifted Left:**

- Start with local environments or ephemeral stacks
- Validate functionality across all deployment stages (local → dev → stage)

**Low Maintenance:** Minimize manual upkeep (avoid brittle selectors, do not repeat UI actions, leverage APIs).

**CI Execution Evidence:** Integrate into pipelines with clear logs/artifacts.

**Visibility:** Generate test reports (e.g., JUnit XML, HTML) for failures and trends.

### Coverage Requirements

**Release Confidence:**

- Happy Path: Core user journeys are prioritized
- Edge Cases: Critical error/validation scenarios are covered
- Feature Flags: Test both enabled and disabled states where applicable

### Test Design Rules

**Assertions:** Keep them explicit in tests; avoid abstraction into helpers. Use parametrized tests for soft assertions.

**Naming:** Follow conventions (e.g., `describe('Component')`, `it('should do X when Y')`).

**Size:** Aim for files ≤200 lines; split/chunk large tests logically.

**Speed:** Target individual tests ≤90 seconds; optimize slow setups (e.g., shared fixtures).

**Careful Abstractions:** Favor readability over DRY when balancing helper reuse (page objects are okay, assertion logic is not).

**Test Cleanup:** Ensure tests clean up resources they create (e.g., closing browser, deleting test data).

**Deterministic Flow:** Tests should refrain from using conditionals (e.g., if/else) to control flow or try/catch blocks where possible.

### API Testing Standards

- Tests must not depend on hardcoded data → use factories and per-test setup
- Always test both happy path and negative/error cases
- API tests should run parallel safely (no global state shared)
- Test idempotency where applicable (e.g., duplicate requests)
- Tests should clean up their data
- Response logs should only be printed in case of failure
- Auth tests must validate token expiration and renewal

## Outputs

### Output 1: Test Design Document

**Save to:** `docs/qa/assessments/{epic}.{story}-test-design-{YYYYMMDD}.md`

Generate a comprehensive test design document:

```markdown
# Test Design: Story {epic}.{story}

Date: {date}
Reviewer: Quinn (Test Architect)

## Test Strategy Overview

- Total test scenarios: X
- Unit tests: Y (A%)
- Integration tests: Z (B%)
- E2E tests: W (C%)

## Test Level Rationale

[Explain why this distribution was chosen]

## Detailed Test Scenarios

### Requirement: AC1 - {description}

#### Unit Tests (3 scenarios)

1. **ID**: 1.3-UNIT-001
   **Test**: Validate input format
   - **Why Unit**: Pure validation logic
   - **Coverage**: Input edge cases
   - **Mocks**: None needed
   - **Mitigates**: DATA-001 (if applicable)

#### Integration Tests (2 scenarios)

1. **ID**: 1.3-INT-001
   **Test**: Service processes valid request
   - **Why Integration**: Multiple components involved
   - **Coverage**: Happy path + error handling
   - **Test Doubles**: Mock external API
   - **Mitigates**: TECH-002

#### E2E Tests (1 scenario)

1. **ID**: 1.3-E2E-001
   **Test**: Complete user workflow
   - **Why E2E**: Critical user journey
   - **Coverage**: Full stack validation
   - **Environment**: Staging
   - **Max Duration**: 90 seconds
   - **Mitigates**: BUS-001

[Continue for all requirements...]

## Test Data Requirements

### Unit Test Data

- Static fixtures for calculations
- Edge case values arrays

### Integration Test Data

- Test database seeds
- API response fixtures

### E2E Test Data

- Test user accounts
- Sandbox environment data

## Mock/Stub Strategy

### What to Mock

- External services (payment, email)
- Time-dependent functions
- Random number generators

### What NOT to Mock

- Core business logic
- Database in integration tests
- Critical security functions

## Test Execution Implementation

### Parallel Execution

- All unit tests: Fully parallel (stateless requirement)
- Integration tests: Parallel with isolated databases
- E2E tests: Sequential or limited parallelism

### Execution Order

1. Unit tests first (fail fast)
2. Integration tests second
3. E2E tests last (expensive, max 90 seconds each)

## Risk-Based Test Priority

### P0 - Must Have (Linked to Critical/High Risks)

- Security-related tests (SEC-\* risks)
- Data integrity tests (DATA-\* risks)
- Critical business flow tests (BUS-\* risks)
- Tests for risks scored ≥6 in risk profile

### P1 - Should Have (Medium Risks)

- Edge case coverage
- Performance tests (PERF-\* risks)
- Error recovery tests
- Tests for risks scored 4-5

### P2 - Nice to Have (Low Risks)

- UI polish tests
- Minor validation tests
- Tests for risks scored ≤3

## Test Maintenance Considerations

### High Maintenance Tests

[List tests that may need frequent updates]

### Stability Measures

- No retry strategies (tests must be deterministic)
- Dynamic waits only (no hard sleeps)
- Environment isolation
- Self-cleaning test data

## Coverage Goals

### Unit Test Coverage

- Target: 80% line coverage
- Focus: Business logic, calculations

### Integration Coverage

- Target: All API endpoints
- Focus: Contract validation

### E2E Coverage

- Target: Critical paths only
- Focus: User value delivery
```

## Test Level Smells to Flag

### Over-testing Smells

- Same logic tested at multiple levels
- E2E tests for calculations
- Integration tests for framework features

### Under-testing Smells

- No unit tests for complex logic
- Missing integration tests for data operations
- No E2E tests for critical user paths

### Wrong Level Smells

- Unit tests with real database
- E2E tests checking calculation results
- Integration tests mocking everything

## Quality Indicators

Good test design shows:

- Clear level separation
- No redundant coverage
- Fast feedback from unit tests
- Reliable integration tests
- Focused e2e tests

## Key Principles

- Test at the lowest appropriate level
- One clear owner per test
- Fast tests run first
- Mock at boundaries, not internals
- E2E for user value, not implementation
- Maintain test/production parity where critical
- Tests must be atomic and self-contained
- No shared state between tests
- Explicit assertions in test files (not helpers)

### Output 2: Story Hook Line

**Print this line for review task to quote:**

```text
Test design: docs/qa/assessments/{epic}.{story}-test-design-{YYYYMMDD}.md
```

**For traceability:** This planning document will be referenced by trace-requirements task.

### Output 3: Test Count Summary

**Print summary for quick reference:**

```yaml
test_summary:
  total: { total_count }
  by_level:
    unit: { unit_count }
    integration: { int_count }
    e2e: { e2e_count }
  by_priority:
    P0: { p0_count }
    P1: { p1_count }
    P2: { p2_count }
  coverage_gaps: [] # List any ACs without tests
```
