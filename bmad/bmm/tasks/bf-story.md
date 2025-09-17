<!-- Powered by BMAD-CORE™ -->

# Brownfield Story v1.0

```xml
<task id="bmad/bmm/tasks/bf-story.md" name="Brownfield Story">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Quick Project Assessment">
      <action>Identify relevant existing functionality and integration points</action>
      <action>Note technology stack for affected area</action>
      <action>Understand current system context and existing patterns</action>
      <action>Define specific change scope and success criteria</action>
      <halt-conditions critical="true">
        <i>If change requires multiple stories: "Use bf-epic task for enhancements requiring 2-3 coordinated stories"</i>
        <i>If architectural planning needed: "Use full brownfield PRD/Architecture process for complex enhancements"</i>
        <i>If integration complexity high: "Escalate to bf-epic for enhancements with multiple integration points"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Create Focused Brownfield Story">
      <action>Create story title: [Specific Enhancement] - Brownfield Addition</action>
      <action>Write user story: As a [user type], I want [specific action], So that [clear benefit]</action>
      <action>Document existing system integration points and technology context</action>
      <action>Define acceptance criteria including functional, integration, and quality requirements</action>
      <action>Add technical notes with integration approach and existing pattern references</action>
      <action>Include Definition of Done with regression testing requirements</action>
    </step>

    <step n="3" title="Risk and Compatibility Assessment">
      <action>Identify primary risk to existing system and mitigation approach</action>
      <action>Define simple rollback procedure if changes need to be undone</action>
      <action>Verify no breaking changes to existing APIs</action>
      <action>Confirm database changes (if any) are additive only</action>
      <action>Ensure UI changes follow existing design patterns</action>
      <action>Validate performance impact is negligible</action>
    </step>

    <step n="4" title="Validate Story Scope and Clarity">
      <action>Confirm story can be completed in one development session (max 4 hours)</action>
      <action>Verify integration approach is straightforward</action>
      <action>Check that story follows existing patterns exactly</action>
      <action>Ensure no design or architecture work is required</action>
      <action>Validate story requirements are unambiguous and testable</action>
    </step>
  </flow>

  <output>
    <i>Complete brownfield story with clear integration context</i>
    <i>Risk assessment with simple mitigation and rollback plan</i>
    <i>Technical notes referencing existing patterns to follow</i>
    <i>Definition of Done including regression testing</i>
  </output>

  <validation>
    <i>Story scope appropriate for single development session</i>
    <i>Integration approach is straightforward and low-risk</i>
    <i>Existing system patterns identified and documented</i>
    <i>Rollback plan is simple and feasible</i>
    <i>Acceptance criteria include existing functionality verification</i>
  </validation>

  <halt-conditions critical="true">
    <i>If enhancement complexity grows: "Escalate to bf-epic for multi-story enhancements"</i>
    <i>If integration points unclear: "Cannot proceed without understanding system integration requirements"</i>
    <i>If existing patterns undefined: "Need clear examples of existing patterns to follow"</i>
    <i>If rollback approach complex: "Story changes must be easily reversible for brownfield safety"</i>
  </halt-conditions>

  <llm critical="true">
    <i>This task is for VERY SMALL brownfield changes only</i>
    <i>If complexity grows during analysis, escalate to bf-epic</i>
    <i>Always prioritize existing system integrity</i>
    <i>When in doubt about integration complexity, use bf-epic instead</i>
    <i>Stories should take no more than 4 hours of focused development work</i>
  </llm>
</task>
```
