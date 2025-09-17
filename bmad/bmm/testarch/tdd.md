<!-- Powered by BMAD-CORE™ -->

# Acceptance Test-Driven Development v1.0

```xml
<task id="bmad/bmm/testarch/tdd" name="Acceptance Test-Driven Development">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Philosophy: "In the AI era, E2E tests reign supreme as the ultimate acceptance criteria"</i>
    <i>TDD Flow: Write acceptance tests first → Let AI/Dev implement → Validate with tests</i>
  </llm>
  <flow>
    <step n="1" title="Understand Requirements">
      <action>Review story/epic requirements and acceptance criteria</action>
      <action>If no story exists, gather requirements from user</action>
      <action>Identify the test level needed: E2E for user journeys, API for backend, Component for UI</action>
      <action>Determine what source code changes will be needed to satisfy tests</action>
      <action>Map out affected systems, services, and components</action>
      <halt-conditions critical="true">
        <i>If requirements unclear: "Cannot write tests without clear acceptance criteria"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Write Failing Acceptance Tests">
      <action>Create test file in appropriate location (tests/e2e, tests/api, or co-located)</action>
      <action>Write test descriptions using Given-When-Then format</action>
      <action>For E2E: Write user journey tests that will fail (no UI exists yet)</action>
      <action>For API: Write contract tests that will fail (endpoints don't exist)</action>
      <action>For Component: Write component tests that will fail (components not built)</action>
      <action>Include happy path and critical edge cases</action>
      <action>Add data-testid attributes that will be needed (document for dev)</action>
      <action>Use functional helpers, not Page Objects</action>
    </step>

    <step n="3" title="Define Test Infrastructure">
      <action>Setup network mocks for external dependencies</action>
      <action>Create test data factories for entities that will be created</action>
      <action>Define fixtures for common operations (auth, API calls)</action>
      <action>Document API contracts that need to be implemented</action>
      <action>Specify database schemas or data structures needed</action>
      <action>Create helper functions for complex test operations</action>
    </step>

    <step n="4" title="Create Implementation Checklist">
      <action>List all source code files that need creation/modification</action>
      <action>For frontend: Components, routes, state management, API calls</action>
      <action>For backend: Controllers, services, models, database migrations</action>
      <action>For API: Endpoints, request/response schemas, validation</action>
      <action>Document data-testid attributes needed in components</action>
      <action>Specify error handling requirements</action>
      <action>Note performance requirements (response times, load handling)</action>
    </step>

    <step n="5" title="Collaborate with Dev Agent">
      <action>Share failing tests with development team/agent</action>
      <action>Provide implementation checklist and requirements</action>
      <action>Explain test expectations and acceptance criteria</action>
      <action>If using AI: "Here are the failing tests - implement code to make them pass"</action>
      <action>Monitor implementation progress against test failures</action>
      <action>Answer questions about test intent and requirements</action>
    </step>

    <step n="6" title="Iterative Development Loop">
      <action>Run tests after each implementation change</action>
      <action>Identify which tests are now passing</action>
      <action>For still-failing tests, determine missing implementation</action>
      <action>Refine tests if requirements were misunderstood</action>
      <action>Add more specific tests as edge cases are discovered</action>
      <action>Continue until all acceptance tests pass</action>
    </step>

    <step n="7" title="Refactor and Optimize">
      <action>Once tests pass, refactor implementation for clarity</action>
      <action>Optimize performance while keeping tests green</action>
      <action>Add lower-level tests (unit/integration) for complex logic</action>
      <action>Ensure test execution time remains under 1.5 minutes</action>
      <action>Remove any test duplication or redundancy</action>
      <action>Verify tests are self-cleaning and parallelizable</action>
    </step>

    <step n="8" title="Validate Definition of Done">
      <action>Run full test suite to ensure no regression</action>
      <action>Verify all acceptance criteria are covered</action>
      <action>Check test quality against DoD checklist</action>
      <action>Ensure CI pipeline passes with new tests</action>
      <action>Document any new test patterns or helpers created</action>
      <action>Update test documentation if needed</action>
    </step>
  </flow>

  <output>
    <i>Failing acceptance tests that define the implementation requirements</i>
    <i>Implementation checklist for developers/AI agents</i>
    <i>Test infrastructure (mocks, factories, fixtures)</i>
    <i>Documentation of required data-testid attributes</i>
    <i>API contracts and schemas to implement</i>
    <i>Green test suite after implementation</i>
  </output>

  <validation>
    <i>Tests written before implementation (true TDD)</i>
    <i>Acceptance tests cover all requirements</i>
    <i>Tests follow functional helper pattern</i>
    <i>Implementation satisfies all tests</i>
    <i>No test duplication across levels</i>
    <i>Tests meet Definition of Done criteria</i>
  </validation>

  <halt-conditions critical="true">
    <i>If requirements unclear: "Cannot write meaningful tests without clear acceptance criteria"</i>
    <i>If test framework not setup: "Run *framework command first to setup test infrastructure"</i>
    <i>If unable to write failing tests: "TDD requires writing tests that fail initially"</i>
  </halt-conditions>

  <llm critical="true">
    <i>TDD Philosophy for Acceptance Testing:</i>
    <i>"Write acceptance criteria as tests first, let AI propose implementation, validate with E2E suite"</i>
    <i>"The more tests resemble actual usage, the more confidence they give"</i>
    <i>"In the world of AI-driven development, E2E tests reign supreme"</i>

    <i>Key Differences from Unit-Level TDD:</i>
    <i>1. Tests may require significant source code changes to pass</i>
    <i>2. Multiple components/services may need implementation</i>
    <i>3. Database schemas, API contracts, UI components all driven by tests</i>
    <i>4. Collaboration with dev team/AI is essential</i>
    <i>5. Tests define the "what", implementation defines the "how"</i>

    <i>Remember: These tests become the acceptance criteria and regression suite</i>
    <i>Cost equation: High initial cost, but massive savings in confidence and maintenance</i>
  </llm>
</task>
```
