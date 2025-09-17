# Story 1: Core Validation Engine and apiRequest Integration - Brownfield Addition

## User Story

**As a** Playwright test developer
**I want** to chain `.validateSchema(jsonSchema)` to apiRequest responses
**So that** I can validate API responses with single-line assertions instead of multiple expect statements.

## Existing System Context

- **Technology Stack**: TypeScript 5.9.2, Playwright 1.55.0, existing apiRequest utility with dual CJS/ESM builds
- **Integration Points**: Extends existing `src/api-request/api-request.ts` and response objects
- **Current Pattern**: "Functional core, fixture shell" architecture with strict TypeScript compliance
- **Existing Functionality**: apiRequest utility provides typed HTTP requests with UI mode integration

## Acceptance Criteria

### Functional Requirements

1. **AC1**: apiRequest responses have validateSchema() method that accepts JSON Schema objects
2. **AC2**: Validation failures throw Playwright assertion errors with detailed context including request/response information
3. **AC3**: Successful validation returns enhanced response object with validated data and preserved original functionality
4. **AC4**: Method supports fluent chaining pattern consistent with existing apiRequest design
5. **AC5**: JSON Schema validation uses AJV engine for industry-standard compliance

### Integration Requirements

6. **AC6**: All existing apiRequest functionality remains unchanged and accessible
7. **AC7**: TypeScript types are preserved and enhanced where validation provides type narrowing
8. **AC8**: Integration with existing log utility for structured validation logging
9. **AC9**: Backward compatibility maintained with all current apiRequest usage patterns

### Quality Requirements

10. **AC10**: Performance overhead is negligible (< 5ms per validation)
11. **AC11**: Error messages provide actionable debugging information with full context

## Technical Implementation Notes

### Integration Approach

- **Response Enhancement**: Add validateSchema method to apiRequest response objects using TypeScript method extension
- **AJV Integration**: Install and configure AJV ^8.17.1 for JSON Schema validation
- **Error Handling**: Wrap validation failures in Playwright assertion errors to maintain test reporting consistency
- **Type Safety**: Use TypeScript method overloading to provide enhanced types for validated responses

### Existing Patterns to Follow

- **Module Structure**: Follow `src/api-request/` directory structure with core logic in separate files
- **Export Pattern**: Maintain both direct function exports and fixture integration
- **Error Handling**: Use existing error wrapping patterns from other utilities
- **UI Integration**: Prepare foundation for UI mode integration (implemented in Story 3)

## Risk Assessment and Mitigation

### Primary Risk

Breaking existing apiRequest functionality during response object enhancement

### Mitigation Strategy

- Use TypeScript method augmentation rather than object replacement
- Comprehensive backward compatibility testing with existing test suite
- Feature flag approach for gradual rollout

### Rollback Plan

Remove validateSchema method extension, revert to original apiRequest response objects

## Definition of Done

### Functionality Complete

- [x] validateSchema method available on all apiRequest responses
- [x] JSON Schema validation working with AJV engine
- [x] Fluent chaining supports continued operations
- [x] TypeScript types enhanced appropriately

### Integration Verified

- [x] All existing apiRequest tests pass without modification
- [x] No breaking changes to existing API contracts
- [x] Performance impact verified as negligible
- [x] Error handling integrates with Playwright reporting

### Quality Assured

- [x] Comprehensive unit tests for validation logic
- [x] Integration tests using sample-app backend
- [x] Error cases handled gracefully with clear messages
- [x] Code follows existing typescript and linting standards

### Regression Testing Complete

- [x] Existing sample-app tests execute successfully
- [x] All current apiRequest usage patterns verified
- [x] No impact on build process or package exports
- [x] Documentation includes usage examples

## TEA Results

### Test Design Complete ✅

**Test Scenarios Designed**: 8 scenarios (3 Unit, 3 Integration, 2 E2E)

**P0 Critical Tests**:

- `1.1-UNIT-01`: Core schema validation logic with AJV integration
- `1.1-INTEGRATION-01`: apiRequest extension and fluent chaining
- `1.1-E2E-01`: Sample-app integration with real schemas

**P1 High Priority Tests**:

- Error handling and Playwright assertion integration
- Backward compatibility verification
- TypeScript type narrowing validation

**Test Coverage**: 100% acceptance criteria mapped to test scenarios
**Testing Approach**: E2E dogfooding - utility tests itself through real usage
**Requirements Traceability**: ✅ All 11 ACs traced to E2E scenarios
**TDD Ready**: ✅ Failing tests can be written immediately
