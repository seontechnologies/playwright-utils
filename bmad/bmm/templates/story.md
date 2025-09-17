<!-- Powered by BMAD-CORE™ -->

# User Story

```xml
<template id="bmad/bmm/templates/story.md" name="User Story" filename="{project-root}{output-directory}/stories/{{epic_num}}.{{story_num}}.{{story_title_short}}.md">

  <title>Story {{epic_num}}.{{story_num}}: {{story_title_short}}</title>

  <agent_config>
    <editable_sections>
      - Status
      - Story
      - Acceptance Criteria
      - Tasks / Subtasks
      - Dev Notes
      - Testing
      - Change Log
    </editable_sections>
  </agent_config>

  <sections>
    <section id="status" title="Status" status="required">
      <instruction>
        Select the current status of the story
      </instruction>
      <type>choice</type>
      <choices>[Draft, Approved, InProgress, Review, Done]</choices>
      <owner>scrum-master</owner>
      <editors>[scrum-master, dev-agent]</editors>
    </section>

    <section id="story" title="Story" status="required" elicit="true">
      <instruction>
        Define the user story using the standard format with role, action, and benefit
      </instruction>
      <type>template-text</type>
      <template id="modules/bmm/templates/story">
        **As a** {{role}},
        **I want** {{action}},
        **so that** {{benefit}}
      </template>
      <owner>scrum-master</owner>
      <editors>[scrum-master]</editors>
    </section>

    <section id="acceptance-criteria" title="Acceptance Criteria" status="required" elicit="true">
      <instruction>
        Copy the acceptance criteria numbered list from the epic file
      </instruction>
      <type>numbered-list</type>
      <owner>scrum-master</owner>
      <editors>[scrum-master]</editors>
    </section>

    <section id="tasks-subtasks" title="Tasks / Subtasks" status="required" elicit="true">
      <instruction>
        Break down the story into specific granular needed for implementation.
        Reference applicable acceptance criteria numbers where relevant.
      </instruction>
      <type>bullet-list</type>
      <template id="modules/bmm/templates/story">
        - [ ] Task 1 (AC: # if applicable)
        - [ ] Task 2 (AC: # if applicable)
        - [ ] Task 3 (AC: # if applicable)
      </template>
      <owner>scrum-master</owner>
      <editors>[scrum-master, dev-agent]</editors>
    </section>

    <section id="dev-notes" title="Dev Notes" status="required" elicit="true">
      <instruction>
        Populate relevant information, only what was pulled from actual artifacts from docs folder, relevant to this story:
        - Do not invent information
        - If known add Relevant Source Tree info that relates to this story
        - If there were important notes from previous story that are relevant to this one, include them here
        - Put enough information in this section so that the dev agent should NEVER need to read the architecture documents, these notes along with the tasks and subtasks must give the Dev Agent the complete context it needs to comprehend with the least amount of overhead the information to complete the story, meeting all AC and completing all tasks+subtasks
      </instruction>
      <owner>scrum-master</owner>
      <editors>[scrum-master]</editors>

      <sections>
        <section id="testing-standards" title="Testing" status="required" elicit="true">
          <instruction>
            List Relevant Testing Standards from Architecture the Developer needs to conform to:
            - Test file location
            - Test standards
            - Testing frameworks and patterns to use
            - Any specific testing requirements for this story
          </instruction>
          <owner>scrum-master</owner>
          <editors>[scrum-master]</editors>
        </section>
      </sections>
    </section>

    <section id="change-log" title="Change Log" status="required">
      <instruction>
        Track changes made to this story document
      </instruction>
      <type>table</type>
      <columns>[Date, Version, Description, Author]</columns>
      <owner>scrum-master</owner>
      <editors>[scrum-master, dev-agent, qa-agent]</editors>
    </section>

    <section id="dev-agent-record" title="Dev Agent Record" status="required">
      <instruction>
        This section is populated by the development agent during implementation
      </instruction>
      <owner>dev-agent</owner>
      <editors>[dev-agent]</editors>

      <sections>
        <section id="agent-model" title="Agent Model Used" status="required">
          <instruction>
            Record the specific AI agent model and version used for development
          </instruction>
          <template id="modules/bmm/templates/story">{{agent_model_name_version}}</template>
          <owner>dev-agent</owner>
          <editors>[dev-agent]</editors>
        </section>

        <section id="debug-log-references" title="Debug Log References" status="optional">
          <instruction>
            Reference any debug logs or traces generated during development
          </instruction>
          <owner>dev-agent</owner>
          <editors>[dev-agent]</editors>
        </section>

        <section id="completion-notes" title="Completion Notes List" status="required">
          <instruction>
            Notes about the completion of tasks and any issues encountered
          </instruction>
          <owner>dev-agent</owner>
          <editors>[dev-agent]</editors>
        </section>

        <section id="file-list" title="File List" status="required">
          <instruction>
            List all files created, modified, or affected during story implementation
          </instruction>
          <owner>dev-agent</owner>
          <editors>[dev-agent]</editors>
        </section>
      </sections>
    </section>

    <section id="qa-results" title="TEA Results" status="optional">
      <instruction>
        Results from QA Agent QA review of the completed story implementation
      </instruction>
      <owner>qa-agent</owner>
      <editors>[qa-agent]</editors>
    </section>
  </sections>
</template>
```
