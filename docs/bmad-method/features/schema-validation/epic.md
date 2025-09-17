# Schema Validation - Brownfield Enhancement

## Epic Goal

Enable single-line API response validation that replaces verbose multi-assertion patterns with declarative schema checking, delivering 70-80% reduction in validation boilerplate while maintaining full backward compatibility with existing apiRequest functionality.

## Existing Context

- **Current functionality**: Comprehensive TypeScript utility library for Playwright with modular "functional core, fixture shell" pattern
- **Technology stack**: TypeScript 5.9.2, Playwright 1.55.0, dual CJS/ESM builds, strict TypeScript compliance
- **Integration points**: Extends existing apiRequest utility, integrates with UI mode and logging systems

## Enhancement Details

- **What's being added/changed**: Fluent schema validation chaining for apiRequest responses supporting JSON Schema, YAML, OpenAPI, and Zod formats
- **Integration approach**: Extends apiRequest response objects with validateSchema() method, maintains all existing functionality
- **Success criteria**: Single-line validation replaces 5-10 line assertion blocks, works across all supported schema formats, preserves TypeScript type safety

## Stories

### Story 1: Core Validation Engine and apiRequest Integration

Implement core validation engine with AJV and extend apiRequest responses with validateSchema() method for JSON Schema support.

**As a** Playwright test developer
**I want** to chain `.validateSchema(jsonSchema)` to apiRequest responses
**So that** I can validate API responses with single-line assertions instead of multiple expect statements.

**Acceptance Criteria:**

1. apiRequest responses have validateSchema() method that accepts JSON Schema objects
2. Validation failures throw Playwright assertion errors with detailed context
3. Successful validation returns enhanced response with validated data
4. All existing apiRequest functionality remains unchanged
5. TypeScript types are preserved and enhanced where possible

**Integration Verification:**

- IV1: Verify existing apiRequest tests continue to pass without modification
- IV2: Verify backward compatibility with all current response object usage patterns
- IV3: Verify performance impact is negligible (< 5ms overhead per validation)

### Story 2: Multi-Format Schema Support

Extend validation engine to support YAML, OpenAPI, and Zod schemas through unified interface.

**As a** Playwright test developer
**I want** to use YAML schema files, OpenAPI specifications, and Zod schemas with validateSchema()
**So that** I can leverage existing schema assets and TypeScript-first validation approaches.

**Acceptance Criteria:**

1. validateSchema() accepts YAML schema files via file path
2. validateSchema() accepts OpenAPI documents with endpoint/method targeting
3. validateSchema() accepts Zod schema instances with native TypeScript integration
4. All schema formats produce consistent validation error reporting
5. Schema format detection is automatic based on input type

**Integration Verification:**

- IV1: Verify YAML schema validation works with existing sample-app schemas
- IV2: Verify OpenAPI integration extracts correct schemas from sample-app/backend/src/api-docs/
- IV3: Verify Zod integration provides proper TypeScript type narrowing

### Story 3: UI Integration and Enhanced Reporting

Integrate validation results with apiRequest UI mode and enhance error reporting with Playwright attachments.

**As a** Playwright test developer
**I want** schema validation results displayed in UI mode with rich error feedback
**So that** I can quickly debug validation failures and understand schema compliance visually.

**Acceptance Criteria:**

1. Validation results appear in apiRequest UI mode with success/failure indicators
2. Schema validation errors include formatted error details in Playwright reports
3. UI displays schema preview and validation summary information
4. Integration with existing playwright-utils/log utility for structured logging
5. Error context includes full request/response details for debugging

**Integration Verification:**

- IV1: Verify UI mode enhancements don't break existing apiRequest UI functionality
- IV2: Verify validation errors provide actionable debugging information
- IV3: Verify log integration maintains existing log formatting and structure

## Compatibility Requirements

- Existing APIs remain unchanged - all current apiRequest usage continues to work
- Database changes are backward compatible - N/A (no database changes)
- UI changes follow existing patterns - extends current apiRequest UI mode framework
- Performance impact is minimal - validation adds < 5ms overhead per request

## Risk Mitigation

- **Primary Risk**: Breaking existing apiRequest functionality during response object enhancement
- **Mitigation**: Comprehensive backward compatibility testing, phased rollout with existing test suites
- **Rollback Plan**: Feature flag to disable validation extension, maintains original apiRequest behavior

## Definition of Done

- All stories completed with acceptance criteria met
- Existing functionality verified through comprehensive test suite execution
- Integration points working correctly across all supported schema formats
- Documentation updated with usage examples and migration patterns
- No regression in existing features confirmed through sample-app test execution
