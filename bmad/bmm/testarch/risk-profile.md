<!-- Powered by BMAD-CORE™ -->

# Risk Profile v1.0

```xml
<task id="bmad/bmm/testarch/risk-profile" name="Risk Profile">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Analyze Story for Risk Factors">
      <action>Extract story ID, title, and acceptance criteria from story file</action>
      <action>Review architecture complexity and integration points</action>
      <action>Identify technology stack and dependencies</action>
      <action>Note security, performance, and data handling requirements</action>
      <halt-conditions critical="true">
        <i>If story file not found: "Risk analysis requires valid story file at specified path"</i>
        <i>If acceptance criteria unclear: "Cannot assess risks without clear acceptance criteria"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Identify Specific Risks by Category">
      <action>Technical Risks (TECH): Architecture complexity, integration challenges, technical debt, scalability concerns, system dependencies</action>
      <action>Security Risks (SEC): Authentication/authorization flaws, data exposure vulnerabilities, injection attacks, session management issues, cryptographic weaknesses</action>
      <action>Performance Risks (PERF): Response time degradation, throughput bottlenecks, resource exhaustion, database query optimization, caching failures</action>
      <action>Data Risks (DATA): Data loss potential, data corruption, privacy violations, compliance issues, backup/recovery gaps</action>
      <action>Business Risks (BUS): Feature doesn't meet user needs, revenue impact, reputation damage, regulatory non-compliance, market timing</action>
      <action>Operational Risks (OPS): Deployment failures, monitoring gaps, incident response readiness, documentation inadequacy, knowledge transfer issues</action>
    </step>

    <step n="3" title="Assess Risk Probability and Impact">
      <action>Rate probability: High (3) >70% chance, Medium (2) 30–70% chance, Low (1) &lt;30% chance</action>
      <action>Rate impact: High (3) severe consequences, Medium (2) moderate consequences, Low (1) minor consequences</action>
      <action>Calculate risk score: Probability × Impact (1-9 scale)</action>
      <action>Prioritize: Critical (9), High (6), Medium (4), Low (2-3), Minimal (1)</action>
    </step>

    <step n="4" title="Develop Risk Mitigation Strategies">
      <action>For each identified risk, define preventive, detective, or corrective actions</action>
      <action>Specify testing requirements to validate mitigation</action>
      <action>Identify residual risk after mitigation</action>
      <action>Assign ownership and timeline for mitigation actions</action>
    </step>

    <step n="5" title="Generate Risk Assessment Outputs">
      <action>Create gate YAML block for pasting into quality gate</action>
      <action>Generate detailed markdown risk assessment report</action>
      <action>Calculate overall story risk score</action>
      <action>Provide risk-based testing and development recommendations</action>
    </step>
  </flow>

  <output>
    <i>Gate YAML block with risk totals and highest risk summary</i>
    <i>Detailed risk profile report saved to qa assessments directory</i>
    <i>Risk-based testing strategy recommendations</i>
    <i>Story hook line for review task reference</i>
  </output>

  <validation>
    <i>All identified risks have probability and impact scores</i>
    <i>Critical and high risks have detailed mitigation strategies</i>
    <i>Risk scoring follows consistent methodology</i>
    <i>Testing recommendations align with risk priorities</i>
    <i>Output files follow naming conventions</i>
  </validation>

  <halt-conditions critical="true">
    <i>If no story file found at specified path: "Cannot perform risk assessment without valid story file"</i>
    <i>If story lacks clear acceptance criteria: "Risk assessment requires clear acceptance criteria to evaluate implementation risks"</i>
    <i>If unable to access qa location from core config: "Cannot save risk assessment without valid tea.teaLocation configuration"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Focus on implementation-specific risks, not theoretical possibilities</i>
    <i>Base probability assessments on story complexity and team experience</i>
    <i>Ensure mitigation strategies are actionable and testable</i>
    <i>Critical risks (score 9) should trigger gate FAIL unless explicitly waived</i>
  </llm>
</task>
```
