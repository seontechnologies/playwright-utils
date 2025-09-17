# Story 2: Multi-Format Schema Support - Brownfield Addition

## User Story

**As a** Playwright test developer
**I want** to use YAML schema files, OpenAPI specifications, and Zod schemas with validateSchema()
**So that** I can leverage existing schema assets and TypeScript-first validation approaches.

## Existing System Context

- **Technology Stack**: Building on Story 1's AJV foundation, extends validation engine with format adapters
- **Integration Points**: Extends validateSchema method with format detection and parsing capabilities
- **Current Pattern**: Maintains "functional core, fixture shell" with adapter pattern for different formats
- **Existing Assets**: Sample-app has OpenAPI docs in `sample-app/backend/src/api-docs/` and schema types in `sample-app/shared/types/`

## Acceptance Criteria

### Functional Requirements

1. **AC1**: validateSchema() accepts YAML schema files via file path (string parameter)
2. **AC2**: validateSchema() accepts OpenAPI documents with endpoint/method targeting via options parameter
3. **AC3**: validateSchema() accepts Zod schema instances with native TypeScript integration
4. **AC4**: Format detection is automatic based on input type (object, string path, Zod instance)
5. **AC5**: All schema formats produce consistent validation error reporting with format-specific details

### Format-Specific Requirements

6. **AC6**: YAML schemas are parsed using js-yaml and validated through AJV engine
7. **AC7**: OpenAPI integration extracts response schemas for specific endpoint/method/status combinations
8. **AC8**: Zod integration uses native Zod validation with enhanced TypeScript type narrowing
9. **AC9**: OpenAPI references ($ref) are properly resolved for complex schemas

### Consistency Requirements

10. **AC10**: All formats return same enhanced response object structure
11. **AC11**: Error reporting maintains consistent format while preserving format-specific context

## Technical Implementation Notes

### Integration Approach

- **Format Adapters**: Create adapter pattern with separate handlers for JSON, YAML, OpenAPI, Zod
- **Dependencies**: Add js-yaml ^4.1.0, swagger-parser ^10.0.3, Zod as peer dependency ^3.23.8
- **Schema Detection**: Use TypeScript type guards and runtime checks for format identification
- **Unified Engine**: Route all formats through common validation interface

### Existing Patterns to Follow

- **Module Structure**: Create `src/schema-validation/adapters/` following existing utility organization
- **Type Safety**: Use discriminated unions for schema format types
- **Error Handling**: Maintain existing error wrapping patterns with format-specific context
- **Caching**: Implement schema compilation caching similar to existing patterns

### Format-Specific Implementation

- **YAML**: File system access with caching, parse to JSON Schema, validate through AJV
- **OpenAPI**: Document parsing with swagger-parser, schema extraction by path/method, reference resolution
- **Zod**: Direct validation with native APIs, TypeScript type extraction for response enhancement

## Risk Assessment and Mitigation

### Primary Risk

Format parsing complexity affecting existing JSON Schema validation reliability

### Mitigation Strategy

- Isolate format adapters with clear interfaces
- Fallback mechanisms for parsing failures
- Comprehensive format-specific testing with real schema files

### Rollback Plan

Disable specific format support while maintaining JSON Schema core functionality

## Definition of Done

### Multi-Format Support Complete

- [x] YAML schema files parsed and validated correctly
- [x] OpenAPI endpoint targeting extracts appropriate response schemas
- [x] Zod schema integration provides TypeScript type narrowing
- [x] Format detection works automatically without explicit configuration

### Integration Verified with Real Assets

- [x] YAML validation tested with sample schema files
- [x] OpenAPI integration works with `sample-app/backend/src/api-docs/openapi.json`
- [x] Zod integration tested with `sample-app/shared/types/schema.ts` exports
- [x] All formats produce consistent error reporting

### Quality Assured

- [x] Format-specific error messages are clear and actionable
- [x] Schema compilation caching implemented for performance
- [x] Type safety maintained across all format adapters
- [x] Dependencies properly managed (peer dependencies where appropriate)

### Regression Testing Complete

- [x] Story 1 JSON Schema validation continues to work unchanged
- [x] No impact on existing apiRequest functionality
- [x] Performance remains within acceptable bounds for all formats
- [x] Error handling graceful for malformed schemas in any format

## TEA Results

### Test Design Complete ✅

**Test Scenarios Designed**: 9 scenarios (3 Unit, 4 Integration, 2 E2E)

**P0 Critical Tests**:

- `1.2-UNIT-01`: Auto-format detection (JSON, YAML, Zod)
- `1.2-INTEGRATION-01`: Format adapters with real assets
- `1.2-E2E-01`: Sample-app OpenAPI and Zod integration

**Key Test Coverage**:

- YAML file parsing and validation through AJV
- OpenAPI endpoint targeting and schema extraction
- Zod native validation with TypeScript type narrowing
- Cross-format error consistency

**Test Coverage**: 100% acceptance criteria mapped to test scenarios
**Testing Approach**: E2E dogfooding - real format validation through actual usage
**Requirements Traceability**: ✅ All 11 ACs traced to format-specific E2E tests
**TDD Ready**: ✅ Building on Story 1 foundation
