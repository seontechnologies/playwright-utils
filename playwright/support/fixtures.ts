import { test as base, mergeTests } from '@playwright/test'
import { captureTestContext } from '../../src/log'
import { test as interceptNetworkCall } from '../../src/intercept-network-call/fixtures'

// a hook that will run before each test in the suite
// this is like having the below code in each test file
// test.beforeEach(async ({}, testInfo) => {
//   captureTestContext(testInfo)
// })
base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

const test = mergeTests(base, interceptNetworkCall)
const expect = base.expect
export { test, expect }
