# 5 Whys Deep Dive

```xml
<elicitation id="bmad/core/adv-elic/five-whys.md" name="5 Whys Deep Dive">
  <description>Advanced elicitation technique for 5 whys deep dive</description>

  <core-method>
    Ask "why" exactly 5 times, each building on previous answer to reach root cause.
  </core-method>

  <llm>
    <action>Stop at exactly 5 iterations</action>
    <action>Each answer must be factual, not speculative</action>
    <action>Document complete chain for verification</action>
  </llm>

  <final-report title="5 Whys Analysis">
    <value>Problem: [Original issue]</value>
    <value>Why₁: [First cause]</value>
    <value>Why₂: [Second cause]</value>
    <value>Why₃: [Third cause]</value>
    <value>Why₄: [Fourth cause]</value>
    <value>Why₅: [Root cause]</value>
    <value>Action: [What to fix at root level]</value>
  </final-report>
</elicitation>
```
