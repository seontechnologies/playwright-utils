import baseConfig from './vitest.config'
import type { ViteUserConfig } from 'vitest/config'
import { defineConfig } from 'vitest/config'
import merge from 'lodash/merge'

const browserConfig: ViteUserConfig = {
  test: {
    browser: {
      headless: false
    }
  }
}

export default defineConfig(merge({}, baseConfig, browserConfig))
