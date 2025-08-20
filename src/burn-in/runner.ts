import { execSync } from 'node:child_process'
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
    console.log(`  ${command.join(' ')}`)

    // Set burn-in environment variable
    process.env.PW_BURN_IN = 'true'

    console.log('\n🚀 Starting burn-in tests...\n')

    try {
      execSync(command.join(' '), {
        stdio: 'inherit',
        env: process.env
      })
      console.log('\n✅ Burn-in tests completed successfully!')
    } catch {
      console.error('\n❌ Burn-in tests failed')
      process.exit(1)
    }
  }
}

export async function runBurnIn(options?: BurnInOptions): Promise<void> {
  const runner = new BurnInRunner(options)
  await runner.run()
}
