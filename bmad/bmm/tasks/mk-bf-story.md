<!-- Powered by BMAD-CORE™ -->

# Make Brownfield Story v1.0

```xml
<task id="bmad/bmm/tasks/mk-bf-story.md" name="Make Brownfield Story">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Check Available Documentation Context">
      <action>Check for sharded PRD/Architecture documents - if found, recommend using next-story task</action>
      <action>Look for brownfield architecture document from doc-proj task</action>
      <action>Check for brownfield PRD, epic files, or user-provided documentation</action>
      <action>Establish documentation context hierarchy for story creation</action>
      <halt-conditions critical="true">
        <i>If standard v4+ documentation exists: "Use next-story task for properly documented projects"</i>
        <i>If no documentation available: "Cannot create safe brownfield story without system context"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Story Identification and Context Gathering">
      <action>From Brownfield PRD: Extract stories from epic sections</action>
      <action>From Epic Files: Read epic definition and story requirements</action>
      <action>From User Direction: Ask which specific enhancement to implement</action>
      <action>Gather essential context: existing functionality impact, integration points, patterns to follow, technical constraints, gotchas/workarounds</action>
      <action>List missing information and request from user if critical details unavailable</action>
    </step>

    <step n="3" title="Extract Technical Context from Sources">
      <action>From brownfield-architecture.md: Technical debt affecting story, key files needing modification, integration patterns, known issues, actual tech stack</action>
      <action>From brownfield PRD: Technical constraints, integration requirements, code organization patterns, risk assessment</action>
      <action>From user documentation: Help identify relevant specs, existing code examples, integration requirements, testing approaches</action>
    </step>

    <step n="4" title="Create Story with Progressive Detail Gathering">
      <action>Start with story template filling known information</action>
      <action>Include context source, enhancement type, existing system impact assessment</action>
      <action>Develop acceptance criteria including new functionality AND existing functionality preservation</action>
      <action>Create Dev Technical Guidance with existing system context, integration approach, technical constraints</action>
      <action>Note missing information for dev agent exploration if needed</action>
    </step>

    <step n="5" title="Generate Implementation Tasks with Safety Checks">
      <action>Include exploration tasks if system understanding incomplete</action>
      <action>Add verification tasks for existing functionality</action>
      <action>Include rollback considerations and reference specific files/patterns when known</action>
      <action>Structure: Analysis tasks, Implementation tasks, Verification tasks, Testing tasks</action>
    </step>

    <step n="6" title="Risk Assessment and Mitigation">
      <action>Add brownfield-specific risk assessment section</action>
      <action>Include implementation risks, rollback plan, safety checks</action>
      <action>Document primary risk, mitigation approach, verification method</action>
      <action>Ensure rollback procedure is simple and documented</action>
    </step>

    <step n="7" title="Final Story Validation">
      <action>Completeness Check: Clear scope, sufficient technical context, defined integration approach, identified risks with mitigation</action>
      <action>Safety Check: Existing functionality protection, feasible rollback plan, testing covers new and existing features</action>
      <action>Information Gaps: All critical missing information gathered, remaining unknowns documented, exploration tasks added where needed</action>
    </step>

    <step n="8" title="Story Output and Handoff">
      <action>Save story with appropriate naming convention</action>
      <action>Include header noting documentation context and references</action>
      <action>Provide clear handoff communication with story title, source documentation, key integration points, noted risks</action>
      <action>List next steps: review story accuracy, verify integration approach, approve or request adjustments</action>
    </step>
  </flow>

  <output>
    <i>Implementation-ready brownfield story with complete context</i>
    <i>Clear integration approach safe for existing system</i>
    <i>Technical context extracted and organized from available sources</i>
    <i>Risk assessment with mitigation strategies and rollback plan</i>
  </output>

  <validation>
    <i>Story can be implemented without requiring dev to search multiple documents</i>
    <i>Integration approach is clear and safe for existing system</i>
    <i>All available technical context has been extracted and organized</i>
    <i>Missing information identified and addressed with user</i>
    <i>Risks documented with mitigation strategies</i>
    <i>Story includes verification of existing functionality</i>
  </validation>

  <halt-conditions critical="true">
    <i>If complexity grows beyond single story: "Escalate to bf-epic for multi-story enhancements"</i>
    <i>If integration complexity unclear: "Cannot create safe story without understanding system integration"</i>
    <i>If no technical context available: "Need some form of technical documentation or user guidance"</i>
    <i>If risks cannot be assessed: "Must understand potential impact on existing system"</i>
  </halt-conditions>

  <llm critical="true">
    <i>This task is for brownfield projects with non-standard documentation</i>
    <i>Always prioritize existing system stability over new features</i>
    <i>When in doubt, add exploration and verification tasks</i>
    <i>Better to ask user for clarification than make assumptions</i>
    <i>Each story should be self-contained for the dev agent</i>
  </llm>
</task>
```
