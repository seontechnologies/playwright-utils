---
description: task-dev-story
auto_execution_mode: 2
---

# Develop Story

```xml
<task id="bmad/bmm/tasks/dev-story.md" name="Develop Story" critical="true">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
    <i>Only update story file Dev Agent Record sections (checkboxes, Debug Log, Completion Notes, Change Log)</i>
  </llm>
  <flow>
    <step n="1" title="Read First or Next Task">
      <action>Identify first incomplete task from story file Tasks/Subtasks section</action>
      <action>Read task requirements and all associated subtasks</action>
      <action>Understand task context from story acceptance criteria and dev notes</action>
      <halt-conditions critical="true">
        <i>If no incomplete tasks found: "All tasks completed - proceed to completion sequence"</i>
        <i>If story file inaccessible: "Cannot develop story without access to story file"</i>
        <i>If task requirements ambiguous: "Task requirements must be clear before implementation"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Implement Task and Subtasks">
      <action>Implement the task completely including all subtasks</action>
      <action>Follow project architecture patterns and coding standards</action>
      <action>Ensure implementation matches story acceptance criteria</action>
      <action>Handle all edge cases and error conditions appropriately</action>
      <halt-conditions critical="true">
        <i>If unapproved dependencies needed: "Confirm with user before adding new dependencies"</i>
        <i>If 3 consecutive implementation failures: "Stop and request guidance after repeated implementation failures"</i>
        <i>If missing required configuration: "Cannot proceed without necessary configuration files"</i>
      </halt-conditions>
    </step>

    <step n="3" title="Write Comprehensive Tests">
      <action>Create unit tests for business logic and core functionality</action>
      <action>Add integration tests for component interactions</action>
      <action>Include end-to-end tests for critical user flows if applicable</action>
      <action>Test edge cases and error handling scenarios</action>
    </step>

    <step n="4" title="Execute All Validations and Tests">
      <action>Run all existing tests to ensure no regressions</action>
      <action>Execute new tests to verify implementation correctness</action>
      <action>Run linting and code quality checks</action>
      <action>Validate implementation meets all acceptance criteria</action>
      <halt-conditions critical="true">
        <i>If regression tests fail: "Cannot proceed while breaking existing functionality"</i>
        <i>If new tests fail: "Implementation must pass all tests before marking complete"</i>
      </halt-conditions>
    </step>

    <step n="5" title="Mark Task Complete">
      <action>ONLY mark task checkbox with [x] if ALL tests pass and validation succeeds</action>
      <action>Update File List section with any new, modified, or deleted files</action>
      <action>Add completion notes to Dev Agent Record if significant changes made</action>
      <action>Move to next task if more tasks remain, otherwise proceed to completion</action>
    </step>

    <step n="6" title="Story Completion Sequence">
      <action>Verify ALL tasks and subtasks are marked [x]</action>
      <action>Run full regression suite - DO NOT skip this step</action>
      <action>Confirm File List section lists every changed file</action>
      <action>Execute story definition of done checklist</action>
      <action>Update story status to: Ready for Review</action>
      <halt-conditions critical="true">
        <i>If any task incomplete: "Cannot complete story with incomplete tasks"</i>
        <i>If regression failures exist: "Must resolve all test failures before completion"</i>
        <i>If File List incomplete: "File List must accurately reflect all changes"</i>
      </halt-conditions>
    </step>
  </flow>

  <output>
    <i>Fully implemented story with all tasks completed</i>
    <i>Comprehensive test coverage for new functionality</i>
    <i>Updated story file with accurate completion tracking</i>
    <i>Clean validation results with no regressions</i>
  </output>

  <validation>
    <i>All tasks and subtasks marked complete with [x]</i>
    <i>Code matches all story requirements exactly</i>
    <i>All validations pass without errors</i>
    <i>Code follows project standards and conventions</i>
    <i>File List section is complete and accurate</i>
  </validation>

  <halt-conditions critical="true">
    <i>If story file updates restricted: "Dev agent can only modify Tasks checkboxes, Dev Agent Record, File List, Change Log, and Status"</i>
    <i>If implementation blocked by external dependencies: "Cannot proceed without resolving external blockers"</i>
    <i>If acceptance criteria cannot be met: "Story requirements must be achievable with current constraints"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Follow execution order strictly - complete current task fully before moving to next</i>
    <i>ONLY mark tasks complete when ALL tests pass</i>
    <i>Update File List with every change</i>
    <i>Run full regression suite before completion - no shortcuts</i>
  </llm>
</task>
```
