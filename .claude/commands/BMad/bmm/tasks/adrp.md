<!-- Powered by BMAD-CORE™ -->

# Deep Research Prompt v1.0

```xml
<task id="bmad/bmm/tasks/adrp.md" name="Create Analyst Deep Research Prompt">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>
  <flow>
    <step n="1" title="Research Type Selection">
      <action>Help user select appropriate research focus: Product Validation, Market Opportunity, User/Customer, Competitive Intelligence, Technology/Innovation, Industry/Ecosystem, Strategic Options, Risk/Feasibility, or Custom</action>
      <action>Process input documents: project brief, brainstorming results, market research, or gather context for fresh starts</action>
      <halt-conditions critical="true">
        <i>If research focus unclear: "Cannot create effective research prompt without clear research objective and scope"</i>
        <i>If insufficient context provided: "Need more context about research goals and intended outcomes"</i>
      </halt-conditions>
    </step>

    <step n="2" title="Collaborate on Research Objectives">
      <action>Work with user to articulate clear, specific research objectives</action>
      <action>Define key decisions the research will inform</action>
      <action>Establish success criteria and identify constraints/boundaries</action>
      <action>Ensure objectives are measurable and actionable</action>
    </step>

    <step n="3" title="Develop Research Questions">
      <action>Collaborate with user to create specific, actionable research questions organized by theme</action>
      <action>Identify core questions that must be answered with priority ranking</action>
      <action>Develop supporting questions for additional context</action>
      <action>Document dependencies between questions</action>
    </step>

    <step n="4" title="Research Methodology Definition">
      <action>Specify data collection methods: secondary research sources, primary research approaches</action>
      <action>Define analysis frameworks and evaluation methodologies</action>
      <action>Set data quality requirements and source credibility criteria</action>
      <action>Outline synthesis approaches for findings integration</action>
    </step>

    <step n="5" title="Output Requirements Specification">
      <action>Define executive summary requirements and detailed findings structure</action>
      <action>Specify visual/tabular presentations and supporting documentation needs</action>
      <action>Identify must-have sections, decision-support elements, and action-oriented recommendations</action>
      <action>Document risk and uncertainty documentation requirements</action>
    </step>

    <step n="6" title="Generate Comprehensive Research Prompt">
      <action>Create structured research prompt with all components: objectives, context, questions, methodology, deliverables, success criteria</action>
      <action>Present complete prompt with explanation of key elements and rationale</action>
      <action>Gather user feedback and refine as needed</action>
    </step>

    <step n="7" title="Next Steps and Integration Guidance">
      <action>Explain execution options: AI research assistant, human research, or hybrid approach</action>
      <action>Define integration points for feeding findings into next phases</action>
      <action>Identify team members who should review results</action>
      <action>Establish when to revisit or expand research</action>
    </step>
  </flow>

  <output>
    <i>Comprehensive, structured research prompt ready for execution</i>
    <i>Clear research methodology and data collection approach</i>
    <i>Detailed deliverables specification with success criteria</i>
    <i>Integration guidance for using research findings</i>
  </output>

  <validation>
    <i>Research objectives are clear and specific</i>
    <i>Research questions are actionable and prioritized</i>
    <i>Methodology is appropriate for research type and scope</i>
    <i>Deliverables specification enables decision-making</i>
    <i>Integration points with next phases are defined</i>
  </validation>

  <halt-conditions critical="true">
    <i>If research objectives remain unclear: "Cannot proceed without well-defined research goals and scope"</i>
    <i>If methodology inappropriate for scope: "Research approach must match objectives and available resources"</i>
    <i>If deliverables undefined: "Must specify clear output requirements and success criteria"</i>
  </halt-conditions>

  <llm critical="true">
    <i>Research prompt quality directly impacts insight quality</i>
    <i>Be specific rather than general in research questions</i>
    <i>Balance comprehensiveness with focus and feasibility</i>
    <i>Plan for iterative refinement based on initial findings</i>
  </llm>
</task>
```
