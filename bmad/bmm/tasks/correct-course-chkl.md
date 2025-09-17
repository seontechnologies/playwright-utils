<!-- Powered by BMAD-CORE™ -->

# Change Navigation Checklist

```xml
<checklist id="bmad/bmm/tasks/correct-course-chkl.md" name="Change Navigation Checklist">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Understand the Trigger and Context">
      <action>Identify triggering story that revealed the issue</action>
      <action>Define core problem precisely: technical limitation, new requirement, misunderstanding, pivot, or failed approach</action>
      <action>Assess initial impact and gather supporting evidence</action>
      <halt-conditions critical="true">
        <i>If trigger unclear: "Cannot proceed without understanding what caused the need for change"</i>
        <i>If no evidence provided: "Need concrete evidence or examples of the issue"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Epic Impact Assessment">
      <action>Evaluate if current epic containing trigger story can still be completed</action>
      <action>Determine if current epic needs modification, addition, removal, or complete redefinition</action>
      <action>Review all remaining planned epics for required changes</action>
      <action>Check if issue invalidates future epics or necessitates new ones</action>
      <action>Consider if epic order/priority should change</action>
    </step>

    <step n="3" title="Artifact Conflict and Impact Analysis">
      <action>Check if issue conflicts with core PRD goals or requirements</action>
      <action>Review architecture document for conflicts with components, patterns, technology, data models, APIs</action>
      <action>Examine frontend spec for conflicts with architecture, components, or UI/UX</action>
      <action>Consider impact on deployment scripts, IaC, monitoring, and other artifacts</action>
    </step>

    <step n="4" title="Path Forward Evaluation">
      <action>Option 1: Direct Adjustment - Can issue be addressed by modifying/adding stories within existing plan?</action>
      <action>Option 2: Potential Rollback - Would reverting completed stories simplify addressing the issue?</action>
      <action>Option 3: PRD MVP Review - Is original PRD MVP still achievable? Does scope need reduction or goals modification?</action>
      <action>Select recommended path based on effort, risk, timeline impact, and long-term sustainability</action>
    </step>

    <step n="5" title="Sprint Change Proposal Components">
      <action>Create identified issue summary with clear problem statement</action>
      <action>Document epic impact and artifact adjustment needs</action>
      <action>Present recommended path forward with rationale</action>
      <action>Define PRD MVP impact and high-level action plan</action>
      <action>Establish agent handoff plan identifying needed roles</action>
    </step>

    <step n="6" title="Final Review and Handoff">
      <action>Review checklist completion and Sprint Change Proposal accuracy</action>
      <action>Obtain explicit user approval for proposal</action>
      <action>Confirm next steps and handoff plan</action>
      <action>Ensure all stakeholders understand the changes and rationale</action>
    </step>
  </flow>

  <output>
    <i>Completed change navigation checklist with all sections addressed</i>
    <i>Sprint Change Proposal with clear issue analysis and recommendations</i>
    <i>Approved path forward with defined handoff responsibilities</i>
    <i>Change summary documenting what changed, action plan, assignments, and success criteria</i>
  </output>

  <validation>
    <i>All checklist sections completed with appropriate status</i>
    <i>Issue impact fully analyzed across epics and artifacts</i>
    <i>Path forward options properly evaluated with clear rationale</i>
    <i>User approval obtained before finalizing proposal</i>
  </validation>

  <halt-conditions critical="true">
    <i>If any critical section cannot be completed: "Cannot proceed to proposal without complete impact analysis"</i>
    <i>If user approval not obtained: "Must have explicit approval before implementing changes"</i>
    <i>If handoff responsibilities unclear: "Must clearly define who will execute the proposed changes"</i>
  </halt-conditions>

  <llm critical="true">
    <i>This is for SIGNIFICANT changes affecting project direction</i>
    <i>Work interactively with user - they make final decisions</i>
    <i>Be factual not blame-oriented when analyzing</i>
    <i>Handle changes professionally as opportunities to improve</i>
  </llm>
</checklist>
```
