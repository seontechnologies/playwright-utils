<!-- BMAD-CORE™ Checklist Validation Task -->

# Run Chkl v2.2

```xml
<task id="bmad/core/tasks/run-chkl.md" name="Run Checklist">

  <llm critical="true">
    <i>NEVER mark PASS without evidence (quote+line#)</i>
    <i>READ criteria fully before evaluating</i>
    <i>If unsure, mark PARTIAL not PASS</i>
    <i>Document WHY for every N/A</i>
  </llm>

  <flow>
    <!-- 1. Initial Assessment -->
    <step n="1">
      <i>If checklist file not found, abort and indicate checklist was not found that was requested.</i>
    </step>

    <!-- 2. Mode Selection -->
    <step n="2">
      <i>Ask: Interactive (section-by-section) or YOLO (all at once)?</i>
      <i>YOLO recommended for speed</i>
    </step>

    <!-- 3. Document Gathering -->
    <step n="3">
      <i>Each checklist specifies required documents and artifacts</i>
      <i>Follow checklist instructions</i>
      <i>If unsure, halt and ask user</i>
    </step>

    <!-- 4. Process Checklist -->
    <step n="4">
      <mode n="interactive">
        <i>Work through each section one at a time</i>
        <i>Review all items following section instructions</i>
        <i>Check against relevant docs</i>
        <i>Present section summary highlighting issues</i>
        <i>Get user confirmation before proceeding</i>
      </mode>
      <mode n="yolo">
        <i>Process all sections at once</i>
        <i>Create comprehensive report</i>
        <i>Present complete analysis</i>
      </mode>
    </step>

    <!-- 5. Validation Approach -->
    <step n="5">
      <for item="checklist.item">
        <i>Read and understand requirement</i>
        <i>Look for evidence in docs</i>
        <i>Consider explicit and implicit coverage</i>
        <i>Follow all checklist LLM instructions</i>
      </for>
      <marks>
        <i>✅ PASS: Requirement clearly met</i>
        <i>❌ FAIL: Not met or insufficient</i>
        <i>⚠️ PARTIAL: Some aspects covered</i>
        <i>N/A: Not applicable (with reason)</i>
      </marks>
    </step>

    <!-- 6. Section Analysis -->
    <step n="6">
      <i>Calculate pass rate per section</i>
      <i>Identify common themes in failures</i>
      <i>Provide specific recommendations</i>
      <i>In interactive: discuss with user</i>
      <i>Document user decisions/explanations</i>
    </step>

    <!-- 7. Final Report -->
    <step n="7">
      <i>Overall completion status</i>
      <i>Pass rates by section</i>
      <i>Failed items with context</i>
      <i>Specific improvement recommendations</i>
      <i>N/A items with justification</i>
    </step>
  </flow>

  <methodology>
    <llm>
      <i>Checklists contain embedded prompts for:</i>
      <i>1. Guide thorough thinking - deep analysis prompts</i>
      <i>2. Request specific artifacts - clear doc requirements</i>
      <i>3. Provide contextual guidance - section-specific validation</i>
      <i>4. Generate comprehensive reports - detailed findings</i>
    </llm>
    <exec>
      <i>Execute complete validation</i>
      <i>Present final report with pass/fail rates</i>
      <i>Offer detailed analysis of warnings/failures</i>
    </exec>
  </methodology>
</task>
```
