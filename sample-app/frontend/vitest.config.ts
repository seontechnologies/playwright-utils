import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

const viteConfigBase = viteConfig({
  mode: process.env.NODE_ENV || 'test',
  command: 'serve'
})

const config = mergeConfig(
  viteConfigBase,
  defineConfig({
    test: {
      retry: 3,
      browser: {
        enabled: true,
        provider: 'playwright',
        instances: [
          {
            browser: 'chromium',
            name: 'chromium'
          }
        ]
      },
      environment: 'happy-dom',
      setupFiles: ['./src/test-utils/vitest-utils/vitest.setup.ts'],
      include: ['src/**/*.vitest.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules/**', 'playwright/**', 'src/consumer.test.ts']
    }
  })
)

export default config
