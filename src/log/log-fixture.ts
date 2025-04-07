import { test as base } from '@playwright/test'
import { log as logObject } from './log'
import type { LogParams } from './types'

// function to build log options
const buildLogOptions = ({
  console,
  testFile,
  testName,
  options = {}
}: LogParams) => ({
  ...options,
  ...(typeof console !== 'undefined' && { console }),
  ...(testFile && { testFile }),
  ...(testName && { testName })
})

export const test = base.extend<{
  log: (params: LogParams) => Promise<void>
}>({
  log: async ({}, use) => {
    const log = async (params: LogParams): Promise<void> => {
      const { level = 'info', message } = params

      // ex: log.step('Testing adding todo items', { console: false }))
      return logObject[level](message, buildLogOptions(params))
    }

    await use(log)
  }
})
