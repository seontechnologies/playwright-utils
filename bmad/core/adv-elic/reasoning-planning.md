# Reasoning via Planning (RAP)

```xml
<elicitation id="bmad/core/adv-elic/reasoning-planning.md" name="Reasoning via Planning (RAP)">
  <description>Advanced elicitation technique for reasoning via planning (rap)</description>

  <core-method>
    Generate multiple possible reasoning steps and simulate their outcomes. Evaluate quality of each path using reward estimation. Balance exploration of new ideas with exploitation of promising paths. Build reasoning trees with world model guidance before final commitment.
  </core-method>

  <llm>
    <action>Define the initial state and desired outcome clearly</action>
    <action>Generate multiple possible next reasoning steps with estimated values</action>
    <action>Simulate predicted outcomes for each potential path</action>
    <action>Evaluate path quality using reward estimation or scoring</action>
    <action>Balance exploration of novel approaches with exploitation of high-value paths</action>
    <action>Select optimal reasoning chain based on simulation results</action>
  </llm>

  <final-report title="Reasoning via Planning Analysis">
    <value>Initial State: [Current understanding and context]</value>
    <value>Generated Steps: [Possible reasoning paths with estimated values]</value>
    <value>Outcome Simulation: [Predicted results for each path]</value>
    <value>Path Evaluation: [Quality assessment and scoring rationale]</value>
    <value>Selected Chain: [Optimal reasoning path chosen]</value>
    <value>Selection Rationale: [Why this path outperformed alternatives]</value>
  </final-report>
</elicitation>
```
