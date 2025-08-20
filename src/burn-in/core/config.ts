import type { BurnInConfig } from './types'
import * as fs from 'node:fs'
import * as path from 'node:path'

export const DEFAULT_CONFIG: BurnInConfig = {
  skipBurnInPatterns: [
    '**/config/**',
    '**/configuration/**',
    '**/playwright.config.ts',
    '**/*featureFlags*',
    '**/*constants*',
    '**/*config*',
    '**/*types*',
    '**/*interfaces*',
    '**/package.json',
    '**/tsconfig.json',
    '**/*.md'
  ],
  testPatterns: ['**/*.spec.ts', '**/*.test.ts'],
  burnIn: {
    repeatEach: 3,
    retries: 0
  },
  commonBurnInTestPercentage: 0.1
}

export function loadConfig(configPath?: string): BurnInConfig {
  const configs: BurnInConfig[] = [DEFAULT_CONFIG]

  // Try to load from possible TypeScript config file locations
  const configPaths = configPath
    ? [configPath]
    : [
        'config/.burn-in.config.ts', // Recommended: organized in config folder
        '.burn-in.config.ts', // Alternative: project root (hidden)
        'burn-in.config.ts', // Alternative: project root
        'playwright/.burn-in.config.ts' // Alternative: playwright folder
      ]

  for (const configFile of configPaths) {
    if (fs.existsSync(configFile)) {
      try {
        // Only load TypeScript config files
        if (path.extname(configFile) !== '.ts') {
          console.warn(
            `⚠️  Skipping non-TypeScript config: ${configFile}. Only .ts config files are supported.`
          )
          continue
        }

        // Safely load TypeScript config
        delete require.cache[path.resolve(configFile)] // Clear cache for fresh load
        const configModule = require(path.resolve(configFile))
        const loadedConfig: BurnInConfig = configModule.default || configModule

        // Validate that it's actually a config object
        if (typeof loadedConfig !== 'object' || loadedConfig === null) {
          throw new Error('Config must export a BurnInConfig object')
        }

        configs.push(loadedConfig)
        console.log(`📋 Loaded burn-in config from: ${configFile}`)
        break
      } catch (error) {
        console.warn(
          `⚠️  Failed to load config from ${configFile}:`,
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  }

  // Merge all configs (later configs override earlier ones)
  return configs.reduce(
    (merged, config) => ({
      ...merged,
      ...config,
      burnIn: {
        ...(merged.burnIn || {}),
        ...(config.burnIn || {})
      }
    }),
    {} as BurnInConfig
  )
}
