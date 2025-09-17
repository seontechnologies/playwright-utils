<!-- Powered by BMAD-CORE™ -->

# fs-arch

````xml
<template id="bmad/bmm/templates/fs-arch.md" name="Fullstack Architecture" filename="{project-root}{output-directory}/architecture.md">

  <title>{{project_name}} Fullstack Architecture</title>

  <sections>
    <section id="introduction" title="Introduction" status="required" elicit="true">
      <instruction>
        If available, review any provided relevant documents to gather all relevant context before beginning. At minimum, you should have access to {project-root}{output-directory}/prd.md and {project-root}{output-directory}/front-end-spec.md. Ask the user for any documents you need but cannot locate. This template creates a unified architecture that covers both backend and frontend concerns to guide AI-driven fullstack development.

        <llm><i>Check for existing PRD and frontend specifications before proceeding</i></llm>
      </instruction>

      This document outlines the complete fullstack architecture for {{project_name}}, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

      This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

      <sections>
        <section id="starter-template" title="Starter Template or Existing Project" status="required">
          <instruction>
            Before proceeding with architecture design, check if the project is based on any starter templates or existing codebases:

            1. Review the PRD and other documents for mentions of:
            - Fullstack starter templates (e.g., T3 Stack, MEAN/MERN starters, Django + React templates)
            - Monorepo templates (e.g., Nx, Turborepo starters)
            - Platform-specific starters (e.g., Vercel templates, AWS Amplify starters)
            - Existing projects being extended or cloned

            2. If starter templates or existing projects are mentioned:
            - Ask the user to provide access (links, repos, or files)
            - Analyze to understand pre-configured choices and constraints
            - Note any architectural decisions already made
            - Identify what can be modified vs what must be retained

            3. If no starter is mentioned but this is greenfield:
            - Suggest appropriate fullstack starters based on tech preferences
            - Consider platform-specific options (Vercel, AWS, etc.)
            - Let user decide whether to use one

            4. Document the decision and any constraints it imposes

            If none, state "N/A - Greenfield project"

            <llm><i>Thoroughly analyze any provided starter templates or existing codebases to understand architectural constraints</i></llm>
          </instruction>
        </section>

        <section id="changelog" title="Change Log" status="required">
          <instruction>
            Initialize change log table with Date, Version, Description, Author columns.
            Track document versions and changes.

            <llm><i>Create table format for tracking document evolution</i></llm>
          </instruction>
        </section>
      </sections>
    </section>

    <!-- High Level Architecture Section -->
    <section id="high-level-architecture" title="High Level Architecture" status="required" elicit="true">
      <instruction>
        This section contains multiple subsections that establish the foundation. Present all subsections together, then elicit feedback on the complete section.

        <llm><i>Present technical summary, platform choice, repository structure, architecture diagram, and patterns together as a cohesive foundation</i></llm>
      </instruction>

      <sections>
        <section id="technical-summary" title="Technical Summary" status="required">
          <instruction>
            Provide a comprehensive overview (4-6 sentences) covering:
            - Overall architectural style and deployment approach
            - Frontend framework and backend technology choices
            - Key integration points between frontend and backend
            - Infrastructure platform and services
            - How this architecture achieves PRD goals

            <llm><i>Create concise but comprehensive technical overview</i></llm>
          </instruction>
        </section>

        <section id="platform-infrastructure" title="Platform and Infrastructure Choice" status="required">
          <instruction>
            Based on PRD requirements and technical assumptions, make a platform recommendation:

            1. Consider common patterns (not an exhaustive list, use your own best judgement and search the web as needed for emerging trends):
            - **Vercel + Supabase**: For rapid development with Next.js, built-in auth/storage
            - **AWS Full Stack**: For enterprise scale with Lambda, API Gateway, S3, Cognito
            - **Azure**: For .NET ecosystems or enterprise Microsoft environments
            - **Google Cloud**: For ML/AI heavy applications or Google ecosystem integration

            2. Present 2-3 viable options with clear pros/cons
            3. Make a recommendation with rationale
            4. Get explicit user confirmation

            Document the choice and key services that will be used.

            <llm><i>Research current best practices and make informed platform recommendations</i></llm>
          </instruction>

          **Platform:** {{selected_platform}}
          **Key Services:** {{core_services_list}}
          **Deployment Host and Regions:** {{regions}}
        </section>

        <section id="repository-structure" title="Repository Structure" status="required">
          <instruction>
            Define the repository approach based on PRD requirements and platform choice, explain your rationale or ask questions to the user if unsure:

            1. For modern fullstack apps, monorepo is often preferred
            2. Consider tooling (Nx, Turborepo, Lerna, npm workspaces)
            3. Define package/app boundaries
            4. Plan for shared code between frontend and backend

            <llm><i>Make informed decisions about repository organization based on project requirements</i></llm>
          </instruction>

          **Structure:** {{repo_structure_choice}}
          **Monorepo Tool:** {{monorepo_tool_if_applicable}}
          **Package Organization:** {{package_strategy}}
        </section>

        <section id="architecture-diagram" title="High Level Architecture Diagram" status="required">
          <instruction>
            Create a Mermaid diagram showing the complete system architecture including:
            - User entry points (web, mobile)
            - Frontend application deployment
            - API layer (REST/GraphQL)
            - Backend services
            - Databases and storage
            - External integrations
            - CDN and caching layers

            Use appropriate diagram type for clarity.

            <llm><i>Create clear, comprehensive Mermaid diagram of system architecture</i></llm>
          </instruction>

          ```mermaid
          {{architecture_mermaid_diagram}}
          ```
        </section>

        <section id="architectural-patterns" title="Architectural Patterns" status="required" repeatable="true">
          <instruction>
            List patterns that will guide both frontend and backend development. Include patterns for:
            - Overall architecture (e.g., Jamstack, Serverless, Microservices)
            - Frontend patterns (e.g., Component-based, State management)
            - Backend patterns (e.g., Repository, CQRS, Event-driven)
            - Integration patterns (e.g., BFF, API Gateway)

            For each pattern, provide recommendation and rationale.

            <llm><i>Select appropriate patterns based on architecture decisions made above</i></llm>
          </instruction>

          - **{{pattern_name}}:** {{pattern_description}} - _Rationale:_ {{rationale}}
        </section>
      </sections>
    </section>

    <!-- Tech Stack Section -->
    <section id="tech-stack" title="Tech Stack" status="required" elicit="true">
      <instruction>
        This is the DEFINITIVE technology selection for the entire project. Work with user to finalize all choices. This table is the single source of truth - all development must use these exact versions.

        Key areas to cover:
        - Frontend and backend languages/frameworks
        - Databases and caching
        - Authentication and authorization
        - API approach
        - Testing tools for both frontend and backend
        - Build and deployment tools
        - Monitoring and logging

        Upon render, elicit feedback immediately.

        <llm><i>Create comprehensive technology stack table with versions and rationales</i></llm>
      </instruction>

      <sections>
        <section id="tech-stack-table" title="Technology Stack Table" status="required">
          <instruction>
            Create a comprehensive table with Category, Technology, Version, Purpose, and Rationale columns.
            Include all major technology choices for the fullstack application.

            <llm><i>Populate table with specific technologies based on architectural decisions</i></llm>
          </instruction>

          | Category             | Technology        | Version     | Purpose     | Rationale      |
          | -------------------- | ----------------- | ----------- | ----------- | -------------- |
          | Frontend Language    | {{fe_language}}   | {{version}} | {{purpose}} | {{why_chosen}} |
          | Frontend Framework   | {{fe_framework}}  | {{version}} | {{purpose}} | {{why_chosen}} |
          | UI Component Library | {{ui_library}}    | {{version}} | {{purpose}} | {{why_chosen}} |
          | State Management     | {{state_mgmt}}    | {{version}} | {{purpose}} | {{why_chosen}} |
          | Backend Language     | {{be_language}}   | {{version}} | {{purpose}} | {{why_chosen}} |
          | Backend Framework    | {{be_framework}}  | {{version}} | {{purpose}} | {{why_chosen}} |
          | API Style            | {{api_style}}     | {{version}} | {{purpose}} | {{why_chosen}} |
          | Database             | {{database}}      | {{version}} | {{purpose}} | {{why_chosen}} |
          | Cache                | {{cache}}         | {{version}} | {{purpose}} | {{why_chosen}} |
          | File Storage         | {{storage}}       | {{version}} | {{purpose}} | {{why_chosen}} |
          | Authentication       | {{auth}}          | {{version}} | {{purpose}} | {{why_chosen}} |
          | Frontend Testing     | {{fe_test}}       | {{version}} | {{purpose}} | {{why_chosen}} |
          | Backend Testing      | {{be_test}}       | {{version}} | {{purpose}} | {{why_chosen}} |
          | E2E Testing          | {{e2e_test}}      | {{version}} | {{purpose}} | {{why_chosen}} |
          | Build Tool           | {{build_tool}}    | {{version}} | {{purpose}} | {{why_chosen}} |
          | Bundler              | {{bundler}}       | {{version}} | {{purpose}} | {{why_chosen}} |
          | IaC Tool             | {{iac_tool}}      | {{version}} | {{purpose}} | {{why_chosen}} |
          | CI/CD                | {{cicd}}          | {{version}} | {{purpose}} | {{why_chosen}} |
          | Monitoring           | {{monitoring}}    | {{version}} | {{purpose}} | {{why_chosen}} |
          | Logging              | {{logging}}       | {{version}} | {{purpose}} | {{why_chosen}} |
          | CSS Framework        | {{css_framework}} | {{version}} | {{purpose}} | {{why_chosen}} |
        </section>
      </sections>
    </section>

    <!-- Data Models Section -->
    <section id="data-models" title="Data Models" status="required" elicit="true" repeatable="true">
      <instruction>
        Define the core data models/entities that will be shared between frontend and backend:

        1. Review PRD requirements and identify key business entities
        2. For each model, explain its purpose and relationships
        3. Include key attributes and data types
        4. Show relationships between models
        5. Create TypeScript interfaces that can be shared
        6. Discuss design decisions with user

        Create a clear conceptual model before moving to database schema.

        <llm><i>Analyze PRD requirements to identify all necessary data entities</i></llm>
      </instruction>

      <sections>
        <section id="model" title="{{model_name}}" status="required">
          **Purpose:** {{model_purpose}}

          **Key Attributes:**
          - {{attribute_1}}: {{type_1}} - {{description_1}}
          - {{attribute_2}}: {{type_2}} - {{description_2}}

          <sections>
            <section id="typescript-interface" title="TypeScript Interface" status="required">
              <instruction>
                Provide TypeScript interface definition for the model.

                <llm><i>Create properly typed interface that can be shared between frontend and backend</i></llm>
              </instruction>

              ```typescript
              {{model_interface}}
              ```
            </section>

            <section id="relationships" title="Relationships" status="required">
              <instruction>
                Define relationships to other models.

                <llm><i>List all relationships using bullet points</i></llm>
              </instruction>

              - {{relationship}}
              - {{relationship}}
            </section>
          </sections>
        </section>
      </sections>
    </section>

    <!-- API Specification Section -->
    <section id="api-spec" title="API Specification" status="required" elicit="true">
      <instruction>
        Based on the chosen API style from Tech Stack:

        1. If REST API, create an OpenAPI 3.0 specification
        2. If GraphQL, provide the GraphQL schema
        3. If tRPC, show router definitions
        4. Include all endpoints from epics/stories
        5. Define request/response schemas based on data models
        6. Document authentication requirements
        7. Include example requests/responses

        Use appropriate format for the chosen API style. If no API (e.g., static site), skip this section.

        <llm><i>Create comprehensive API specification based on chosen technology and data models</i></llm>
      </instruction>

      <sections>
        <section id="rest-api" title="REST API Specification" status="conditional">
          <instruction>
            Include this section only if API style is REST.
            Create OpenAPI 3.0 specification.

            <llm><i>Generate complete OpenAPI spec with all endpoints</i></llm>
          </instruction>

          ```yaml
          openapi: 3.0.0
          info:
            title: {{api_title}}
            version: {{api_version}}
            description: {{api_description}}
          servers:
            - url: {{server_url}}
              description: {{server_description}}
          {{rest_api_spec}}
          ```
        </section>

        <section id="graphql-api" title="GraphQL Schema" status="conditional">
          <instruction>
            Include this section only if API style is GraphQL.
            Provide complete GraphQL schema.

            <llm><i>Generate GraphQL schema with types, queries, and mutations</i></llm>
          </instruction>

          ```graphql
          {{graphql_schema}}
          ```
        </section>

        <section id="trpc-api" title="tRPC Router Definitions" status="conditional">
          <instruction>
            Include this section only if API style is tRPC.
            Show tRPC router definitions.

            <llm><i>Generate tRPC router structure with procedures</i></llm>
          </instruction>

          ```typescript
          {{trpc_routers}}
          ```
        </section>
      </sections>
    </section>

    <!-- Components Section -->
    <section id="components" title="Components" status="required" elicit="true">
      <instruction>
        Based on the architectural patterns, tech stack, and data models from above:

        1. Identify major logical components/services across the fullstack
        2. Consider both frontend and backend components
        3. Define clear boundaries and interfaces between components
        4. For each component, specify:
        - Primary responsibility
        - Key interfaces/APIs exposed
        - Dependencies on other components
        - Technology specifics based on tech stack choices

        5. Create component diagrams where helpful

        <llm><i>Design comprehensive component architecture with clear separation of concerns</i></llm>
      </instruction>

      <sections>
        <section id="component-list" title="{{component_name}}" status="required" repeatable="true">
          **Responsibility:** {{component_description}}

          **Key Interfaces:**
          - {{interface_1}}
          - {{interface_2}}

          **Dependencies:** {{dependencies}}

          **Technology Stack:** {{component_tech_details}}
        </section>

        <section id="component-diagrams" title="Component Diagrams" status="required">
          <instruction>
            Create Mermaid diagrams to visualize component relationships. Options:
            - C4 Container diagram for high-level view
            - Component diagram for detailed internal structure
            - Sequence diagrams for complex interactions
            Choose the most appropriate for clarity

            <llm><i>Create appropriate diagram type based on component complexity</i></llm>
          </instruction>

          ```mermaid
          {{component_diagram}}
          ```
        </section>
      </sections>
    </section>

    <!-- External APIs Section -->
    <section id="external-apis" title="External APIs" status="conditional" elicit="true" repeatable="true">
      <instruction>
        Include this section only if project requires external API integrations.

        For each external service integration:

        1. Identify APIs needed based on PRD requirements and component design
        2. If documentation URLs are unknown, ask user for specifics
        3. Document authentication methods and security considerations
        4. List specific endpoints that will be used
        5. Note any rate limits or usage constraints

        If no external APIs are needed, state this explicitly and skip to next section.

        <llm><i>Analyze PRD requirements to identify necessary external integrations</i></llm>
      </instruction>

      <sections>
        <section id="api" title="{{api_name}} API" status="required">
          - **Purpose:** {{api_purpose}}
          - **Documentation:** {{api_docs_url}}
          - **Base URL(s):** {{api_base_url}}
          - **Authentication:** {{auth_method}}
          - **Rate Limits:** {{rate_limits}}

          **Key Endpoints Used:**
          - `{{method}} {{endpoint_path}}` - {{endpoint_purpose}}

          **Integration Notes:** {{integration_considerations}}
        </section>
      </sections>
    </section>

    <!-- Core Workflows Section -->
    <section id="core-workflows" title="Core Workflows" status="required" elicit="true">
      <instruction>
        Illustrate key system workflows using sequence diagrams:

        1. Identify critical user journeys from PRD
        2. Show component interactions including external APIs
        3. Include both frontend and backend flows
        4. Include error handling paths
        5. Document async operations
        6. Create both high-level and detailed diagrams as needed

        Focus on workflows that clarify architecture decisions or complex interactions.

        <llm><i>Create comprehensive sequence diagrams for critical user flows</i></llm>
      </instruction>

      ```mermaid
      {{workflow_sequence_diagram}}
      ```
    </section>

    <!-- Database Schema Section -->
    <section id="database-schema" title="Database Schema" status="required" elicit="true">
      <instruction>
        Transform the conceptual data models into concrete database schemas:

        1. Use the database type(s) selected in Tech Stack
        2. Create schema definitions using appropriate notation
        3. Include indexes, constraints, and relationships
        4. Consider performance and scalability
        5. For NoSQL, show document structures

        Present schema in format appropriate to database type (SQL DDL, JSON schema, etc.)

        <llm><i>Generate appropriate schema format based on selected database technology</i></llm>
      </instruction>

      ```sql
      {{database_schema_ddl}}
      ```
    </section>

    <!-- Frontend Architecture Section -->
    <section id="frontend-architecture" title="Frontend Architecture" status="required" elicit="true">
      <instruction>
        Define frontend-specific architecture details. After each subsection, note if user wants to refine before continuing.

        <llm><i>Create detailed frontend architecture based on chosen framework and patterns</i></llm>
      </instruction>

      <sections>
        <section id="component-architecture" title="Component Architecture" status="required">
          <instruction>
            Define component organization and patterns based on chosen framework.

            <llm><i>Create framework-specific component architecture</i></llm>
          </instruction>

          <sections>
            <section id="component-organization" title="Component Organization" status="required">
              ```
              {{component_structure}}
              ```
            </section>

            <section id="component-template" title="Component Template" status="required">
              ```typescript
              {{component_template}}
              ```
            </section>
          </sections>
        </section>

        <section id="state-management" title="State Management Architecture" status="required">
          <instruction>
            Detail state management approach based on chosen solution.

            <llm><i>Define state management patterns and structure</i></llm>
          </instruction>

          <sections>
            <section id="state-structure" title="State Structure" status="required">
              ```typescript
              {{state_structure}}
              ```
            </section>

            <section id="state-patterns" title="State Management Patterns" status="required">
              - {{pattern}}
              - {{pattern}}
            </section>
          </sections>
        </section>

        <section id="routing-architecture" title="Routing Architecture" status="required">
          <instruction>
            Define routing structure based on framework choice.

            <llm><i>Create routing architecture appropriate for chosen frontend framework</i></llm>
          </instruction>

          <sections>
            <section id="route-organization" title="Route Organization" status="required">
              ```
              {{route_structure}}
              ```
            </section>

            <section id="protected-routes" title="Protected Route Pattern" status="required">
              ```typescript
              {{protected_route_example}}
              ```
            </section>
          </sections>
        </section>

        <section id="frontend-services" title="Frontend Services Layer" status="required">
          <instruction>
            Define how frontend communicates with backend.

            <llm><i>Create service layer architecture for API communication</i></llm>
          </instruction>

          <sections>
            <section id="api-client-setup" title="API Client Setup" status="required">
              ```typescript
              {{api_client_setup}}
              ```
            </section>

            <section id="service-example" title="Service Example" status="required">
              ```typescript
              {{service_example}}
              ```
            </section>
          </sections>
        </section>
      </sections>
    </section>

    <!-- Backend Architecture Section -->
    <section id="backend-architecture" title="Backend Architecture" status="required" elicit="true">
      <instruction>
        Define backend-specific architecture details. Consider serverless vs traditional server approaches.

        <llm><i>Create detailed backend architecture based on chosen platform and framework</i></llm>
      </instruction>

      <sections>
        <section id="service-architecture" title="Service Architecture" status="required">
          <instruction>
            Based on platform choice, define service organization.

            <llm><i>Create service architecture appropriate for chosen backend approach</i></llm>
          </instruction>

          <sections>
            <section id="serverless-architecture" title="Serverless Architecture" status="conditional">
              <instruction>
                Include this section only if serverless architecture is chosen.

                <llm><i>Define serverless function organization and templates</i></llm>
              </instruction>

              <sections>
                <section id="function-organization" title="Function Organization" status="required">
                  ```
                  {{function_structure}}
                  ```
                </section>

                <section id="function-template" title="Function Template" status="required">
                  ```typescript
                  {{function_template}}
                  ```
                </section>
              </sections>
            </section>

            <section id="traditional-server" title="Traditional Server Architecture" status="conditional">
              <instruction>
                Include this section only if traditional server architecture is chosen.

                <llm><i>Define traditional server organization and templates</i></llm>
              </instruction>

              <sections>
                <section id="controller-organization" title="Controller/Route Organization" status="required">
                  ```
                  {{controller_structure}}
                  ```
                </section>

                <section id="controller-template" title="Controller Template" status="required">
                  ```typescript
                  {{controller_template}}
                  ```
                </section>
              </sections>
            </section>
          </sections>
        </section>

        <section id="database-architecture" title="Database Architecture" status="required">
          <instruction>
            Define database schema and access patterns.

            <llm><i>Create database access layer and repository patterns</i></llm>
          </instruction>

          <sections>
            <section id="schema-design" title="Schema Design" status="required">
              ```sql
              {{database_schema}}
              ```
            </section>

            <section id="data-access-layer" title="Data Access Layer" status="required">
              ```typescript
              {{repository_pattern}}
              ```
            </section>
          </sections>
        </section>

        <section id="auth-architecture" title="Authentication and Authorization" status="required">
          <instruction>
            Define auth implementation details.

            <llm><i>Create authentication flow and middleware patterns</i></llm>
          </instruction>

          <sections>
            <section id="auth-flow" title="Auth Flow" status="required">
              ```mermaid
              {{auth_flow_diagram}}
              ```
            </section>

            <section id="auth-middleware" title="Middleware/Guards" status="required">
              ```typescript
              {{auth_middleware}}
              ```
            </section>
          </sections>
        </section>
      </sections>
    </section>

    <!-- Unified Project Structure Section -->
    <section id="unified-project-structure" title="Unified Project Structure" status="required" elicit="true">
      <instruction>
        Create a monorepo structure that accommodates both frontend and backend. Adapt based on chosen tools and frameworks.

        <llm><i>Generate comprehensive project structure based on all architectural decisions made</i></llm>
      </instruction>
      <example-markdown>
      {{project_name}}/
      ├── .github/                    # CI/CD workflows
      │   └── workflows/
      │       ├── ci.yaml
      │       └── deploy.yaml
      ├── apps/                       # Application packages
      │   ├── web/                    # Frontend application
      │   │   ├── src/
      │   │   │   ├── components/     # UI components
      │   │   │   ├── pages/          # Page components/routes
      │   │   │   ├── hooks/          # Custom React hooks
      │   │   │   ├── services/       # API client services
      │   │   │   ├── stores/         # State management
      │   │   │   ├── styles/         # Global styles/themes
      │   │   │   └── utils/          # Frontend utilities
      │   │   ├── public/             # Static assets
      │   │   ├── tests/              # Frontend tests
      │   │   └── package.json
      │   └── api/                    # Backend application
      │       ├── src/
      │       │   ├── routes/         # API routes/controllers
      │       │   ├── services/       # Business logic
      │       │   ├── models/         # Data models
      │       │   ├── middleware/     # Express/API middleware
      │       │   ├── utils/          # Backend utilities
      │       │   └── {{serverless_or_server_entry}}
      │       ├── tests/              # Backend tests
      │       └── package.json
      ├── packages/                   # Shared packages
      │   ├── shared/                 # Shared types/utilities
      │   │   ├── src/
      │   │   │   ├── types/          # TypeScript interfaces
      │   │   │   ├── constants/      # Shared constants
      │   │   │   └── utils/          # Shared utilities
      │   │   └── package.json
      │   ├── ui/                     # Shared UI components
      │   │   ├── src/
      │   │   └── package.json
      │   └── config/                 # Shared configuration
      │       ├── eslint/
      │       ├── typescript/
      │       └── jest/
      ├── infrastructure/             # IaC definitions
      │   └── {{iac_structure}}
      ├── scripts/                    # Build/deploy scripts
      ├── docs/                       # Documentation
      │   ├── {{prdFile}}
      │   ├── front-end-spec.md
      │   └── fullstack-architecture.md
      ├── .env.example                # Environment template
      ├── package.json                # Root package.json
      ├── {{monorepo_config}}         # Monorepo configuration
      └── README.md
      </example-markdown>
    </section>

    <section id="development-workflow" title="Development Workflow" status="required" elicit="true">
      <instruction>
        Define the development setup and workflow for the fullstack application.

        <llm><i>Create comprehensive development workflow including setup, commands, and environment configuration</i></llm>
      </instruction>

      <sections>
        <section id="local-setup" title="Local Development Setup" status="required">
          <sections>
            <section id="prerequisites" title="Prerequisites" status="required">
              ```bash
              {{prerequisites_commands}}
              ```
            </section>

            <section id="initial-setup" title="Initial Setup" status="required">
              ```bash
              {{setup_commands}}
              ```
            </section>

            <section id="dev-commands" title="Development Commands" status="required">
              ```bash
              # Start all services
              {{start_all_command}}

              # Start frontend only
              {{start_frontend_command}}

              # Start backend only
              {{start_backend_command}}

              # Run tests
              {{test_commands}}
              ```
            </section>
          </sections>
        </section>

        <section id="environment-config" title="Environment Configuration" status="required">
          <sections>
            <section id="env-vars" title="Required Environment Variables" status="required">
              ```bash
              # Frontend (.env.local)
              {{frontend_env_vars}}

              # Backend (.env)
              {{backend_env_vars}}

              # Shared
              {{shared_env_vars}}
              ```
            </section>
          </sections>
        </section>
      </sections>
    </section>

    <section id="deployment-architecture" title="Deployment Architecture" status="required" elicit="true">
      <instruction>
        Define deployment strategy based on platform choice.

        <llm><i>Create deployment architecture based on chosen platform and infrastructure</i></llm>
      </instruction>

      <sections>
        <section id="deployment-strategy" title="Deployment Strategy" status="required">
          **Frontend Deployment:**
          - **Platform:** {{frontend_deploy_platform}}
          - **Build Command:** {{frontend_build_command}}
          - **Output Directory:** {{frontend_output_dir}}
          - **CDN/Edge:** {{cdn_strategy}}

          **Backend Deployment:**
          - **Platform:** {{backend_deploy_platform}}
          - **Build Command:** {{backend_build_command}}
          - **Deployment Method:** {{deployment_method}}
        </section>

        <section id="cicd-pipeline" title="CI/CD Pipeline" status="required">
          ```yaml
          {{cicd_pipeline_config}}
          ```
        </section>

        <section id="environments" title="Environments" status="required">
          | Environment | Frontend URL       | Backend URL        | Purpose                |
          | ----------- | ------------------ | ------------------ | ---------------------- |
          | Development | {{dev_fe_url}}     | {{dev_be_url}}     | Local development      |
          | Staging     | {{staging_fe_url}} | {{staging_be_url}} | Pre-production testing |
          | Production  | {{prod_fe_url}}    | {{prod_be_url}}    | Live environment       |
        </section>
      </sections>
    </section>

    <section id="security-performance" title="Security and Performance" status="required" elicit="true">
      <instruction>
        Define security and performance considerations for the fullstack application.

        <llm><i>Create comprehensive security and performance guidelines</i></llm>
      </instruction>

      <sections>
        <section id="security-requirements" title="Security Requirements" status="required">
          **Frontend Security:**
          - CSP Headers: {{csp_policy}}
          - XSS Prevention: {{xss_strategy}}
          - Secure Storage: {{storage_strategy}}

          **Backend Security:**
          - Input Validation: {{validation_approach}}
          - Rate Limiting: {{rate_limit_config}}
          - CORS Policy: {{cors_config}}

          **Authentication Security:**
          - Token Storage: {{token_strategy}}
          - Session Management: {{session_approach}}
          - Password Policy: {{password_requirements}}
        </section>

        <section id="performance-optimization" title="Performance Optimization" status="required">
          **Frontend Performance:**
          - Bundle Size Target: {{bundle_size}}
          - Loading Strategy: {{loading_approach}}
          - Caching Strategy: {{fe_cache_strategy}}

          **Backend Performance:**
          - Response Time Target: {{response_target}}
          - Database Optimization: {{db_optimization}}
          - Caching Strategy: {{be_cache_strategy}}
        </section>
      </sections>
    </section>

    <section id="testing-strategy" title="Testing Strategy" status="required" elicit="true">
      <instruction>
        Define comprehensive testing approach for fullstack application.

        <llm><i>Create testing pyramid and examples based on chosen technologies</i></llm>
      </instruction>

      <sections>
        <section id="testing-pyramid" title="Testing Pyramid" status="required">
          ```
          E2E Tests
          /        \
          Integration Tests
          /            \
          Frontend Unit  Backend Unit
          ```
        </section>

        <section id="test-organization" title="Test Organization" status="required">
          <sections>
            <section id="frontend-tests" title="Frontend Tests" status="required">
              ```
              {{frontend_test_structure}}
              ```
            </section>

            <section id="backend-tests" title="Backend Tests" status="required">
              ```
              {{backend_test_structure}}
              ```
            </section>

            <section id="e2e-tests" title="E2E Tests" status="required">
              ```
              {{e2e_test_structure}}
              ```
            </section>
          </sections>
        </section>

        <section id="test-examples" title="Test Examples" status="required">
          <sections>
            <section id="frontend-test" title="Frontend Component Test" status="required">
              ```typescript
              {{frontend_test_example}}
              ```
            </section>

            <section id="backend-test" title="Backend API Test" status="required">
              ```typescript
              {{backend_test_example}}
              ```
            </section>

            <section id="e2e-test" title="E2E Test" status="required">
              ```typescript
              {{e2e_test_example}}
              ```
            </section>
          </sections>
        </section>
      </sections>
    </section>

    <section id="coding-standards" title="Coding Standards" status="required" elicit="true" repeatable="true">
      <instruction>
        Define MINIMAL but CRITICAL standards for AI agents. Focus only on project-specific rules that prevent common mistakes. These will be used by dev agents.

        <llm><i>Create concise, actionable coding standards specific to the chosen tech stack</i></llm>
      </instruction>

      <sections>
        <section id="critical-rules" title="Critical Fullstack Rules" status="required">
          - **{{rule_name}}:** {{rule_description}}
        </section>

        <section id="naming-conventions" title="Naming Conventions" status="required">
          | Element         | Frontend             | Backend    | Example             |
          | --------------- | -------------------- | ---------- | ------------------- |
          | Components      | PascalCase           | -          | `UserProfile.tsx`   |
          | Hooks           | camelCase with 'use' | -          | `useAuth.ts`        |
          | API Routes      | -                    | kebab-case | `/api/user-profile` |
          | Database Tables | -                    | snake_case | `user_profiles`     |
        </section>
      </sections>
    </section>

    <section id="error-handling" title="Error Handling Strategy" status="required" elicit="true">
      <instruction>
        Define unified error handling across frontend and backend.

        <llm><i>Create comprehensive error handling strategy with flow diagrams and examples</i></llm>
      </instruction>

      <sections>
        <section id="error-flow" title="Error Flow" status="required">
          ```mermaid
          {{error_flow_diagram}}
          ```
        </section>

        <section id="error-format" title="Error Response Format" status="required">
          ```typescript
          interface ApiError {
            error: {
              code: string;
              message: string;
              details?: Record&lt;string, any&gt;;
              timestamp: string;
              requestId: string;
            };
          }
          ```
        </section>

        <section id="frontend-error-handling" title="Frontend Error Handling" status="required">
          ```typescript
          {{frontend_error_handler}}
          ```
        </section>

        <section id="backend-error-handling" title="Backend Error Handling" status="required">
          ```typescript
          {{backend_error_handler}}
          ```
        </section>
      </sections>
    </section>

    <section id="monitoring" title="Monitoring and Observability" status="required" elicit="true">
      <instruction>
        Define monitoring strategy for fullstack application.

        <llm><i>Create monitoring stack and key metrics based on chosen technologies</i></llm>
      </instruction>

      <sections>
        <section id="monitoring-stack" title="Monitoring Stack" status="required">
          - **Frontend Monitoring:** {{frontend_monitoring}}
          - **Backend Monitoring:** {{backend_monitoring}}
          - **Error Tracking:** {{error_tracking}}
          - **Performance Monitoring:** {{perf_monitoring}}
        </section>

        <section id="key-metrics" title="Key Metrics" status="required">
          **Frontend Metrics:**
          - Core Web Vitals
          - JavaScript errors
          - API response times
          - User interactions

          **Backend Metrics:**
          - Request rate
          - Error rate
          - Response time
          - Database query performance
        </section>
      </sections>
    </section>

    <section id="checklist-results" title="Checklist Results Report" status="required">
      <instruction>
        Before running the checklist, offer to output the full architecture document. Once user confirms, execute the architect-checklist and populate results here.

        <llm><i>Run through architecture completeness checklist and document any gaps or recommendations</i></llm>
      </instruction>
    </section>
  </sections>

  <variables>
    <variable name="architectureFile" default="{project-root}{output-directory}/architecture.md" />
    <variable name="project_name" default="Project Name" />
    <variable name="prdFile" default="{project-root}{output-directory}/project-requirements.md" />
    <variable name="selected_platform" default="" />
    <variable name="core_services_list" default="" />
    <variable name="regions" default="" />
    <variable name="repo_structure_choice" default="" />
    <variable name="monorepo_tool_if_applicable" default="" />
    <variable name="package_strategy" default="" />
  </variables>
</template>
````
