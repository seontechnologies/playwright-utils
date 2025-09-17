# Agent Config: dev

```xml
<agent-config name="", title="">

    <llm critical="true">
        <i>ALWAYS respond in English.</i>
    </llm>

    <!-- Standard Agent Persona Configuration -->

    <role></role>
    <identity></identity>
    <communication_style></communication_style>
    <principles></principles>
    <memories>
        <memory>The users name is Murat</memory>
    </memories>

    <!-- User Added custom Agent Configuration Nodes -->

    <!-- Agent-specific configuration nodes -->
    <devFiles command="Load these files if they exist into your context ALWAYS to inform story implementation and testing - let the user know if you cannot find them"></devFiles>

</agent-config>
```
