<!-- Powered by BMAD-CORE™ -->

# TDD GREEN Phase - Make Tests Pass

```xml
<task id="bmad/bmm/tasks/green-story.md" name="TDD GREEN - Make Tests Pass" critical="true">
  <llm critical="true">
    <i>MANDATORY: This is the GREEN phase of Test-Driven Development</i>
    <i>Write MINIMAL implementation code to make tests pass</i>
    <i>DO NOT refactor or optimize during this phase</i>
    <i>Focus ONLY on making the red tests turn green</i>
  </llm>
  <flow>
    <step n="1" title="Verify RED Phase Completion">
      <action>Load the current TDD story file from devStoryLocation</action>
      <action>Verify corresponding RED task is marked complete</action>
      <action>Run test suite to confirm tests are currently failing</action>
      <action>Identify which GREEN task to work on</action>
      <halt-conditions critical="true">
        <i>If RED phase not complete: "Must complete RED phase before GREEN"</i>
        <i>If tests already passing: "Tests should be failing at start of GREEN phase"</i>
        <i>If no GREEN tasks found: "No GREEN phase tasks to complete"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Analyze Failing Tests">
      <action>Run tests with verbose output to understand failures</action>
      <action>Identify the minimal code needed to pass each test</action>
      <action>Review test assertions to understand expected behavior</action>
      <action>Map test requirements to implementation approach</action>
      <action>Prioritize simplest solution over elegant solution</action>
    </step>

    <step n="3" title="Implement Minimal Solution">
      <action>Create necessary files and modules per project structure</action>
      <action>Write simplest code that satisfies test assertions</action>
      <action>Implement one test requirement at a time</action>
      <action>Run tests frequently to track progress</action>
      <action>Avoid premature optimization or abstractions</action>
      <action>Use hard-coded values if they make tests pass</action>
      <action>Focus on correctness, not code quality</action>
    </step>

    <step n="4" title="Handle Edge Cases">
      <action>Address edge case tests with minimal code changes</action>
      <action>Add error handling only where tests require it</action>
      <action>Implement validation logic tested by the suite</action>
      <action>Ensure all boundary conditions are handled</action>
    </step>

    <step n="5" title="Verify All Tests Pass">
      <action>Run complete test suite for the component</action>
      <action>Confirm all RED phase tests now pass</action>
      <action>Check that no regression tests have failed</action>
      <action>Verify test coverage meets requirements</action>
      <halt-conditions critical="true">
        <i>If any test still fails: "All tests must pass before completing GREEN"</i>
        <i>If regression detected: "Fix regression before marking GREEN complete"</i>
      </halt-conditions>
    </step>

    <step n="6" title="Document GREEN Phase Completion">
      <action>Mark GREEN task as complete [x] in story file</action>
      <action>Update File List with implementation files</action>
      <action>Record implementation approach in Dev Agent Record</action>
      <action>Note any technical debt for REFACTOR phase</action>
      <action>List obvious improvements for refactoring</action>
      <output>
        GREEN Phase Complete for: {{testable-unit}}
        Tests Passing: {{test-count}}/{{test-count}}
        Implementation Files: {{implementation-files}}
        Technical Debt Notes: {{debt-items}}
        Next Step: Execute REFACTOR phase (*refactor)
      </output>
    </step>
  </flow>

  <validation>
    <i>All tests must pass before marking GREEN complete</i>
    <i>Implementation uses minimal code approach</i>
    <i>No refactoring performed during GREEN phase</i>
    <i>No new features added beyond test requirements</i>
  </validation>

  <llm critical="true">
    <i>Write ONLY enough code to make tests pass</i>
    <i>NEVER refactor or optimize in GREEN phase</i>
    <i>Duplicate code is acceptable in GREEN phase</i>
    <i>Hard-coded values are acceptable if tests pass</i>
    <i>Save all improvements for REFACTOR phase</i>
    <i>Focus on making red tests green, nothing more</i>
  </llm>
</task>
```
