import merge from 'lodash/merge'
import { defineConfig } from '@playwright/test'
import { baseConfig } from './base.config'

export default defineConfig(
  merge({}, baseConfig, { use: { baseUrl: 'https://test-api.k6.io' } })
)
