import { test as base } from '@playwright/test'
import { log as logObject } from './log'
import type { LogParams } from './types'

// function to build log options
const buildLoggingConfig = ({
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
      return logObject[level](message, buildLoggingConfig(params))
    }

    await use(log)
  }
})
