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
        name: 'chromium',
        provider: 'playwright'
      },
      environment: 'happy-dom',
      setupFiles: ['./src/test-utils/vitest-utils/vitest.setup.ts'],
      include: ['src/**/*.vitest.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: [
        'node_modules/**',
        'pw/**',
        'cypress/**',
        'src/consumer.test.ts',
        'src/**/*.pacttest.ts',
        'src/**/*.pw.ts',
        'src/**/*.cy.ts'
      ]
    }
  })
)

export default config
