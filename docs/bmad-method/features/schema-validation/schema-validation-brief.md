# Feature Brief: Schema Validation

## About This Brief

This brief provides a high-level overview of the schema validation feature for playwright-utils. This feature extends the existing apiRequest utility with fluent schema validation capabilities. For comprehensive details, refer to the accompanying Feature PRD.

## Executive Summary

**Schema validation** is a new feature that enables single-line API response validation, replacing verbose multi-assertion patterns with declarative schema checking. It integrates seamlessly with the existing `apiRequest` utility, maintaining playwright-utils' established "functional core, fixture shell" pattern.

The feature supports multiple schema formats (JSON, YAML, OpenAPI, Zod) and combines contract validation with shape checking in a single fluent assertion, delivering significant productivity gains for API testing workflows.

## Problem Statement

**API Validation Complexity**: Current API response validation requires 5-10 lines of manual property checking and assertion chains. Teams spend significant time writing and maintaining verbose validation code that should be handled declaratively.

**Key Pain Points**:

- Multi-line assertion blocks for simple response structure validation
- Lack of contract validation against API specifications
- Repetitive validation patterns across test suites
- No integration between schema compliance and shape validation

## Proposed Solution

Add schema validation capability to `apiRequest` responses using fluent chaining:

```typescript
const { body } = await apiRequest({
  method: 'POST',
  path: '/movies',
  data: movie
}).validateSchema(openApiSchema, {
  endpoint: '/movies',
  method: 'POST',
  shape: { status: 200, data: movieProps }
})
```

**Key Features**:

- Fluent API integration with existing apiRequest
- Multi-format schema support (JSON, YAML, OpenAPI, Zod)
- Combined contract + shape validation in single assertion
- Configurable behavior (throw on failure vs. return results)

## Key Stakeholders

- **Primary**: Teams already using apiRequest utility for API testing
- **Secondary**: API developers doing contract testing and validation
- **Strategic**: Teams migrating from Cypress cy.spok patterns

## Success Criteria

- 70-80% reduction in validation boilerplate code
- Successful enhancement of existing `crud-movie-event.spec.ts` test
- Demonstration across all supported schema formats
- Seamless adoption pattern consistent with other playwright-utils modules

## Next Steps

1. **API Design** - Define exact interface for validateSchema method
2. **Core Implementation** - Build AJV-based validation engine
3. **Multi-Format Support** - Implement JSON, YAML, OpenAPI, Zod handlers
4. **Reference Implementation** - Update existing test with schema validation
5. **Integration Testing** - Validate across multiple repositories

**Dependencies**: Requires existing apiRequest utility and established playwright-utils patterns.

**Handoff**: This brief provides context for the detailed Feature PRD, which contains comprehensive technical specifications and implementation requirements.
