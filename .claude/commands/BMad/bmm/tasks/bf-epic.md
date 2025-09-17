<!-- Powered by BMAD-CORE™ -->

# Bf Epic v1.1

```xml
<task id="bmad/bmm/tasks/bf-epic.md" name="Create Brownfield Epic">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Analyze Existing Project">
      <action>Understand project purpose and current functionality</action>
      <action>Identify technology stack and architecture patterns</action>
      <action>Map integration points with existing system</action>
      <action>Define enhancement scope and success criteria</action>
    </step>

    <step n="2" title="Create Epic Document">

      <output>
        <epic-title>{{Enhancement Name}} - Brownfield Enhancement</epic-title>
        <epic-goal>{{1-2 sentences describing what the epic accomplishes and value added}}</epic-goal>

        <existing-context>
          <i>Current functionality: {{brief description}}</i>
          <i>Technology stack: {{relevant existing technologies}}</i>
          <i>Integration points: {{where new work connects}}</i>
        </existing-context>

        <enhancement-details>
          <i>What's being added/changed: {{clear description}}</i>
          <i>Integration approach: {{how it integrates}}</i>
          <i>Success criteria: {{measurable outcomes}}</i>
        </enhancement-details>

        <stories>
          <i>Story 1: {{title and brief description}}</i>
          <i>Story 2: {{title and brief description}}</i>
          <i>Story 3: {{title and brief description if needed}}</i>
        </stories>

        <compatibility>
          <i>Existing APIs remain unchanged</i>
          <i>Database changes are backward compatible</i>
          <i>UI changes follow existing patterns</i>
          <i>Performance impact is minimal</i>
        </compatibility>

        <risk-mitigation>
          <i>Primary Risk: {{main risk to existing system}}</i>
          <i>Mitigation: {{how risk will be addressed}}</i>
          <i>Rollback Plan: {{how to undo changes if needed}}</i>
        </risk-mitigation>

        <definition-of-done>
          <i>All stories completed with acceptance criteria met</i>
          <i>Existing functionality verified through testing</i>
          <i>Integration points working correctly</i>
          <i>Documentation updated appropriately</i>
          <i>No regression in existing features</i>
        </definition-of-done>
      </output>
    </step>

    <step n="3" title="Validate Epic Scope">
      <validation>
        <i>Epic completable in 1-3 stories maximum</i>
        <i>No architectural documentation required</i>
        <i>Enhancement follows existing patterns</i>
        <i>Risk to existing system is low</i>
        <i>Rollback plan is feasible</i>
        <i>Testing covers existing functionality</i>
      </validation>
    </step>

    <step n="4" title="Create Story Manager Handoff">
      <output>
Story Manager Handoff:
Please develop detailed user stories for this brownfield epic. Key considerations:
- Enhancement to existing system running {{technology stack}}
- Integration points: {{list key integration points}}
- Existing patterns to follow: {{relevant existing patterns}}
- Critical compatibility requirements: {{key requirements}}
- Each story must verify existing functionality remains intact
The epic should maintain system integrity while delivering {{epic goal}}.
      </output>
    </step>
  </flow>

  <halt-conditions critical="true">
    <llm>
      <i>HALT IMMEDIATELY if scope exceeds 3 stories - Tell user: "This enhancement requires more than 3 stories. Please use the brownfield PRD process instead. Would you like me to create a PRD using the analysis completed so far?"</i>
      <i>HALT if architectural changes needed - Tell user: "This requires architectural changes. Converting to brownfield PRD process. Shall I create the PRD?"</i>
      <i>HALT if integration complexity is high - Tell user: "Integration complexity exceeds epic scope. This needs full brownfield planning. Create PRD?"</i>
    </llm>
  </halt-conditions>

  <llm critical="true">
    <i>Always prioritize existing system integrity over new functionality</i>
  </llm>
</task>
```
