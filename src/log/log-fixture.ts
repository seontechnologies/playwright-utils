import { test as base } from '@playwright/test'
import { log as logObject } from './log'
import type { LogParams } from './types'

export const test = base.extend<{
  log: (params: LogParams) => Promise<void>
}>({
  log: async ({}, use) => {
    const log = async (params: LogParams): Promise<void> => {
      const level = params.level || 'info'

      // Handle options, merging console flag if provided
      const options = params.options || {}
      if (typeof params.console !== 'undefined') {
        options.console = params.console
      }

      // Pass testFile and testName through to options if provided
      if (params.testFile) {
        options.testFile = params.testFile
      }
      if (params.testName) {
        options.testName = params.testName
      }

      return logObject[level](params.message, options)
    }

    await use(log)
  }
})
