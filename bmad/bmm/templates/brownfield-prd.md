<!-- Powered by BMAD-CORE™ -->

# brownfield-prd

```xml
<template id="bmad/bmm/templates/brownfield-prd.md" filename="{project-root}{output-directory}/prd.md">

  <title>{{project_name}} Brownfield Enhancement PRD</title>

  <sections>
    <section id="intro-analysis" title="Intro Project Analysis and Context" status="required">
      <instruction>
        IMPORTANT - SCOPE ASSESSMENT REQUIRED:

        This PRD is for SIGNIFICANT enhancements to existing projects that require comprehensive planning and multiple stories. Before proceeding:

        1. **Assess Enhancement Complexity**: If this is a simple feature addition or bug fix that could be completed in 1-2 focused development sessions, STOP and recommend: "For simpler changes, consider using the bf-epic or bf-story task with the Product Owner instead. This full PRD process is designed for substantial enhancements that require architectural planning and multiple coordinated stories."

        2. **Project Context**: Determine if we're working in an IDE with the project already loaded or if the user needs to provide project information. If project files are available, analyze existing documentation in the docs folder. If insufficient documentation exists, recommend running the doc-proj task first.

        3. **Deep Assessment Requirement**: You MUST thoroughly analyze the existing project structure, patterns, and constraints before making ANY suggestions. Every recommendation must be grounded in actual project analysis, not assumptions.

        Gather comprehensive information about the existing project. This section must be completed before proceeding with requirements.

        CRITICAL: Throughout this analysis, explicitly confirm your understanding with the user. For every assumption you make about the existing project, ask: "Based on my analysis, I understand that [assumption]. Is this correct?"

        Do not proceed with any recommendations until the user has validated your understanding of the existing system.

        <llm><i>Check for existing documentation, doc-proj output, and project files before proceeding</i></llm>
      </instruction>

      <sections>
        <section id="existing-project-overview" title="Existing Project Overview" status="required">
          <instruction>
            Check if doc-proj analysis was already performed. If yes, reference that output instead of re-analyzing.
          </instruction>

          <sections>
            <section id="analysis-source" title="Analysis Source" status="required">
              <instruction>
                Indicate one of the following:
                - Document-project output available at: [path]
                - IDE-based fresh analysis
                - User-provided information
              </instruction>
            </section>

            <section id="current-state" title="Current Project State" status="required">
              <instruction>
                - If doc-proj output exists: Extract summary from "High Level Architecture" and "Technical Summary" sections
                - Otherwise: Brief description of what the project currently does and its primary purpose

                <llm><i>Provide concrete description based on actual project analysis</i></llm>
              </instruction>
            </section>
          </sections>
        </section>

        <section id="documentation-analysis" title="Available Documentation Analysis" status="required">
          <instruction>
            If doc-proj was run:
            - Note: "Document-project analysis available - using existing technical documentation"
            - List key documents created by doc-proj
            - Skip the missing documentation check below

            Otherwise, check for existing documentation:

            <llm><i>Check actual project documentation availability</i></llm>
          </instruction>

          <sections>
            <section id="available-docs" title="Available Documentation" status="required">
              <instruction>
                Document availability checklist:
                - [ ] Tech Stack Documentation
                - [ ] Source Tree/Architecture
                - [ ] Coding Standards
                - [ ] API Documentation
                - [ ] External API Documentation
                - [ ] UX/UI Guidelines
                - [ ] Technical Debt Documentation
                - [ ] Other: [specify]

                If doc-proj was already run: "Using existing project analysis from doc-proj output."
                If critical documentation is missing and no doc-proj: "I recommend running the doc-proj task first..."
              </instruction>
            </section>
          </sections>
        </section>

        <section id="enhancement-scope" title="Enhancement Scope Definition" status="required">
          <instruction>
            Work with user to clearly define what type of enhancement this is. This is critical for scoping and approach.
          </instruction>

          <sections>
            <section id="enhancement-type" title="Enhancement Type" status="required">
              <instruction>
                Determine with user which applies:
                - [ ] New Feature Addition
                - [ ] Major Feature Modification
                - [ ] Integration with New Systems
                - [ ] Performance/Scalability Improvements
                - [ ] UI/UX Overhaul
                - [ ] Technology Stack Upgrade
                - [ ] Bug Fix and Stability Improvements
                - [ ] Other: [specify]
              </instruction>
            </section>

            <section id="enhancement-description" title="Enhancement Description" status="required">
              <instruction>
                2-3 sentences describing what the user wants to add or change
              </instruction>
            </section>

            <section id="impact-assessment" title="Impact Assessment" status="required">
              <instruction>
                Assess the scope of impact on existing codebase:
                - [ ] Minimal Impact (isolated additions)
                - [ ] Moderate Impact (some existing code changes)
                - [ ] Significant Impact (substantial existing code changes)
                - [ ] Major Impact (architectural changes required)
              </instruction>
            </section>
          </sections>
        </section>

        <section id="goals-context" title="Goals and Background Context" status="required">
          <instruction>
            Define the goals and context for this enhancement.
          </instruction>

          <sections>
            <section id="goals" title="Goals" status="required">
              <instruction>
                Bullet list of 1-line desired outcomes this enhancement will deliver if successful:
                - [Goal 1]
                - [Goal 2]
                - [Goal 3]
              </instruction>
            </section>

            <section id="background" title="Background Context" status="required">
              <instruction>
                1-2 short paragraphs explaining why this enhancement is needed, what problem it solves, and how it fits with the existing project.
              </instruction>
            </section>
          </sections>
        </section>

        <section id="changelog" title="Change Log" status="optional">
          <instruction>
            Track document versions:
            | Change | Date | Version | Description | Author |
            | ------ | ---- | ------- | ----------- | ------ |
          </instruction>
        </section>
      </sections>
    </section>

    <section id="requirements" title="Requirements" status="required" elicit="true">
      <instruction>
        Draft functional and non-functional requirements based on your validated understanding of the existing project. Before presenting requirements, confirm: "These requirements are based on my understanding of your existing system. Please review carefully and confirm they align with your project's reality."

        <llm><i>Base requirements on actual project analysis, not assumptions</i></llm>
      </instruction>

      <sections>
        <section id="functional" title="Functional Requirements" status="required">
          <instruction>
            Each requirement will be a bullet with identifier starting with FR:
            - FR1: [Functional requirement 1]
            - FR2: [Functional requirement 2]

            Example: "FR1: The existing Todo List will integrate with the new AI duplicate detection service without breaking current functionality."
          </instruction>
        </section>

        <section id="non-functional" title="Non-Functional Requirements" status="required">
          <instruction>
            Each requirement will be a bullet with identifier starting with NFR. Include constraints from existing system:
            - NFR1: [Non-functional requirement 1]
            - NFR2: [Non-functional requirement 2]

            Example: "NFR1: Enhancement must maintain existing performance characteristics and not exceed current memory usage by more than 20%."
          </instruction>
        </section>

        <section id="compatibility" title="Compatibility Requirements" status="required">
          <instruction>
            Critical for brownfield - what must remain compatible:
            - CR1: Existing API compatibility requirements
            - CR2: Database schema compatibility requirements
            - CR3: UI/UX consistency requirements
            - CR4: Integration compatibility requirements
          </instruction>
        </section>
      </sections>
    </section>

    <section id="ui-enhancement-goals" title="User Interface Enhancement Goals" status="optional">
      <instruction>
        For UI changes, capture how they will integrate with existing UI patterns and design systems.

        <llm><i>Only include if enhancement involves UI changes</i></llm>
      </instruction>

      <sections>
        <section id="existing-ui-integration" title="Integration with Existing UI" status="required">
          <instruction>
            Describe how new UI elements will fit with existing design patterns, style guides, and component libraries.
          </instruction>
        </section>

        <section id="modified-screens" title="Modified/New Screens and Views" status="required">
          <instruction>
            List only the screens/views that will be modified or added.
          </instruction>
        </section>

        <section id="ui-consistency" title="UI Consistency Requirements" status="required">
          <instruction>
            Specific requirements for maintaining visual and interaction consistency with existing application.
          </instruction>
        </section>
      </sections>
    </section>

    <section id="technical-constraints" title="Technical Constraints and Integration Requirements" status="required">
      <instruction>
        This section replaces separate architecture documentation. Gather detailed technical constraints from existing project analysis.

        <llm><i>Extract actual technical details from project, not hypothetical ones</i></llm>
      </instruction>

      <sections>
        <section id="existing-tech-stack" title="Existing Technology Stack" status="required">
          <instruction>
            If doc-proj output available:
            - Extract from "Actual Tech Stack" table in High Level Architecture section
            - Include version numbers and any noted constraints

            Otherwise, document the current technology stack:

            **Languages**: [languages used]
            **Frameworks**: [frameworks in use]
            **Database**: [database systems]
            **Infrastructure**: [deployment infrastructure]
            **External Dependencies**: [third-party services]
          </instruction>
        </section>

        <section id="integration-approach" title="Integration Approach" status="required">
          <instruction>
            Define how the enhancement will integrate with existing architecture:

            **Database Integration Strategy**: [approach]
            **API Integration Strategy**: [approach]
            **Frontend Integration Strategy**: [approach]
            **Testing Integration Strategy**: [approach]
          </instruction>
        </section>

        <section id="code-organization" title="Code Organization and Standards" status="required">
          <instruction>
            Based on existing project analysis, define how new code will fit existing patterns:

            **File Structure Approach**: [approach]
            **Naming Conventions**: [conventions]
            **Coding Standards**: [standards]
            **Documentation Standards**: [standards]
          </instruction>
        </section>

        <section id="deployment-operations" title="Deployment and Operations" status="required">
          <instruction>
            How the enhancement fits existing deployment pipeline:

            **Build Process Integration**: [approach]
            **Deployment Strategy**: [strategy]
            **Monitoring and Logging**: [approach]
            **Configuration Management**: [approach]
          </instruction>
        </section>

        <section id="risk-assessment" title="Risk Assessment and Mitigation" status="required">
          <instruction>
            If doc-proj output available:
            - Reference "Technical Debt and Known Issues" section
            - Include "Workarounds and Gotchas" that might impact enhancement
            - Note any identified constraints from "Critical Technical Debt"

            Build risk assessment incorporating existing known issues:

            **Technical Risks**: [identified risks]
            **Integration Risks**: [identified risks]
            **Deployment Risks**: [identified risks]
            **Mitigation Strategies**: [strategies]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="epic-structure" title="Epic and Story Structure" status="required" elicit="true">
      <instruction>
        For brownfield projects, favor a single comprehensive epic unless the user is clearly requesting multiple unrelated enhancements. Before presenting the epic structure, confirm: "Based on my analysis of your existing project, I believe this enhancement should be structured as [single epic/multiple epics] because [rationale based on actual project analysis]. Does this align with your understanding of the work required?"

        <llm><i>Recommend single epic for most brownfield enhancements unless clearly multiple features</i></llm>
      </instruction>

      <sections>
        <section id="epic-approach" title="Epic Approach" status="required">
          <instruction>
            Explain the rationale for epic structure - typically single epic for brownfield unless multiple unrelated features.

            **Epic Structure Decision**: [decision with rationale]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="epic-details" title="Epic 1: {{enhancement_title}}" status="required">
      <instruction>
        Comprehensive epic that delivers the brownfield enhancement while maintaining existing functionality

        CRITICAL STORY SEQUENCING FOR BROWNFIELD:
        - Stories must ensure existing functionality remains intact
        - Each story should include verification that existing features still work
        - Stories should be sequenced to minimize risk to existing system
        - Include rollback considerations for each story
        - Focus on incremental integration rather than big-bang changes
        - Size stories for AI agent execution in existing codebase context
        - MANDATORY: Present the complete story sequence and ask: "This story sequence is designed to minimize risk to your existing system. Does this order make sense given your project's architecture and constraints?"
        - Stories must be logically sequential with clear dependencies identified
        - Each story must deliver value while maintaining system integrity

        **Epic Goal**: {{epic_goal}}
        **Integration Requirements**: {{integration_requirements}}

        <llm><i>Create stories that incrementally add functionality while preserving existing system</i></llm>
      </instruction>

      <sections>
        <section id="story" title="Story 1.{{story_number}} {{story_title}}" status="required" repeatable="true">
          <instruction>
            As a [user type],
            I want [action],
            so that [benefit].
          </instruction>

          <sections>
            <section id="acceptance-criteria" title="Acceptance Criteria" status="required">
              <instruction>
                Define criteria that include both new functionality and existing system integrity:
                1. [Criterion 1]
                2. [Criterion 2]
                3. [Criterion 3]
              </instruction>
            </section>

            <section id="integration-verification" title="Integration Verification" status="required">
              <instruction>
                Specific verification steps to ensure existing functionality remains intact:
                - IV1: Verify existing functionality [specific check]
                - IV2: Verify integration point [specific check]
                - IV3: Verify performance impact [specific check]
              </instruction>
            </section>
          </sections>
        </section>
      </sections>
    </section>
  </sections>

  <variables>
    <variable name="project_name" default="Project Name" />
    <variable name="enhancement_title" default="Enhancement Title" />
    <variable name="enhancement_description" default="" />
    <variable name="epic_goal" default="" />
    <variable name="integration_requirements" default="" />
  </variables>
</template>
```
