# Feature PRD: Schema Validation

## About This Feature PRD

This PRD covers the schema validation feature for playwright-utils. It extends the existing apiRequest utility with comprehensive schema validation capabilities. This document references the overall Project PRD for playwright-utils architectural patterns and strategic context.

## Executive Summary

**Schema validation** enables single-line API response validation that replaces verbose, multi-assertion patterns with declarative schema checking. Building on the existing `apiRequest` utility, it provides fluent chaining that combines OpenAPI schema validation with shape assertion patterns.

**Key Value Proposition**: Eliminate 5-10 lines of manual property checking while providing both contract validation (schema compliance) and shape validation (property structure) in a single, fluent assertion.

## Problem Statement

**API Validation Complexity**: Current API response validation in Playwright requires extensive manual assertion chains. What Cypress handles with `cy.spok()` or plugin-based schema validation becomes 5-10 lines of manual property checking, reducing test readability and maintainability.

**Specific Pain Points**:

1. **Verbose Validation Patterns**: Simple response structure validation requires multiple expect statements and manual property checking
2. **No Contract Validation**: Teams cannot easily validate API responses against OpenAPI specifications or schema documents
3. **Repetitive Code**: Same validation patterns repeated across test suites without reusable abstractions
4. **Limited Shape Validation**: No equivalent to Cypress cy.spok for flexible property matching and validation

**Current vs. Desired State**:

```typescript
// Current: 8-10 lines of manual validation
expect(createStatus).toBe(200)
expect(createResponse).toMatchObject({
  status: 200,
  data: { ...movieProps, id: movieId }
})
expect(createResponse.data.name).toBe(movie.name)
expect(createResponse.data.year).toBe(movie.year)
// ... more assertions

// Desired: Single fluent assertion
const { body } = await apiRequest({...})
  .validateSchema(openApiSchema, {
    endpoint: '/movies',
    method: 'POST',
    shape: { status: 200, data: movieProps }
  })
```

## Proposed Solution

**Fluent Schema Validation** that integrates seamlessly with the existing `apiRequest` utility:

### Core API Design

```typescript
// Fluent chaining with apiRequest
const response = await apiRequest({
  method: 'POST',
  path: '/movies',
  data: movie
}).validateSchema(schema, options)
```

### Multi-Format Schema Support

- **JSON Schema**: Native JSON schema documents
- **YAML Schema**: YAML-formatted schema files
- **OpenAPI 3/Swagger 2**: Full OpenAPI specification documents with endpoint/method targeting
- **Zod Schemas**: Direct Zod schema validation using native Zod APIs

### Validation Options

```typescript
interface ValidationOptions {
  endpoint?: string // OpenAPI endpoint path
  method?: string // HTTP method for OpenAPI targeting
  status?: number // Expected status code for OpenAPI targeting
  shape?: object // spok-like shape validation
  mode?: 'throw' | 'return' // Behavior on validation failure
}
```

### Integration with Existing Patterns

- **Functional Core, Fixture Shell**: Core validation logic as standalone functions, fixtures provide Playwright integration
- **Error Integration**: Validation failures integrate with Playwright's assertion and reporting system
- **UI Enhancement**: Leverage Sebastian's UI reporting concepts for enhanced validation feedback

## Target Users

### Primary Users

**Teams Using apiRequest Utility**: Current playwright-utils adopters who need enhanced API response validation capabilities

**API Contract Testers**: Teams doing integration testing where response structure validation against API specifications is critical

### Secondary Users

**Cypress Migrants**: Teams familiar with cy.spok patterns looking for equivalent Playwright functionality

**Enterprise API Teams**: Organizations with comprehensive OpenAPI specifications requiring contract validation

## Goals & Success Metrics

### Feature Objectives

- **Code Reduction**: 70-80% reduction in validation boilerplate compared to manual assertion patterns
- **API Integration**: Seamless chaining with existing apiRequest without breaking changes
- **Multi-Format Support**: Single API supporting JSON, YAML, OpenAPI, and Zod schemas
- **Performance**: No significant test execution overhead from schema validation

### Success Metrics

- **Reference Implementation**: Successfully enhance `playwright/tests/sample-app/backend/crud-movie-event.spec.ts`
- **Format Demonstration**: Working examples for all supported schema formats
- **Adoption Proof**: Integration across existing SEON repositories using playwright-utils
- **API Consistency**: Maintains established playwright-utils patterns and conventions

## MVP Scope

### Core Features (Must Have)

