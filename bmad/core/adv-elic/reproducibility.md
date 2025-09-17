# Reproducibility

```xml
<elicitation id="bmad/core/adv-elic/reproducibility.md" name="Reproducibility">
  <description>Advanced elicitation technique for reproducibility</description>

  <core-method>Document every input and create standardized procedures to enable exact replication of results</core-method>

  <llm>
    <action>Include complete documentation of all inputs affecting outcome</action>
    <action>Version everything and track all dependencies</action>
    <action>Eliminate randomness using seeds or controlled conditions</action>
  </llm>

  <final-report title="Reproducibility Package">
    <value>Process: [What you're making reproducible]</value>
    <value>Inputs: [Variables, data, configurations]</value>
    <value>Environment: [System requirements, versions]</value>
    <value>Steps: [Detailed execution procedure]</value>
    <value>Expected: [Results that should be produced]</value>
    <value>Variation: [Factors causing differences]</value>
    <value>Package: [Everything needed for replication]</value>
  </final-report>
</elicitation>
```
