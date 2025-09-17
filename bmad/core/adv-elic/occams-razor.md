# Occam's Razor Application

```xml
<elicitation id="bmad/core/adv-elic/occams-razor.md" name="Occam's Razor Application">
  <description>Advanced elicitation technique for occam's razor application</description>

  <core-method>When multiple explanations exist, choose the one requiring the fewest assumptions. "Entities should not be multiplied without necessity."</core-method>

  <llm>
    <action>List all possible explanations</action>
    <action>Test which fully explain observations</action>
    <action>Count assumptions required for each</action>
    <action>Choose simplest sufficient explanation</action>
  </llm>

  <final-report title="Occam's Razor Analysis">
    <value>Phenomenon: [What needs explaining]</value>
    <value>Explanations: [List with assumption counts]</value>
    <value>Sufficiency: [Which explain all evidence]</value>
    <value>Choice: [Simplest sufficient explanation]</value>
    <value>Action: [What to do based on choice]</value>
  </final-report>
</elicitation>
```
