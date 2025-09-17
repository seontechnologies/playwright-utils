<!-- Powered by BMAD-CORE™ -->

# Brownfield Service/API Enhancement

```xml
<workflow id="bmad/bmm/wfs/bf-svc.md" name="Brownfield Service/API Enhancement" type="brownfield">
  <meta>
    <desc>Agent workflow for enhancing existing backend services and APIs with new features, modernization, or performance improvements. Handles existing system analysis and safe integration.</desc>
    <types>service-modernization, api-enhancement, microservice-extraction, performance-optimization, integration-enhancement</types>
  </meta>

  <steps>
    <step agent="architect" action="analyze_existing_project" uses="doc-proj" creates="multiple_documents">
      <notes>Review existing service docs, codebase, performance metrics, identify integration dependencies</notes>
    </step>

    <step agent="pm" creates="prd.md" uses="brownfield-prd" needs="existing_service_analysis">
      <notes>Create comprehensive PRD focused on service enhancement. SAVE: {project-root}{output-directory}/prd.md</notes>
    </step>

    <step agent="architect" creates="architecture.md" uses="brownfield-architecture" needs="prd.md">
      <notes>Create architecture with service integration strategy and API evolution. SAVE: {project-root}{output-directory}/architecture.md</notes>
    </step>

    <step agent="po" validates="all_artifacts" uses="po-master-checklist">
      <notes>Validate docs for service integration safety and API compatibility</notes>
    </step>

    <step agent="various" updates="any_flagged_documents" if="po_checklist_issues">
      <notes>Fix PO-flagged issues, re-export to {project-root}{output-directory}/</notes>
    </step>

    <step agent="po" action="shard_documents" creates="sharded_docs" needs="all_artifacts_in_project">
      <notes>Shard docs: A) po agent->shard {project-root}{output-directory}/prd.md | B) Manual drag shard-doc+{project-root}{output-directory}/prd.md</notes>
    </step>

    <step agent="sm" action="create_story" creates="story.md" needs="sharded_docs" repeat="per_epic">
      <notes>SM Agent->create cmd | Next story from shards | Status: Draft</notes>
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
    <use-when>Service enhancement with coordinated stories | API versioning/breaking changes | DB schema changes | Performance improvements | Multiple integration points</use-when>
  </guidance>

  <handoffs>
    <h from="analyst" to="pm">Service analysis complete. Create comprehensive PRD with integration strategy</h>
    <h from="pm" to="architect">PRD ready. Save {project-root}{output-directory}/prd.md, create service architecture</h>
    <h from="architect" to="po">Architecture done. Save {project-root}{output-directory}/architecture.md. Validate for service integration safety</h>
    <h type="po-issues">PO found issues in [doc]. Return to [agent] to fix</h>
    <h type="complete">Planning done. Move to IDE for development</h>
  </handoffs>
</workflow>
```
