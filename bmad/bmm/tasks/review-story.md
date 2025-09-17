<!-- Powered by BMAD-CORE™ -->

# Review Story v1.0

```xml
<task id="bmad/bmm/tasks/review-story.md" name="Review Story">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Gather Story Information">
      <action>Extract story_id: '{epic}.{story}' format (e.g., "1.3")</action>
      <action>Locate story_path: '{devStoryLocation}/{epic}.{story}.*.md'</action>
      <action>Get story_title from story file H1 heading</action>
      <action>Generate story_slug: lowercase title with hyphens replacing spaces</action>
      <halt-conditions critical="true">
        <i>If story not found: "Cannot review story - file not found at expected location"</i>
        <i>If story status not "Review": "Story must be in Review status before review can begin"</i>
        <i>If File List section empty: "Cannot review without completed File List from developer"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Assess Risk Level for Review Depth">
      <action>Check if auth/payment/security files touched → deep review required</action>
      <action>Check if no tests added to story → deep review required</action>
      <action>Check if diff > 500 lines → deep review required</action>
      <action>Check if previous gate was FAIL/CONCERNS → deep review required</action>
      <action>Check if story has > 5 acceptance criteria → deep review required</action>
      <output>risk_level: standard | deep</output>
    </step>

    <step n="3">
      <title>Map Requirements to Tests</title>
      <action>Map each acceptance criteria to validating tests using Given-When-Then format</action>
      <action>Identify any coverage gaps in test scenarios</action>
      <action>Verify all requirements have corresponding test cases</action>
      <action>Document missing test scenarios if found</action>
    </step>

    <step n="4">
      <title>Review Code Quality</title>
      <action>Analyze architecture and design patterns used</action>
      <action>Identify refactoring opportunities and perform if appropriate</action>
      <action>Check for code duplication or inefficiencies</action>
      <action>Verify error handling and edge cases covered</action>
      <action>Review security implications of changes</action>
    </step>

    <step n="5">
      <title>Evaluate Test Architecture</title>
      <action>Verify test isolation and independence</action>
      <action>Check appropriate use of mocks vs real dependencies</action>
      <action>Validate test naming follows Given-When-Then pattern</action>
      <action>Ensure tests are maintainable and understandable</action>
      <action>Verify performance test coverage if applicable</action>
    </step>

    <step n="6">
      <title>Verify Integration Points</title>
      <action>Test API contracts and interfaces</action>
      <action>Verify database migrations are safe and reversible</action>
      <action>Check configuration changes for environment compatibility</action>
      <action>Validate external service integrations</action>
    </step>

    <step n="7">
      <title>Execute Validation Suite</title>
      <action>Run all unit tests and verify 100% pass</action>
      <action>Execute integration tests if present</action>
      <action>Run linting and code quality checks</action>
      <action>Perform security scanning if applicable</action>
      <action>Check performance benchmarks if defined</action>
      <halt-conditions critical="true">
        <i>If tests fail: "Cannot pass review with failing tests - mark as FAIL"</i>
        <i>If critical security issues: "Security vulnerabilities must be fixed - mark as FAIL"</i>
      </halt-conditions>
    </step>

    <step n="8">
      <title>Determine Quality Gate Status</title>
      <action>PASS: All criteria met, full test coverage, no issues found</action>
      <action>CONCERNS: Minor issues present but can proceed with tracking</action>
      <action>FAIL: Missing tests, failing validations, or critical issues</action>
      <action>WAIVED: Issues explicitly accepted with documented approval</action>
    </step>

    <step n="9">
      <title>Create Quality Gate File</title>
      <action>Generate gate at tea.teaLocation/gates/{epic}.{story}-{slug}.yml</action>
      <action>Document all findings with severity (low/medium/high)</action>
      <action>Include test coverage metrics and mapping</action>
      <action>Add actionable recommendations for each issue</action>
      <action>Set reviewer as 'Murat' with current timestamp</action>
    </step>

    <step n="10">
      <title>Update Story with Results</title>
      <action>Add review findings to TEA Results section</action>
      <action>Include gate status and file reference</action>
      <action>Add test coverage percentage and metrics</action>
      <action>Document any refactoring performed</action>
      <action>Note recommendations for future improvements</action>
    </step>
  </flow>

  <validation>
    <i>All acceptance criteria have mapped tests</i>
    <i>Test coverage meets project standards</i>
    <i>No critical issues remain unresolved</i>
    <i>Gate file follows standard YAML schema</i>
    <i>Story updated with complete review results</i>
  </validation>

  <output>
    <i>Updated story file with TEA Results section</i>
    <i>Quality gate YAML file with detailed findings</i>
    <i>Test coverage mapping and metrics</i>
    <i>Actionable recommendations for improvements</i>
    <i>Clear pass/fail decision with reasoning</i>
  </output>

  <llm critical="true">
    <i>Always perform thorough review - this is the quality checkpoint</i>
    <i>Escalate to deep review when risk indicators present</i>
    <i>Never pass a story with failing tests or missing coverage</i>
    <i>Document all findings clearly for developer action</i>
  </llm>
</task>
```
