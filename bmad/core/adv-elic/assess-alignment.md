# Assess Alignment with Goals

```xml
<elicitation id="bmad/core/adv-elic/assess-alignment.md" name="Assess Alignment with Goals">
  <description>Advanced elicitation technique for assess alignment with goals</description>

  <core-method>
    Evaluate how well content contributes to stated objectives. Identifies misalignments, gaps, and optimization opportunities.
  </core-method>

  <llm>
    <action>Map each content element to goals</action>
    <action>Score alignment strength (Strong/Moderate/Weak/Misaligned)</action>
    <action>Identify missing elements and scope drift</action>
    <action>Recommend optimization actions</action>
  </llm>

  <final-report title="Goal Alignment Assessment">
    <value name="Content">[What was analyzed]</value>
    <value name="Primary Goal">[Main objective]</value>
    <value name="Alignment Score">[Strong/Moderate/Weak elements]</value>
    <value name="Gaps">[Missing elements, scope drift]</value>
    <value name="Optimizations">[Strengthen, remove, add, rebalance]</value>
  </final-report>
</elicitation>
```
