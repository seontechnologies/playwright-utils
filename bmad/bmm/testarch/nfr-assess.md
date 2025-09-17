<!-- Powered by BMAD-CORE™ -->

# Nfr Assess v1.0

```xml
<task id="bmad/bmm/testarch/nfr-assess" name="NFR Assessment">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Select NFR Scope">
      <action>Interactive mode: Ask which NFRs to assess</action>
      <action>Non-interactive mode: Default to core four (security, performance, reliability, maintainability)</action>
      <output>
Which NFRs should I assess? (Enter numbers or press Enter for default)
[1] Security (default)
[2] Performance (default)
[3] Reliability (default)
[4] Maintainability (default)
[5] Usability
[6] Compatibility
[7] Portability
[8] Functional Suitability
      </output>
    </step>

    <step n="2" title="Check for Requirements and Thresholds">
      <action>Look for NFR requirements in story acceptance criteria</action>
      <action>Check {project-root}{output-directory}/architecture/*.md files</action>
      <action>Review {project-root}{output-directory}/technical-preferences.md</action>
      <action>Interactive mode: Ask for missing thresholds</action>
      <action>Non-interactive mode: Mark as CONCERNS with "Target unknown"</action>
    </step>

    <step n="3" title="Quick Assessment">
      <action>For each selected NFR, check if there's evidence it's implemented</action>
      <action>Validate whether it can be verified</action>
      <action>Identify obvious gaps</action>
    </step>

    <step n="4" title="Generate Gate YAML Block">
      <output>
# Gate YAML (copy/paste):
nfr_validation:
  _assessed: [{{assessed-nfrs}}]
  {{nfr-name}}:
    status: {{PASS|CONCERNS|FAIL}}
    notes: '{{specific-findings}}'
      </output>
    </step>

    <step n="5" title="Create Assessment Report">
      <action>Save to tea.teaLocation/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md</action>
      <output>
# NFR Assessment: {{epic}}.{{story}}

Date: {{date}}
Reviewer: Murat

## Summary
- {{nfr}}: {{status}} - {{brief-finding}}

## Critical Issues
{{numbered-list-of-critical-issues}}

## Quick Wins
{{actionable-improvements-with-time-estimates}}
      </output>
    </step>

    <step n="6" title="Provide Integration Information">
      <output>
NFR assessment: tea.teaLocation/assessments/{{epic}}.{{story}}-nfr-{{YYYYMMDD}}.md

Gate NFR block ready → paste into tea.teaLocation/gates/{{epic}}.{{story}}-{{slug}}.yml under nfr_validation
      </output>
    </step>
  </flow>

  <assessment-criteria>
    <security>
      <pass>
        <i>Authentication implemented</i>
        <i>Authorization enforced</i>
        <i>Input validation present</i>
        <i>No hardcoded secrets</i>
      </pass>
      <concerns>
        <i>Missing rate limiting</i>
        <i>Weak encryption</i>
        <i>Incomplete authorization</i>
      </concerns>
      <fail>
        <i>No authentication</i>
        <i>Hardcoded credentials</i>
        <i>SQL injection vulnerabilities</i>
      </fail>
    </security>

    <performance>
      <pass>
        <i>Meets response time targets</i>
        <i>No obvious bottlenecks</i>
        <i>Reasonable resource usage</i>
      </pass>
      <concerns>
        <i>Close to limits</i>
        <i>Missing indexes</i>
        <i>No caching strategy</i>
      </concerns>
      <fail>
        <i>Exceeds response time limits</i>
        <i>Memory leaks</i>
        <i>Unoptimized queries</i>
      </fail>
    </performance>

    <reliability>
      <pass>
        <i>Error handling present</i>
        <i>Graceful degradation</i>
        <i>Retry logic where needed</i>
      </pass>
      <concerns>
        <i>Some error cases unhandled</i>
        <i>No circuit breakers</i>
        <i>Missing health checks</i>
      </concerns>
      <fail>
        <i>No error handling</i>
        <i>Crashes on errors</i>
        <i>No recovery mechanisms</i>
      </fail>
    </reliability>

    <maintainability>
      <pass>
        <i>Test coverage meets target</i>
        <i>Code well-structured</i>
        <i>Documentation present</i>
      </pass>
      <concerns>
        <i>Test coverage below target</i>
        <i>Some code duplication</i>
        <i>Missing documentation</i>
      </concerns>
      <fail>
        <i>No tests</i>
        <i>Highly coupled code</i>
        <i>No documentation</i>
      </fail>
    </maintainability>
  </assessment-criteria>

  <llm critical="true">
    <i>Focus on the core four NFRs by default</i>
    <i>Quick assessment, not deep analysis</i>
    <i>Generate gate-ready output format</i>
    <i>Provide brief, actionable findings</i>
    <i>Use deterministic status rules for consistency</i>
    <i>Unknown targets result in CONCERNS, not guesses</i>
    <i>If story file not found, still create assessment with appropriate notes</i>
  </llm>
</task>
```
