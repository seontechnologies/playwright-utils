<!-- Powered by BMAD-CORE™ -->

# qa-gate

````xml
<template id="bmad/bmm/templates/qa-gate.md" name="Quality Gate Decision" filename="{{qaLocation}}/gates/{{epic_num}}.{{story_num}}-{{story_slug}}.yml">

  <title>Quality Gate: {{epic_num}}.{{story_num}}</title>

  <sections>
    <section id="gate-decision" title="Quality Gate Decision" status="required">
      <instruction>
        Determine the quality gate status for story {{epic_num}}.{{story_num}}.

        Review the story implementation and determine gate status:
        - PASS: All criteria met, ready for production
        - CONCERNS: Minor issues that should be monitored
        - FAIL: Critical issues blocking progress
        - WAIVED: Accepted with known issues for business reasons

        <llm><i>Analyze story implementation against acceptance criteria and quality standards.</i><i>Consider functional correctness, test coverage, security, performance, and maintainability.</i><i>Be specific about the reason for the gate decision.</i></llm>
      </instruction>

      <sections>
        <section id="metadata" title="Gate Metadata" status="required">
          <instruction>
            Document gate decision metadata:
            ```yaml
            schema: 1
            story: "{{epic_num}}.{{story_num}}"
            story_title: "{{story_title}}"
            gate: "{{gate_status}}"
            status_reason: "{{status_reason}}"
            reviewer: "Murat (Master Test Architect)"
            updated: "{{iso_timestamp}}"
            ```

            <llm><i>Generate current ISO timestamp for the updated field.</i><i>Status reason should be 1-2 sentences explaining the decision.</i></llm>
          </instruction>
        </section>

        <section id="waiver-check" title="Waiver Status" status="required">
          <instruction>
            Document waiver status:
            ```yaml
            waiver: { active: false }
            ```

            If gate status is WAIVED, set active to true and include:
            - reason: Explanation for the waiver
            - approved_by: Who approved the waiver

            <llm><i>Only activate waiver section if gate_status is WAIVED</i></llm>
          </instruction>
        </section>
      </sections>
    </section>

    <section id="issues" title="Quality Issues" status="optional">
      <instruction>
        Document any quality issues found during review.
        Issues should be categorized by severity: low, medium, or high.

        <llm><i>Only include this section if issues were found.</i><i>Generate unique issue IDs using appropriate prefixes: SEC- for security, TEST- for testing, PERF- for performance, etc.</i></llm>
      </instruction>

      <sections>
        <section id="top-issues" title="Top Issues" status="optional">
          <instruction>
            List the most critical issues found:
            ```yaml
            top_issues:
              - id: "[TYPE]-[NUMBER]"
                severity: [low|medium|high]
                finding: "Clear description of the issue"
                suggested_action: "Specific remediation action"
            ```

            Example categories:
            - SEC: Security vulnerabilities
            - TEST: Missing test coverage
            - PERF: Performance concerns
            - MAINT: Maintainability issues
            - DOC: Documentation gaps
          </instruction>
        </section>
      </sections>
    </section>

    <section id="risk-assessment" title="Risk Summary" status="optional">
      <instruction>
        Summarize risk assessment from risk-profile task if it was run.

        <llm><i>Include this section if a formal risk assessment was performed.</i><i>Reference the risk-profile task output if available.</i></llm>
      </instruction>

      <sections>
        <section id="risk-totals" title="Risk Totals" status="optional">
          <instruction>
            Document risk counts by severity:
            ```yaml
            risk_summary:
              totals:
                critical: 0
                high: 0
                medium: 0
                low: 0
            ```
          </instruction>
        </section>

        <section id="risk-recommendations" title="Risk Recommendations" status="optional">
          <instruction>
            List risk mitigation recommendations:
            ```yaml
              recommendations:
                must_fix: []  # Critical items blocking production
                monitor: []   # Items to track post-deployment
            ```

            <llm><i>Categorize recommendations based on severity and impact</i></llm>
          </instruction>
        </section>
      </sections>
    </section>

    <section id="extended-metrics" title="Extended Quality Metrics" status="optional">
      <instruction>
        Include additional quality metrics if your team tracks them.

        <llm><i>Only include if specifically requested or team standards require</i></llm>
      </instruction>

      <sections>
        <section id="quality-score" title="Quality Score" status="optional">
          <instruction>
            Document overall quality score:
            ```yaml
            quality_score: 75  # 0-100 scoring
            expires: "{{future_date}}"  # Gate validity period
            ```
          </instruction>
        </section>

        <section id="evidence" title="Review Evidence" status="optional">
          <instruction>
            Document review evidence:
            ```yaml
            evidence:
              tests_reviewed: [number]
              risks_identified: [number]
              trace:
                ac_covered: []  # AC numbers with test coverage
                ac_gaps: []     # AC numbers lacking coverage
            ```
          </instruction>
        </section>

        <section id="nfr-validation" title="NFR Validation" status="optional">
          <instruction>
            Validate non-functional requirements:
            ```yaml
            nfr_validation:
              security: { status: [PASS|CONCERNS|FAIL], notes: "" }
              performance: { status: [PASS|CONCERNS|FAIL], notes: "" }
              reliability: { status: [PASS|CONCERNS|FAIL], notes: "" }
              maintainability: { status: [PASS|CONCERNS|FAIL], notes: "" }
            ```

            <llm><i>Assess each NFR dimension based on implementation review</i></llm>
          </instruction>
        </section>
      </sections>
    </section>

    <section id="recommendations" title="Recommendations" status="optional">
      <instruction>
        Provide actionable recommendations for improvement.

        <llm><i>Focus on specific, implementable actions with code references</i></llm>
      </instruction>

      <sections>
        <section id="immediate-actions" title="Immediate Actions" status="optional">
          <instruction>
            List actions required before production:
            ```yaml
            recommendations:
              immediate:
                - action: "Specific action description"
                  refs: ["file:line-range"]
            ```
          </instruction>
        </section>

        <section id="future-improvements" title="Future Improvements" status="optional">
          <instruction>
            List improvements for future iterations:
            ```yaml
              future:
                - action: "Enhancement description"
                  refs: ["file/component reference"]
            ```
          </instruction>
        </section>
      </sections>
    </section>

    <section id="history" title="Gate History" status="optional">
      <instruction>
        Maintain audit trail of gate decisions if this is a re-review.

        <llm><i>Only include if this story has been reviewed before</i></llm>
      </instruction>

      <sections>
        <section id="audit-trail" title="Audit Trail" status="optional">
          <instruction>
            Document gate history (append-only):
            ```yaml
            history:
              - at: "{{timestamp}}"
                gate: [PASS|CONCERNS|FAIL|WAIVED]
                note: "Brief description of decision/changes"
            ```

            <llm><i>List previous gate decisions chronologically, newest last</i></llm>
          </instruction>
        </section>
      </sections>
    </section>
  </sections>

  <variables>
    <variable name="epic_num" default="1" />
    <variable name="story_num" default="1" />
    <variable name="story_slug" default="feature-implementation" />
    <variable name="story_title" default="Story Title" />
    <variable name="gate_status" default="PASS" />
    <variable name="status_reason" default="" />
    <variable name="iso_timestamp" default="{{current_iso_timestamp}}" />
  </variables>
</template>```
````
