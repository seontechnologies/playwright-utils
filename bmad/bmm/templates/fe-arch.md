<!-- Powered by BMAD-CORE™ -->

# fe-arch

````xml
<template id="bmad/bmm/templates/fe-arch.md" name="Architecture" filename="{project-root}{output-directory}/architecture.md">

  <title>{{project_name}} Frontend Architecture</title>

  <sections>
    <section id="template-framework-selection" title="Template and Framework Selection" status="required">
      <instruction>
        Review provided documents including PRD, UX-UI Specification, and main Architecture Document. Focus on extracting technical implementation details needed for AI frontend tools and developer agents. Ask the user for any of these documents if you are unable to locate and were not provided.

        Before proceeding with frontend architecture design, check if the project is using a frontend starter template or existing codebase:

        1. Review the PRD, main architecture document, and brainstorming brief for mentions of:
          - Frontend starter templates (e.g., Create React App, Next.js, Vite, Vue CLI, Angular CLI, etc.)
          - UI kit or component library starters
          - Existing frontend projects being used as a foundation
          - Admin dashboard templates or other specialized starters
          - Design system implementations

        2. If a frontend starter template or existing project is mentioned:
          - Ask the user to provide access via one of these methods:
            - Link to the starter template documentation
            - Upload/attach the project files (for small projects)
            - Share a link to the project repository
          - Analyze the starter/existing project to understand:
            - Pre-installed dependencies and versions
            - Folder structure and file organization
            - Built-in components and utilities
            - Styling approach (CSS modules, styled-components, Tailwind, etc.)
            - State management setup (if any)
            - Routing configuration
            - Testing setup and patterns
            - Build and development scripts
          - Use this analysis to ensure your frontend architecture aligns with the starter's patterns

        3. If no frontend starter is mentioned but this is a new UI, ensure we know what the ui language and framework is:
          - Based on the framework choice, suggest appropriate starters:
            - React: Create React App, Next.js, Vite + React
            - Vue: Vue CLI, Nuxt.js, Vite + Vue
            - Angular: Angular CLI
          - Or suggest popular UI templates if applicable
          - Explain benefits specific to frontend development

        4. If the user confirms no starter template will be used:
          - Note that all tooling, bundling, and configuration will need manual setup
          - Proceed with frontend architecture from scratch

        Document the starter template decision and any constraints it imposes before proceeding.

        <llm><i>Check PRD, architecture doc, and ask user about frontend starter templates or existing codebases</i></llm>
      </instruction>

      <sections>
        <section id="changelog" title="Change Log" status="optional">
          <instruction>
            Track document versions and changes:
            | Date | Version | Description | Author |
            | ---- | ------- | ----------- | ------ |
          </instruction>
        </section>
      </sections>
    </section>

    <section id="frontend-tech-stack" title="Frontend Tech Stack" status="required" elicit="true">
      <instruction>
        Extract from main architecture's Technology Stack Table. This section MUST remain synchronized with the main architecture document.

        <llm><i>Ensure consistency with main architecture document's tech stack</i></llm>
      </instruction>

      <sections>
        <section id="tech-stack-table" title="Technology Stack Table" status="required">
          <instruction>
            Fill in appropriate technology choices based on the selected framework and project requirements:

            | Category          | Technology           | Version     | Purpose           | Rationale  |
            | ----------------- | -------------------- | ----------- | ----------------- | ---------- |
            | Framework         | {{framework}}        | {{version}} | Core UI framework | Why chosen |
            | UI Library        | {{ui_library}}       | {{version}} | Component library | Why chosen |
            | State Management  | {{state_management}} | {{version}} | Application state | Why chosen |
            | Routing           | {{routing_library}}  | {{version}} | Navigation        | Why chosen |
            | Build Tool        | {{build_tool}}       | {{version}} | Bundling          | Why chosen |
            | Styling           | {{styling_solution}} | {{version}} | CSS approach      | Why chosen |
            | Testing           | {{test_framework}}   | {{version}} | Test runner       | Why chosen |
            | Component Library | {{component_lib}}    | {{version}} | UI components     | Why chosen |
            | Form Handling     | {{form_library}}     | {{version}} | Form management   | Why chosen |
            | Animation         | {{animation_lib}}    | {{version}} | Animations        | Why chosen |
            | Dev Tools         | {{dev_tools}}        | {{version}} | Development aids  | Why chosen |
          </instruction>
        </section>
      </sections>
    </section>

    <section id="project-structure" title="Project Structure" status="required" elicit="true">
      <instruction>
        Define exact directory structure for AI tools based on the chosen framework. Be specific about where each type of file goes. Generate a structure that follows the framework's best practices and conventions.

        <llm><i>Generate framework-specific folder structure following best practices</i></llm>
      </instruction>
    </section>

    <section id="component-standards" title="Component Standards" status="required" elicit="true">
      <instruction>
        Define exact patterns for component creation based on the chosen framework.

        <llm><i>Provide framework-specific component patterns and conventions</i></llm>
      </instruction>

      <sections>
        <section id="component-template" title="Component Template" status="required">
          <instruction>
            Generate a minimal but complete component template following the framework's best practices. Include TypeScript types, proper imports, and basic structure.

            ```typescript
            // Component template code here
            ```

          </instruction>
        </section>

        <section id="naming-conventions" title="Naming Conventions" status="required">
          <instruction>
            Provide naming conventions specific to the chosen framework for:
            - Components
            - Files
            - Services
            - State management
            - Other architectural elements
          </instruction>
        </section>
      </sections>
    </section>

    <section id="state-management" title="State Management" status="required" elicit="true">
      <instruction>
        Define state management patterns based on the chosen framework.

        <llm><i>Provide framework-specific state management patterns</i></llm>
      </instruction>

      <sections>
        <section id="store-structure" title="Store Structure" status="required">
          <instruction>
            Generate the state management directory structure appropriate for the chosen framework and selected state management solution.

            ```plaintext
            // Store structure here
            ```
          </instruction>
        </section>

        <section id="state-template" title="State Management Template" status="required">
          <instruction>
            Provide a basic state management template/example following the framework's recommended patterns. Include TypeScript types and common operations like setting, updating, and clearing state.

            ```typescript
            // State management template code here
            ```
          </instruction>
        </section>
      </sections>
    </section>

    <section id="api-integration" title="API Integration" status="required" elicit="true">
      <instruction>
        Define API service patterns based on the chosen framework.

        <llm><i>Provide framework-specific API integration patterns</i></llm>
      </instruction>

      <sections>
        <section id="service-template" title="Service Template" status="required">
          <instruction>
            Provide an API service template that follows the framework's conventions. Include proper TypeScript types, error handling, and async patterns.

            ```typescript
            // API service template code here
            ```
          </instruction>
        </section>

        <section id="api-client-config" title="API Client Configuration" status="required">
          <instruction>
            Show how to configure the HTTP client for the chosen framework, including authentication interceptors/middleware and error handling.

            ```typescript
            // API client configuration code here
            ```
          </instruction>
        </section>
      </sections>
    </section>

    <section id="routing" title="Routing" status="required" elicit="true">
      <instruction>
        Define routing structure and patterns based on the chosen framework.

        <llm><i>Provide framework-specific routing patterns</i></llm>
      </instruction>

      <sections>
        <section id="route-configuration" title="Route Configuration" status="required">
          <instruction>
            Provide routing configuration appropriate for the chosen framework. Include protected route patterns, lazy loading where applicable, and authentication guards/middleware.

            ```typescript
            // Route configuration code here
            ```
          </instruction>
        </section>
      </sections>
    </section>

    <section id="styling-guidelines" title="Styling Guidelines" status="required" elicit="true">
      <instruction>
        Define styling approach based on the chosen framework.

        <llm><i>Provide framework-specific styling patterns and methodology</i></llm>
      </instruction>

      <sections>
        <section id="styling-approach" title="Styling Approach" status="required">
          <instruction>
            Describe the styling methodology appropriate for the chosen framework (CSS Modules, Styled Components, Tailwind, etc.) and provide basic patterns.
          </instruction>
        </section>

        <section id="global-theme" title="Global Theme Variables" status="required">
          <instruction>
            Provide a CSS custom properties (CSS variables) theme system that works across all frameworks. Include colors, spacing, typography, shadows, and dark mode support.

            ```css
            /* Theme variables here */
            ```
          </instruction>
        </section>
      </sections>
    </section>

    <section id="testing-requirements" title="Testing Requirements" status="required" elicit="true">
      <instruction>
        Define minimal testing requirements based on the chosen framework.

        <llm><i>Provide framework-specific testing patterns and templates</i></llm>
      </instruction>

      <sections>
        <section id="component-test-template" title="Component Test Template" status="required">
          <instruction>
            Provide a basic component test template using the framework's recommended testing library. Include examples of rendering tests, user interaction tests, and mocking.

            ```typescript
            // Component test template code here
            ```
          </instruction>
        </section>

        <section id="testing-best-practices" title="Testing Best Practices" status="required">
          <instruction>
            Document testing best practices:
            1. **Unit Tests**: Test individual components in isolation
            2. **Integration Tests**: Test component interactions
            3. **E2E Tests**: Test critical user flows (using Cypress/Playwright)
            4. **Coverage Goals**: Aim for 80% code coverage
            5. **Test Structure**: Arrange-Act-Assert pattern
            6. **Mock External Dependencies**: API calls, routing, state management
          </instruction>
        </section>
      </sections>
    </section>

    <section id="environment-configuration" title="Environment Configuration" status="required" elicit="true">
      <instruction>
        List required environment variables based on the chosen framework. Show the appropriate format and naming conventions for the framework.

        <llm><i>Provide framework-specific environment configuration</i></llm>
      </instruction>
    </section>

    <section id="frontend-developer-standards" title="Frontend Developer Standards" status="required">
      <instruction>
        Define critical standards for frontend development.
      </instruction>

      <sections>
        <section id="critical-coding-rules" title="Critical Coding Rules" status="required" elicit="true">
          <instruction>
            List essential rules that prevent common AI mistakes, including both universal rules and framework-specific ones.

            <llm><i>Provide framework-specific coding rules and patterns to avoid common mistakes</i></llm>
          </instruction>
        </section>

        <section id="quick-reference" title="Quick Reference" status="required">
          <instruction>
            Create a framework-specific cheat sheet with:
            - Common commands (dev server, build, test)
            - Key import patterns
            - File naming conventions
            - Project-specific patterns and utilities
          </instruction>
        </section>
      </sections>
    </section>
  </sections>

  <variables>
    <variable name="project_name" default="Project Name" />
    <variable name="framework" default="" />
    <variable name="version" default="" />
    <variable name="ui_library" default="" />
    <variable name="state_management" default="" />
    <variable name="routing_library" default="" />
    <variable name="build_tool" default="" />
    <variable name="styling_solution" default="" />
    <variable name="test_framework" default="" />
    <variable name="component_lib" default="" />
    <variable name="form_library" default="" />
    <variable name="animation_lib" default="" />
    <variable name="dev_tools" default="" />
  </variables>
</template>
````
