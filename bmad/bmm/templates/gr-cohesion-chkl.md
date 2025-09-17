<!-- Powered by BMAD-CORE™ -->

# greenfield-cohesion-chkl

```xml
<checklist id="bmad/bmm/templates/gr-cohesion-chkl.md" name="Greenfield Project Cohesion Validation">

  <llm>
    <i>Validate cohesion between PRD, Architecture, and UX (if present)</i>
    <i>Mark items as ✅ PASS, ❌ FAIL, ⚠️ PARTIAL, or N/A</i>
    <i>Skip UI/UX sections if backend-only project</i>
    <i critical="true">This validates BEFORE development - ensure plans align</i>
  </llm>

  <section id="project-setup" name="1. Project Setup and Initialization">
    <desc>Foundation for clean project start</desc>
    <llm>Verify Epic 1 includes all setup before functionality</llm>

    <subsection name="1.1 Project Scaffolding">
      <i>Epic 1 includes explicit steps for project creation/initialization</i>
      <i>If using starter template, steps for cloning/setup are included</i>
      <i>If building from scratch, all scaffolding steps are defined</i>
      <i>Initial README or documentation setup is included</i>
      <i>Repository setup and initial commit processes are defined</i>
    </subsection>

    <subsection name="1.2 Development Environment">
      <i>Local development environment setup clearly defined</i>
      <i>Required tools and versions specified</i>
      <i>Steps for installing dependencies included</i>
      <i>Configuration files addressed appropriately</i>
      <i>Development server setup included</i>
    </subsection>

    <subsection name="1.3 Core Dependencies">
      <i>All critical packages/libraries installed early</i>
      <i>Package management properly addressed</i>
      <i>Version specifications appropriately defined</i>
      <i>Dependency conflicts or special requirements noted</i>
    </subsection>
  </section>

  <section id="infrastructure" name="2. Infrastructure and Deployment">
    <desc>Infrastructure exists before use</desc>
    <llm>Check that setup precedes usage in stories</llm>

    <subsection name="2.1 Database and Data Store">
      <i>Database selection/setup occurs before any operations</i>
      <i>Schema definitions created before data operations</i>
      <i>Migration strategies defined if applicable</i>
      <i>Seed data or initial data setup included if needed</i>
    </subsection>

    <subsection name="2.2 API and Service Configuration">
      <i>API frameworks set up before implementing endpoints</i>
      <i>Service architecture established before implementing services</i>
      <i>Authentication framework set up before protected routes</i>
      <i>Middleware and common utilities created before use</i>
    </subsection>

    <subsection name="2.3 Deployment Pipeline">
      <i>CI/CD pipeline established before deployment actions</i>
      <i>Infrastructure as Code set up before use</i>
      <i>Environment configurations defined early</i>
      <i>Deployment strategies defined before implementation</i>
    </subsection>

    <subsection name="2.4 Testing Infrastructure">
      <i>Testing frameworks installed before writing tests</i>
      <i>Test environment setup precedes test implementation</i>
      <i>Mock services or data defined before testing</i>
    </subsection>
  </section>

  <section id="external-deps" name="3. External Dependencies and Integrations">
    <desc>External dependencies often block progress</desc>
    <llm>Ensure accounts/keys obtained before usage</llm>

    <subsection name="3.1 Third-Party Services">
      <i>Account creation steps identified for required services</i>
      <i>API key acquisition processes defined</i>
      <i>Steps for securely storing credentials included</i>
      <i>Fallback or offline development options considered</i>
    </subsection>

    <subsection name="3.2 External APIs">
      <i>Integration points with external APIs clearly identified</i>
      <i>Authentication with external services properly sequenced</i>
      <i>API limits or constraints acknowledged</i>
      <i>Backup strategies for API failures considered</i>
    </subsection>

    <subsection name="3.3 Infrastructure Services">
      <i>Cloud resource provisioning properly sequenced</i>
      <i>DNS or domain registration needs identified</i>
      <i>Email or messaging service setup included if needed</i>
      <i>CDN or static asset hosting setup precedes use</i>
    </subsection>
  </section>

  <section id="ui-ux" name="4. UI/UX Considerations">
    <desc>Frontend infrastructure and design alignment</desc>
    <llm>Skip entire section if backend-only project</llm>

    <subsection name="4.1 Design System Setup">
      <i>UI framework and libraries selected and installed early</i>
      <i>Design system or component library established</i>
      <i>Styling approach defined (CSS modules, styled-components, etc.)</i>
      <i>Responsive design strategy established</i>
      <i>Accessibility requirements defined upfront</i>
    </subsection>

    <subsection name="4.2 Frontend Infrastructure">
      <i>Frontend build pipeline configured before development</i>
      <i>Asset optimization strategy defined</i>
      <i>Frontend testing framework set up</i>
      <i>Component development workflow established</i>
    </subsection>

    <subsection name="4.3 User Experience Flow">
      <i>User journeys mapped before implementation</i>
      <i>Navigation patterns defined early</i>
      <i>Error states and loading states planned</i>
      <i>Form validation patterns established</i>
    </subsection>
  </section>

  <section id="responsibility" name="5. User/Agent Responsibility">
    <desc>Clear ownership prevents confusion</desc>
    <llm>Ensure human-only tasks assigned to users</llm>

    <subsection name="5.1 User Actions">
      <i>User responsibilities limited to human-only tasks</i>
      <i>Account creation on external services assigned to users</i>
      <i>Purchasing or payment actions assigned to users</i>
      <i>Credential provision appropriately assigned to users</i>
    </subsection>

    <subsection name="5.2 Developer Agent Actions">
      <i>All code-related tasks assigned to developer agents</i>
      <i>Automated processes identified as agent responsibilities</i>
      <i>Configuration management properly assigned</i>
      <i>Testing and validation assigned to appropriate agents</i>
    </subsection>
  </section>

  <section id="dependencies" name="6. Feature Sequencing and Dependencies">
    <desc>Dependencies create the critical path</desc>
    <llm critical="true">Wrong sequencing causes development blockage</llm>

    <subsection name="6.1 Functional Dependencies">
      <i>Features depending on others sequenced correctly</i>
      <i>Shared components built before their use</i>
      <i>User flows follow logical progression</i>
      <i>Authentication features precede protected features</i>
    </subsection>

    <subsection name="6.2 Technical Dependencies">
      <i>Lower-level services built before higher-level ones</i>
      <i>Libraries and utilities created before their use</i>
      <i>Data models defined before operations on them</i>
      <i>API endpoints defined before client consumption</i>
    </subsection>

    <subsection name="6.3 Cross-Epic Dependencies">
      <i>Later epics build upon earlier epic functionality</i>
      <i>No epic requires functionality from later epics</i>
      <i>Infrastructure from early epics utilized consistently</i>
      <i>Incremental value delivery maintained</i>
    </subsection>
  </section>

  <section id="mvp-scope" name="7. MVP Scope Alignment">
    <desc>MVP means MINIMUM viable product</desc>
    <llm>Challenge any scope creep or over-engineering</llm>

    <subsection name="7.1 Core Goals Alignment">
      <i>All core goals from PRD addressed</i>
      <i>Features directly support MVP goals</i>
      <i>No extraneous features beyond MVP scope</i>
      <i>Critical features prioritized appropriately</i>
    </subsection>

    <subsection name="7.2 User Journey Completeness">
      <i>All critical user journeys fully implemented</i>
      <i>Edge cases and error scenarios addressed</i>
      <i>User experience considerations included</i>
      <i>Accessibility requirements incorporated (if UI)</i>
    </subsection>

    <subsection name="7.3 Technical Requirements">
      <i>All technical constraints from PRD addressed</i>
      <i>Non-functional requirements incorporated</i>
      <i>Architecture decisions align with constraints</i>
      <i>Performance considerations addressed</i>
    </subsection>
  </section>

  <section id="alignment" name="8. Architecture-PRD Alignment">
    <desc>Technical solution matches business requirements</desc>
    <llm critical="true">Architecture must solve PRD problems, not create new ones</llm>

    <subsection name="8.1 Requirement Coverage">
      <i>Every PRD functional requirement has technical solution</i>
      <i>Non-functional requirements have specific implementations</i>
      <i>Architecture supports all user stories</i>
      <i>Edge cases from PRD addressed in architecture</i>
    </subsection>

    <subsection name="8.2 Technology Choices">
      <i>Tech stack aligns with PRD constraints</i>
      <i>Architecture respects technical preferences</i>
      <i>Performance requirements achievable with chosen stack</i>
      <i>Scalability approach matches growth expectations</i>
    </subsection>

    <subsection name="8.3 Epic-Architecture Mapping">
      <i>Each epic has clear architectural components</i>
      <i>Story implementation paths technically clear</i>
      <i>No architectural gaps for planned features</i>
      <i>Testing approach defined for all components</i>
    </subsection>
  </section>

  <section id="documentation" name="9. Documentation and Handoff">
    <desc>Good documentation enables smooth development</desc>
    <llm>Check for clarity - could a new developer understand?</llm>

    <subsection name="9.1 Developer Documentation">
      <i>API documentation created alongside implementation</i>
      <i>Setup instructions comprehensive</i>
      <i>Architecture decisions documented</i>
      <i>Patterns and conventions documented</i>
    </subsection>

    <subsection name="9.2 User Documentation">
      <i>User guides or help documentation included if required</i>
      <i>Error messages and user feedback considered</i>
      <i>Onboarding flows fully specified</i>
    </subsection>
  </section>

  <section id="future" name="10. Post-MVP Considerations">
    <desc>Planning for success prevents technical debt</desc>
    <llm>Ensure MVP doesn't paint us into a corner</llm>

    <subsection name="10.1 Future Enhancements">
      <i>Clear separation between MVP and future features</i>
      <i>Architecture supports planned enhancements</i>
      <i>Technical debt considerations documented</i>
      <i>Extensibility points identified</i>
    </subsection>

    <subsection name="10.2 Monitoring and Feedback">
      <i>Analytics or usage tracking included if required</i>
      <i>User feedback collection considered</i>
      <i>Monitoring and alerting addressed</i>
      <i>Performance measurement incorporated</i>
    </subsection>
  </section>

  <summary>
    <title>Greenfield Cohesion Validation Summary</title>
    <report>
      <overall-status>Calculate percentage complete</overall-status>
      <readiness>Ready for Development | Needs Alignment</readiness>
      <critical-gaps>List any blocking misalignments</critical-gaps>
      <recommendations>Specific actions to improve cohesion</recommendations>
    </report>
  </summary>
</checklist>
```
