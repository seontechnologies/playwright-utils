import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { BurnInAnalyzer } from './core/analyzer'
import { loadConfig } from './core/config'
import type { BurnInOptions, BurnInConfig } from './core/types'

// Internal type with config override capability
type InternalBurnInOptions = BurnInOptions & {
  config?: BurnInConfig
}

export class BurnInRunner {
  private analyzer: BurnInAnalyzer

  constructor(private options: InternalBurnInOptions = {}) {
    const config = options.config || loadConfig(options.configPath)
    this.analyzer = new BurnInAnalyzer(config, options)
  }

  async run(): Promise<void> {
    const baseBranch = this.options.baseBranch || 'main'

    console.log('🔍 Smart Burn-in Test Runner')
    console.log(`🌳 Base branch: ${baseBranch}`)

    // Get changed files
    const changedFiles = this.analyzer.getChangedFiles(baseBranch)

    if (changedFiles.all.length === 0) {
      console.log('✅ No changes detected. Nothing to burn-in.')
      return
    }

    console.log(`📝 Found ${changedFiles.all.length} changed file(s)`)

    // Analyze and create test plan
    const plan = await this.analyzer.analyzeTestableDependencies(changedFiles)
    const command = this.analyzer.buildCommand(plan)

    console.log('\n🎯 Test execution plan:')
    console.log(`  ${plan.reason}`)

    if (!command) {
      console.log('ℹ️  No tests need to be run based on the changes.')
      return
    }

    if (plan.tests !== null) {
      console.log(`  Tests to run: ${plan.tests.length}`)
      plan.tests.forEach((test) => console.log(`    - ${test}`))
    }

    console.log('\n📦 Command to execute:')
    console.log(`  playwright ${command.map(formatArgument).join(' ')}`)

    // Set burn-in environment variable
    process.env.PW_BURN_IN = 'true'

    console.log('\n🚀 Starting burn-in tests...\n')

    // Arguments go straight to the Playwright CLI process. No shell parses them, so file
    // names with spaces or shell syntax stay single, literal arguments.
    const result = spawnSync(
      process.execPath,
      [resolvePlaywrightCli(), ...command],
      { stdio: 'inherit', env: process.env }
    )

    if (result.error || result.status !== 0) {
      if (result.error) console.error(result.error)
      console.error('\n❌ Burn-in tests failed')
      process.exit(1)
    }
    console.log('\n✅ Burn-in tests completed successfully!')
  }
}

/** The Playwright CLI script installed in the project being tested */
function resolvePlaywrightCli(): string {
  const projectRequire = createRequire(path.join(process.cwd(), 'package.json'))
  for (const cli of ['@playwright/test/cli', 'playwright/cli']) {
    try {
      return projectRequire.resolve(cli)
    } catch {
      // Try the next package
    }
  }
  throw new Error(
    `Cannot find the Playwright CLI from ${process.cwd()}. Install @playwright/test in the project.`
  )
}

/** Quotes an argument the way a POSIX shell would need it, for display */
function formatArgument(argument: string): string {
  return /^[\w./=:@%+,-]+$/.test(argument)
    ? argument
    : `"${argument.replace(/["\\$`]/g, '\\$&')}"`
}

export async function runBurnIn(options?: BurnInOptions): Promise<void> {
  const runner = new BurnInRunner(options)
  await runner.run()
}
