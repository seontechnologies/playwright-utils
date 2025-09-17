<!-- Powered by BMAD-CORE™ -->

# Brownfield Full-Stack Enhancement

```xml
<workflow id="bmad/bmm/wfs/bf-fs.md" name="Brownfield Full-Stack Enhancement" type="brownfield">
  <meta>
    <desc>Agent workflow for enhancing existing full-stack applications with new features, modernization, or significant changes. Handles existing system analysis and safe integration.</desc>
    <types>feature-addition, refactoring, modernization, integration-enhancement</types>
  </meta>

  <steps>
    <step agent="analyst" action="classify_enhancement_scope">
      <notes>Determine complexity: Single story->bf-story | Small feature->bf-epic | Major->continue workflow</notes>
    </step>

    <step type="routing" if="based_on_classification">
      <route type="single_story" agent="pm" uses="bf-story">
        <notes>Create single story for immediate implementation. Exit after creation</notes>
      </route>
      <route type="small_feature" agent="pm" uses="bf-epic">
        <notes>Create focused epic with 1-3 stories. Exit after creation</notes>
      </route>
      <route type="major_enhancement">
        <notes>Continue with comprehensive planning workflow</notes>
      </route>
    </step>

    <step agent="analyst" action="check_existing_documentation" if="major_enhancement_path">
      <notes>Check docs: adequate->skip doc-proj | inadequate->run doc-proj first</notes>
    </step>

    <step agent="architect" action="analyze_existing_project" uses="doc-proj" creates="brownfield-architecture.md" if="documentation_inadequate">
      <notes>Run doc-proj to capture current system state, technical debt, constraints</notes>
    </step>

    <step agent="pm" creates="prd.md" uses="brownfield-prd" needs="existing_documentation_or_analysis">
      <notes>Create PRD for major enhancement. Reference doc-proj output if run. SAVE: {project-root}{output-directory}/prd.md</notes>
    </step>

    <step agent="pm/architect" action="determine_architecture_need" if="after_prd_creation">
      <notes>Review PRD: New patterns/libs/infrastructure->create arch doc | Existing patterns->skip</notes>
    </step>

    <step agent="architect" creates="architecture.md" uses="brownfield-architecture" needs="prd.md" if="architecture_changes_needed">
      <notes>Create architecture ONLY for significant changes. SAVE: {project-root}{output-directory}/architecture.md</notes>
    </step>

    <step agent="po" validates="all_artifacts" uses="po-master-checklist">
      <notes>Validate docs for integration safety/completeness</notes>
    </step>

    <step agent="various" updates="any_flagged_documents" if="po_checklist_issues">
      <notes>Fix PO-flagged issues, re-export to {project-root}{output-directory}/</notes>
    </step>

    <step agent="po" action="shard_documents" creates="sharded_docs" needs="all_artifacts_in_project">
      <notes>Shard docs: A) po agent->shard {project-root}{output-directory}/prd.md | B) Manual drag shard-doc+{project-root}{output-directory}/prd.md</notes>
    </step>

    <step agent="sm" action="create_story" creates="story.md" needs="sharded_docs_or_brownfield_docs" repeat="per_epic">
      <notes>Sharded PRD: sm->create | Brownfield docs: sm->mk-bf-story | Status: Draft</notes>
    </step>

    <step agent="analyst/pm" action="review_draft_story" updates="story.md" needs="story.md" optional="true" if="user_wants_review">
      <notes>OPTIONAL: Review story | Update: Draft->Approved | story-review task coming</notes>
    </step>

    <step agent="dev" action="implement_story" creates="implementation_files" needs="story.md">
      <notes>Dev Agent implements | Updates File List | Status->Review when done</notes>
    </step>

    <step agent="qa" action="review_implementation" updates="implementation_files" needs="implementation_files" optional="true">
      <notes>OPTIONAL: TEA->review-story | Sr dev review | Fix small issues | Leave checklist | Status: Review->Done</notes>
    </step>

    <step agent="dev" action="address_qa_feedback" updates="implementation_files" if="qa_left_unchecked_items">
      <notes>Address TEA items | Return to QA for approval</notes>
    </step>

    <step type="loop" action="continue_for_all_stories">
      <notes>Repeat SM->Dev->TEA for all PRD stories</notes>
    </step>

    <step agent="po" action="epic_retrospective" creates="epic-retrospective.md" if="epic_complete" optional="true">
      <notes>OPTIONAL: Validate epic completion | Document learnings | epic-retrospective task coming</notes>
    </step>

    <step type="end" action="project_complete">
      <notes>All stories done! | Ref: {project-root}/data/bmad-kb.md#IDE-Development-Workflow</notes>
    </step>
  </steps>

  <guidance>
    <use-when>Existing apps | Feature additions | Refactoring | Modernization | Integration enhancements</use-when>
    <avoid-when>New projects | Complete rewrites | Isolated services</avoid-when>
  </guidance>

  <handoffs>
    <h type="classify">Describe enhancement scope: small fix, feature addition, or major enhancement?</h>
    <h from="analyst" to="architect">Documentation inadequate. Running doc-proj for system analysis</h>
    <h from="architect" to="pm">System analysis complete. Create PRD with findings</h>
    <h from="pm" to="architect">PRD ready. Determine if architecture doc needed</h>
    <h to="po">All docs in {project-root}{output-directory}/. Validate artifacts for safe integration</h>
    <h type="po-issues">PO found issues in [doc]. Return to [agent] to fix</h>
    <h type="complete">Enhancement planning done. Move to IDE for development</h>
  </handoffs>
</workflow>
```
