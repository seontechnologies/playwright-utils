import { test as base } from '@playwright/test'
import { captureTestContext } from '../../src/log'

// a hook that will run before each test in the suite
// this is like having the below code in each test file
// test.beforeEach(async ({}, testInfo) => {
//   captureTestContext(testInfo)
// })
base.beforeEach(async ({}, testInfo) => {
  captureTestContext(testInfo)
})

export const test = base
export const expect = base.expect
