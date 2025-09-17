# Self-Consistency Validation

```xml
<elicitation id="bmad/core/adv-elic/self-consistency.md" name="Self-Consistency Validation">
  <description>Advanced elicitation technique for self-consistency validation</description>

  <core-method>
    Generate 3-5 independent solutions using different approaches. Develop each solution without referencing the others. Compare results to identify convergence and divergence patterns. Use agreement level as confidence indicator for final answer.
  </core-method>

  <llm>
    <action>Generate first solution using your primary reasoning approach</action>
    <action>Create second solution using alternative methodology or perspective</action>
    <action>Develop third solution with different assumptions or starting point</action>
    <action>Add fourth and fifth solutions if problem complexity warrants</action>
    <action>Compare all solutions to identify points of convergence</action>
    <action>Assess confidence based on agreement level across approaches</action>
  </llm>

  <final-report title="Self-Consistency Validation">
    <value>Multiple Approaches: [Each solution method and result]</value>
    <value>Convergence Analysis: [Where solutions agree]</value>
    <value>Divergence Points: [Where solutions differ and why]</value>
    <value>Agreement Level: [Percentage or degree of consensus]</value>
    <value>Confidence Assessment: [High/Medium/Low with justification]</value>
  </final-report>
</elicitation>
```
