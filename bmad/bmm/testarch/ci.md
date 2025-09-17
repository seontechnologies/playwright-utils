<!-- Powered by BMAD-CORE™ -->

# CI/CD Pipeline Setup v1.0

```xml
<task id="bmad/bmm/testarch/ci" name="CI/CD Pipeline Setup">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Apply proven CI/CD patterns: parallel execution, smart caching, burn-in testing for changed files</i>
    <i>Focus on speed: parallel execution, smart caching, burn-in for changed files</i>
  </llm>
  <flow>
    <step n="1" title="Detect Repository Type">
      <action>Check for .github directory (GitHub)</action>
      <action>Check for .gitlab-ci.yml (GitLab)</action>
      <action>Check for bitbucket-pipelines.yml (Bitbucket)</action>
      <action>If not detected, ask: "Which CI platform are you using? (GitHub Actions/GitLab CI/CircleCI/Other)"</action>
      <halt-conditions critical="true">
        <i>If no git repository: "CI/CD requires a git repository. Please initialize with 'git init'"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Analyze Test Framework">
      <action>Detect test framework from package.json (playwright, cypress, jest, vitest)</action>
      <action>Identify test scripts in package.json</action>
      <action>Check for existing test configuration files</action>
      <action>Determine if tests support parallel execution</action>
      <action>Check for environment-specific configurations</action>
    </step>

    <step n="3" title="Generate Workflow Files">
      <action>Create main workflow file (.github/workflows/e2e.yml for GitHub)</action>
      <action>Setup triggers: pull_request, push to main/master</action>
      <action>Configure Node.js version from .nvmrc or package.json engines</action>
      <action>Setup dependency caching (npm/yarn/pnpm)</action>
      <action>Configure test job with proper environment variables</action>
    </step>

    <step n="4" title="Setup Parallel Execution">
      <action>Configure matrix strategy for test sharding (4-8 containers)</action>
      <action>Implement test splitting logic if framework supports it</action>
      <action>Setup Cypress Dashboard recording if using Cypress</action>
      <action>Configure Playwright sharding if using Playwright</action>
      <action>Ensure fail-fast: false for complete test coverage</action>
    </step>

    <step n="5" title="Configure Burn-in Testing">
      <action>Create burn-in workflow for changed files</action>
      <action>Implement git diff detection for changed test files</action>
      <action>Setup loop to run changed tests 10 times</action>
      <action>Add early failure detection to save CI time</action>
      <action>Create scripts/burn-in-changed.sh helper script</action>
    </step>

    <step n="6" title="Setup Optimizations">
      <action>Configure aggressive caching: node_modules, Cypress binary, Playwright browsers</action>
      <action>Setup artifact retention policies (30 days for reports)</action>
      <action>Configure test result reporting (JUnit XML, HTML reports) for visibility</action>
      <action>Setup screenshot/video artifacts for failures only</action>
      <action>Configure response logs to print only on failure (not on success)</action>
      <action>Implement "test changed files first" strategy - shift left principle</action>
      <action>Add workflow concurrency controls to prevent duplicate runs</action>
      <action>Ensure clear logs/artifacts for CI execution evidence (DoD requirement)</action>
    </step>

    <step n="7" title="Environment Configuration">
      <action>Setup environment-specific workflow jobs (dev, staging, prod)</action>
      <action>Configure secrets management for API keys and credentials</action>
      <action>Create environment variable templates</action>
      <action>Ensure 1:1 parity between local and CI execution</action>
      <action>Verify tests work identically across all deployments (dev, stage, prod)</action>
      <action>Setup .env.example with all required variables documented</action>
      <action>Create scripts/test-local.sh that mirrors CI execution exactly</action>
      <action>Configure deployment gates based on test results</action>
      <action>Validate: npm test locally = CI pipeline results</action>
      <action>Configure notification webhooks for failures</action>
    </step>
  </flow>

  <output>
    <i>.github/workflows/e2e.yml - Main test workflow with parallel execution</i>
    <i>.github/workflows/burn-in.yml - Burn-in testing for changed files</i>
    <i>scripts/burn-in-changed.sh - Helper script for burn-in testing</i>
    <i>scripts/test-changed.sh - Run only changed test files</i>
    <i>Updated package.json with CI-specific test scripts</i>
    <i>Documentation in README.md for CI/CD setup</i>
  </output>

  <validation>
    <i>Workflows have proper syntax (validate with GitHub/GitLab linters)</i>
    <i>Caching strategies properly configured</i>
    <i>Parallel execution matrix defined</i>
    <i>Burn-in testing implemented for flakiness prevention</i>
    <i>Environment variables properly secured</i>
    <i>Test results properly reported and stored</i>
  </validation>

  <halt-conditions critical="true">
    <i>If no git repository: "Initialize git repository first"</i>
    <i>If no test framework: "Setup test framework first using *framework command"</i>
    <i>If CI platform unclear: "Please specify your CI/CD platform"</i>
  </halt-conditions>

  <llm critical="true">
    <i>CI/CD Optimization Principles:</i>
    <i>1. Ensure 20x speed improvements: parallel execution + smart caching + changed file detection</i>
    <i>2. Follow the 32+ ways of selective testing patterns</i>
    <i>3. Always include burn-in testing (10x runs) to prevent flaky tests in production</i>
    <i>4. Never use synchronous execution when parallel is possible</i>
    <i>5. Test changed files first, then run full suite</i>
    <i>6. Cache aggressively: node_modules, browser binaries, build artifacts</i>
    <i>7. Fail fast on critical paths, continue on secondary paths</i>
    <i>8. CRITICAL: Ensure 1:1 parity - "npm test" locally must equal CI results</i>
    <i>9. Tests must work identically across all deployments (local, dev, stage, prod)</i>

    <i>Deployment Parity Principle:</i>
    <i>"The goal is that tests work in all deployments, and CI vs local laptop experience is 1:1"</i>
    <i>- Same commands work everywhere: npm test, npm run test:e2e</i>
    <i>- Environment variables control deployment target, not test behavior</i>
    <i>- A developer can run exact CI pipeline locally with one script</i>

    <i>Official CI/CD Documentation:</i>
    <i>- GitHub Actions: https://docs.github.com/en/actions</i>
    <i>- GitLab CI: https://docs.gitlab.com/ee/ci/</i>
    <i>- CircleCI: https://circleci.com/docs/</i>
    <i>- Playwright CI: https://playwright.dev/docs/ci</i>
    <i>- Cypress CI: https://docs.cypress.io/guides/continuous-integration/introduction</i>
    <i>Always refer to latest docs for best practices and new features</i>
  </llm>
</task>
```
