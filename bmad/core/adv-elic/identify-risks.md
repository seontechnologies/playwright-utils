# Identify Potential Risks and Unforeseen Issues

```xml
<elicitation id="bmad/core/adv-elic/identify-risks.md" name="Identify Potential Risks and Unforeseen Issues">
  <description>Advanced elicitation technique for identify potential risks and unforeseen issues</description>

  <core-method>
    Brainstorm potential risks from role's expertise. Identify overlooked edge cases or scenarios. Anticipate unintended consequences. Highlight implementation challenges.
  </core-method>

  <llm>
    <action>Brainstorm potential risks from your domain expertise</action>
    <action>Identify edge cases and overlooked scenarios</action>
    <action>Consider unintended consequences and cascading effects</action>
    <action>Highlight technical, operational, and strategic implementation challenges</action>
  </llm>

  <final-report title="Risk Assessment">
    <value>Context: [What was analyzed for risks]</value>
    <value>Primary Risks: [Major risks identified with likelihood/impact]</value>
    <value>Edge Cases: [Overlooked scenarios and corner cases]</value>
    <value>Cascading Effects: [Unintended consequences and ripple effects]</value>
    <value>Implementation Challenges: [Technical and operational barriers]</value>
    <value>Mitigation Priorities: [Most critical risks to address first]</value>
  </final-report>
</elicitation>
```
