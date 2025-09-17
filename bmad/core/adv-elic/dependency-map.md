# Dependency Mapping

```xml
<elicitation id="bmad/core/adv-elic/dependency-map.md" name="Dependency Mapping">
  <description>Advanced elicitation technique for dependency mapping</description>

  <core-method>
    Identify all dependencies and interconnections in a system to map critical paths, bottlenecks, and failure cascades.
  </core-method>

  <llm>
    <action>Map all relationships and constraints between components</action>
    <action>Identify longest dependency chains (critical paths)</action>
    <action>Highlight single points of failure and risk areas</action>
  </llm>

  <final-report title="Dependency Map">
    <value name="Entities">[List all components]</value>
    <value name="Dependencies">[A] → [B] (dependency type)</value>
    <value name="Critical Path">[Longest chain through dependencies]</value>
    <value name="Bottlenecks">[Single points of failure]</value>
    <value name="Risk Areas">[High-impact dependency failures]</value>
  </final-report>
</elicitation>
```
