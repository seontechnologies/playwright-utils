<!-- Powered by BMAD-CORE™ -->

# brownfield-arch

````xml
<template id="bmad/bmm/templates/brownfield-arch.md" name="Brownfield Enhancement Solution Design" filename="{project-root}{output-directory}/architecture.md">

  <title>{{project_name}} Brownfield Enhancement Solution Design</title>

  <sections>
    <section id="introduction" title="Introduction" status="required" elicit="true">
      <instruction>
        IMPORTANT - SCOPE AND ASSESSMENT REQUIRED:

        This architecture document is for SIGNIFICANT enhancements to existing projects that require comprehensive architectural planning. Before proceeding:

        1. **Verify Complexity**: Confirm this enhancement requires architectural planning. For simple additions, recommend: "For simpler changes that don't require architectural planning, consider using the bf-epic or bf-story task with the Product Owner instead."

        2. **REQUIRED INPUTS**:
          - Completed brownfield-prd.md
          - Existing project technical documentation (from docs folder or user-provided)
          - Access to existing project structure (IDE or uploaded files)

        3. **DEEP ANALYSIS MANDATE**: You MUST conduct thorough analysis of the existing codebase, architecture patterns, and technical constraints before making ANY architectural recommendations. Every suggestion must be based on actual project analysis, not assumptions.

        4. **CONTINUOUS VALIDATION**: Throughout this process, explicitly validate your understanding with the user. For every architectural decision, confirm: "Based on my analysis of your existing system, I recommend [decision] because [evidence from actual project]. Does this align with your system's reality?"

        If any required inputs are missing, request them before proceeding.

        <llm><i>Check for existing documentation in docs folder, existing architecture files, and brownfield PRD. Validate all findings with user before proceeding.</i></llm>
      </instruction>

      <sections>
        <section id="intro-content" title="Document Purpose" status="required">
          <instruction>
            This document outlines the architectural approach for enhancing {{project_name}} with {{enhancement_description}}. Its primary goal is to serve as the guiding architectural blueprint for AI-driven development of new features while ensuring seamless integration with the existing system.

            **Relationship to Existing Architecture:**
            This document supplements existing project architecture by defining how new components will integrate with current systems. Where conflicts arise between new and existing patterns, this document provides guidance on maintaining consistency while implementing enhancements.
          </instruction>
        </section>

        <section id="existing-project-analysis" title="Existing Project Analysis" status="required" elicit="true">
          <instruction>
            Analyze the existing project structure and architecture:

            1. Review existing documentation in docs folder
            2. Examine current technology stack and versions
            3. Identify existing architectural patterns and conventions
            4. Note current deployment and infrastructure setup
            5. Document any constraints or limitations

            CRITICAL: After your analysis, explicitly validate your findings: "Based on my analysis of your project, I've identified the following about your existing system: [key findings]. Please confirm these observations are accurate before I proceed with architectural recommendations."

            <llm><i>Thoroughly analyze existing project files, documentation, and structure. Present concrete findings from actual files, not assumptions.</i></llm>
          </instruction>

          <sections>
            <section id="current-state" title="Current Project State" status="required">
              <instruction>
                Document the current project state:
                - **Primary Purpose:** {{existing_project_purpose}}
                - **Current Tech Stack:** {{existing_tech_summary}}
                - **Architecture Style:** {{existing_architecture_style}}
                - **Deployment Method:** {{existing_deployment_approach}}
              </instruction>
            </section>

            <section id="available-docs" title="Available Documentation" status="required">
              <instruction>
                List all available documentation found in the project.

                <llm><i>List actual documents found, not hypothetical ones</i></llm>
              </instruction>
            </section>

            <section id="constraints" title="Identified Constraints" status="required">
              <instruction>
                Document all identified constraints and limitations from the existing system.
              </instruction>
            </section>
          </sections>
        </section>

        <section id="changelog" title="Change Log" status="optional">
          <instruction>
            Track document versions and changes in a table format:
            | Change | Date | Version | Description | Author |
            | ------ | ---- | ------- | ----------- | ------ |
          </instruction>
        </section>
      </sections>
    </section>

    <section id="enhancement-scope" title="Enhancement Scope and Integration Strategy" status="required" elicit="true">
      <instruction>
        Define how the enhancement will integrate with the existing system:

        1. Review the brownfield PRD enhancement scope
        2. Identify integration points with existing code
        3. Define boundaries between new and existing functionality
        4. Establish compatibility requirements

        VALIDATION CHECKPOINT: Before presenting the integration strategy, confirm: "Based on my analysis, the integration approach I'm proposing takes into account [specific existing system characteristics]. These integration points and boundaries respect your current architecture patterns. Is this assessment accurate?"

        <llm><i>Reference specific existing code patterns, files, and structures when defining integration strategy</i></llm>
      </instruction>

      <sections>
        <section id="enhancement-overview" title="Enhancement Overview" status="required">
          <instruction>
            Document the enhancement details:
            - **Enhancement Type:** Feature addition, modification, or replacement
            - **Scope:** Specific boundaries of the enhancement
            - **Integration Impact:** Low, Medium, or High impact on existing system
          </instruction>
        </section>

        <section id="integration-approach" title="Integration Approach" status="required">
          <instruction>
            Define integration strategies:
            - **Code Integration Strategy:** How new code will interface with existing
            - **Database Integration:** Schema changes and data migration approach
            - **API Integration:** How new APIs will work with existing ones
            - **UI Integration:** Maintaining UI/UX consistency
          </instruction>
        </section>

        <section id="compatibility-requirements" title="Compatibility Requirements" status="required">
          <instruction>
            Document compatibility constraints:
            - **Existing API Compatibility:** Must maintain backward compatibility
            - **Database Schema Compatibility:** Migration strategy for schema changes
            - **UI/UX Consistency:** Design system alignment requirements
            - **Performance Impact:** Acceptable performance degradation limits
          </instruction>
        </section>
      </sections>
    </section>

    <section id="tech-stack-alignment" title="Tech Stack Alignment" status="required" elicit="true">
      <instruction>
        Ensure new components align with existing technology choices:

        1. Use existing technology stack as the foundation
        2. Only introduce new technologies if absolutely necessary
        3. Justify any new additions with clear rationale
        4. Ensure version compatibility with existing dependencies

        <llm><i>Extract actual tech stack from package.json, requirements.txt, or other dependency files</i></llm>
      </instruction>

      <sections>
        <section id="existing-stack" title="Existing Technology Stack" status="required">
          <instruction>
            Document the current stack in a table format:
            | Category | Current Technology | Version | Usage in Enhancement | Notes |
            | -------- | ------------------ | ------- | -------------------- | ----- |

            <llm><i>Fill with actual technologies found in the project</i></llm>
          </instruction>
        </section>

        <section id="new-tech-additions" title="New Technology Additions" status="optional">
          <instruction>
            Only include if new technologies are required for the enhancement:
            | Technology | Version | Purpose | Rationale | Integration Method |
            | ---------- | ------- | ------- | --------- | ------------------ |
          </instruction>
        </section>
      </sections>
    </section>

    <section id="data-models" title="Data Models and Schema Changes" status="optional" elicit="true">
      <instruction>
        Define new data models and how they integrate with existing schema:

        1. Identify new entities required for the enhancement
        2. Define relationships with existing data models
        3. Plan database schema changes (additions, modifications)
        4. Ensure backward compatibility

        <llm><i>Reference existing database schema and models when defining new ones</i></llm>
      </instruction>

      <sections>
        <section id="new-models" title="New Data Models" status="optional" repeatable="true">
          <instruction>
            For each new data model, document:

            **Model Name:** [Name]
            **Purpose:** [Why this model is needed]
            **Integration:** [How it relates to existing models]

            **Key Attributes:**
            - [attribute]: [type] - [description]

            **Relationships:**
            - With Existing: [existing model relationships]
            - With New: [new model relationships]
          </instruction>
        </section>

        <section id="schema-integration" title="Schema Integration Strategy" status="optional">
          <instruction>
            Document database changes:

            **Database Changes Required:**
            - New Tables: [list of new tables]
            - Modified Tables: [list of modified tables]
            - New Indexes: [list of new indexes]
            - Migration Strategy: [approach for data migration]

            **Backward Compatibility:**
            - [compatibility measures]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="component-architecture" title="Component Architecture" status="required" elicit="true">
      <instruction>
        Define new components and their integration with existing architecture:

        1. Identify new components required for the enhancement
        2. Define interfaces with existing components
        3. Establish clear boundaries and responsibilities
        4. Plan integration points and data flow

        MANDATORY VALIDATION: Before presenting component architecture, confirm: "The new components I'm proposing follow the existing architectural patterns I identified in your codebase: [specific patterns]. The integration interfaces respect your current component structure and communication patterns. Does this match your project's reality?"

        <llm><i>Base component design on actual existing patterns found in the codebase</i></llm>
      </instruction>

      <sections>
        <section id="new-components" title="New Components" status="required" repeatable="true">
          <instruction>
            For each new component:

            **Component Name:** [Name]
            **Responsibility:** [What it does]
            **Integration Points:** [Where it connects to existing system]

            **Key Interfaces:**
            - [interface description]

            **Dependencies:**
            - Existing Components: [existing dependencies]
            - New Components: [new dependencies]

            **Technology Stack:** [specific technologies used]
          </instruction>
        </section>

        <section id="interaction-diagram" title="Component Interaction Diagram" status="optional">
          <instruction>
            Create a Mermaid diagram showing component interactions:

            ```mermaid
            graph TD
                [component relationships]
            ```
          </instruction>
        </section>
      </sections>
    </section>

    <section id="api-design" title="API Design and Integration" status="optional" elicit="true">
      <instruction>
        Define new API endpoints and integration with existing APIs:

        1. Plan new API endpoints required for the enhancement
        2. Ensure consistency with existing API patterns
        3. Define authentication and authorization integration
        4. Plan versioning strategy if needed

        <llm><i>Follow existing API patterns found in the codebase</i></llm>
      </instruction>

      <sections>
        <section id="api-strategy" title="API Integration Strategy" status="required">
          <instruction>
            Document API approach:
            - **API Integration Strategy:** [approach]
            - **Authentication:** [auth method consistent with existing]
            - **Versioning:** [versioning approach if needed]
          </instruction>
        </section>

        <section id="new-endpoints" title="New API Endpoints" status="optional" repeatable="true">
          <instruction>
            For each new endpoint:

            **Endpoint:** [HTTP Method] [Path]
            **Purpose:** [What it does]
            **Integration:** [How it works with existing APIs]

            **Request:**
            ```json
            {
              // request schema
            }
            ```

            **Response:**
            ```json
            {
              // response schema
            }
            ```
          </instruction>
        </section>
      </sections>
    </section>

    <section id="external-api-integration" title="External API Integration" status="optional" repeatable="true">
      <instruction>
        Document new external API integrations if required:

        **API Name:** [Name]
        **Purpose:** [Why it's needed]
        **Documentation:** [URL]
        **Base URL:** [API base URL]
        **Authentication:** [Auth method]
        **Integration Method:** [How it will be integrated]

        **Key Endpoints Used:**
        - [Method] [Path] - [Purpose]

        **Error Handling:** [Strategy for handling API errors]
      </instruction>
    </section>

    <section id="source-tree-integration" title="Source Tree Integration" status="required" elicit="true">
      <instruction>
        Define how new code will integrate with existing project structure:

        1. Follow existing project organization patterns
        2. Identify where new files/folders will be placed
        3. Ensure consistency with existing naming conventions
        4. Plan for minimal disruption to existing structure

        <llm><i>Analyze actual project structure and propose additions that follow existing patterns</i></llm>
      </instruction>

      <sections>
        <section id="existing-structure" title="Existing Project Structure" status="required">
          <instruction>
            Document relevant parts of current structure:
            ```
            [existing directory structure]
            ```
          </instruction>
        </section>

        <section id="new-file-organization" title="New File Organization" status="required">
          <instruction>
            Show new additions to existing structure:
            ```
            project-root/
            ├── [existing folders]
            │   ├── [new folder]/           # Purpose
            │   │   ├── [new files]
            │   └── [existing folder]/      # With additions
            │       └── [new file]          # New addition
            ```
          </instruction>
        </section>

        <section id="integration-guidelines" title="Integration Guidelines" status="required">
          <instruction>
            Document integration rules:
            - **File Naming:** [naming convention consistency]
            - **Folder Organization:** [organization approach]
            - **Import/Export Patterns:** [module patterns]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="infrastructure-deployment" title="Infrastructure and Deployment Integration" status="required" elicit="true">
      <instruction>
        Define deployment strategy alongside existing infrastructure:

        1. Use existing deployment pipeline and infrastructure
        2. Identify any infrastructure changes needed
        3. Plan deployment strategy to minimize risk
        4. Define rollback procedures

        <llm><i>Reference existing deployment configuration and CI/CD setup</i></llm>
      </instruction>

      <sections>
        <section id="existing-infrastructure" title="Existing Infrastructure" status="required">
          <instruction>
            Document current deployment:
            - **Current Deployment:** [deployment method]
            - **Infrastructure Tools:** [tools used]
            - **Environments:** [dev, staging, prod setup]
          </instruction>
        </section>

        <section id="enhancement-deployment" title="Enhancement Deployment Strategy" status="required">
          <instruction>
            Define deployment approach:
            - **Deployment Approach:** [strategy]
            - **Infrastructure Changes:** [required changes]
            - **Pipeline Integration:** [CI/CD modifications]
          </instruction>
        </section>

        <section id="rollback-strategy" title="Rollback Strategy" status="required">
          <instruction>
            Document rollback plan:
            - **Rollback Method:** [approach]
            - **Risk Mitigation:** [risk management]
            - **Monitoring:** [monitoring strategy]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="coding-standards" title="Coding Standards and Conventions" status="required" elicit="true">
      <instruction>
        Ensure new code follows existing project conventions:

        1. Document existing coding standards from project analysis
        2. Identify any enhancement-specific requirements
        3. Ensure consistency with existing codebase patterns
        4. Define standards for new code organization

        <llm><i>Extract actual coding standards from linter configs, existing code patterns</i></llm>
      </instruction>

      <sections>
        <section id="existing-standards" title="Existing Standards Compliance" status="required">
          <instruction>
            Document current standards:
            - **Code Style:** [existing style guide]
            - **Linting Rules:** [linter configuration]
            - **Testing Patterns:** [test structure]
            - **Documentation Style:** [doc format]
          </instruction>
        </section>

        <section id="enhancement-standards" title="Enhancement-Specific Standards" status="optional">
          <instruction>
            List any new patterns needed:
            - [Standard]: [Description]
          </instruction>
        </section>

        <section id="integration-rules" title="Critical Integration Rules" status="required">
          <instruction>
            Define integration requirements:
            - **Existing API Compatibility:** [rule]
            - **Database Integration:** [rule]
            - **Error Handling:** [pattern]
            - **Logging Consistency:** [approach]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="testing-strategy" title="Testing Strategy" status="required" elicit="true">
      <instruction>
        Define testing approach for the enhancement:

        1. Integrate with existing test suite
        2. Ensure existing functionality remains intact
        3. Plan for testing new features
        4. Define integration testing approach

        <llm><i>Reference existing test framework and patterns</i></llm>
      </instruction>

      <sections>
        <section id="existing-test-integration" title="Integration with Existing Tests" status="required">
          <instruction>
            Document current testing:
            - **Existing Test Framework:** [framework]
            - **Test Organization:** [structure]
            - **Coverage Requirements:** [coverage targets]
          </instruction>
        </section>

        <section id="new-testing" title="New Testing Requirements" status="required">
          <instruction>
            Define new test requirements.
          </instruction>

          <sections>
            <section id="unit-tests" title="Unit Tests for New Components" status="required">
              <instruction>
                - **Framework:** [test framework]
                - **Location:** [where tests go]
                - **Coverage Target:** [coverage percentage]
                - **Integration with Existing:** [how it fits]
              </instruction>
            </section>

            <section id="integration-tests" title="Integration Tests" status="required">
              <instruction>
                - **Scope:** [what to test]
                - **Existing System Verification:** [verification approach]
                - **New Feature Testing:** [test strategy]
              </instruction>
            </section>

            <section id="regression-tests" title="Regression Testing" status="optional">
              <instruction>
                - **Existing Feature Verification:** [approach]
                - **Automated Regression Suite:** [automation strategy]
                - **Manual Testing Requirements:** [manual tests needed]
              </instruction>
            </section>
          </sections>
        </section>
      </sections>
    </section>

    <section id="security-integration" title="Security Integration" status="required" elicit="true">
      <instruction>
        Ensure security consistency with existing system:

        1. Follow existing security patterns and tools
        2. Ensure new features don't introduce vulnerabilities
        3. Maintain existing security posture
        4. Define security testing for new components

        <llm><i>Reference existing security measures and patterns</i></llm>
      </instruction>

      <sections>
        <section id="existing-security" title="Existing Security Measures" status="required">
          <instruction>
            Document current security:
            - **Authentication:** [auth method]
            - **Authorization:** [authz approach]
            - **Data Protection:** [encryption/protection]
            - **Security Tools:** [tools used]
          </instruction>
        </section>

        <section id="enhancement-security" title="Enhancement Security Requirements" status="required">
          <instruction>
            Define new security needs:
            - **New Security Measures:** [new requirements]
            - **Integration Points:** [security touchpoints]
            - **Compliance Requirements:** [compliance needs]
          </instruction>
        </section>

        <section id="security-testing" title="Security Testing" status="optional">
          <instruction>
            Plan security testing:
            - **Existing Security Tests:** [current tests]
            - **New Security Test Requirements:** [new tests]
            - **Penetration Testing:** [pentest needs]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="checklist-results" title="Checklist Results Report" status="optional">
      <instruction>
        Execute the architect-checklist and populate results here, focusing on brownfield-specific validation.

        <llm><i>Run checklist if available and document results</i></llm>
      </instruction>
    </section>

    <section id="next-steps" title="Next Steps" status="required">
      <instruction>
        After completing the brownfield architecture:

        1. Review integration points with existing system
        2. Begin story implementation with Dev agent
        3. Set up deployment pipeline integration
        4. Plan rollback and monitoring procedures
      </instruction>

      <sections>
        <section id="story-manager-handoff" title="Story Manager Handoff" status="required">
          <instruction>
            Create a brief prompt for Story Manager to work with this brownfield enhancement. Include:
            - Reference to this architecture document
            - Key integration requirements validated with user
            - Existing system constraints based on actual project analysis
            - First story to implement with clear integration checkpoints
            - Emphasis on maintaining existing system integrity throughout implementation
          </instruction>
        </section>

        <section id="developer-handoff" title="Developer Handoff" status="required">
          <instruction>
            Create a brief prompt for developers starting implementation. Include:
            - Reference to this architecture and existing coding standards analyzed from actual project
            - Integration requirements with existing codebase validated with user
            - Key technical decisions based on real project constraints
            - Existing system compatibility requirements with specific verification steps
            - Clear sequencing of implementation to minimize risk to existing functionality
          </instruction>
        </section>
      </sections>
    </section>
  </sections>

  <variables>
    <variable name="project_name" default="Project Name" />
    <variable name="enhancement_description" default="enhancement description" />
    <variable name="existing_project_purpose" default="" />
    <variable name="existing_tech_summary" default="" />
    <variable name="existing_architecture_style" default="" />
    <variable name="existing_deployment_approach" default="" />
  </variables>
</template>
````
