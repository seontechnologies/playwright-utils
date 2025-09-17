<!-- Powered by BMAD-CORE™ -->

# TDD REFACTOR Phase - Improve Code Quality

```xml
<task id="bmad/bmm/tasks/refactor-story.md" name="TDD REFACTOR - Improve Code" critical="true">
  <llm critical="true">
    <i>MANDATORY: This is the REFACTOR phase of Test-Driven Development</i>
    <i>Improve code quality while keeping all tests green</i>
    <i>Run tests after EVERY refactoring change</i>
    <i>DO NOT add new functionality during this phase</i>
  </llm>
  <flow>
    <step n="1" title="Verify GREEN Phase Completion">
      <action>Load the current TDD story file from devStoryLocation</action>
      <action>Verify corresponding GREEN task is marked complete</action>
      <action>Run full test suite to confirm all tests passing</action>
      <action>Review Refactoring Targets section from story</action>
      <halt-conditions critical="true">
        <i>If GREEN phase not complete: "Must complete GREEN phase before REFACTOR"</i>
        <i>If any test failing: "All tests must be green before refactoring"</i>
        <i>If no REFACTOR tasks: "No refactoring tasks to complete"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Identify Refactoring Opportunities">
      <action>Review code for duplication (DRY violations)</action>
      <action>Identify magic numbers and hard-coded values</action>
      <action>Find complex conditionals that need simplification</action>
      <action>Locate long methods that should be extracted</action>
      <action>Check for poor naming of variables/functions</action>
      <action>Review technical debt notes from GREEN phase</action>
      <action>Consult Refactoring Targets from story specification</action>
    </step>

    <step n="3" title="Apply Code Quality Improvements">
      <action>Extract duplicate code into reusable functions/modules</action>
      <action>Replace magic numbers with named constants</action>
      <action>Simplify complex conditionals with guard clauses or extraction</action>
      <action>Break down large functions into smaller, focused ones</action>
      <action>Improve variable and function names for clarity</action>
      <action>Add type hints/annotations per project standards</action>
      <action>Run tests after EACH refactoring change</action>
      <halt-conditions critical="true">
        <i>If test fails after refactor: "Revert change immediately - tests must stay green"</i>
      </halt-conditions>
    </step>

    <step n="4" title="Optimize Performance">
      <action>Replace inefficient algorithms with better ones</action>
      <action>Optimize database queries if applicable</action>
      <action>Reduce unnecessary iterations or computations</action>
      <action>Cache computed values where appropriate</action>
      <action>Run tests to ensure optimizations don't break functionality</action>
    </step>

    <step n="5" title="Improve Code Organization">
      <action>Move code to appropriate modules/files</action>
      <action>Group related functionality together</action>
      <action>Ensure proper separation of concerns</action>
      <action>Apply SOLID principles where applicable</action>
      <action>Follow project architecture patterns</action>
      <action>Update imports and dependencies</action>
    </step>

    <step n="6" title="Clean Up and Polish">
      <action>Remove commented-out code</action>
      <action>Delete unused imports and variables</action>
      <action>Format code per project standards</action>
      <action>Run linting and fix any issues</action>
      <action>Ensure consistent code style throughout</action>
    </step>

    <step n="7" title="Final Validation">
      <action>Run complete test suite one final time</action>
      <action>Execute linting and code quality checks</action>
      <action>Verify no functionality was added or changed</action>
      <action>Confirm all refactoring targets addressed</action>
      <halt-conditions critical="true">
        <i>If any test fails: "Cannot complete REFACTOR with failing tests"</i>
        <i>If linting fails: "Must fix all linting issues"</i>
      </halt-conditions>
    </step>

    <step n="8" title="Document REFACTOR Phase Completion">
      <action>Mark REFACTOR task as complete [x] in story file</action>
      <action>Update File List with any file reorganizations</action>
      <action>Document refactoring changes in Dev Agent Record</action>
      <action>Note any remaining technical debt for future</action>
      <action>Record performance improvements if measured</action>
      <output>
        REFACTOR Phase Complete for: {{testable-unit}}
        All Tests: PASSING
        Refactorings Applied: {{refactoring-list}}
        Code Quality Improvements: {{improvement-metrics}}
        Files Modified: {{modified-files}}
        Next Step: Move to next TDD cycle or complete story
      </output>
    </step>
  </flow>

  <validation>
    <i>All tests remain green throughout refactoring</i>
    <i>No new functionality added</i>
    <i>Code quality measurably improved</i>
    <i>All linting and style checks pass</i>
    <i>Refactoring targets from story addressed</i>
  </validation>

  <llm critical="true">
    <i>Run tests after EVERY refactoring change</i>
    <i>NEVER add new features during REFACTOR</i>
    <i>If a test fails, immediately revert the change</i>
    <i>Focus on code quality, not new functionality</i>
    <i>Small, incremental refactorings are safer</i>
    <i>Keep refactoring scope within current test coverage</i>
  </llm>
</task>
```
