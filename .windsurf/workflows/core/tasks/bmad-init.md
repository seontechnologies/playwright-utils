---
description: task-bmad-init
auto_execution_mode: 2
---

<!-- BMAD-CORE™ Initialization Task -->

# BMAD Init v1.0

```xml
<task id="bmad/core/tasks/bmad-init.md" name="BMAD Init">

  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>This task coordinates various BMAD initialization and maintenance operations</i>
  </llm>

  <flow>
    <step n="1" title="Welcome and Status Check">
      <desc>Display welcome message and current BMAD status</desc>
      <action>Display welcome banner with BMAD logo/ascii art</action>
      <action>Check for BMAD installation at {project-root}/bmad</action>
      <action>Display current version and installation date if available</action>
      <action>LOAD the manifest {project-root}/bmad/_cfg/manifest.xml</action>
      <format>
        ╔════════════════════════════════════════╗
        ║         BMAD INITIALIZATION            ║
        ╚════════════════════════════════════════╝

        Status: [Installed/Not Found]
        Location: {project-root}/bmad
        Version: [version from manifest]
        Installed: [date from manifest]
      </format>
    </step>

    <step n="2" title="Present Initialization Options">
      <desc>Show available initialization and maintenance tasks</desc>
      <action>List all available initialization options</action>
      <action>Wait for user selection</action>
      <format>
        Available initialization tasks:

        1. Generate/Update Agent Manifest
           - Creates or updates the agent manifest file
           - Uses LLM to generate condensed agent essences

        2. Verify Installation (Coming Soon)
           - Check all files are properly installed
           - Validate configurations

        3. Update Configurations (Coming Soon)
           - Update agent configurations
           - Apply language settings

        4. Exit

        Please select an option (1-4):
      </format>
    </step>

    <step n="3" title="Process User Selection">
      <desc>Execute the selected initialization task</desc>
      <conditions>
        <if option="1">
          <action>Confirm manifest generation with user</action>
          <format>
            Agent Manifest Generation
            ─────────────────────────
            This will analyze all installed agents and generate
            a condensed manifest for multi-agent orchestration.

            Existing manifest will be backed up if present.

            Proceed? (y/n):
          </format>
          <on-confirm>
            <action>Load and execute `{project-root}/bmad/core/tasks/agent-party-generate.md` task</action>
          </on-confirm>
        </if>
        <if option="2">
          <format>
            ⚠️ Installation verification is coming soon.
          </format>
        </if>
        <if option="3">
          <format>
            ⚠️ Configuration update is coming soon.
          </format>
        </if>
        <if option="4">
          <format>
            Exiting BMAD Init. Thank you!
          </format>
          <action>Exit task</action>
        </if>
      </conditions>
    </step>

    <step n="4" title="Post-Task Options">
      <desc>After completing a task, offer to continue or exit</desc>
      <action>Display completion status</action>
      <action>Ask if user wants to perform another task</action>
      <format>
        Task completed successfully!

        Would you like to perform another initialization task? (y/n):
      </format>
      <on-yes>
        <action>Return to Step 2</action>
      </on-yes>
      <on-no>
        <action>Display farewell message, suggest user start a new context or clear context, and then exit</action>
      </on-no>
    </step>
  </flow>

  <validation>
    <check>Ensure BMAD is installed at {project-root}/bmad</check>
    <check>Verify user has necessary permissions for file operations</check>
    <check>Confirm before any destructive operations</check>
  </validation>

  <error-handling>
    <error type="no-installation">
      <message>BMAD installation not found at {project-root}/bmad</message>
      <action>Suggest running BMAD installer first</action>
    </error>
    <error type="permission-denied">
      <message>Insufficient permissions to modify BMAD files</message>
      <action>Suggest running with appropriate permissions</action>
    </error>
  </error-handling>

  <outputs>
    <output>Status messages and user prompts to console</output>
    <output>Execution of selected sub-tasks</output>
    <output>Completion status for each operation</output>
  </outputs>
</task>
```

## Task Notes

This is the primary initialization task for BMAD that serves as an entry point for various system maintenance and configuration operations. Currently implements agent manifest generation with placeholders for future functionality.

### Future Enhancements

TBD
