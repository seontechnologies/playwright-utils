<!-- Powered by BMAD-CORE™ -->

# TDD RED Phase - Write Failing Tests

```xml
<task id="bmad/bmm/tasks/red-story.md" name="TDD RED - Write Failing Tests" critical="true">
  <llm critical="true">
    <i>MANDATORY: This is the RED phase of Test-Driven Development</i>
    <i>Write comprehensive tests that MUST FAIL before any implementation</i>
    <i>DO NOT write any implementation code during this phase</i>
    <i>Tests define the specification and expected behavior</i>
  </llm>
  <flow>
    <step n="1" title="Load TDD Story and Identify Current Cycle">
      <action>Load the current TDD story file from devStoryLocation</action>
      <action>Identify the next RED task that needs to be completed</action>
      <action>Extract Test Specifications section for current testable unit</action>
      <action>Review Expected Test Failures section for guidance</action>
      <halt-conditions critical="true">
        <i>If no TDD story found: "Cannot execute RED phase without TDD story"</i>
        <i>If not a TDD story: "RED phase only works with TDD-structured stories"</i>
        <i>If no incomplete RED tasks: "All RED phases completed - proceed to GREEN"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Analyze Test Requirements">
      <action>Review acceptance criteria linked to current test cycle</action>
      <action>Extract test scenarios from Test Specifications section</action>
      <action>Identify edge cases and error conditions to test</action>
      <action>Determine test data and fixtures needed from story</action>
      <action>Review testing patterns from Dev Notes section</action>
    </step>

    <step n="3" title="Setup Test Infrastructure">
      <action>Create test file(s) in appropriate test directory</action>
      <action>Import testing framework and utilities per project standards</action>
      <action>Setup test fixtures and mock data as specified</action>
      <action>Configure mocks for external dependencies</action>
      <action>Add test lifecycle hooks (beforeEach, afterEach) if needed</action>
    </step>

    <step n="4" title="Write Comprehensive Failing Tests">
      <action>Write test suite describing the feature/component</action>
      <action>Create tests for happy path scenarios</action>
      <action>Add tests for edge cases and boundary conditions</action>
      <action>Include tests for error handling and validation</action>
      <action>Write tests for any async operations if applicable</action>
      <action>Ensure test names clearly describe expected behavior</action>
      <action>Use proper assertions that match project conventions</action>
    </step>

    <step n="5" title="Verify Tests Fail Correctly">
      <action>Run the test suite to ensure all new tests FAIL</action>
      <action>Verify failures match expected reasons (no implementation)</action>
      <action>Confirm error messages are clear and informative</action>
      <action>Check that test structure follows project standards</action>
      <halt-conditions critical="true">
        <i>If tests pass without implementation: "Tests must fail in RED phase - review test logic"</i>
        <i>If tests error due to syntax: "Fix test syntax errors before proceeding"</i>
      </halt-conditions>
    </step>

    <step n="6" title="Document RED Phase Completion">
      <action>Mark RED task as complete [x] in story file</action>
      <action>Add test file paths to File List section</action>
      <action>Record number of tests written in Dev Agent Record</action>
      <action>Note any deviations from test specifications</action>
      <action>Update story with test execution command if not standard</action>
      <output>
        RED Phase Complete for: {{testable-unit}}
        Tests Written: {{test-count}}
        All Tests Status: FAILING (as expected)
        Test Files: {{test-file-paths}}
        Next Step: Execute GREEN phase (*green)
      </output>
    </step>
  </flow>

  <validation>
    <i>All tests must be failing before marking RED complete</i>
    <i>Test coverage must match specifications in story</i>
    <i>No implementation code written during RED phase</i>
    <i>Test structure follows project testing conventions</i>
  </validation>

  <llm critical="true">
    <i>NEVER write implementation code during RED phase</i>
    <i>Tests MUST fail - if they pass, the test is incorrect</i>
    <i>Focus on test clarity and comprehensive coverage</i>
    <i>Tests define the contract for implementation</i>
    <i>Only mark RED complete when all specified tests are written and failing</i>
  </llm>
</task>
```
