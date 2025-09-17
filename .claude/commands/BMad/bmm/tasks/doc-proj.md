<!-- Powered by BMAD-CORE™ -->

# Document Project v1.0

```xml
<task id="bmad/bmm/tasks/doc-proj.md" name="Document Project">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Initial Project Analysis">
      <action>Check if PRD or requirements document exists in context</action>
      <action>If PRD exists: Focus documentation on relevant areas for planned enhancement</action>
      <action>If no PRD: Ask user for focus preference - create PRD first, provide requirements, describe focus, or document everything</action>
      <action>Conduct project structure discovery, technology stack identification, build system analysis</action>
      <action>Review existing documentation and sample key files for patterns</action>
      <halt-conditions critical="true">
        <i>If user preference unclear: "Need to understand documentation scope - full project or focused on specific enhancement"</i>
        <i>If project structure inaccessible: "Cannot document project without access to codebase structure"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Deep Codebase Analysis">
      <action>Explore key areas: entry points, configuration files, package dependencies, build/deployment configs, test suites</action>
      <action>Ask clarifying questions about custom patterns, critical/complex parts, undocumented knowledge, technical debt</action>
      <action>Map ACTUAL patterns used, not theoretical best practices</action>
      <action>Find business logic locations, integration points, workarounds, and areas differing from standard patterns</action>
      <action>If PRD provided: Analyze what would need to change for the enhancement</action>
    </step>

    <step n="3" title="Generate Brownfield Architecture Document">
      <action>Create comprehensive brownfield architecture document reflecting ACTUAL system state</action>
      <action>Document technical debt, inconsistent patterns, legacy code constraints, integration constraints</action>
      <action>Include: Introduction with scope, Quick Reference to key files, Tech Stack from actual dependencies</action>
      <action>Source Tree with real structure and module organization, Data Models and API references</action>
      <action>Technical Debt section, Integration Points, Development/Deployment reality, Testing current state</action>
      <action>If PRD provided: Impact Analysis showing files needing modification and integration considerations</action>
    </step>

    <step n="4" title="Document Delivery">
      <action>Web UI: Present document in response, instruct user to save as brownfield-architecture.md</action>
      <action>IDE Environment: Create document as /Users/murat.ozcan/seon/playwright-utils/{output-directory}/architecture.md</action>
      <action>Ensure document enables future agents to understand actual system state, key file locations, technical debt constraints</action>
      <action>If PRD provided: Clear enhancement impact analysis</action>
    </step>

    <step n="5" title="Quality Assurance">
      <action>Verify technical details match actual codebase</action>
      <action>Ensure all major system components are documented</action>
      <action>If user provided scope, verify relevant areas are emphasized</action>
      <action>Check explanations are clear for AI agents and document has clear navigation structure</action>
    </step>
  </flow>

  <output>
    <i>Single comprehensive brownfield architecture document</i>
    <i>Document reflecting reality including technical debt and workarounds</i>
    <i>Key files and modules referenced with actual paths</i>
    <i>If PRD provided: Clear impact analysis for planned enhancement</i>
  </output>

  <validation>
    <i>Document captures TRUE system state with technical debt</i>
    <i>References actual files rather than duplicating content</i>
    <i>Technical constraints and gotchas clearly documented</i>
    <i>For brownfield with PRD: Enhancement impact analysis provided</i>
    <i>Document enables AI agents to navigate actual codebase</i>
  </validation>

  <halt-conditions critical="true">
    <i>If codebase inaccessible: "Cannot document project without access to source code and structure"</i>
    <i>If scope undefined and user unresponsive: "Need clear scope definition to create focused documentation"</i>
    <i>If technical details cannot be verified: "Documentation must accurately reflect actual system implementation"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Create ONE document capturing TRUE system state</i>
    <i>Reference actual files rather than duplicating content when possible</i>
    <i>Document technical debt, workarounds, and constraints honestly</i>
    <i>Goal is PRACTICAL documentation for AI agents doing real work</i>
  </llm>
</task>
```
