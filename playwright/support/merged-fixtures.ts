import { test as base, mergeTests } from '@playwright/test'
import { captureTestContext } from '../../src/log'
import { test as authFixture } from './auth/auth-fixture'
import { test as interceptNetworkCall } from '../../src/intercept-network-call/fixtures'
import { test as crudHelper } from './fixtures/crud-helper-fixture'
import { test as apiRequest } from '../../src/api-request/fixtures'

// a hook that will run before each test in the suite
base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

const test = mergeTests(
  base,
  authFixture,
  interceptNetworkCall,
  apiRequest,
  crudHelper
)
const expect = base.expect
export { test, expect }
