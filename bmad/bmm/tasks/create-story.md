<!-- Powered by BMAD-CORE™ -->

# Next Story v1.0

```xml
<task id="bmad/bmm/tasks/create-story.md" name="Create Next Story">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Load Core Configuration">
      <action>Load {project-root}/bmad/bmm/config.yaml from project root</action>
      <action>Extract key configurations: devStoryLocation, prd.*, architecture.*, workflow.*</action>
      <validation>
        <i>If core-config.yaml not found, HALT and inform user of configuration requirement</i>
      </validation>
    </step>

    <step n="2" title="Identify Next Story for Preparation">
      <action>Based on prdSharded from config, locate epic files</action>
      <action>If devStoryLocation has story files, load highest {epicNum}.{storyNum}.story.md file</action>
      <action>If highest story exists, verify status is 'Done'</action>
      <action>If no story files exist, next story is ALWAYS 1.1 (first story of first epic)</action>
      <output>
        Identified next story for preparation: {{epicNum}}.{{storyNum}} - {{Story Title}}
      </output>
      <validation>
        <i>If incomplete story found, alert user with override option</i>
        <i>If epic complete, prompt user for next epic selection</i>
        <i>NEVER automatically skip to another epic without user instruction</i>
      </validation>
    </step>

    <step n="3" title="Gather Story Requirements and Previous Context">
      <action>Extract story requirements from identified epic file</action>
      <action>If previous story exists, review Dev Agent Record sections for completion notes</action>
      <action>Extract implementation deviations and technical decisions</action>
      <action>Identify challenges encountered and lessons learned</action>
      <action>Extract relevant insights that inform current story preparation</action>
    </step>

    <step n="4" title="Gather Architecture Context">
      <action>Determine architecture reading strategy based on architectureVersion and sharding</action>
      <action>For ALL Stories: read tech-stack.md, unified-project-structure.md, coding-standards.md, testing-strategy.md</action>
      <action>For Backend/API Stories: additionally read data-models.md, database-schema.md, backend-architecture.md, rest-api-spec.md, external-apis.md</action>
      <action>For Frontend/UI Stories: additionally read frontend-architecture.md, components.md, core-workflows.md, data-models.md</action>
      <action>For Full-Stack Stories: read both Backend and Frontend sections</action>
      <action>Extract ONLY information directly relevant to implementing current story</action>
      <action>ALWAYS cite source documents: [Source: architecture/{filename}.md#{section}]</action>
    </step>

    <step n="5" title="Verify Project Structure Alignment">
      <action>Cross-reference story requirements with Project Structure Guide</action>
      <action>Ensure file paths, component locations, module names align with defined structures</action>
      <action>Document any structural conflicts in "Project Structure Notes" section</action>
    </step>

    <step n="6" title="Populate Story Template with Full Context">
      <action>Create new story file: {devStoryLocation}/{epicNum}.{storyNum}.story.md using Story Template</action>
      <action>Fill in basic story information: Title, Status (Draft), Story statement, Acceptance Criteria from Epic</action>
      <action>Populate Dev Notes section with ALL relevant technical details from previous steps</action>
      <action>Generate Tasks/Subtasks section based on Epic Requirements, Story AC, and Architecture Information</action>
      <action>Each task must reference relevant architecture documentation</action>
      <action>Include unit testing as explicit subtasks based on Testing Strategy</action>
      <action>Link tasks to ACs where applicable (e.g., Task 1 (AC: 1, 3))</action>
    </step>

    <step n="7" title="Story Draft Completion and Review">
      <action>Review all sections for completeness and accuracy</action>
      <action>Verify all source references are included for technical details</action>
      <action>Ensure tasks align with both epic requirements and architecture constraints</action>
      <action>Update status to "Draft" and save story file</action>
      <action>Execute {project-root}/tasks/run-chkl {project-root}/checklists/story-draft-checklist</action>
      <output>
        Story created: {{devStoryLocation}}/{{epicNum}}.{{storyNum}}.story.md
        Status: Draft
        Key technical components: {{components-list}}
        Deviations/conflicts: {{conflicts-if-any}}
        Checklist results: {{results}}
        Next steps: Review story draft (manually or run rev-draft-story task)
      </output>
    </step>
  </flow>

  <llm critical="true">
    <i>NEVER proceed to next step until current step is complete</i>
    <i>Dev Notes section MUST contain ONLY information extracted from architecture documents</i>
    <i>NEVER invent or assume technical details not in source documents</i>
    <i>Every technical detail MUST include source reference</i>
    <i>If information not found in architecture docs, explicitly state "No specific guidance found"</i>
    <i>NEVER automatically skip to another epic without user instruction</i>
  </llm>
</task>
```
