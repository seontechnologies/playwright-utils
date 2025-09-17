<!-- Powered by BMAD-CORE™ -->

# Test Automation v1.0

```xml
<task id="bmad/bmm/testarch/automate" name="Test Automation Implementation">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Apply Murat's testing philosophy: Functional helpers over Page Objects, test at lowest level possible, no flaky tests</i>
    <i>CRITICAL: NEVER generate Page Object Model code - ALWAYS use functional helpers</i>
  </llm>
  <flow>
    <step n="1" title="Check Story/Epic Context">
      <action>Look for existing story/epic files in dev-story-location</action>
      <action>If story exists, extract: implemented features, modified files, API specs, UI components</action>
      <action>If no story, ask user: "What feature are you automating? (UI feature/API endpoint/Full stack)"</action>
      <action>Collaborate with dev agent if needed to understand implementation details</action>
      <halt-conditions critical="true">
        <i>If no clear automation target: "Please specify what feature/component to automate"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Analyze Codebase Structure">
      <action>Detect application framework (React, Vue, Angular, Node.js)</action>
      <action>Identify existing test framework (Playwright, Cypress, Jest, Vitest)</action>
      <action>If no test framework found, assess: Small repo + DX = Cypress, Large repo + performance = Playwright</action>
      <action>For component tests: Large repo = Vitest, Small repo with Cypress E2E = Cypress CT</action>
      <action>Scan for existing test patterns and conventions</action>
      <action>Check for data-testid or data-cy attributes in components</action>
    </step>

    <step n="3" title="Setup Test Architecture">
      <action>Create fixture architecture using mergeTests pattern (Playwright) or command pattern (Cypress)</action>
      <action>Implement pure function → fixture wrapper pattern</action>
      <action>Setup network interception utilities (route handlers for Playwright, cy.intercept for Cypress)</action>
      <action>Create auth fixture for session management</action>
      <action>Establish logging fixture for debugging</action>
    </step>

    <step n="4" title="Implement Core Test Fixtures">
      <action>apiRequest fixture: API calls with automatic auth headers</action>
      <action>network fixture: Intercept and mock network calls</action>
      <action>auth fixture: Login/logout, session persistence</action>
      <action>log fixture: Structured logging for test debugging</action>
      <action>Create merged-fixtures.ts combining all fixtures</action>
    </step>

    <step n="5" title="Generate Test Scenarios">
      <action>Map acceptance criteria to test scenarios using Given-When-Then</action>
      <action>Apply test pyramid: Test at lowest level possible while maintaining release confidence</action>
      <action>Reference test-levels-framework.md for test level decision matrix and selection rules</action>
      <action>Start with unit tests for pure logic, algorithms, business rules</action>
      <action>Move to integration only when unit cannot provide confidence (API contracts, service boundaries)</action>
      <action>Consider contract tests for microservices, cross system workflows using Pact (consumer-driven contracts)</action>
      <action>Use E2E only for critical user journeys that cannot be validated at lower levels</action>
      <action>Check duplicate coverage guard - avoid testing same logic at multiple levels</action>
      <action>Follow naming: unit: test_{component}_{scenario}, integration: test_{flow}_{interaction}, e2e: test_{journey}_{outcome}</action>
      <action>Create test files following naming convention: feature-name.spec.ts</action>
      <action>Implement happy path tests first</action>
      <action>Add negative test cases and edge cases</action>
      <action>Ensure each test is atomic and independent</action>
    </step>

    <step n="6" title="Implement Test Patterns">
      <action>Factory functions for dynamic test data generation (using faker.js)</action>
      <action>Network-first pattern: intercept before navigation</action>
      <action>API setup for test data, UI assertions for validation</action>
      <action>Explicit assertions in tests, not hidden in helpers</action>
      <action>Deterministic waiting: waitForResponse, waitForLoadState</action>
      <action>Self-cleaning: cleanup in afterEach/after hooks</action>
    </step>

    <step n="7" title="Validate Test Quality - Definition of Done">
      <action>Run tests locally to ensure they pass</action>
      <action>Verify no hard waits (page.waitForTimeout, cy.wait(ms)) - use dynamic waiting</action>
      <action>Check test independence: run with .only, ensure stateless and parallelizable</action>
      <action>Ensure proper selector strategy (data-testid/data-cy priority)</action>
      <action>Confirm tests are self-cleaning - setup own data, cleanup entities created</action>
      <action>Validate test execution time &lt; 1.5 minutes per test</action>
      <action>Verify tests live near source code (*.spec.js alongside components)</action>
      <action>Check file size &lt; 300 lines - split if larger</action>
      <action>Ensure no conditionals (if/else, try/catch) controlling test flow</action>
      <action>For APIs: validate error scenarios, idempotency, parallel safety</action>
      <action>For feature flags: test both enabled and disabled states</action>
      <action>Confirm CI integration with proper reporting (JUnit XML, HTML)</action>
    </step>
  </flow>

  <output>
    <i>Complete test suite following functional helper pattern</i>
    <i>Fixture architecture with mergeTests composition</i>
    <i>Factory-based test data system</i>
    <i>Self-cleaning, parallelizable tests</i>
    <i>Test files in appropriate directories (tests/e2e, tests/integration, src/**/*.cy.tsx)</i>
    <i>Updated package.json with test scripts</i>
  </output>

  <validation>
    <i>All tests pass locally</i>
    <i>No Page Object Models used</i>
    <i>Functional helpers for reusable logic</i>
    <i>Network interception properly configured</i>
    <i>Tests follow Murat's testing philosophy</i>
    <i>Proper test pyramid distribution</i>
  </validation>

  <halt-conditions critical="true">
    <i>If no clear feature to automate: "Cannot proceed without specific automation target"</i>
    <i>If test framework unclear: "Please specify Playwright or Cypress for test framework"</i>
    <i>If codebase not accessible: "Cannot generate tests without access to source code"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Core Testing Philosophy:</i>
    <i>"Testing and engineering are bound together - one failing test proves software isn't good enough"</i>
    <i>"The more tests resemble actual usage, the more confidence they give"</i>
    <i>"What you can avoid testing is more important than what you test"</i>
    <i>"Simplicity is the ultimate sophistication"</i>
    <i>"Strong opinions, weakly held" - when uncertain, refer to official docs</i>

    <i>Testing Manifesto:</i>
    <i>1. Functional helpers over Page Objects - composition over inheritance, components compose</i>
    <i>2. Test at lowest level possible - only move up when lower level cannot provide release confidence</i>
    <i>   Refer to https://dev.to/muratkeremozcan/mostly-incomplete-list-of-test-methodologies-52no</i>
    <i>   See test-levels-framework.md for detailed decision matrix and anti-patterns</i>
    <i>3. In AI era, E2E tests reign supreme - they are the ultimate acceptance criteria</i>
    <i>4. No flaky tests ever - 0 tolerance, shared mutable state is source of all evil</i>
    <i>5. Setup via API, assert via UI - fast and user-centric</i>
    <i>6. One test = one concern - focused and clear</i>
    <i>7. Explicit over implicit - assertions in tests, not helpers</i>
    <i>8. Data factories over fixtures - dynamic > static</i>
    <i>9. No conditionals in tests - avoid if/else or try/catch for control flow</i>
    <i>10. TDD with AI: Write acceptance tests first, let AI implement, validate with E2E</i>

    <i>Framework Selection Criteria:</i>
    <i>- Small repo + DX focus = Cypress (king of developer experience)</i>
    <i>- Large repo + performance = Playwright (unbeatable stability)</i>
    <i>- Component tests: Vitest for large repos, Cypress CT for small repos with Cypress E2E</i>
    <i>- API-heavy with dependencies = Playwright (Cypress chain style limitation)</i>
    <i>- Microservices: Add Pact for consumer-driven contract testing</i>
    <i>  See https://dev.to/muratkeremozcan/my-thoughts-and-notes-about-consumer-driven-contract-testing-11id</i>

    <i>Official Documentation Sources (always use latest):</i>
    <i>- Playwright: https://playwright.dev/docs and https://playwright.dev/docs/best-practices</i>
    <i>- Cypress: https://docs.cypress.io and https://docs.cypress.io/guides/references/best-practices</i>
    <i>- Vitest: https://vitest.dev/guide/ (recommended for component testing)</i>
    <i>- Jest: https://jestjs.io/docs/getting-started</i>
    <i>- Pact: https://docs.pact.io/</i>
    <i>Remember: Cost vs Confidence where cost = creation + execution + maintenance</i>
  </llm>
</task>
```
