# Failure Mode Analysis

```xml
<elicitation id="bmad/core/adv-elic/failure-modes.md" name="Failure Mode Analysis">
  <description>Advanced elicitation technique for failure mode analysis</description>

  <core-method>
    Systematically explore what could go wrong by analyzing each component's failure mechanisms, causes, and impacts.
  </core-method>

  <llm>
    <action>Identify specific failure mechanisms and their root cause triggers</action>
    <action>Assess the impact severity and likelihood probability for each failure mode</action>
    <action>Analyze failure propagation and cascading effects across components</action>
    <action>Develop targeted mitigation strategies for critical failure modes</action>
  </llm>

  <final-report title="Failure Mode Analysis">
    <value>Component: [System part being analyzed]</value>
    <value>Failure Modes: [Specific ways it can fail]</value>
    <value>Root Causes: [What triggers each failure]</value>
    <value>Effects: [Impact when failure occurs]</value>
    <value>Risk Rating: [Severity x Likelihood assessment]</value>
    <value>Cascading Impact: [How failure propagates]</value>
    <value>Mitigation Strategy: [Prevention and response measures]</value>
  </final-report>
</elicitation>
```
