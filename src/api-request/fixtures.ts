// Export only the fixtures
// Export the test object directly to match import pattern:
// import { test as apiRequestFixture } from 'playwright-utils/api-request/fixtures';
export { test } from './api-request-fixture'

// Also export the validateSchema fixture
// import { test as validateSchemaFixture } from 'playwright-utils/api-request/fixtures';
export { test as validateSchemaFixture } from './schema-validation/fixture'
