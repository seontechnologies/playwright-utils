# Expert Panel

```xml
<elicitation id="bmad/core/adv-elic/expert-panel.md" name="Expert Panel">
  <description>Advanced elicitation technique for expert panel</description>

  <core-method>Simulate multiple domain experts debating an issue, each providing evidence-based recommendations from their unique perspective.</core-method>

  <llm>
    <action>Each expert has distinct domain viewpoint and reasoning</action>
    <action>All recommendations cite specific evidence</action>
    <action>Experts constructively disagree when appropriate</action>
  </llm>

  <final-report title="Expert Panel Analysis">
    <value>TOPIC: [Issue needing expert input]</value>
    <value>PANEL: [3-5 expert roles and domains]</value>
    <value>POSITIONS: [Each expert's stance with reasoning]</value>
    <value>DEBATE: [Key disagreements]</value>
    <value>CONSENSUS: [Agreed recommendations]</value>
    <value>MINORITY: [Important dissenting views]</value>
  </final-report>
</elicitation>
```
