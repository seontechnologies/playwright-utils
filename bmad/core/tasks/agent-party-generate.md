<!-- BMAD-CORE™ Agent Party Generation Task -->

# Agent Party Generate v1.0

```xml
<task id="bmad/core/tasks/agent-party-generate.md" name="Agent Manifest Generate">

  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>Use LLM capabilities to create rich, condensed agent essences</i>
    <i>Focus on creating orchestration-optimized descriptions</i>
    <i>Consider all customizations when generating summaries</i>
  </llm>

  <flow>
    <step n="1" title="Preparation" desc="Prepare for manifest generation">
      <action>Check for installation manifest at {project-root}/bmad/_cfg/manifest.xml</action>
      <action>If not found, abort with error message</action>
      <action>Check for existing agent manifest at {project-root}/bmad/_cfg/agent-party.xml</action>
      <action>If exists, create backup at {project-root}/bmad/_cfg/agent-party.xml.backup</action>
      <format>
        Agent Manifest Generation
        ═════════════════════════

        Checking installation...
        Location: {project-root}/bmad

        [✓] Installation manifest found
        [✓] Backup created (if existing agent manifest)
      </format>
    </step>

    <step n="2" title="Agent Discovery">
      <desc>Discover all installed agents from manifest</desc>
      <action>Read the installation manifest at {project-root}/bmad/_cfg/manifest.xml</action>
      <action>Extract all file nodes with type="agent"</action>
      <action>For each agent file node, get the path attribute</action>
      <action>Combine installation path with file path to get full agent file location</action>
      <action>Build list of agent files to process with their metadata</action>
      <format>
        Discovering agents from manifest...

        Reading: {project-root}/bmad/_cfg/manifest.xml

        Agents found by module:
          [module]: [Num] agents
          [module]: [Num] agents
          ...

        Total agents to process: [Num]
      </format>
    </step>

    <step n="3" title="Agent Analysis and Essence Extraction">
      <desc>Use LLM to analyze each agent and create highly condensed essence</desc>
      <action>For each discovered agent file:</action>
      <sub-steps>
        <i>1. Read full agent definition from .md file</i>
        <i>2. Check for config overrides in {project-root}/bmad/_cfg/agents/[module]-[agent].md</i>
        <i>3. If config override sections exist, they COMPLETELY REPLACE the corresponding base sections</i>
        <i>4. Use LLM to create ultra-condensed summary:</i>
        <synthesis>
          <i>Single sentence capturing role and unique value (30-40 words max)</i>
          <i>Communication style in 10-15 words</i>
          <i>Core principles compressed to 1-2 brief sentences</i>
          <i>Memories condensed to 1-2 sentences if present (important context/backstory)</i>
          <i>Skip capabilities list - embed key skills in the role sentence</i>
          <i>Only note 1-2 key collaborators if truly essential</i>
        </synthesis>
      </sub-steps>
      <format>
        Processing agents...

        [1/N] Analyzing [agent-name]...
              ✓ Identity synthesized
              ✓ Core principles extracted
              ✓ Capabilities identified

        [2/N] Analyzing [agent-name]...
              ...
      </format>
    </step>

    <step n="4" title="Relationship Mapping">
      <desc>Identify relationships and synergies between agents</desc>
      <action>Analyze agent capabilities for complementary skills</action>
      <action>Identify potential collaboration patterns</action>
      <action>Note agents with overlapping expertise</action>
      <action>Create orchestration recommendations</action>
      <format>
        Mapping agent relationships...

        Identified synergies:
        - [Agent A] + [Agent B]: [Synergy description]
        - [Agent C] + [Agent D]: [Synergy description]

        Collaboration patterns detected: [N]
      </format>
    </step>

    <step n="5" title="Manifest Generation">
      <desc>Generate ultra-compact XML manifest file</desc>
      <action>Create minimal XML structure with root manifest element</action>
      <action>Group agents by module for organization</action>
      <action>For each agent, create compact XML entry:</action>
      <xml-structure>
        <agent id="path" name="name" title="title">
          <role>Single sentence with role and key capabilities embedded (30-40 words)</role>
          <style>Communication style in 10-15 words</style>
          <principles>Core principles in 1-2 sentences max</principles>
          <memories>Important context/backstory in 1-2 sentences if present</memories>
          <collab>Key collaborator names only if essential</collab>
        </agent>
      </xml-structure>
      <action>Add statistics section with totals and metadata</action>
      <action>Write to {project-root}/bmad/_cfg/agent-party.xml</action>
    </step>

    <step n="6" title="Validation and Report">
      <desc>Validate the generated manifest and provide summary</desc>
      <action>Verify XML structure is valid</action>
      <action>Ensure all discovered agents are included</action>
      <action>Report generation statistics</action>
      <format>
        Manifest Generation Complete
        ═══════════════════════════

        ✓ Manifest created successfully

        Statistics:
        - Total agents processed: [N]
        - Modules included: [list]
        - Relationships mapped: [N]
        - File size: [size]
        - Location: {project-root}/bmad/_cfg/agent-party.xml

        The manifest is now ready for use with party-mode and
        other multi-agent orchestration features.
      </format>
    </step>
  </flow>

  <llm-prompts>
    <essence-prompt>
      Analyze this agent and create an ULTRA-CONDENSED summary for party-mode orchestration.

      CRITICAL: Config overrides COMPLETELY REPLACE base sections - use override content if present.

      Generate ONLY:
      1. Role: ONE sentence (30-40 words) combining role + key capabilities
      2. Style: Communication style in 10-15 words ONLY
      3. Principles: Compress ALL principles into 1-2 sentences MAX
      4. Memories: If present, condense to 1-2 sentences of important context
      5. Collab: List 1-2 key collaborator names only if truly essential

      Target: Reduce from ~2000 chars to <350 chars per agent (with memories).
      Every word must earn its place. Be ruthlessly concise.
    </essence-prompt>

    <relationship-prompt>
      Based on these agent capabilities and roles, identify:
      1. Which agents would work well together
      2. Complementary skill sets
      3. Potential collaboration patterns
      4. Agents that could hand off tasks to each other
    </relationship-prompt>
  </llm-prompts>

  <validation>
    <check>Ensure BMAD installation exists at {project-root}/bmad</check>
    <check>Verify write permissions for _cfg directory</check>
    <check>Validate XML structure before writing</check>
    <check>Confirm all non-localskip agents are included</check>
  </validation>

  <error-handling>
    <error type="no-manifest">
      <message>Installation manifest not found at {project-root}/bmad/_cfg/manifest.xml</message>
      <action>Ensure BMAD is properly installed and manifest.xml exists</action>
    </error>
    <error type="no-agents-found">
      <message>No agent files found in installation manifest</message>
      <action>Check installation integrity - agents should have type="agent" in manifest</action>
    </error>
    <error type="xml-generation-failed">
      <message>Failed to generate valid XML structure</message>
      <action>Restore from backup if available</action>
    </error>
    <error type="llm-analysis-failed">
      <message>Failed to analyze agent with LLM</message>
      <action>Fall back to basic extraction for that agent</action>
    </error>
  </error-handling>

  <outputs>
    <output>Generated agent-party.xml in _cfg directory</output>
    <output>Backup of previous manifest (if existed)</output>
    <output>Console progress and completion report</output>
  </outputs>
</task>
```
