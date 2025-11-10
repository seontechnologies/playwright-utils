import { test as base, mergeTests } from '@playwright/test'
import { test as apiRequest } from '../../src/api-request/fixtures'
import { test as validateSchema } from '../../src/api-request/schema-validation/fixture'
import { test as fileUtils } from '../../src/file-utils/file-utils-fixture'
import { test as interceptNetworkCall } from '../../src/intercept-network-call/fixtures'
import { captureTestContext } from '../../src/log'
import { test as networkRecorder } from '../../src/network-recorder/fixtures'
import { test as authFixture } from './auth/auth-fixture'
import { test as crudHelper } from './fixtures/crud-helper-fixture'
import { test as networkErrorMonitorFixture } from '../../src/network-error-monitor/fixtures'

// a hook that will run before each test in the suite
base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

const test = mergeTests(
  base,
  authFixture,
  interceptNetworkCall,
  apiRequest,
  validateSchema,
  crudHelper,
  fileUtils,
  networkRecorder,
  networkErrorMonitorFixture
)
const expect = base.expect
export { expect, test }
