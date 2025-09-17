---
description: task-rev-draft-story
auto_execution_mode: 2
---

<!-- Powered by BMAD-CORE™ -->

# Review Draft Story v1.0

```xml
<task id="bmad/bmm/tasks/rev-draft-story.md" name="Review Draft Story">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Load Core Configuration and Inputs">
      <action>Load bmad-modules/bmm/core-config.yaml for devStoryLocation, prd, architecture configurations</action>
      <action>Identify story file, parent epic, architecture documents, and story template</action>
      <action>Extract key configurations needed for validation</action>
      <halt-conditions critical="true">
        <i>If core-config.yaml not found: "core-config.yaml not found. This file is required for story validation."</i>
        <i>If story file not accessible: "Cannot validate story without access to story file"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Template Completeness Validation">
      <action>Load story template and extract all required section headings</action>
      <action>Compare story sections against template to verify completeness</action>
      <action>Check for unfilled placeholders or template variables</action>
      <action>Verify story follows template structure and formatting</action>
    </step>

    <step n="3" title="File Structure and Source Tree Validation">
      <action>Verify file paths are clearly specified and accurate</action>
      <action>Check that relevant project structure is included in Dev Notes</action>
      <action>Confirm new directories/components are properly located</action>
      <action>Validate file creation sequence follows logical order</action>
    </step>

    <step n="4" title="UI/Frontend Completeness Validation">
      <action>Check component specifications are sufficiently detailed</action>
      <action>Verify styling/design guidance is clear</action>
      <action>Confirm user interaction flows are specified</action>
      <action>Validate frontend-backend integration points are clear</action>
    </step>

    <step n="5" title="Acceptance Criteria Satisfaction Assessment">
      <action>Verify all acceptance criteria will be satisfied by listed tasks</action>
      <action>Check acceptance criteria are measurable and verifiable</action>
      <action>Ensure edge cases and error conditions are covered</action>
      <action>Confirm success definition is clear for each acceptance criterion</action>
    </step>

    <step n="6" title="Validation and Testing Instructions Review">
      <action>Check testing methods are clearly specified</action>
      <action>Verify key test cases are identified</action>
      <action>Confirm acceptance criteria validation steps are clear</action>
      <action>Validate required testing tools and test data needs are specified</action>
    </step>

    <step n="7" title="Security Considerations Assessment">
      <action>Check security requirements are identified and addressed</action>
      <action>Verify authentication/authorization controls are specified</action>
      <action>Confirm sensitive data handling requirements are clear</action>
      <action>Validate compliance and regulatory needs are addressed</action>
    </step>

    <step n="8" title="Tasks/Subtasks Sequence Validation">
      <action>Verify tasks follow proper implementation sequence</action>
      <action>Check task dependencies are clear and correct</action>
      <action>Confirm tasks are appropriately sized and actionable</action>
      <action>Ensure tasks cover all requirements and acceptance criteria</action>
    </step>

    <step n="9" title="Anti-Hallucination Verification">
      <action>Verify every technical claim is traceable to source documents</action>
      <action>Check Dev Notes content matches architecture specifications</action>
      <action>Flag any technical decisions not supported by source documents</action>
      <action>Cross-reference claims against epic and architecture documents</action>
    </step>

    <step n="10" title="Dev Agent Implementation Readiness">
      <action>Verify story can be implemented without reading external docs</action>
      <action>Check implementation steps are unambiguous</action>
      <action>Confirm all required technical details are present in Dev Notes</action>
      <action>Ensure all tasks are actionable by development agent</action>
    </step>

    <step n="11" title="Generate Validation Report">
      <action>Create structured validation report with template compliance issues</action>
      <action>Document critical issues that block story implementation</action>
      <action>List should-fix issues for quality improvements</action>
      <action>Note nice-to-have improvements and anti-hallucination findings</action>
      <action>Provide final assessment with GO/NO-GO recommendation</action>
    </step>
  </flow>

  <output>
    <i>Comprehensive validation report with issue categorization</i>
    <i>Implementation readiness score and confidence level</i>
    <i>GO/NO-GO recommendation with supporting rationale</i>
    <i>Prioritized list of required fixes before implementation</i>
  </output>

  <validation>
    <i>All template sections are present and complete</i>
    <i>Technical claims are verified against source documents</i>
    <i>Implementation guidance is clear and actionable</i>
    <i>Anti-hallucination checks identify unsupported claims</i>
    <i>Final assessment accurately reflects story readiness</i>
  </validation>

  <halt-conditions critical="true">
    <i>If core-config.yaml missing: "Story validation requires core configuration file"</i>
    <i>If story template unavailable: "Cannot validate completeness without story template reference"</i>
    <i>If story file inaccessible: "Cannot validate story that cannot be accessed or read"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Focus on implementation readiness, not perfection</i>
    <i>Prioritize critical blocking issues over cosmetic improvements</i>
    <i>Verify technical details against actual source documents</i>
    <i>Ensure story provides sufficient context for safe development</i>
  </llm>
</task>
```
