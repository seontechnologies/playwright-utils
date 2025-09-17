# PRD Validation Checklist

## Document Completeness

- [ ] All required sections are present
- [ ] Goals section contains 3-7 measurable objectives
- [ ] Background context provides clear problem statement (1-2 paragraphs)
- [ ] Change log table initialized with creation entry
- [ ] Functional requirements section populated
- [ ] Non-functional requirements section populated
- [ ] Epic list is present and numbered
- [ ] All epics have detailed stories with acceptance criteria
- [ ] Next steps section includes appropriate agent prompts

## Requirements Quality

- [ ] Each functional requirement has unique FR identifier (FR1, FR2, etc.)
- [ ] Each non-functional requirement has unique NFR identifier
- [ ] Requirements are specific and testable
- [ ] Requirements directly support stated goals
- [ ] No technical implementation details in functional requirements
- [ ] Requirements are achievable within project scope

## Epic and Story Structure

- [ ] Epic 1 includes foundational project infrastructure
- [ ] Epics follow logical sequential delivery pattern
- [ ] Each epic delivers significant, deployable functionality
- [ ] User stories follow "As a... I want... So that..." format
- [ ] All stories have clear, testable acceptance criteria
- [ ] Stories are sized for 2-4 hour AI agent completion
- [ ] No story depends on work from later stories or epics
- [ ] Each story represents a vertical slice of functionality
- [ ] Prerequisites clearly identified where applicable

## UI/UX Requirements (if applicable)

- [ ] UX vision clearly articulated
- [ ] Core screens and views identified
- [ ] Accessibility requirements specified (None/WCAG AA/WCAG AAA)
- [ ] Target platforms defined
- [ ] Branding guidelines documented (if any)
- [ ] Interaction paradigms described

## Technical Requirements

- [ ] Technical requirements documented with TR identifiers
- [ ] Technical choices include rationale
- [ ] Repository structure decision documented
- [ ] Service architecture approach defined
- [ ] Testing requirements specified
- [ ] Alignment with technical preferences file (if provided)

## User Journeys

- [ ] Primary user journey mapped from entry to value delivery
- [ ] Journey steps reference functional requirements (FR numbers)
- [ ] Critical decision points identified
- [ ] Success metrics defined for journey stages
- [ ] Journey insights inform epic sequencing

## Cross-References and Consistency

- [ ] Technical assumptions align with project brief (if exists)
- [ ] User journeys connect to functional requirements
- [ ] Out of scope items have clear rationale
- [ ] Epic count matches between list and details sections
- [ ] Story numbering is consistent (Epic.Story format)

## Quality Standards

- [ ] Goals are specific, measurable, and achievable
- [ ] Document uses consistent terminology throughout
- [ ] No placeholder text remains (all {{variables}} replaced)
- [ ] Cross-cutting concerns integrated throughout epics (not isolated)
- [ ] MVP focus maintained (out of scope clearly defined)

## Readiness for Next Phase

- [ ] Document ready for UX Expert review (if UI components exist)
- [ ] Document ready for Architect review
- [ ] Sufficient detail for AI agent story implementation
- [ ] Clear handoff prompts for next agents provided

## Final Validation

- [ ] All sections reviewed by stakeholder
- [ ] Document version and date current
- [ ] Author information complete
- [ ] File saved in correct location ({project-root}/{output-directory}/prd.md)
