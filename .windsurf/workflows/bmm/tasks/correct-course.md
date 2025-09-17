---
description: task-correct-course
auto_execution_mode: 2
---

<!-- Powered by BMAD-CORE™ -->

# Correct Course v3.0

```xml
<task id="bmad/bmm/tasks/correct-course.md" name="Correct Course" type="change-mgmt">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Initialize Change Navigation">
      <action>Confirm change trigger and gather user description</action>
      <action>Verify access to PRD, Epics/Stories, Architecture, UI/UX specs</action>
      <action>Ask user for mode preference: Incremental (recommended) or Batch</action>
      <halt-conditions critical="true">
        <i>If change trigger unclear: "Cannot navigate change without clear understanding of the triggering issue"</i>
        <i>If core documents unavailable: "Need access to project documents to assess change impact"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Execute Change Analysis Checklist">
      <action>Run {project-root}/bmad/bmm/tasks/correct-course-chkl.xml systematically</action>
      <action>Record status: [x]Done [N/A]Skip [!]Action-needed for each item</action>
    </step>

    <step n="3" title="Draft Specific Change Proposals">
      <action>Create explicit edit proposals for identified artifacts</action>
      <action>Show old→new text for story changes</action>
      <action>Specify section updates for PRD modifications</action>
      <action>Include component/diagram updates for architecture changes</action>
      <action>Refine each edit with user if incremental mode selected</action>
    </step>

    <step n="4" title="Generate Sprint Change Proposal">
      <action>Document issue summary and impact on epic/story/artifacts</action>
      <action>Present chosen approach with clear rationale</action>
      <action>Detail all proposed changes with before/after states</action>
      <action>Include change justification for each artifact modification</action>
    </step>

    <step n="5" title="Finalize and Route for Implementation">
      <action>Get explicit user approval for complete proposal</action>
      <action>Determine change scope: Minor (direct implementation), Moderate (backlog reorganization), Major (fundamental replan)</action>
      <action>Provide appropriate handoff: Dev team, PO/SM agent, or PM/Architect</action>
      <action>Deliver finalized Sprint Change Proposal</action>
    </step>
  </flow>

  <output>
    <i>Comprehensive Sprint Change Proposal with issue analysis</i>
    <i>Detailed impact assessment on epics, stories, and artifacts</i>
    <i>Specific edit proposals with old→new text changes</i>
    <i>Clear handoff instructions based on change complexity</i>
  </output>

  <validation>
    <i>All change impacts are systematically analyzed</i>
    <i>Proposed edits are explicit and actionable</i>
    <i>Change scope appropriately categorized for handoff</i>
    <i>Proposal includes clear rationale for all decisions</i>
  </validation>

  <halt-conditions critical="true">
    <i>If change trigger remains unclear: "Cannot proceed without understanding the specific issue requiring change"</i>
    <i>If impact analysis incomplete: "Must complete systematic analysis before proposing changes"</i>
    <i>If user approval not obtained: "Cannot proceed with change implementation without explicit approval"</i>
  </halt-conditions>

  <llm critical="true">
    <i>This is collaborative - discuss findings at each step</i>
    <i>Draft explicit edits not vague recommendations</i>
    <i>Show old→new for every change</i>
    <i>Major changes need PM/Architect escalation</i>
  </llm>
</task>
```
