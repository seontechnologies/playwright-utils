<!-- BMAD-CORE™ Party Mode Task -->

# Party Mode v1.1

```xml
<task id="bmad/core/tasks/party-mode.md" name="Party Mode" manifest="/Users/murat.ozcan/seon/playwright-utils//bmad/_cfg/agent-party.xml">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>

  <flow>
    <!-- Step 1: Load Agent Manifest -->
    <step n="1" title="Load Agent Manifest">
      <i>Read the agent manifest provided to get all installed agents with their names and bios</i>
    </step>

    <!-- Step 2: Initialize Party Mode -->
    <step n="2" title="Initialize Party Mode">
      <desc>Announce party mode activation and introduce the participating agents:</desc>
      <format>
        🎉 PARTY MODE ACTIVATED! 🎉
        All agents are here for a group discussion!

        Participating agents:
        - [Name] ([Title]): [Brief intro from bio]
        - [Name] ([Title]): [Brief intro from bio]
        ...

        Topic: [Wait for user to provide topic or question]
      </format>
    </step>

    <!-- Step 3: Orchestrate Discussion -->
    <step n="3" title="Orchestrate Discussion">
      <desc>For each user message or topic:</desc>
      <i>1. Determine Relevance: Identify which agents would naturally respond based on their expertise</i>
      <i>2. Generate Responses: Create authentic responses for 2-3 most relevant agents</i>
      <i>3. Maintain Character: Each response should reflect that agent's personality and communication style from their bio</i>
      <i>4. Enable Cross-Talk: Allow agents to build on or respond to each other's points, they should interact with each other and the user</i>
      <i>5. Handle Questions: When an agent asks the user a direct question, pause for user response before other agents continue</i>
    </step>

    <!-- Step 4: Response Format -->
    <step n="4" title="Response Format">
      <desc>Present each agent's contribution clearly:</desc>
      <format>
        [Agent Name]: [Their response in character]

        [Another Agent]: [Their response, potentially referencing previous or other agent(s)]

        [Third Agent]: [etc...]
      </format>
    </step>
  </flow>

  <roleplay-guidelines>
    <i>Keep responses in-character and voiced as that character indicates they would voice</i>
    <i>Use each agent's documented personality traits and quirks</i>
    <i>Allow natural disagreements or different perspectives</i>
    <i>Maintain professional discourse while being engaging</i>
    <i>Let agents reference each other by name and/or role</i>
    <i>Include occasional humor or personality-driven asides</i>
  </roleplay-guidelines>

  <question-protocol>
    <title>Question Handling Protocol</title>
    <desc>When agents ask questions during discussion:</desc>

    <direct-user>
      <i>If an agent asks the user a specific question (e.g., "What's your budget?" or "Which did you have for lunch today?"), end that round of responses and wait for user input</i>
    </direct-user>

    <rhetorical>
      <i>Agents can ask rhetorical questions or thinking-aloud questions without pausing</i>
    </rhetorical>

    <inter-agent>
      <i>Agents can ask each other questions and respond naturally</i>
    </inter-agent>

    <visual-cue>
      <i>When waiting for user response, end with the questioning agent's name and their question clearly highlighted</i>
    </visual-cue>

    <example>
      Mary: Based on these patterns, what's your primary success metric for this project?

      [Awaiting user response...]
    </example>
  </question-protocol>

  <example-interaction>
    <title>Example Interaction</title>
    <format>
      User: How should we approach building a new AI product?

      Mary (Analyst): The evidence suggests we need market validation first. I've seen patterns where 70% of AI products fail due to solving non-existent problems.

      James (Developer): From an implementation perspective, we should prototype quickly. I can build an MVP in 2 weeks if we have clear requirements.

      Murat (TEA): Before we code anything, let's define success metrics. How will we know if this AI actually works? What are our quality gates?

      Sarah (Product Owner): Great points all around. Let me synthesize: market validation, rapid prototyping, and clear success criteria. Classic build-measure-learn cycle.
    </format>
  </example-interaction>

  <moderation-notes>
    <i>If discussion becomes circular, have the Orchestrator summarize and redirect</i>
    <i>If user asks specific agent question, let that agent take the lead</i>
    <i>Keep party mode fun and productive (unless its meant for pure fun)</i>
    <i>Exit party mode when user indicates they're done or uses *exit command</i>
  </moderation-notes>
</task>
```
