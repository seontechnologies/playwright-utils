---
description: task-ai-fe-prompt
auto_execution_mode: 2
---

<!-- Powered by BMAD-CORE™ -->

# AI Frontend Prompt v1.0

```xml
<task id="bmad/bmm/tasks/ai-fe-prompt.md" name="AI Frontend Prompt">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>

  <flow>
    <title>MANDATORY WORKFLOW STEPS - Execute IN ORDER</title>
    <step n="1" title="Apply Core Prompting Principles">
      <action>Be explicit and detailed - provide comprehensive context and avoid vague requests</action>
      <action>Plan for iteration - generate one component or section at a time, build incrementally</action>
      <action>Provide context first - include tech stack, existing code, and project goals</action>
      <halt-conditions critical="true">
        <i>If PRD unavailable: "AI frontend prompt requires completed PRD for context"</i>
        <i>If UI/UX spec missing: "Cannot generate effective frontend prompt without UI/UX specifications"</i>
        <i>If frontend architecture undefined: "Need frontend architecture document or combined architecture specification"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Apply Structured Prompting Framework">
      <action>High-level goal: Start with clear, concise summary of overall objective</action>
      <action>Detailed instructions: Provide granular, numbered list of actions broken into sequential steps</action>
      <action>Code examples and constraints: Include relevant snippets, data structures, API contracts, and explicit limitations</action>
      <action>Strict scope: Define boundaries of task, specify which files to modify and which to avoid</action>
    </step>

    <step n="3" title="Gather Foundational Context">
      <action>Extract project purpose and full tech stack from PRD and architecture</action>
      <action>Identify primary UI component library being used</action>
      <action>Gather visual style requirements: color palette, typography, spacing, aesthetic</action>
      <action>Request design files or screenshots from user if available</action>
    </step>

    <step n="4" title="Describe Visual Requirements">
      <action>Process design files (Figma links, screenshots) if provided by user</action>
      <action>If no design files, describe visual style from specifications</action>
      <action>Include specific color palette, typography choices, and spacing requirements</action>
      <action>Define overall aesthetic approach (minimalist, corporate, playful, etc.)</action>
    </step>

    <step n="5" title="Build Comprehensive AI Prompt">
      <action>Apply four-part structured framework to create core request</action>
      <action>Focus on single component or full page as appropriate</action>
      <action>Include all technical context, visual requirements, and constraints</action>
      <action>Specify exact tech stack versions and component library patterns</action>
    </step>

    <step n="6" title="Present and Refine Prompt">
      <action>Output complete, copy-ready prompt in clear code block format</action>
      <action>Explain prompt structure and rationale referencing core principles</action>
      <action>Gather user feedback and refine prompt as needed</action>
      <action>Remind user that AI-generated code requires careful human review and testing</action>
    </step>
  </flow>

  <critical-context>
    <llm>These elements MUST be considered throughout the entire task execution:</llm>
    <i>Generated prompts are for AI frontend tools like Vercel v0, Lovable.ai</i>
    <i>Focus on creating masterful, comprehensive prompts for significant frontend work</i>
    <i>Always remind users that AI-generated code needs human review and testing</i>
    <i>Emphasize iterative approach rather than expecting perfection in one generation</i>
  </critical-context>

  <output>
    <i>Comprehensive, structured AI frontend prompt ready for use</i>
    <i>Complete technical context with tech stack and component patterns</i>
    <i>Clear visual requirements and design specifications</i>
    <i>Explicit scope boundaries and implementation constraints</i>
  </output>

  <validation>
    <i>Prompt follows structured four-part framework</i>
    <i>Technical context is complete and accurate</i>
    <i>Visual requirements are clearly specified</i>
    <i>Scope boundaries prevent unintended changes</i>
    <i>Instructions are granular and actionable</i>
  </validation>
</task>
```
