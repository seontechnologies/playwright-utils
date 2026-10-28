import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as os from 'node:os'
import path from 'node:path'
import { BurnInAnalyzer, toFileFilter } from './core/analyzer'
import { loadConfig } from './core/config'
import {
  formatShard,
  isListed,
  parseTestWeights,
  partitionTests,
  weightOf,
  type TestWeights
} from './core/shard'
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

    // Resolved first so an invalid shard fails before any analysis
    const shard = this.analyzer.getShard()
    if (shard) console.log(`🧩 Shard: ${formatShard(shard)}`)

    // Get changed files
    const changedFiles = this.analyzer.getChangedFiles(baseBranch)

    if (changedFiles.all.length === 0) {
      console.log('✅ No changes detected. Nothing to burn-in.')
      return
    }

    console.log(`📝 Found ${changedFiles.all.length} changed file(s)`)

    // Analyze and create test plan
    let plan = await this.analyzer.analyzeTestableDependencies(changedFiles)

    // The projects Playwright lists depend on this variable, so the listing and the run see it
    process.env.PW_BURN_IN = 'true'

    // Explicit test files are split here into balanced legs. Selection above never depends on
    // the shard, so every leg partitions the same set. Fallback mode (tests: null) passes the
    // shard to Playwright instead.
    // A single leg is the whole selection: no listing, no extra Playwright process.
    if (
      shard &&
      shard.total > 1 &&
      plan.tests !== null &&
      plan.tests.length > 0
    ) {
      const weights = listTestWeights(resolvePlaywrightCli(), plan.tests)
      // Files Playwright lists no test for (outside testDir, or in testIgnore) would only fail
      // the run with "No tests found", so they take no part in the partition
      const selected = plan.tests.filter((file) => isListed(weights, file))
      const unlisted = plan.tests.filter((file) => !isListed(weights, file))
      if (unlisted.length > 0) {
        console.warn(
          `⚠️  Skipping ${unlisted.length} selected file(s) Playwright lists no tests for: ${unlisted.join(', ')}`
        )
      }
      const leg = partitionTests(selected, weights, shard)
      const weigh = (files: string[]) =>
        files.reduce((sum, file) => sum + weightOf(weights, file), 0)

      console.log(
        `\n🧩 Shard ${formatShard(shard)}: ${leg.length} of ${selected.length} test file(s), ${weigh(leg)} of ${weigh(selected)} test(s) before repeats`
      )
      if (leg.length === 0) {
        console.log(
          `ℹ️  Nothing to run: ${selected.length} test file(s) do not reach shard ${formatShard(shard)}.`
        )
        return
      }
      plan = { ...plan, tests: leg }
    }

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

/**
 * Counts the tests in each file with `playwright test --list`, under the burn-in environment so
 * the burn-in projects are counted. Throws when Playwright cannot list the files.
 */
function listTestWeights(cli: string, files: string[]): TestWeights {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'burn-in-list-'))
  // A report file keeps the JSON apart from anything the config prints to stdout
  const reportFile = path.join(directory, 'report.json')
  try {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        'test',
        '--list',
        '--reporter=json',
        // The run overrides every project's configured repeatEach, so count tests before repeats
        '--repeat-each=1',
        // Overrides a shard in the consumer's config, which would hide tests from the listing
        '--shard=1/1',
        ...files.map(toFileFilter)
      ],
      {
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_NAME: reportFile,
          // Playwright gives this one precedence, so a consumer's own value must not win
          PLAYWRIGHT_JSON_OUTPUT_FILE: reportFile
        },
        encoding: 'utf-8',
        stdio: ['ignore', 'ignore', 'pipe']
      }
    )
    if (result.error) {
      throw new Error(
        `Could not list tests to balance the shards: ${result.error.message}`
      )
    }

    const report = fs.existsSync(reportFile)
      ? fs.readFileSync(reportFile, 'utf-8')
      : ''
    if (result.status !== 0) {
      const details = [result.stderr.trim()]
      try {
        parseTestWeights(report)
      } catch (error) {
        details.push(error instanceof Error ? error.message : String(error))
      }
      throw new Error(
        `Could not list tests to balance the shards: "playwright test --list" exited with ${result.status}.\n${details.filter(Boolean).join('\n')}`
      )
    }
    return parseTestWeights(report)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
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
