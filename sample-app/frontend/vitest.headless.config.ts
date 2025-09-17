import baseConfig from './vitest.config'
import type { UserConfigExport } from 'vitest/config'
import { defineConfig } from 'vitest/config'
import merge from 'lodash/merge'

const browserConfig: UserConfigExport = {
  test: {
    browser: {
      instances: [
        {
          browser: 'chromium',
          name: 'chromium-headless',
          options: {
            headless: true
          }
        }
      ]
    }
  }
}

export default defineConfig(merge({}, baseConfig, browserConfig))
