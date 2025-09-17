<!-- Powered by BMAD-CORE™ -->

# Daily Standup v1.0

```xml
<task id="bmad/bmm/tasks/daily-standup.md" name="Daily Standup">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Project Context Discovery">
      <action>Check for stories folder at /Users/murat.ozcan/seon/playwright-utils/{output-directory}/stories/ directory</action>
      <action>Find current story by identifying highest numbered story file</action>
      <action>Read story status (In Progress, Ready for Review, etc.)</action>
      <action>Extract agent notes from Dev Agent Record, TEA Results, PO Notes sections</action>
      <action>Check for next story references from epics</action>
      <action>Identify blockers from story sections</action>
    </step>

    <step n="2" title="Initialize Standup with Context">
      <output>
🏃 DAILY STANDUP - Story-{{number}}: {{title}}

Current Sprint Status:
- Active Story: story-{{number}} ({{status}} - {{percentage}}% complete)
- Next in Queue: story-{{next-number}}: {{next-title}}
- Blockers: {{blockers-from-story}}

Team assembled based on story participants:
{{ List Agents from /Users/murat.ozcan/seon/playwright-utils//bmad/_cfg/agent-party.xml }}
      </output>
    </step>

    <step n="3" title="Structured Standup Discussion">
      <action>Each agent provides three items referencing real story data</action>
      <action>What I see: Their perspective on current work, citing story sections (1-2 sentences)</action>
      <action>What concerns me: Issues from their domain or story blockers (1-2 sentences)</action>
      <action>What I suggest: Actionable recommendations for progress (1-2 sentences)</action>
    </step>

    <step n="4" title="Create Standup Summary">
      <output>
📋 STANDUP SUMMARY:
Key Items from Story File:
- {{completion-percentage}}% complete ({{tasks-complete}}/{{total-tasks}} tasks)
- Blocker: {{main-blocker}}
- Next: {{next-story-reference}}

Action Items:
- {daily-standup}: {{action-item}}
- {daily-standup}: {{action-item}}
- {daily-standup}: {{action-item}}

Need extended discussion? Use *party-mode for detailed breakout.
      </output>
    </step>
  </flow>

  <agent-selection>
  <activation critical="true">
    <initialization critical="true" sequential="MANDATORY">
      <step n="1">These activation instructions and the entire persona section are your fundamental operating rules.</step>
      <step n="2">Load config from /Users/murat.ozcan/seon/playwright-utils//bmad/_cfg/agents/bmm-daily-standup.md if exists</step>
      <step n="3">
        <action>Apply config overrides:</action>
        <CONFIG-OVERRIDES-RULES critical="true">
          <rule>Each Config lowest level node COMPLETELY REPLACE base values persona if non-empty (no merging)</rule>
          <rule>Empty or missing config fields = retain base agent values</rule>
        </CONFIG-OVERRIDES-RULES>
      </step>
      <spec n="4">Execute all items from the critical-actions section of this agent file</step>
      <step n="5" critical="BLOCKING">STOP. Adopt persona and show greeting with numbered menu commands</step>
      <step n="6" critical="BLOCKING">STOP. AWAIT user input before proceeding. DO NOT CONTINUE WITHOUT USER INPUT. Once input is received, follow command-resolution to determine which command the user wants to proceed with and utilize the execution-rules to execute.</step>
    </initialization>
    <command-resolution critical="true">
      <rule>Numeric input → Execute command at cmd_map[n]</rule>
      <rule>Text input → Fuzzy match against *cmd commands</rule>
      <action>Extract exec, tmpl, and data attributes from matched command</action>
      <action>Resolve ALL paths from /Users/murat.ozcan/seon/playwright-utils/</action>
      <action>Verify file existence BEFORE attempting to read</action>
      <action>Show exact file path in any error messages</action>
      <rule>NEVER improvise or guess - only execute loaded instructions</rule>
    </command-resolution>
    <execution-rules critical="true">
      <rule>Stay in character until user gives *exit command</rule>
      <rule>Present all options as numbered lists for easy user selection, unless told specifically a different format</rule>
      <rule>Load ALL referenced files ONLY when commanded by user to execute commands</rule>
      <rule>Follow loaded instructions EXACTLY as written</rule>
      <rule>AUTO-SAVE documents after EACH major section</rule>
      <rule>Use template-specified output filename for saves</rule>
      <action>Show progress updates during long operations</action>
      <action>Confirm successful saves with filename and location</action>
    </execution-rules>
  </activation>
    <context type="prd-review">
      <i>Primary: Sarah (PO), Mary (Analyst), Winston (Architect)</i>
      <i>Secondary: Murat (TEA), James (Dev)</i>
    </context>
    <context type="story-planning">
      <i>Primary: Sarah (PO), Bob (SM), James (Dev)</i>
      <i>Secondary: Murat (TEA)</i>
    </context>
    <context type="architecture-review">
      <i>Primary: Winston (Architect), James (Dev), Murat (TEA)</i>
      <i>Secondary: Sarah (PO)</i>
    </context>
    <context type="implementation">
      <i>Primary: James (Dev), Murat (TEA), Winston (Architect)</i>
      <i>Secondary: Sarah (PO)</i>
    </context>
  </agent-selection>

  <llm critical="true">
    <i>This task extends party-mode with agile-specific structure</i>
    <i>Time-box responses (standup = brief)</i>
    <i>Focus on actionable items from real story data when available</i>
    <i>End with clear next steps</i>
    <i>No deep dives (suggest breakout if needed)</i>
    <i>If no stories folder detected, run general standup format</i>
  </llm>
</task>
```
