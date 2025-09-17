---
description: task-kb-interact
auto_execution_mode: 2
---

<!-- Powered by BMAD-CORE™ -->

# Kb Interact v1.0

```xml
<task id="bmad/core/tasks/kb-interact.md" name="KB Mode Interaction">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Welcome to KB Mode">
      <action>Ensure you have access to a knowledge-base for each module. If you do not, HALT and inform the user you do not have access to a knowledge base or knowledge base index. Exit KB Mode immediately.</action>
      <action>Announce entering KB mode with brief, friendly introduction</action>
      <action>Explain access to full BMad knowledge base</action>
    </step>

    <step n="2" title="Present Topic Areas">
      <action>Generate a list of topic areas from the loaded knowledge base topic list, or offer to chat about something not listed to see if you can help.</action>
    </step>

    <step n="3" title="Respond to User Query">
      <action>Wait for user's specific question or topic selection</action>
      <action>Provide focused, relevant information from knowledge base</action>
      <action>Offer to dive deeper or explore related topics</action>
      <action>Keep responses concise unless user asks for detailed explanations</action>
    </step>

    <step n="4" title="Continue Interactive Exploration">
      <action>After answering, suggest related topics they might find helpful</action>
      <action>Maintain conversational flow rather than data dumping</action>
      <action>Use examples when appropriate</action>
      <action>Reference specific documentation sections when relevant</action>
    </step>

    <step n="5" title="Exit KB Mode">
      <action>Summarize key points discussed if helpful</action>
      <action>Remind them they can return to KB mode anytime with *kb-mode</action>
      <action>Suggest next steps based on what was discussed</action>
    </step>
  </flow>

  <llm critical="true">
    <i>Provide user-friendly interface to BMad knowledge base</i>
    <i>Don't overwhelm users with information upfront</i>
    <i>Wait for specific questions before providing detailed information</i>
    <i>Maintain conversational flow throughout interaction</i>
  </llm>
</task>
```
