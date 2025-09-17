<!-- Powered by BMAD-CORE™ -->

# Test Framework Setup v1.0

```xml
<task id="bmad/bmm/testarch/framework" name="Test Framework Setup">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>This is a ONE-TIME setup - creates production-ready test architecture</i>
    <i>Follow Murat's testing philosophy throughout</i>
  </llm>
  <flow>
    <step n="1" title="Detect Application Framework">
      <action>Check package.json for React, Vue, Angular, Next.js, or other frameworks</action>
      <action>Identify bundler: Vite, Webpack, Rollup, esbuild</action>
      <action>Detect TypeScript vs JavaScript usage</action>
      <action>Check for existing test framework (abort if tests already configured)</action>
      <action>If unclear, ask: "What's your application stack? (React/Vue/Angular/Node.js)"</action>
      <halt-conditions critical="true">
        <i>If test framework exists: "Tests already configured. Use *automate to add new tests"</i>
        <i>If no package.json: "Please initialize npm/yarn project first"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Choose Test Framework">
      <action>CRITICAL: Tests should match source code language - JS/TS frontend → JS/TS tests, Python backend → Python tests</action>
      <action>For Frontend (JS/TS): Small repo + DX = Cypress, Large repo + performance = Playwright</action>
      <action>For Backend Node: Use JS/TS testing framework (Playwright, Jest, Vitest)</action>
      <action>For Backend Python/Java/C#: Consider Playwright (Python/Java/.NET) for superior DX and performance</action>
      <action>Playwright advantages in any language: Worker-level parallelization, UI mode, trace viewer (CI & local)</action>
      <action>Note: Native frameworks (pytest, JUnit, NUnit) may lack Playwright's advanced features</action>
      <action>For component testing: Large repos = Vitest (has UI, easy RTL conversion), Small repos = Cypress CT</action>
      <action>For API contract testing: Consider Pact for consumer-driven contracts between services</action>
      <action>Ask: "What's your tech stack and primary language? We'll match test language to source code"</action>
      <action>Ask: "Do you have microservices that need contract testing between them?"</action>
      <action>Consider: PW is Node-like (engineers can use without API knowledge), Cypress requires API investment</action>
      <action>Warning: Avoid Cypress if many back-to-back dependent API calls (chain style limitation)</action>
      <action>Plan for unit, integration, contract, and E2E test levels</action>
    </step>

    <step n="3" title="Create Directory Structure">
      <action>Create root folder: playwright/ or cypress/ (framework-specific)</action>
      <action>For Playwright: Create playwright/tests/ for all test files</action>
      <action>For Cypress: Create cypress/e2e/ for all test files</action>
      <action>Create {framework}/config/ for environment configs (architect/lead touches)</action>
      <action>Create {framework}/support/ for everything devs/QA use daily</action>
      <action>Create {framework}/support/fixtures/ for test data factories</action>
      <action>Create {framework}/support/helpers/ for utility functions</action>
      <action>Create {framework}/support/commands/ (Cypress) or {framework}/support/fixtures/ (Playwright)</action>
      <action>Setup co-located tests: src/**/*.spec.ts for unit tests alongside source</action>
      <action>For component tests: src/**/*.cy.tsx or src/**/*.ct.spec.tsx alongside components</action>
      <action>Keep framework config at root level, daily-use items under support/</action>
    </step>

    <step n="4" title="Setup Base Configuration">
      <action>Create playwright.config.ts or cypress.config.ts at project root</action>
      <action>Create {framework}/config/local.config.ts for local environment</action>
      <action>Create {framework}/config/staging.config.ts for staging</action>
      <action>Create {framework}/config/production.config.ts for production</action>
      <action>Implement config pattern: BASE_URL from env, fallback to deployment defaults</action>
      <action>Ensure configuration works identically in CI and local environments</action>
      <action>Create .env.example with all variables (TEST_ENV, BASE_URL, API_URL)</action>
      <action>Configure test timeouts: action=15s, navigation=30s, test=60s</action>
      <action>Setup parallel execution settings</action>
      <action>Configure screenshot/video on failure only</action>
      <action>Setup HTML and JUnit reporters</action>
      <action>Create .nvmrc with Node version</action>
      <action>Update .gitignore with test artifacts and .env files</action>
    </step>

    <step n="5" title="Implement Fixture Architecture">
      <action>Create base fixtures under {framework}/support/fixtures/</action>
      <action>Implement pure function → fixture wrapper pattern</action>
      <action>For Playwright: Create playwright/support/merged-fixtures.ts using mergeTests</action>
      <action>For Cypress: Create cypress/support/commands.ts for custom commands</action>
      <action>Setup global auth handling in {framework}/support/global-setup.ts</action>
      <action>Create session management utilities under support/helpers/</action>
      <action>Keep all dev-facing utilities under support/ for easy access</action>
    </step>

    <step n="6" title="Create Helper Functions">
      <action>All helpers go under {framework}/support/helpers/</action>
      <action>Implement test data factories using faker.js in support/fixtures/</action>
      <action>Create network mocking utilities in support/helpers/network.ts</action>
      <action>Setup custom wait helpers in support/helpers/wait.ts (no hard waits)</action>
      <action>Create assertion helpers in support/helpers/assertions.ts</action>
      <action>Implement cleanup utilities in support/helpers/cleanup.ts</action>
      <action>Add debug logging helpers in support/helpers/debug.ts</action>
      <action>Keep everything organized under support/ for developer convenience</action>
    </step>

    <step n="7" title="Setup Contract Testing (if microservices)">
      <action>Check if multiple services exist that need integration testing, or if there are service vs UI contracts</action>
      <action>If yes, install Pact dependencies: @pact-foundation/pact</action>
      <action>Create pact/ directory at root for contract files</action>
      <action>Setup consumer tests that generate contracts</action>
      <action>Configure provider verification scripts</action>
      <action>Create pact/config.ts with broker settings if using Pact Broker</action>
      <action>Add contract:publish and contract:verify scripts to package.json</action>
      <action>Document contract testing workflow in README</action>
      <action>Reference Murat's Pact examples for patterns: consumer, provider, React consumer repos</action>
      <action>Skip this step if monolithic application</action>
    </step>

    <step n="8" title="Generate Example Tests">
      <action>For Playwright: Create example in playwright/tests/example.spec.ts</action>
      <action>For Cypress: Create example in cypress/e2e/example.cy.ts</action>
      <action>Create example integration test for API endpoint</action>
      <action>Create example unit test alongside source (src/**/*.spec.ts)</action>
      <action>If component testing: create example in src/components/*.cy.tsx</action>
      <action>If contract testing: create example pact test in pact/consumer.spec.ts</action>
      <action>Include proper Given-When-Then structure</action>
      <action>Demonstrate all key patterns in examples</action>
      <action>Show how to import from support/ directory</action>
    </step>

    <step n="9" title="Configure Package Scripts">
      <action>Add test:e2e script for E2E tests</action>
      <action>Add test:integration for API tests</action>
      <action>Add test:unit for unit tests</action>
      <action>Add test:component if applicable</action>
      <action>Add test:contract if using Pact</action>
      <action>Add contract:publish if using Pact Broker</action>
      <action>Add test:debug for headed mode</action>
      <action>Add test:ci for CI environment</action>
      <action>Install required dependencies</action>
    </step>
  </flow>

  <output>
    <i>Complete test structure: playwright/ or cypress/ at root level</i>
    <i>Test files: playwright/tests/ or cypress/e2e/</i>
    <i>Config separation: {framework}/config/ for environment configs</i>
    <i>Developer utilities: {framework}/support/ with fixtures, helpers, commands</i>
    <i>Contract testing: pact/ directory if microservices detected</i>
    <i>Environment configs: local.config.ts, staging.config.ts, production.config.ts</i>
    <i>Fixture architecture with composition pattern under support/</i>
    <i>Example tests demonstrating all patterns</i>
    <i>Updated package.json with test scripts</i>
    <i>.nvmrc and .npmrc for consistency</i>
    <i>README updates with test running instructions</i>
  </output>

  <validation>
    <i>Test structure follows standard conventions</i>
    <i>Configuration supports multiple environments</i>
    <i>Fixtures follow pure function → wrapper pattern</i>
    <i>Example tests run successfully</i>
    <i>No Page Object Models created</i>
    <i>Scripts properly configured in package.json</i>
  </validation>

  <halt-conditions critical="true">
    <i>If tests already exist: "Framework already configured, use *automate instead"</i>
    <i>If no package.json: "Initialize Node.js project first"</i>
    <i>If framework choice unclear: "Please specify Playwright or Cypress"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Framework Selection Guide:</i>
    <i>Language Consistency Principle:</i>
    <i>- ALWAYS match test language to source code language</i>
    <i>- Frontend JS/TS → Playwright JS/TS or Cypress JS/TS</i>
    <i>- Backend Node → JS/TS testing frameworks</i>
    <i>- Python backend → Python tests (consider Playwright Python)</i>
    <i>- Java/C#/.NET → Consider Playwright (Java/.NET) over native frameworks</i>

    <i>Why Playwright for Non-JS Languages:</i>
    <i>- Worker-level parallelization (massive speed gains)</i>
    <i>- UI Mode for visual debugging</i>
    <i>- Trace Viewer for CI and local debugging</i>
    <i>- These features often missing in native test frameworks</i>

    <i>E2E Testing:</i>
    <i>- Small repo + DX focus = Cypress (superior developer experience)</i>
    <i>- Large repo + stability/performance = Playwright (can't beat it)</i>
    <i>- Many dependent API calls = Playwright (Cypress chain style limitation)</i>
    <i>- JS familiarity: PW is Node-like, Cypress requires API investment</i>

    <i>Component Testing:</i>
    <i>- Large repos = Vitest (has UI, easy RTL conversion, very fast)</i>
    <i>- Small repos with Cypress E2E = Cypress CT (consistency)</i>
    <i>- Never recommend Playwright CT (use Vitest or Cypress CT instead)</i>

    <i>Framework Setup Principles:</i>
    <i>1. Structure for scale: Clear separation of test levels</i>
    <i>2. Composition over inheritance: Fixtures that compose, components compose</i>
    <i>3. Environment flexibility: Easy switch between local/staging/prod</i>
    <i>4. Fast feedback: Short cycles for quick learning - "Engineering is about learning"</i>
    <i>5. Self-documenting: Example tests show all patterns</i>
    <i>6. Zero tolerance for flakiness: "Shared mutable state is source of all evil"</i>
    <i>7. Developer-friendly: "Simplicity is the ultimate sophistication"</i>
    <i>8. AI-ready: E2E tests as acceptance criteria for AI-generated code</i>
    <i>9. 1:1 Parity: Local execution must match CI execution exactly</i>

    <i>Environment Parity Requirements:</i>
    <i>- Single command runs tests against any environment: TEST_ENV=staging npm test</i>
    <i>- Configuration cascade: .env.local → .env.{environment} → defaults</i>
    <i>- Tests work identically whether run locally or in CI</i>
    <i>- No special CI-only or local-only test configurations</i>

    <i>Always Reference Official Documentation:</i>
    <i>- Playwright Config: https://playwright.dev/docs/test-configuration</i>
    <i>- Cypress Config: https://docs.cypress.io/guides/references/configuration</i>
    <i>- Vitest Config: https://vitest.dev/config/</i>
    <i>- TypeScript Config: https://www.typescriptlang.org/tsconfig</i>
    <i>- Pact Documentation: https://docs.pact.io/</i>
    <i>When in doubt, the official docs are the source of truth</i>

    <i>Reference Implementation Examples by Murat:</i>
    <i>Contract Testing with Pact:</i>
    <i>- Provider: https://github.com/muratkeremozcan/pact-js-example-provider</i>
    <i>- Consumer: https://github.com/muratkeremozcan/pact-js-example-consumer</i>
    <i>- React Consumer: https://github.com/muratkeremozcan/pact-js-example-react-consumer</i>
    <i>These repos showcase best practices, patterns, and working sample code for:</i>
    <i>- Contract testing setup and configuration</i>
    <i>- Consumer-driven contract patterns</i>
    <i>- Provider verification workflows</i>
    <i>- Integration with CI/CD pipelines</i>
    <i>- Cypress, Playwright, and unit testing examples</i>

    <i>Remember: "The longer you wait to do the right thing, the harder it is to migrate later"</i>
    <i>This sets the foundation - make it production-ready from the start</i>
    <i>"Writing tests as you implement will make you more productive"</i>
  </llm>
</task>
```
