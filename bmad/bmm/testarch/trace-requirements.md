<!-- Powered by BMAD-CORE™ -->

# Trace Requirements v1.0

```xml
<task id="bmad/bmm/testarch/trace-requirements" name="Trace Requirements">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Extract All Testable Requirements">
      <action>Identify requirements from acceptance criteria, user story statement, and task behaviors</action>
      <action>Include non-functional requirements and documented edge cases</action>
      <action>Ensure all requirements are traceable and testable</action>
      <halt-conditions critical="true">
        <i>If story file not found: "Requirements traceability requires valid story file with acceptance criteria"</i>
        <i>If no testable requirements found: "Cannot create traceability matrix without clear requirements"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Map Requirements to Test Cases">
      <action>For each requirement, identify which tests validate it</action>
      <action>Use Given-When-Then to describe WHAT the test validates (documentation only)</action>
      <action>Document test files, test cases, and coverage level</action>
      <action>Note: Given-When-Then is for mapping clarity, not actual test code syntax</action>
    </step>

    <step n="3" title="Analyze Test Coverage Completeness">
      <action>Evaluate coverage levels: full, partial, none, integration-only, unit-only</action>
      <action>Identify requirements with complete validation</action>
      <action>Document requirements with gaps or incomplete coverage</action>
      <action>Prioritize coverage based on business risk and criticality</action>
    </step>

    <step n="4" title="Identify and Document Coverage Gaps">
      <action>List requirements without adequate test coverage</action>
      <action>Assess gap severity and business impact</action>
      <action>Suggest specific test types and approaches for gaps</action>
      <action>Recommend additional test scenarios or test types needed</action>
    </step>

    <step n="5" title="Generate Traceability Outputs">
      <action>Create gate YAML block with coverage totals and uncovered requirements</action>
      <action>Generate comprehensive traceability matrix report</action>
      <action>Provide test design recommendations for identified gaps</action>
      <action>Reference test design planning document if available</action>
    </step>
  </flow>

  <output>
    <i>Gate YAML block with traceability summary and coverage gaps</i>
    <i>Detailed requirements traceability matrix report</i>
    <i>Critical coverage gap analysis with recommendations</i>
    <i>Story hook line for review task reference</i>
  </output>

  <validation>
    <i>Every acceptance criterion is mapped to test coverage</i>
    <i>Coverage gaps are identified with severity assessment</i>
    <i>Given-When-Then mappings clarify test validation scope</i>
    <i>Critical business requirements have adequate test coverage</i>
    <i>Test design recommendations are actionable</i>
  </validation>

  <halt-conditions critical="true">
    <i>If story file missing: "Cannot create traceability matrix without story requirements"</i>
    <i>If acceptance criteria unclear: "Traceability requires clear, testable acceptance criteria"</i>
    <i>If no test files accessible: "Cannot assess coverage without access to test files or specifications"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Use Given-When-Then for documentation clarity, NOT for test code structure</i>
    <i>Focus on business-critical requirements and user-facing features</i>
    <i>Prioritize coverage gaps based on risk and business impact</i>
    <i>Map tests at appropriate granularity levels for comprehensive coverage</i>
  </llm>
</task>
```
