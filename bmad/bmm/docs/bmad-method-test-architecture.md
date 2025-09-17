# BMad Method Advanced Test Framework

## The Test Architect (QA Agent)

### Overview

The TEA agent in the BMad Method is not just a "senior developer reviewer" - it's a **Test Architect** with deep expertise in test strategy, quality gates, and risk-based testing. Named Murat, this agent provides advisory authority on quality matters while actively improving code when safe to do so.

#### Quick Start (Essential Commands)

```bash
# Setup & Implementation (NEW in V5)
@tea *framework          # One-time test framework setup
@tea *tdd {story}        # Write acceptance tests first, drive implementation
@tea *automate {story}   # Generate tests following Murat's patterns
@tea *ci                 # Setup CI/CD with 20x optimizations

# Architecture & Planning
@tea *risk {story}       # Assess risks before development
@tea *design {story}     # Create test strategy
@tea *trace {story}      # Verify test coverage during dev

# Review & Quality Gates
@tea *nfr {story}        # Check quality attributes
@tea *review {story}     # Full assessment → writes gate
@tea *gate {story}       # Update gate decision
```

#### Command Aliases (Test Architect)

The documentation uses short forms for convenience. Both styles are valid:

```text
# New Commands (V5)
*framework → Initialize test architecture (one-time setup)
*tdd      → Acceptance Test-Driven Development
*automate → Generate comprehensive test automation
*ci       → Setup optimized CI/CD pipeline

# Existing Commands
*risk     → *risk-profile
*design   → *test-design
*nfr      → *nfr-assess
*trace    → *trace-requirements (or just *trace)
*review   → *review
*gate     → *gate
```

### Core Capabilities

#### NEW V5 Commands - Murat's Testing Philosophy

##### 1. Test Framework Setup (`*framework`)

**When:** Once at project start (one-time setup)

Creates production-ready test architecture:

- Functional helper pattern (no Page Objects)
- Fixture composition with mergeTests (Playwright) or custom commands (Cypress)
- Environment-based configurations (local, dev, staging, production)
- Co-located test structure where possible (lower level tests live near source code, e2e or Pact can live in a separate directory)
- Example tests demonstrating all patterns
- 1:1 parity between local and CI testing developer experience.

##### 2. Acceptance Test-Driven Development (optional) (`*tdd`)

**When:** Before implementation begins (write tests first)

Drives implementation through acceptance tests:

- Write failing E2E/API tests that define requirements
- Tests become the acceptance criteria
- Collaborate with dev agent/AI to implement code that satisfies tests
- "In the AI era, E2E tests reign supreme as ultimate acceptance criteria"
- Supports significant source code changes to satisfy higher-level tests

##### 3. Test Automation (`*automate`)

**When:** After feature implementation or for existing code

Generates comprehensive test suites:

