# Simplified Template System - 3-File Architecture

## Overview

A radically simplified template system using just 3 files per template:

1. **Structure file** (`.md`) - Document structure with {{placeholders}}
2. **Instructions file** (`.yaml`) - LLM instructions and workflow
3. **Checklist file** (`-checklist.md`) - Validation checks

## Core Principle

Separation of concerns with maximum simplicity. Each file has one job, does it well, and stays human-readable.

## File Structure

```
templates/
├── prd.md              # Document structure
├── prd.yaml            # Instructions & workflow
└── prd-checklist.md    # Validation checklist
```

## 1. Structure File (`.md`)

Pure markdown with placeholders for dynamic content along with formatting of static content. No instructions, no XML, just clean document structure.

**Example: `prd.md`**

```markdown
# {{project_name}} Product Requirements Document

## Goals and Background Context

### Goals

{{goals}}

### Background Context

{{background_context}}

### Change Log

{{change_log}}

## Requirements

### Functional Requirements

{{functional_requirements}}

### Non-Functional Requirements

{{non_functional_requirements}}

## User Interface Design Goals

{{ui_goals}}

## Technical Requirements

{{technical_requirements}}

## Core User Journeys

{{user_journeys}}

## Out of Scope

{{out_of_scope}}

## Epic List

{{epic_list}}

{{epic_details}}

## Next Steps

{{next_steps}}
```

## 2. Instructions File (`.yaml`)

All LLM instructions, workflow configuration, and variable definitions in clean YAML.

**Example: `prd.yaml`**

```yaml
# <!-- Powered by BMAD™ Core -->
metadata:
  name: Product Requirements Document
  version: 2.0
  output: '{project-root}/{output-directory}/prd.md'

config:
  module: bmm # Load from src/modules/bmm/config.yaml
  inherit_variables: true # Auto-load all variables from config
  variables: # Specific variables to extract (optional)
    - output-directory
    - project-name
    - default-author

inputs:
  suggest:
    - name: project_brief
      path: '{project-root}/{output-directory}/brief.md'
      required: false
      message: 'Do you have a Project Brief document? It provides essential foundation.'
    - name: technical_preferences
      path: '{project-root}/data/technical-preferences.yaml'
      required: false

variables:
  project_name: '{{project-name}}' # Will use config value if available

workflow:
  mode: interactive
  elicitation: true

sections:
  goals:
    instruction: |
      If Project Brief exists, extract goals from it.
      Otherwise, work with user to define 3-7 measurable objectives.
      Format as bullet list of desired outcomes.
    type: bullet-list
    min_items: 3
    max_items: 7
    examples:
      - 'Reduce manual processing time by 80%'
      - 'Enable self-service for 90% of common tasks'

  background_context:
    instruction: |
      Write 1-2 paragraphs summarizing:
      - What problem this solves
      - Why it matters now
      - Current landscape/need
    type: paragraph
    max_length: 300_words

  change_log:
    instruction: 'Initialize change log table'
    type: table
    columns: [Date, Version, Description, Author]
    initial_row: ['{{today}}', '1.0', 'Initial draft', '{{author}}']

  functional_requirements:
    instruction: |
      Create specific, testable requirements.
      Each must directly support stated goals.
    type: numbered-list
    prefix: 'FR'
    template: 'FR{{number}}: {{description}}'
    elicit: true
    validation:
      - must_be_specific
      - must_be_testable
      - must_support_goals

  non_functional_requirements:
    instruction: 'Define performance, security, and operational requirements'
    type: numbered-list
    prefix: 'NFR'
    template: 'NFR{{number}}: {{description}}'

  ui_goals:
    condition: has_ui_components
    instruction: |
      Capture high-level UI/UX vision.
      Focus on product vision, not detailed specs.
    elicit: true
    subsections:
      - ux_vision
      - interaction_paradigms
      - core_screens
      - accessibility
      - branding
      - target_platforms

  technical_requirements:
    instruction: |
      Document technical decisions to guide architecture.
      Check technical_preferences file if provided.
    elicit: true
    choices:
      repository: [Monorepo, Polyrepo]
      architecture: [Monolith, Microservices, Serverless]
      testing: [Unit Only, Unit + Integration, Full Pyramid]

  user_journeys:
    instruction: |
      Map primary user flows from discovery to value delivery.
      Connect to functional requirements (reference FR numbers).
    type: structured
    template: 'Entry Point → Actions → Value → Metrics'

  out_of_scope:
    instruction: |
      Explicitly list what's NOT included in this PRD.
      Help maintain MVP focus.
    type: bullet-list
    template: '{{feature}}: {{why_excluded}}'

  epic_list:
    instruction: |
      Create high-level epic list.
      Each epic = significant, deployable functionality.
      Epic 1 must include foundational infrastructure.
    elicit: true
    type: numbered-list
    template: 'Epic {{number}}: {{title}} - {{one_line_goal}}'

  epic_details:
    instruction: |
      For each epic, create detailed stories with acceptance criteria.
      Stories must be sequential, ~2-4 hour scope for AI agent.
    repeatable: true
    count: '{{epic_count}}'
    template: |
      ## Epic {{number}}: {{title}}

      ### Goal
      {{epic_goal}}

      ### Stories
      {{stories}}
    story_template: |
      #### Story {{epic}}.{{story}}: {{title}}

      As a {{user_type}},
      I want {{action}},
      So that {{benefit}}.

      **Acceptance Criteria:**
      {{acceptance_criteria}}

  next_steps:
    instruction: |
      Define immediate next actions.
      Include prompts for UX Expert and Architect agents.
    subsections:
      - immediate_actions
      - ux_expert_prompt
      - architect_prompt
```

