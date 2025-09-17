<!-- Powered by BMAD-CORE™ -->

# Greenfield Full-Stack Application Development

```xml
<workflow id="bmad/bmm/wfs/gf-fs.md" name="Greenfield Full-Stack Application Development" type="greenfield">
  <meta>
    <desc>Agent workflow for building full-stack applications from concept to development. Supports comprehensive planning for complex projects and rapid prototyping.</desc>
    <types>web-app, saas, enterprise-app, prototype, mvp</types>
  </meta>

  <steps>
    <step agent="analyst" creates="project-brief.md">
      <opts>brainstorming_session; market_research_prompt</opts>
      <notes>Brainstorm first, optional research, then create brief. SAVE: {project-root}{output-directory}/project-brief.md</notes>
    </step>

    <step agent="pm" creates="prd.md" needs="project-brief.md">
      <notes>Create PRD from brief using prd cmd. SAVE: {project-root}{output-directory}/prd.md</notes>
    </step>

    <step agent="ux-expert" creates="front-end-spec.md" needs="prd.md">
      <opts>user_research_prompt</opts>
      <notes>Create UI/UX spec using uxui-spec. SAVE: {project-root}{output-directory}/front-end-spec.md</notes>
    </step>

    <step agent="ux-expert" creates="v0_prompt" needs="front-end-spec.md" if="user_wants_ai_generation">
      <notes>OPTIONAL: Generate AI UI prompt (v0/Lovable) using ai-fe-prompt task</notes>
    </step>

    <step agent="architect" creates="fullstack-architecture.md" needs="prd.md, front-end-spec.md">
      <opts>technical_research_prompt; review_generated_ui_structure</opts>
      <notes>Create comprehensive architecture. May suggest PRD changes. SAVE: {project-root}{output-directory}/fullstack-architecture.md</notes>
    </step>

    <step agent="pm" updates="prd.md" needs="fullstack-architecture.md" if="architecture_suggests_prd_changes">
      <notes>Update PRD with architect's story changes, re-export to {project-root}{output-directory}/</notes>
    </step>

    <step agent="po" validates="all_artifacts" uses="po-master-checklist">
      <notes>Validate all docs for consistency/completeness</notes>
    </step>

    <step agent="various" updates="any_flagged_documents" if="po_checklist_issues">
      <notes>Fix PO-flagged issues, re-export to {project-root}{output-directory}/</notes>
    </step>

    <step type="guide" action="guide_project_structure" if="user_has_generated_ui">
      <notes>Polyrepo: separate frontend/backend repos | Monorepo: apps/web or packages/frontend</notes>
    </step>

    <step type="guide" action="guide_development_sequence">
      <notes>Frontend-heavy: start frontend first | Backend-heavy: start backend | Tightly coupled: follow story sequence</notes>
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
    <use-when>Production apps | Team projects | Complex features | Need docs | Long-term maintenance | Enterprise/customer-facing</use-when>
  </guidance>

  <handoffs>
    <h from="analyst" to="pm">Brief complete. Save {project-root}{output-directory}/project-brief.md, create PRD</h>
    <h from="pm" to="ux">PRD ready. Save {project-root}{output-directory}/prd.md, create UI/UX spec</h>
    <h from="ux" to="architect">UI spec done. Save {project-root}{output-directory}/front-end-spec.md, create architecture</h>
    <h type="architect-review">Architecture done. Save {project-root}{output-directory}/fullstack-architecture.md. Suggest PRD changes?</h>
    <h from="architect" to="pm">Update PRD with story changes, re-export to {project-root}{output-directory}/</h>
    <h to="po">All docs in {project-root}{output-directory}/. Validate artifacts</h>
    <h type="po-issues">PO found issues in [doc]. Return to [agent] to fix</h>
    <h type="complete">Planning done. Move to IDE for development</h>
  </handoffs>
</workflow>
```
