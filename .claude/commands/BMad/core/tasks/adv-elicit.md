<!-- BMAD-CORE™ Advanced Elicitation Task -->

# Advanced Elicitation v1.1

```xml
<task id="bmad/core/tasks/adv-elicit.md" name="Advanced Elicitation">
  <llm critical="true">
    <i>MANDATORY: Execute ALL steps in the flow section IN EXACT ORDER</i>
    <i>DO NOT skip steps or change the sequence</i>
    <i>HALT immediately when halt-conditions are met</i>
    <i>Each &lt;action&gt; within &lt;step&gt; is a REQUIRED action to complete that step</i>
    <i>Sections outside flow (validation, output, critical-context) provide essential context - review and apply throughout execution</i>
  </llm>

  <integration>
    <desc>When called from create-doc.md during template processing:</desc>
    <i>1. Receive the current section content that was just generated</i>
    <i>2. Apply elicitation methods iteratively to enhance that specific content</i>
    <i>3. Return the enhanced version back to create-doc.md when user selects 'x'</i>
    <i>4. The enhanced content replaces the original section content in the final document</i>
  </integration>

  <flow>
    <step n="1" title="Method Loading &amp; Selection">

      <first>Load the lightweight index from /Users/murat.ozcan/seon/playwright-utils//bmad/core/adv-elic/index.csv</first>

      <context-analysis>
        <i>Use conversation history</i>
        <i>Analyze: content type, complexity, stakeholder needs, risk level, and creative potential</i>
      </context-analysis>

      <smart-selection>
        <i>1. Analyze context: Content type, complexity, stakeholder needs, risk level, creative potential</i>
        <i>2. Select 5 methods: Choose methods from CSV ONLY that best match the context and goals</i>
        <i>3. Balance approach: Include mix of foundational and specialized techniques as appropriate</i>
        <i>4. Present method names only - DO NOT load individual method files until user selects one</i>
      </smart-selection>
    </step>

    <step n="2" title="Present Options &amp; Handle Responses">

      <format>
        **Advanced Elicitation Options**
        Choose a number (1-5), r to shuffle, or x to proceed:

        1. [Method Name]
        2. [Method Name]
        3. [Method Name]
        4. [Method Name]
        5. [Method Name]
        r. Reshuffle the list with 5 new options
        x. Proceed / No Further Actions
      </format>

      <response-handling>
        <case n="1-5">
          <i>Load the specific method file from /Users/murat.ozcan/seon/playwright-utils//bmad/core/adv-elic/[file_name].md</i>
          <i>Display the output of the method to the current section content being worked on in create-doc template for the user and suggest potential changes to the document based on the user.</i>
          <i>CRITICAL: Ask the user if they would like to apply the changes to the doc (y/n/other) and HALT to await response.</i>
          <i>CRITICAL: ONLY if Yes, apply the changes. IF No, discard your memory of the proposed changes. If any other reply, try best to follow the instructions given by the user.</i>
          <i>CRITICAL: Re-present the same 1-5,r,x prompt to allow additional elicitations</i>
        </case>
        <case n="r">
          <i>Select 5 different methods from index.csv, present new list with same prompt format</i>
        </case>
        <case n="x">
          <i>Complete elicitation and proceed</i>
          <i>Return the fully enhanced content back to create-doc.md</i>
          <i>The enhanced content becomes the final version for that section</i>
          <i>Signal completion back to create-doc.md to continue with next section</i>
        </case>
        <case n="direct-feedback">
          <i>Apply changes to current section content and re-present choices</i>
        </case>
        <case n="multiple-numbers">
          <i>Execute methods in sequence on the content, then re-offer choices</i>
        </case>
      </response-handling>
    </step>

    <step n="3" title="Execution Guidelines">
      <i>Efficient loading: Only load index.csv initially, then load specific method files when selected</i>
      <i>Be concise: Focus on actionable insights</i>
      <i>Stay relevant: Tie elicitation to specific content being analyzed (the current section from create-doc)</i>
      <i>Identify personas: For multi-persona methods, clearly identify viewpoints</i>
      <i>Critical loop behavior: Always re-offer the 1-5,r,x choices after each method execution</i>
      <i>Continue until user selects 'x' to proceed with enhanced content</i>
      <i>Each method application builds upon previous enhancements</i>
      <i>Content preservation: Track all enhancements made during elicitation</i>
      <i>Iterative enhancement: Each selected method (1-5) should:</i>
      <i> 1. Apply to the current enhanced version of the content</i>
      <i> 2. Show the improvements made</i>
      <i> 3. Return to the prompt for additional elicitations or completion</i>
    </step>

    <step n="4" title="Enhancement History Tracking">
      <desc>Track and preserve elicitation improvements:</desc>

      <method-history>
        <i>Record each method selected (1-5) with timestamp</i>
        <i>Capture the specific insights generated</i>
        <i>Track cumulative improvements to content</i>
      </method-history>

      <content-evolution>
        <i>Maintain original content prior to elicitation</i>
        <i>Track each version after method application</i>
        <i>Build insights array for future reference</i>
      </content-evolution>

      <session-state>
        <i>If interrupted: Preserve current enhanced content</i>
        <i>On resume: Show methods already applied</i>
        <i>Prevent duplicate method suggestions when possible</i>
      </session-state>
    </step>

    <step n="5" title="Recovery Checkpoint System">
      <desc>Automatic checkpoint creation:</desc>

      <before-method>
        <i>Save current content state</i>
        <i>Record selected method about to be applied</i>
        <i>Create rollback point if needed</i>
      </before-method>

      <after-method>
        <i>Update checkpoint with results</i>
        <i>Save enhanced content version</i>
        <i>Update methods_used array</i>
      </after-method>

      <checkpoint-structure>
        checkpoint:
        timestamp: ISO-8601
        section_id: string
        checkpoint_type: "pre_method" | "post_method" | "user_save"
        content_snapshot: string
        method_about_to_apply: string (if pre_method)
        method_just_applied: string (if post_method)
        can_rollback: boolean
      </checkpoint-structure>

      <recovery-options>
        <i>On session resume: "Found elicitation in progress. Resume from last checkpoint?"</i>
        <i>After error: "Method application failed. Restore from checkpoint?"</i>
        <i>User request: "Undo last enhancement and return to previous version?"</i>
      </recovery-options>
    </step>
  </flow>
</task>
```
