<!-- Powered by BMAD-CORE™ -->

# Test Design v1.0

```xml
<task id="bmad/bmm/testarch/test-design" name="Test Design">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Analyze Story Requirements">
      <action>Break down each acceptance criterion into testable scenarios</action>
      <action>Identify core functionality, data variations, error conditions, and edge cases</action>
      <action>Map testable behaviors to specific acceptance criteria</action>
      <halt-conditions critical="true">
        <i>If story file not found: "Test design requires valid story file with clear acceptance criteria"</i>
        <i>If acceptance criteria missing: "Cannot design tests without defined acceptance criteria"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Apply Test Level Framework">
      <action>Reference test-levels-framework.md for detailed decision matrix and selection rules</action>
      <action>Unit tests: Pure logic, algorithms, calculations, business rules</action>
      <action>Integration tests: Component interactions, database operations, API calls, service integration</action>
      <action>E2E tests: Critical user journeys, compliance requirements, cross-system workflows</action>
      <action>Check for duplicate coverage - avoid testing same logic at multiple levels</action>
      <action>Assign appropriate test level for each identified scenario</action>
    </step>

    <step n="3" title="Assign Test Priorities">
      <action>Reference test-priorities-matrix.md for detailed priority criteria and examples</action>
      <action>P0: Revenue-critical, security, compliance, core user paths</action>
      <action>P1: Core user journeys, frequently used features</action>
      <action>P2: Secondary features, admin functions, less common paths</action>
      <action>P3: Nice-to-have features, rarely used functionality</action>
      <action>Apply testing requirements based on priority level (P0 needs comprehensive coverage)</action>
    </step>

    <step n="4" title="Design Detailed Test Scenarios">
      <action>Create test scenarios with ID, requirement mapping, priority, level, description, and justification</action>
      <action>Map scenarios to risk mitigations if risk profile exists</action>
      <action>Ensure atomic and independent test scenarios</action>
      <action>Follow naming convention: {epic}.{story}-{LEVEL}-{SEQ}</action>
    </step>

    <step n="5" title="Validate Test Coverage">
      <action>Ensure every acceptance criterion has at least one test</action>
      <action>Verify no duplicate coverage across test levels</action>
      <action>Confirm critical paths have appropriate multi-level coverage</action>
      <action>Check that risk mitigations are addressed in test scenarios</action>
    </step>
  </flow>

  <output>
    <i>Comprehensive test design document saved to qa assessments directory</i>
    <i>Gate YAML block with test scenario counts and coverage summary</i>
    <i>Test execution order recommendations</i>
    <i>Trace references for requirements traceability task</i>
  </output>

  <validation>
    <i>Every acceptance criterion has corresponding test coverage</i>
    <i>Test levels are appropriate for scenario complexity</i>
    <i>No redundant coverage across test levels</i>
    <i>Priorities align with business risk and usage patterns</i>
    <i>Test scenarios are atomic and maintainable</i>
  </validation>

  <halt-conditions critical="true">
    <i>If story file missing: "Cannot design tests without access to story requirements"</i>
    <i>If acceptance criteria unclear: "Test design requires clear, testable acceptance criteria"</i>
    <i>If qa location unavailable: "Cannot save test design without valid tea.teaLocation configuration"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Shift left: Prefer unit over integration, integration over E2E</i>
    <i>Focus testing on business risk areas and complex logic</i>
    <i>Design for fast feedback with quick unit tests first</i>
    <i>Ensure test scenarios are independent and maintainable</i>
    <i>Reference framework documentation:</i>
    <i>- test-levels-framework.md for test level decision matrix and anti-patterns</i>
    <i>- test-priorities-matrix.md for priority assignment criteria and examples</i>
    <i>- Duplicate coverage guard rules and test naming conventions</i>
    <i>- Priority-based testing requirements (P0 needs full coverage, P3 can be selective)</i>
  </llm>
</task>
```