- **Fluent API Integration**: `await apiRequest({...}).validateSchema(schema, options)` chaining
- **Multi-Format Schema Support**: JSON Schema, YAML Schema, OpenAPI 3/Swagger 2, and Zod schemas
- **Unified Validation**: Combined contract validation (schema compliance) and shape validation (property structure)
- **Dual Behavior**: Configurable to throw on failure (assertion-style) or return results (inspection-style)
- **Error Integration**: Schema validation errors integrate with Playwright's test reporting

### Out of Scope for MVP

- **Custom Validation Rules**: Advanced validation logic beyond schema compliance
- **Schema Generation/Inference**: Automatic schema creation from API responses
- **Performance Optimizations**: Caching, async validation, or performance tuning
- **Advanced Error Reporting**: Custom error formatting beyond Playwright's standard assertion failures

### MVP Success Criteria

- **Reference Implementation**: `crud-movie-event.spec.ts` enhanced with schema validation showing 70-80% validation code reduction
- **Multi-Format Tests**: Spot-check tests for JSON, YAML, OpenAPI, and Zod using existing schema files in `sample-app/backend/src/api-docs/` and `sample-app/shared/types/schema.ts`
- **API Consistency**: Schema validation follows established playwright-utils module patterns
- **Repository Compatibility**: Works across existing 6+ SEON repositories using playwright-utils

## Technical Implementation

### Architecture Considerations

- **Schema Validation Engine**: Custom implementation using AJV directly (minimize dependencies)
- **Zod Integration**: Use Zod's native validation APIs for Zod schema support
- **API Extension**: Extend apiRequest response objects with `.validateSchema()` method
- **Error Handling**: Schema validation failures integrate with Playwright's standard assertion system
- **TypeScript Support**: Provide type narrowing for validated response bodies where feasible

### Implementation Strategy

1. **Core Validation Engine**: Build AJV-based validator supporting multiple schema formats
2. **Response Extension**: Add validateSchema method to apiRequest response objects
3. **Schema Format Handlers**: Implement parsers for JSON, YAML, OpenAPI, and Zod schemas
4. **UI Integration**: Incorporate validation feedback into existing apiRequest UI features
5. **Error Reporting**: Ensure validation failures provide clear, actionable error messages

### Integration Points

- **Existing apiRequest Utility**: Extend response objects without breaking changes
- **Schema Files**: Leverage existing `generate:openapi` workflow for up-to-date schemas
- **Test Infrastructure**: Work with established Playwright fixtures and test patterns
- **Documentation**: Follow playwright-utils documentation patterns and standards

## Dependencies & Constraints

### Technical Dependencies

- **AJV**: JSON Schema validator for core validation engine
- **YAML Parser**: For YAML schema format support
- **Zod**: For Zod schema validation (peer dependency)
- **OpenAPI Parser**: For extracting schemas from OpenAPI documents

### Project Constraints

- **Backward Compatibility**: Must not break existing apiRequest functionality
- **Bundle Size**: Minimize impact on overall library size
- **Performance**: Schema validation should not significantly impact test execution time
- **API Consistency**: Follow established playwright-utils patterns and conventions

## Implementation Roadmap

### Phase 1: Core Foundation

1. Design and implement core validation engine with AJV
2. Create apiRequest response extension mechanism
3. Implement basic JSON schema validation support

### Phase 2: Multi-Format Support

4. Add YAML schema parsing and validation
5. Implement OpenAPI 3/Swagger 2 schema extraction and validation
6. Add Zod schema validation integration

### Phase 3: Enhancement & Integration

7. Integrate UI reporting features for validation feedback
8. Add comprehensive error reporting and messaging
9. Implement dual behavior modes (throw vs. return)

### Phase 4: Testing & Documentation

10. Update `crud-movie-event.spec.ts` with schema validation examples
11. Create spot-check tests for all supported schema formats
12. Validate integration across existing SEON repositories

## Next Steps

### Immediate Actions

1. **API Interface Design**: Define exact signature for `validateSchema(schema, options)` method
2. **Schema Format Analysis**: Review existing schema files and determine parsing requirements
3. **AJV Integration**: Implement core validation engine with multi-format support
4. **Response Extension**: Develop mechanism for adding validateSchema to apiRequest responses
5. **Reference Implementation**: Begin enhancement of existing test with schema validation

### Validation & Rollout

- **Testing**: Comprehensive testing across all supported schema formats and edge cases
- **Integration**: Validate compatibility with existing playwright-utils modules and patterns
- **Documentation**: Complete feature documentation with examples and migration guides
- **Rollout**: Gradual deployment across SEON repositories with feedback collection

This feature PRD provides the comprehensive foundation for implementing schema validation while maintaining alignment with the overall playwright-utils project vision and architectural patterns.
