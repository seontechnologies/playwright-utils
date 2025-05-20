import baseConfig from './vitest.config'
import type { UserConfigExport } from 'vitest/config'
import { defineConfig } from 'vitest/config'
import merge from 'lodash/merge'

const browserConfig: UserConfigExport = {
  test: {
    browser: {
      headless: true,
      name: 'chromium'
    }
  }
}

export default defineConfig(merge({}, baseConfig, browserConfig))
