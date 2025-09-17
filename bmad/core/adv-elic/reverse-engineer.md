# Reverse Engineering

```xml
<elicitation id="bmad/core/adv-elic/reverse-engineer.md" name="Reverse Engineering">
  <description>Advanced elicitation technique for reverse engineering</description>

  <core-method>Start with desired outcome and work backwards to identify necessary conditions and map the path from goal to current state.</core-method>

  <llm>
    <action>Begin with clearly defined desired end state</action>
    <action>Identify what immediately precedes each step</action>
    <action>Map essential steps that cannot be skipped</action>
  </llm>

  <final-report title="Reverse Engineering Analysis">
    <value>Desired Outcome: [Target goal]</value>
    <value>Immediate Prerequisites: [What directly enables the goal]</value>
    <value>Step Chain: [Goal ← Step N ← ... ← Step 1 ← Current State]</value>
    <value>Critical Path: [Essential steps that cannot be skipped]</value>
    <value>Gap Analysis: [What's missing from current state]</value>
  </final-report>
</elicitation>
```
