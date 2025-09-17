<!-- Powered by BMAD-CORE™ -->

# uxui-spec

````xml
<template id="bmad/bmm/templates/uxui-spec.md" name="UX/UI Specification" filename="{project-root}{output-directory}/front-end-spec.md">

  <title>{{project_name}} UI/UX Specification</title>

  <sections>
    <section id="introduction" title="Introduction" status="required">
      <instruction>
        Review provided documents including Project Brief, PRD, and any user research to gather context. Focus on understanding user needs, pain points, and desired outcomes before beginning the specification.

        This document defines the user experience goals, information architecture, user flows, and visual design specifications for {{project_name}}'s user interface. It serves as the foundation for visual design and frontend development, ensuring a cohesive and user-centered experience.

        <llm><i>Review PRD and any user research to understand context before proceeding</i></llm>
      </instruction>

      <sections>
        <section id="ux-goals-principles" title="Overall UX Goals &amp; Principles" status="required" elicit="true">
          <instruction>
            Work with the user to establish and document the following. If not already defined, facilitate a discussion to determine:

            1. Target User Personas - elicit details or confirm existing ones from PRD
            2. Key Usability Goals - understand what success looks like for users
            3. Core Design Principles - establish 3-5 guiding principles

            <llm><i>Extract from PRD if available, otherwise elicit from user</i></llm>
          </instruction>

          <sections>
            <section id="user-personas" title="Target User Personas" status="required">
              <instruction>
                Document target user personas:

                Examples:
                - **Power User:** Technical professionals who need advanced features and efficiency
                - **Casual User:** Occasional users who prioritize ease of use and clear guidance
                - **Administrator:** System managers who need control and oversight capabilities
              </instruction>
            </section>

            <section id="usability-goals" title="Usability Goals" status="required">
              <instruction>
                Define key usability goals:

                Examples:
                - Ease of learning: New users can complete core tasks within 5 minutes
                - Efficiency of use: Power users can complete frequent tasks with minimal clicks
                - Error prevention: Clear validation and confirmation for destructive actions
                - Memorability: Infrequent users can return without relearning
              </instruction>
            </section>

            <section id="design-principles" title="Design Principles" status="required">
              <instruction>
                Establish 3-5 core design principles:

                Examples:
                1. **Clarity over cleverness** - Prioritize clear communication over aesthetic innovation
                2. **Progressive disclosure** - Show only what's needed, when it's needed
                3. **Consistent patterns** - Use familiar UI patterns throughout the application
                4. **Immediate feedback** - Every action should have a clear, immediate response
                5. **Accessible by default** - Design for all users from the start
              </instruction>
            </section>
          </sections>
        </section>

        <section id="changelog" title="Change Log" status="optional">
          <instruction>
            Track document versions:
            | Date | Version | Description | Author |
            | ---- | ------- | ----------- | ------ |
          </instruction>
        </section>
      </sections>
    </section>

    <section id="information-architecture" title="Information Architecture (IA)" status="required" elicit="true">
      <instruction>
        Collaborate with the user to create a comprehensive information architecture:

        1. Build a Site Map or Screen Inventory showing all major areas
        2. Define the Navigation Structure (primary, secondary, breadcrumbs)
        3. Use Mermaid diagrams for visual representation
        4. Consider user mental models and expected groupings

        <llm><i>Create clear IA based on project requirements</i></llm>
      </instruction>

      <sections>
        <section id="sitemap" title="Site Map / Screen Inventory" status="required">
          <instruction>
            Create a site map using Mermaid diagram:

            ```mermaid
            graph TD
                A[Homepage] --> B[Dashboard]
                A --> C[Products]
                A --> D[Account]
                B --> B1[Analytics]
                B --> B2[Recent Activity]
                C --> C1[Browse]
                C --> C2[Search]
                C --> C3[Product Details]
                D --> D1[Profile]
                D --> D2[Settings]
                D --> D3[Billing]
            ```
          </instruction>
        </section>

        <section id="navigation-structure" title="Navigation Structure" status="required">
          <instruction>
            Define navigation approach:

            **Primary Navigation:** [Description of main navigation]

            **Secondary Navigation:** [Description of secondary navigation]

            **Breadcrumb Strategy:** [How breadcrumbs will work]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="user-flows" title="User Flows" status="required" elicit="true" repeatable="true">
      <instruction>
        For each critical user task identified in the PRD:

        1. Define the user's goal clearly
        2. Map out all steps including decision points
        3. Consider edge cases and error states
        4. Use Mermaid flow diagrams for clarity
        5. Link to external tools (Figma/Miro) if detailed flows exist there

        Create subsections for each major flow.

        <llm><i>Create flows for each major user task from PRD</i></llm>
      </instruction>

      <sections>
        <section id="flow" title="Flow: [Flow Name]" status="required">
          <instruction>
            **User Goal:** [What the user wants to achieve]

            **Entry Points:** [Where users start this flow]

            **Success Criteria:** [How we know the user succeeded]
          </instruction>

          <sections>
            <section id="flow-diagram" title="Flow Diagram" status="required">
              <instruction>
                Create flow diagram using Mermaid:

                ```mermaid
                graph TD
                    Start[User starts] --> Action1[First action]
                    Action1 --> Decision{Decision point}
                    Decision -->|Yes| Success[Success state]
                    Decision -->|No| Alternative[Alternative path]
                ```
              </instruction>
            </section>

            <section id="edge-cases" title="Edge Cases &amp; Error Handling" status="required">
              <instruction>
                List edge cases and error handling:
                - [Edge case 1]
                - [Edge case 2]
                - [Error scenario and handling]
              </instruction>
            </section>

            <section id="notes" title="Notes" status="optional">
              <instruction>
                Additional notes about this flow.
              </instruction>
            </section>
          </sections>
        </section>
      </sections>
    </section>

    <section id="wireframes-mockups" title="Wireframes &amp; Mockups" status="optional" elicit="true">
      <instruction>
        Clarify where detailed visual designs will be created (Figma, Sketch, etc.) and how to reference them. If low-fidelity wireframes are needed, offer to help conceptualize layouts for key screens.

        <llm><i>Document design file locations and key screen concepts</i></llm>
      </instruction>

      <sections>
        <section id="design-files" title="Design Files" status="required">
          <instruction>
            **Primary Design Files:** [Link to Figma/Sketch/etc.]
          </instruction>
        </section>

        <section id="key-screen-layouts" title="Key Screen Layouts" status="optional" repeatable="true">
          <instruction>
            For each key screen:

            **Screen Name:** [Name]
            **Purpose:** [What this screen does]

            **Key Elements:**
            - [Element 1]
            - [Element 2]
            - [Element 3]

            **Interaction Notes:** [How users interact]

            **Design File Reference:** [Link to specific frame]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="component-library" title="Component Library / Design System" status="required" elicit="true">
      <instruction>
        Discuss whether to use an existing design system or create a new one. If creating new, identify foundational components and their key states. Note that detailed technical specs belong in front-end-architecture.

        <llm><i>Define approach to component library and core components</i></llm>
      </instruction>

      <sections>
        <section id="design-system-approach" title="Design System Approach" status="required">
          <instruction>
            **Design System Approach:** [Use existing system like Material UI, create custom, or hybrid approach]
          </instruction>
        </section>

        <section id="core-components" title="Core Components" status="required" repeatable="true">
          <instruction>
            For each core component:

            **Component Name:** [Name]
            **Purpose:** [What it's used for]

            **Variants:** [Different versions/styles]

            **States:** [Default, hover, active, disabled, etc.]

            **Usage Guidelines:** [When and how to use]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="branding-style" title="Branding &amp; Style Guide" status="required" elicit="true">
      <instruction>
        Link to existing style guide or define key brand elements. Ensure consistency with company brand guidelines if they exist.

        <llm><i>Define visual identity and style elements</i></llm>
      </instruction>

      <sections>
        <section id="visual-identity" title="Visual Identity" status="optional">
          <instruction>
            **Brand Guidelines:** [Link to existing brand guidelines if available]
          </instruction>
        </section>

        <section id="color-palette" title="Color Palette" status="required">
          <instruction>
            Define color palette:

            | Color Type | Hex Code | Usage                            |
            | ---------- | -------- | -------------------------------- |
            | Primary    | #0066CC  | Main brand color, CTAs           |
            | Secondary  | #6B7280  | Supporting elements              |
            | Accent     | #10B981  | Highlights, special states       |
            | Success    | #059669  | Positive feedback, confirmations |
            | Warning    | #D97706  | Cautions, important notices      |
            | Error      | #DC2626  | Errors, destructive actions      |
            | Neutral    | #F3F4F6  | Text, borders, backgrounds       |
          </instruction>
        </section>

        <section id="typography" title="Typography" status="required">
          <instruction>
            Define typography system.
          </instruction>

          <sections>
            <section id="font-families" title="Font Families" status="required">
              <instruction>
                - **Primary:** [e.g., Inter, system-ui]
                - **Secondary:** [e.g., Georgia, serif]
                - **Monospace:** [e.g., Monaco, monospace]
              </instruction>
            </section>

            <section id="type-scale" title="Type Scale" status="required">
              <instruction>
                | Element | Size | Weight | Line Height |
                | ------- | ---- | ------ | ----------- |
                | H1      | 32px | 700    | 1.2         |
                | H2      | 24px | 600    | 1.3         |
                | H3      | 20px | 600    | 1.4         |
                | Body    | 16px | 400    | 1.5         |
                | Small   | 14px | 400    | 1.4         |
              </instruction>
            </section>
          </sections>
        </section>

        <section id="iconography" title="Iconography" status="optional">
          <instruction>
            **Icon Library:** [e.g., Heroicons, Material Icons]

            **Usage Guidelines:** [How to use icons consistently]
          </instruction>
        </section>

        <section id="spacing-layout" title="Spacing &amp; Layout" status="required">
          <instruction>
            **Grid System:** [e.g., 12-column grid, 8px base unit]

            **Spacing Scale:** [e.g., 4, 8, 12, 16, 24, 32, 48, 64px]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="accessibility" title="Accessibility Requirements" status="required" elicit="true">
      <instruction>
        Define specific accessibility requirements based on target compliance level and user needs. Be comprehensive but practical.

        <llm><i>Define accessibility standards and requirements</i></llm>
      </instruction>

      <sections>
        <section id="compliance-target" title="Compliance Target" status="required">
          <instruction>
            **Standard:** [e.g., WCAG 2.1 AA]
          </instruction>
        </section>

        <section id="key-requirements" title="Key Requirements" status="required">
          <instruction>
            **Visual:**
            - Color contrast ratios: [e.g., 4.5:1 for normal text, 3:1 for large text]
            - Focus indicators: [Visible focus states for all interactive elements]
            - Text sizing: [Minimum 16px, user scalable]

            **Interaction:**
            - Keyboard navigation: [All functionality keyboard accessible]
            - Screen reader support: [Proper ARIA labels and semantic HTML]
            - Touch targets: [Minimum 44x44px]

            **Content:**
            - Alternative text: [All images have descriptive alt text]
            - Heading structure: [Logical heading hierarchy]
            - Form labels: [All inputs have associated labels]
          </instruction>
        </section>

        <section id="testing-strategy" title="Testing Strategy" status="optional">
          <instruction>
            How accessibility will be tested and validated.
          </instruction>
        </section>
      </sections>
    </section>

    <section id="responsiveness" title="Responsiveness Strategy" status="required" elicit="true">
      <instruction>
        Define breakpoints and adaptation strategies for different device sizes. Consider both technical constraints and user contexts.

        <llm><i>Define responsive design approach</i></llm>
      </instruction>

      <sections>
        <section id="breakpoints" title="Breakpoints" status="required">
          <instruction>
            | Breakpoint | Min Width | Max Width | Target Devices         |
            | ---------- | --------- | --------- | ---------------------- |
            | Mobile     | 320px     | 767px     | Phones                 |
            | Tablet     | 768px     | 1023px    | Tablets, small laptops |
            | Desktop    | 1024px    | 1439px    | Laptops, desktops      |
            | Wide       | 1440px    | -         | Large monitors         |
          </instruction>
        </section>

        <section id="adaptation-patterns" title="Adaptation Patterns" status="required">
          <instruction>
            **Layout Changes:** [How layouts adapt across breakpoints]

            **Navigation Changes:** [Mobile menu vs desktop navigation]

            **Content Priority:** [What shows/hides at different sizes]

            **Interaction Changes:** [Touch vs mouse interactions]
          </instruction>
        </section>
      </sections>
    </section>

    <section id="animation" title="Animation &amp; Micro-interactions" status="optional" elicit="true">
      <instruction>
        Define motion design principles and key interactions. Keep performance and accessibility in mind.

        <llm><i>Define animation approach if applicable</i></llm>
      </instruction>

      <sections>
        <section id="motion-principles" title="Motion Principles" status="required">
          <instruction>
            Define principles for motion and animation in the UI.
          </instruction>
        </section>

        <section id="key-animations" title="Key Animations" status="optional" repeatable="true">
          <instruction>
            - **[Animation name]:** [Description] (Duration: [time], Easing: [function])
          </instruction>
        </section>
      </sections>
    </section>

    <section id="performance" title="Performance Considerations" status="optional">
      <instruction>
        Define performance goals and strategies that impact UX design decisions.
      </instruction>

      <sections>
        <section id="performance-goals" title="Performance Goals" status="required">
          <instruction>
            - **Page Load:** [e.g., &lt; 3 seconds on 3G]
            - **Interaction Response:** [e.g., &lt; 100ms for user input]
            - **Animation FPS:** [e.g., 60 FPS for smooth animations]
          </instruction>
        </section>

        <section id="design-strategies" title="Design Strategies" status="required">
          <instruction>
            Strategies to achieve performance goals through design decisions.
          </instruction>
        </section>
      </sections>
    </section>

    <section id="next-steps" title="Next Steps" status="required">
      <instruction>
        After completing the UI/UX specification:

        1. Recommend review with stakeholders
        2. Suggest creating/updating visual designs in design tool
        3. Prepare for handoff to Design Architect for frontend architecture
        4. Note any open questions or decisions needed
      </instruction>

      <sections>
        <section id="immediate-actions" title="Immediate Actions" status="required">
          <instruction>
            1. [Action 1]
            2. [Action 2]
            3. [Action 3]
          </instruction>
        </section>

        <section id="design-handoff-checklist" title="Design Handoff Checklist" status="required">
          <instruction>
            - [ ] All user flows documented
            - [ ] Component inventory complete
            - [ ] Accessibility requirements defined
            - [ ] Responsive strategy clear
            - [ ] Brand guidelines incorporated
            - [ ] Performance goals established
          </instruction>
        </section>
      </sections>
    </section>

    <section id="checklist-results" title="Checklist Results" status="optional">
      <instruction>
        If a UI/UX checklist exists, run it against this document and report results here.

        <llm><i>Run checklist if available</i></llm>
      </instruction>
    </section>
  </sections>

  <variables>
    <variable name="project_name" default="Project Name" />
  </variables>
</template>
````