- Checks story/epic context first (collaborates with dev agent)
- Follows functional helper pattern exclusively
- Creates factory-based test data (no hardcoded fixtures)
- Network-first interception strategy
- Self-cleaning, parallelizable tests
- Tests at lowest level that still maintains release confidence: unit < component < integration < ui-integration (network stubbed e2e) < true e2e. Refer to [List of Test Methodologies](https://dev.to/muratkeremozcan/mostly-incomplete-list-of-test-methodologies-52no) and [Consumer-Driven Contract Testing](https://dev.to/muratkeremozcan/my-thoughts-and-notes-about-consumer-driven-contract-testing-11id) for microservices and cross-service testing.

##### 4. CI/CD Pipeline Setup (`*ci`)

**When:** After test framework is established

Creates optimized CI/CD pipeline:

- Speed improvements through parallel execution
- Burn-in testing (10x runs) for changed files to ensure order independent, stateless tests.
- Smart caching strategies
- 1:1 parity: local = CI developer experience
- Works identically across all deployments (dev, stage, prod)
- Environment variables control target, not behavior

#### Test Architecture

##### 5. Risk Profiling (`*risk`)

**When:** After story draft, before development begins (earliest intervention point)

Identifies and assesses implementation risks:

- **Categories**: Technical, Security, Performance, Data, Business, Operational
- **Scoring**: Probability × Impact analysis (1-9 scale)
- **Mitigation**: Specific strategies for each identified risk
- **Gate Impact**: Risks ≥9 trigger FAIL, ≥6 trigger CONCERNS (see `tasks/risk-profile.md` for authoritative rules)

##### 6. Test Design (`*design`)

**When:** After story draft, before development begins (guides what tests to write)

Creates comprehensive test strategies including:

- Test scenarios for each acceptance criterion
- Appropriate test level recommendations (unit vs integration vs E2E)
- Risk-based prioritization (P0/P1/P2)
- Test data requirements and mock strategies
- Execution strategies for CI/CD integration

**Example output:**

```yaml
test_summary:
  total: 24
  by_level:
    unit: 15
    integration: 7
    e2e: 2
  by_priority:
    P0: 8 # Must have - linked to critical risks
    P1: 10 # Should have - medium risks
    P2: 6 # Nice to have - low risks
```

##### 7. Requirements Tracing (`*trace`)

**When:** During development (mid-implementation checkpoint)

Maps requirements to test coverage:

- Documents which tests validate each acceptance criterion
- Uses Given-When-Then for clarity (documentation only, not BDD code)
- Identifies coverage gaps with severity ratings
- Creates traceability matrix for audit purposes

##### 8. NFR Assessment (`*nfr`)

**When:** During development or early review (validate quality attributes)

Validates non-functional requirements:

- **Core Four**: Security, Performance, Reliability, Maintainability
- **Evidence-Based**: Looks for actual implementation proof
- **Gate Integration**: NFR failures directly impact quality gates

##### 9. Comprehensive Test Architecture Review (`*review`)

**When:** After development complete, story marked "Ready for Review"

When you run `@tea *review {story}`, Murat performs:

- **Requirements Traceability**: Maps every acceptance criterion to its validating tests
- **Test Level Analysis**: Ensures appropriate testing at unit, integration, and E2E levels
- **Coverage Assessment**: Identifies gaps and redundant test coverage
- **Active Refactoring**: Improves code quality directly when safe
- **Quality Gate Decision**: Issues PASS/CONCERNS/FAIL status based on findings

##### 10. Quality Gates (`*gate`)

**When:** After review fixes or when gate status needs updating

Manages quality gate decisions:

- **Deterministic Rules**: Clear criteria for PASS/CONCERNS/FAIL
- **Parallel Authority**: QA owns gate files in `docs/qa/gates/`
- **Advisory Nature**: Provides recommendations, not blocks
- **Waiver Support**: Documents accepted risks when needed

**Note:** Gates are advisory; teams choose their quality bar. WAIVED requires reason, approver, and expiry date. See `templates/qa-gate.yaml` for schema and `tasks/review-story.md` (gate rules) and `tasks/risk-profile.md` for scoring.

### Working with the Test Architect

#### Integration with BMad Workflow

The Test Architect provides value throughout the entire development lifecycle. Here's when and how to leverage each capability:

| **Stage**          | **Command**  | **When to Use**         | **Value**                  | **Output**                                                     |
| ------------------ | ------------ | ----------------------- | -------------------------- | -------------------------------------------------------------- |
| **Project Start**  | `*framework` | One-time setup          | Test architecture ready    | Complete test structure + configs                              |
| **Story Drafting** | `*tdd`       | Before implementation   | Tests drive development    | Failing acceptance tests + implementation checklist            |
|                    | `*risk`      | After SM drafts story   | Identify pitfalls early    | `docs/qa/assessments/{epic}.{story}-risk-{YYYYMMDD}.md`        |
|                    | `*design`    | After risk assessment   | Guide dev on test strategy | `docs/qa/assessments/{epic}.{story}-test-design-{YYYYMMDD}.md` |
| **Development**    | `*automate`  | After implementation    | Generate test suite        | Complete test files following patterns                         |
|                    | `*trace`     | Mid-implementation      | Verify test coverage       | `docs/qa/assessments/{epic}.{story}-trace-{YYYYMMDD}.md`       |
|                    | `*nfr`       | While building features | Catch quality issues early | `docs/qa/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md`         |
| **CI Setup**       | `*ci`        | After tests created     | 20x speed optimization     | CI/CD workflows + scripts                                      |
| **Review**         | `*review`    | Story marked complete   | Full quality assessment    | TEA Results in story + gate file                               |
| **Post-Review**    | `*gate`      | After fixing issues     | Update quality decision    | Updated `docs/qa/gates/{epic}.{story}-{slug}.yml`              |

#### Example Commands

```bash
# Initial Setup - Run ONCE per project
@tea *framework              # Setup test architecture (Playwright/Cypress)

# TDD Workflow - Write tests BEFORE implementation
@tea *tdd {story}            # Write failing acceptance tests
# ... dev implements code to satisfy tests ...
@tea *automate {story}       # Generate additional test coverage

# Traditional Workflow - Tests AFTER implementation
@tea *risk {draft-story}     # What could go wrong?
@tea *design {draft-story}   # What tests should we write?
# ... development happens ...
@tea *automate {story}       # Generate comprehensive test suite
@tea *trace {story}          # Are we testing everything?
@tea *nfr {story}            # Are we meeting quality standards?

# CI/CD Setup - After tests exist
@tea *ci                     # Setup optimized CI/CD pipeline

# Review Stage - Run when development complete
@tea *review {story}         # Comprehensive assessment + refactoring

# Post-Review - Run after addressing issues
@tea *gate {story}           # Update gate status
```

### Quality Standards Enforced

Murat enforces these test quality principles:

#### Core Testing Philosophy

- **"Testing and engineering are bound together"** - One failing test proves software isn't good enough
- **"The more tests resemble actual usage, the more confidence they give"**
- **"What you can avoid testing is more important than what you test"**
- **"Simplicity is the ultimate sophistication"**
- **"In the AI era, E2E tests reign supreme"** - Ultimate acceptance criteria

#### Technical Standards

- **No Flaky Tests**: 0 tolerance - proper async handling, explicit waits
- **No Hard Waits**: Dynamic waiting strategies only (no sleep/wait(ms))
- **Functional Helpers Over Page Objects**: Composition wins over inheritance
- **Stateless & Parallel-Safe**: Tests run independently, no shared mutable state
- **Self-Cleaning**: Tests manage their own test data and cleanup
- **Co-located Tests**: Tests live near source code (\*.spec.js alongside components)
- **Appropriate Test Levels**: Test at lowest level that maintains release confidence
- **Explicit Assertions**: Keep assertions in tests, not hidden in helpers
- **Data Factories**: Dynamic test data generation, no hardcoded fixtures
- **No Conditionals**: Avoid if/else or try/catch controlling test flow
- **1:1 Parity**: Local execution must match CI execution exactly

### Gate Status Meanings

- **PASS**: All critical requirements met, no blocking issues
- **CONCERNS**: Non-critical issues found, team should review
- **FAIL**: Critical issues that should be addressed (security risks, missing P0 tests)
- **WAIVED**: Issues acknowledged but explicitly accepted by team

### Special Situations

**High-Risk Stories:**

- Always run `*risk` and `*design` before development starts
- Consider mid-development `*trace` and `*nfr` checkpoints

**Complex Integrations:**

- Run `*trace` during development to ensure all integration points tested
- Follow up with `*nfr` to validate performance across integrations

**Performance-Critical:**

- Run `*nfr` early and often during development
- Don't wait until review to discover performance issues

**Brownfield/Legacy Code:**

- Start with `*risk` to identify regression dangers
- Use `*review` with extra focus on backward compatibility

### Best Practices

- **Early Engagement**: Run `*design` and `*risk` during story drafting
- **Risk-Based Focus**: Let risk scores drive test prioritization
- **Iterative Improvement**: Use QA feedback to improve future stories
- **Gate Transparency**: Share gate decisions with the team
- **Continuous Learning**: QA documents patterns for team knowledge sharing
- **Brownfield Care**: Pay extra attention to regression risks in existing systems