## 3. Checklist File (`-checklist.md`)

Validation checks in simple markdown checkbox format.

**Example: `prd-checklist.md`**

```markdown
# PRD Validation Checklist

## Required Sections

- [ ] Goals section exists with 3-7 measurable objectives
- [ ] Background context provides clear problem statement
- [ ] Functional requirements all have FR identifiers
- [ ] Non-functional requirements all have NFR identifiers
- [ ] Epic list is present and numbered
- [ ] All epics have detailed stories
- [ ] Next steps section includes agent prompts

## Quality Standards

- [ ] Goals are specific and measurable
- [ ] Requirements are testable, not implementation details
- [ ] User stories follow "As a... I want... So that..." format
- [ ] Each story has clear acceptance criteria
- [ ] Stories sized for 2-4 hour AI agent completion

## Logical Flow

- [ ] Epic 1 includes foundational infrastructure
- [ ] Epics follow sequential delivery pattern
- [ ] No story depends on later stories/epics
- [ ] Stories deliver vertical slices of functionality

## Cross-References

- [ ] Technical requirements align with project brief (if exists)
- [ ] User journeys reference FR numbers
- [ ] Out of scope items have clear rationale

## Completeness

- [ ] Change log initialized with current date
- [ ] All {{variables}} have been replaced
- [ ] No placeholder text remains
- [ ] Document is ready for architect review
```

## Workflow Engine

The enhanced `create-doc.md` processes templates as follows:

### Phase 1: Initialization

1. Load the 3 files (structure, instructions, checklist)
2. Create doc at output location direct copy of the base md file
3. Parse YAML instructions (identified by comment header)
4. Load module config.yaml if specified in `config` section
5. Merge config variables with template variables (template overrides config)
6. Check for suggested input documents
7. Gather required variables from user for any missing values

### Phase 2: Content Generation

1. For each placeholder in structure:
   - Find corresponding section in instructions
   - Execute instruction with appropriate engagement
   - Generate content
   - Replace placeholder

### Phase 3: Validation

1. Save completed document
2. Run checklist validations
3. Report any failures
4. Offer fixes for issues

## Implementation Benefits

### Simplicity

- **3 files only** - Easy to understand and maintain
- **Clear separation** - Each file has one purpose
- **No XML mixing** - Instructions never confused with content

### User Experience

- **Readable YAML** - Template creators can easily write instructions
- **Clean markdown** - Structure is immediately apparent
- **Simple checklists** - Validation is transparent

### LLM Performance

- **Clear signals** - Comment headers prevent confusion
- **Native formats** - Markdown and YAML are well-understood
- **Explicit validation** - Checklists ensure quality

## Migration Path

### Converting Existing Templates

1. **Extract structure**: Copy headings to `.md` file, add placeholders
2. **Move instructions**: Convert XML instructions to YAML sections
3. **Create checklist**: Extract validation rules to checkbox format

### Example Migration

**Old format (mixed XML):**

```xml
<section id="goals" elicit="true">
  <instruction>Create 3-7 goals</instruction>
  <content>{{goals}}</content>
</section>
```

**New format:**

Structure (`template.md`):

```markdown
## Goals

{{goals}}
```

Instructions (`template.yaml`):

```yaml
sections:
  goals:
    instruction: Create 3-7 measurable goals
    type: bullet-list
    elicit: true
```

Checklist (`template-checklist.md`):

```markdown
- [ ] Goals section has 3-7 items
- [ ] Goals are measurable
```

## Usage Examples

### Creating a Template

```bash
# Create the 3 files
touch my-template.md
touch my-template.yaml
touch my-template-checklist.md

# Edit each file with your content
# Use the template
bmad create-doc --template my-template
```

### Template Discovery

```bash
# List available templates
bmad list-templates

# Show template details
bmad show-template prd
```

## Technical Specification

### File Naming Convention

- Structure: `{name}.md`
- Instructions: `{name}.yaml`
- Checklist: `{name}-checklist.md`

### YAML Structure

```yaml
# <!-- Powered by BMAD™ Core -->
metadata:
  name: string
  version: string
  output: string

config:
  module: string # Module name (e.g., bmm, cis)
  inherit_variables: bool # Auto-load all config variables
  variables: [] # Specific variables to extract
  fallback: {} # Default values if config missing

inputs:
  suggest: [] # Documents to suggest loading
  require: [] # Required inputs

variables: {} # Variable definitions

workflow: {} # Processing configuration

sections: {} # Section instructions
```

### Placeholder Format

- Simple: `{{variable_name}}`
- With default: `{{variable_name|default_value}}`
- Conditional: `{{?condition:value_if_true:value_if_false}}`

## Success Metrics

1. **Template creation time**: 80% reduction
2. **User errors**: 90% reduction in mixing instructions/content
3. **LLM accuracy**: 95% format adherence
4. **Maintenance time**: 70% faster updates

## Next Steps

1. Build prototype with one template
2. Test with users
3. Convert existing templates
4. Create template builder tool
5. Document best practices

## Conclusion

This 3-file system delivers maximum simplicity with full power. Clean separation, human-readable formats, and clear validation make template creation accessible to everyone while ensuring LLM reliability.
