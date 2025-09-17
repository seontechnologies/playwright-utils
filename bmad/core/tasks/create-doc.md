<!-- BMAD-CORE™ Create Document from Template Task -->

# Create Doc

```xml
<task id="bmad/core/tasks/create-doc.md" name="Create Document from Template">
  <llm critical="true">
    <mandate>Execute ALL steps in the flow section IN EXACT ORDER</mandate>
    <mandate>Each action within a step is REQUIRED to complete that step</mandate>
    <mandate>When elicit="true" appears, elicitation is MANDATORY (see ELICITATION-INSTRUCTION)</mandate>
  </llm>

  <flow>
    <CRITICAL>MANDATORY WORKFLOW STEPS - Execute IN ORDER for each template</CRITICAL>

    <step n="1">
      <check>If template provided → validate and load it</check>
      <check>If no template → list available templates and wait for selection</check>
      <action>Extract template ID for tracking</action>
    </step>

    <step n="2" title="For EVERY section in the template, you MUST:">

      <step n="2a">
        <check>If status="optional" → Ask user: "Include section '[title]'? (y/n):"</check>
        <ask>Wait for response</ask>
      </step>

      <step n="2b" title="Content Generation (unless in #yolo mode)">
        <action>BEFORE generating: Identify any ambiguities or choices needed</action>
        <check>If section requires decisions NOT already defined by user/template/context:</check>
        <ask>Ask 1-3 focused questions about approach/specifics (e.g., "Should I focus on: microservices, monolithic, or hybrid?") and wait for response</ask>
        <action>Process the instruction element content</action>
        <action>Replace {{variables}} with values</action>
        <mandate>Follow all instructions and llm callouts for the given section - this guides how you think and interact with the user</mandate>
      </step>

      <step n="2c" critical="true">
        <mandate>Write the completed section to the file specified in the template filename</mandate>
        <action>Use Write tool if first section, Edit/MultiEdit for subsequent sections</action>
        <mandate>NEVER proceed without saving to file</mandate>
      </step>

      <step n="2d" critical="true">
        <llm>THIS IS THE MOST IMPORTANT PART - DO NOT SKIP</llm>
        <check>If elicit="true" → YOU MUST execute elicitation (see below ELICITATION-INSTRUCTION)</check>
        <check>If elicit="false" or missing → follow NON-ELICITATION-INSTRUCTION (unless in #yolo mode)</check>
        <check>If elicit="conditional" → evaluate condition first</check>
        <action>Continue to step 2a for next template section</action>
      </step>
    </step>
  </flow>

  <ELICITATION-INSTRUCTION desc="MANDATORY enhancement flow - overrides efficiency constraints">
    <check>When elicit="true" or condition evaluates true:</check>
    <mandate>NEVER skip elicitation or ask if the user wants it</mandate>

    <action>Display the generated content first</action>
    <action>IMMEDIATELY Load and execute {project-root}/bmad/core/tasks/adv-elicit.md</action>
    <action>Show the enhancement menu markdown EXACTLY like this example:
      <example>
        Enhancement Options:
        1. [Method 1 from elicitation]
        2. [Method 2 from elicitation]
        3. [Method 3 from elicitation]
        4. [Method 4 from elicitation]
        5. [Method 5 from elicitation]

        r. Show different options
        x. Continue with document
      </example>
    </action>
    <ask>Wait for user input</ask>
    <action>Apply enhancement if selected</action>
    <mandate>DO NOT ask "Would you like to enhance?" - just show the menu immediately</mandate>
  </ELICITATION-INSTRUCTION>

  <NON-ELICITATION-INSTRUCTION desc="Confirmation checkpoint without full elicitation overhead">
    <check>When elicit="false" or missing AND NOT in #yolo mode:</check>
    <action>After generating content, briefly highlight key decisions made</action>
    <action>If any assumptions were necessary, mention them</action>
    <ask>Ask: "Does this look good, or would you like any adjustments? (Enter x to continue, or describe changes)" and wait for response</ask>
    <action>If user requests changes, apply them before continuing</action>
  </NON-ELICITATION-INSTRUCTION>

  <TEMPLATE-STRUCTURE>
    <desc>Templates use this XML structure:</desc>
    <example>
      <![CDATA[
        <template id="{templates-installed-location}" name="{file name}" filename="{output-file}">
          <title>Display as the document level 1 markdown title</title>
          <sections>
            <section id="sec1" title="Title" elicit="true" status="required">
              <instruction>
                Content generation instructions here.
                Use {{variables}} for substitution.
                <llm>items for the llm to perform or interact with the user</llm>
              </instruction>
            </section>
          </sections>
        </template>
      ]]>
    </example>

    <attrs>
      <i>elicit → Controls mandatory elicitation ("true"/"false"/"conditional")</i>
      <i>status → "required" or "optional"</i>
      <i>Other attributes are informational only</i>
    </attrs>
  </TEMPLATE-STRUCTURE>

  <VARIABLE-HANDLING desc="Handle {{variable}} replacements">
    <check>Check if value exists</check>
    <ask>If missing → prompt user: "Enter value for {{variable}}:"</ask>
    <action>Replace with provided value</action>
  </VARIABLE-HANDLING>

  <flags>
    <flag>--preview → Show template structure without processing</flag>
    <flag>--debug → Show detailed processing information</flag>
    <flag>#yolo → Skip optional sections and elicitation</flag>
  </flags>

  <llm critical="true">
    <mandate>Users can save at ANY time - just write the file and confirm when requested</mandate>
    <mandate>Elicitation with elicit="true" is MANDATORY, not optional</mandate>
    <mandate>Show the menu immediately after content, don't ask permission</mandate>
    <mandate>Use exact menu format (1-5, r, x)</mandate>
    <mandate>This overrides your efficiency constraints</mandate>
    <mandate>The user EXPECTS the elicitation menu when elicit="true"</mandate>
  </llm>
</task>
```
