import { test as base } from '@playwright/test'
import { log as logObject, type LogParams } from './log'

export const test = base.extend<{
  log: (params: LogParams) => Promise<void>
}>({
  log: async ({}, use) => {
    const log = async (params: LogParams): Promise<void> => {
      const level = params.level || 'info'
      return logObject[level](params.message, params.console)
    }

    await use(log)
  }
})
