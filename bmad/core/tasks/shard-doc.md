<!-- BMAD-CORE™ Document Sharding Task -->

# Shard Doc v1.1

```xml
<task id="bmad/core/tasks/shard-doc.md" name="Shard Doc">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>

  <flow>
    <step n="1" title="Check for Tool">
      <i>First check if md-tree command is available</i>
    </step>

    <step n="2" title="Install if Needed">
      <i>If not available, ask user permission to install: npm install -g @kayvan/markdown-tree-parser</i>
    </step>

    <step n="3" title="Shard Document">
      <i>Use the explode command to split the document</i>
    </step>
  </flow>

  <usage>
    <commands>
      # Install the tool (if needed)
      npm install -g @kayvan/markdown-tree-parser

      # Shard a document
      md-tree explode [source-document] [destination-folder]

      # Examples
      md-tree explode docs/prd.md docs/prd
      md-tree explode docs/architecture.md docs/architecture
    </commands>
  </usage>

  <halt-conditions critical="true">
    <i>HALT if md-tree command fails and user declines installation</i>
    <i>HALT if source document does not exist at specified path</i>
    <i>HALT if destination folder exists and user does not confirm overwrite</i>
  </halt-conditions>

  <validation>
    <title>Error Handling</title>
    <desc>If the md-tree command fails:</desc>
    <i>1. Check if the tool is installed globally</i>
    <i>2. Ask user permission to install it</i>
    <i>3. Retry the operation after installation</i>
  </validation>
</task>
```
