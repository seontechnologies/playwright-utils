import { execFileSync } from 'node:child_process'
import picomatch from 'picomatch'
import path from 'node:path'
import { DependencyResolver, toComparablePath } from './dependency-graph'
import { formatShard, parseShard, validateShard } from './shard'
import type { BurnInConfig, BurnInOptions, BurnInShard } from './types'

// Internal types - not exposed to users
type ChangedFiles = {
  /** Paths are relative to the repository root, as git reports them */
  testFiles: string[]
  skipBurnInFiles: string[]
  otherFiles: string[]
  all: string[]
}

type TestRunPlan = {
  /** Tests to run, or null to use --only-changed */
  tests: string[] | null
  /** Special flags such as --only-changed and, in fallback mode, the user's --shard */
  flags?: string[]
  /** Reason for the test selection */
  reason: string
}

export class BurnInAnalyzer {
  private debugMode: boolean
  private repoRoot: string | undefined
  /** Resolved once so the "ignored PW_SHARD" warning prints once. null means not sharded */
  private resolvedShard: BurnInShard | null | undefined

  constructor(
    private config: BurnInConfig,
    private options: BurnInOptions
  ) {
    // Enable debug mode via config or environment variable
    this.debugMode = this.config.debug || process.env.BURN_IN_DEBUG === 'true'
  }

  /**
   * The leg this run covers: the `shard` option, else the `PW_SHARD` environment variable
   * ("i/n"), else null. Throws when the value in use is not a valid shard.
   */
  getShard(): BurnInShard | null {
    if (this.resolvedShard !== undefined) return this.resolvedShard

    const fromEnv = process.env.PW_SHARD?.trim()
    if (this.options.shard !== undefined) {
      const { shard: option } = this.options
      const shard =
        typeof option === 'string' ? parseShard(option) : validateShard(option)
      if (fromEnv) {
        console.warn(
          `⚠️  Ignoring PW_SHARD="${fromEnv}": the shard option (${formatShard(shard)}) takes precedence.`
        )
      }
      this.resolvedShard = shard
    } else {
      this.resolvedShard = fromEnv ? parseShard(fromEnv) : null
    }
    return this.resolvedShard
  }

  getChangedFiles(baseBranch: string): ChangedFiles {
    // Input validation
    if (!baseBranch || typeof baseBranch !== 'string') {
      throw new Error('baseBranch must be a non-empty string')
    }

    // Restrict branch names so git can never read one as an option
    const sanitizedBranch = baseBranch.replace(/[^a-zA-Z0-9._/-]/g, '')
    if (sanitizedBranch !== baseBranch || baseBranch.startsWith('-')) {
      throw new Error(
        `Invalid branch name: ${baseBranch}. Branch names can only contain letters, numbers, dots, underscores, hyphens, and forward slashes, and cannot start with a hyphen.`
      )
    }

    try {
      // -z keeps file names verbatim: git quotes unusual names without it
      const files = splitNullSeparated(
        execFileSync(
          'git',
          [
            'diff',
            '--no-renames',
            '--name-only',
            '-z',
            `${sanitizedBranch}...HEAD`
          ],
          { encoding: 'utf-8', stdio: 'pipe' }
        )
      )
      const result: ChangedFiles = {
        testFiles: [],
        skipBurnInFiles: [],
        otherFiles: [],
        all: files
      }
      const repoRoot = this.getRepoRoot()

      files.forEach((file) => {
        const patternPath = path
          .relative(process.cwd(), path.resolve(repoRoot, file))
          .split(path.sep)
          .join('/')
        if (this.isTestFile(patternPath)) {
          // Check if this test file should be skipped
          if (this.isSkipBurnInFile(patternPath)) {
            result.skipBurnInFiles.push(file)
          } else {
            result.testFiles.push(file)
          }
        } else if (this.isSkipBurnInFile(patternPath)) {
          result.skipBurnInFiles.push(file)
        } else {
          result.otherFiles.push(file)
        }
      })

      return result
    } catch (error) {
      // Provide more specific error messages based on git error types
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      if (errorMessage.includes('not a git repository')) {
        throw new Error(
          'Not in a git repository. Please run this command from within a git repository.'
        )
      }

      if (errorMessage.includes('unknown revision')) {
        throw new Error(
          `Branch '${sanitizedBranch}' does not exist. Please check the branch name.`
        )
      }

      if (errorMessage.includes('bad revision')) {
        throw new Error(`Invalid git reference: ${sanitizedBranch}`)
      }

      throw new Error(`Failed to get changed files: ${errorMessage}`)
    }
  }

  private isTestFile(file: string): boolean {
    // Get test patterns from config with fallback to standard patterns
    const testPatterns = this.config.testPatterns || [
      '**/*.spec.ts',
      '**/*.test.ts'
    ]
    return testPatterns.some((pattern) => this.matchesPattern(file, pattern))
  }

  private isSkipBurnInFile(file: string): boolean {
    const patterns = this.config.skipBurnInPatterns || []
    const isSkipped = patterns.some((pattern) => {
      const matches = this.matchesPattern(file, pattern)
      if (this.debugMode && matches) {
        console.log(`    🔍 File "${file}" matches skip pattern "${pattern}"`)
      }
      return matches
    })

    if (this.debugMode && patterns.length > 0) {
      console.log(`    📌 Skip decision for "${file}": ${isSkipped}`)
    }

    return isSkipped
  }

  private matchesPattern(file: string, pattern: string): boolean {
    // Use picomatch for safe and proper glob matching
    try {
      const isMatch = picomatch(pattern)
      return isMatch(file)
    } catch (error) {
      // If pattern is invalid, log warning and return false
      console.warn(`Invalid glob pattern: ${pattern}`, error)
      return false
    }
  }

  async analyzeTestableDependencies(
    changedFiles: ChangedFiles
  ): Promise<TestRunPlan> {
    const { skipBurnInFiles, testFiles, otherFiles, all } = changedFiles

    // If ONLY skip files changed, skip all tests
    if (all.length > 0 && all.length === skipBurnInFiles.length) {
      return {
        tests: [],
        reason: `Smart mode: Only skip-pattern files changed (${skipBurnInFiles.length} files), no tests needed`
      }
    }

    // If nothing changed at all
    if (all.length === 0) {
      return {
        tests: [],
        reason: 'Smart mode: No files changed'
      }
    }

    // Get the files that should affect tests (non-skip files)
    const relevantFiles = [...testFiles, ...otherFiles]
    const nonSkipCount = relevantFiles.length

    console.log(
      `🔍 Analyzing dependencies for ${relevantFiles.length} relevant files...`
    )

    // Use custom dependency analysis instead of Playwright's --only-changed
    return await this.createCustomTestPlan(relevantFiles, nonSkipCount)
  }

  private async createCustomTestPlan(
    relevantFiles: string[],
    nonSkipCount: number
  ): Promise<TestRunPlan> {
    if (relevantFiles.length === 0) {
      return {
        tests: [],
        reason: 'Smart mode: No relevant files changed after filtering'
      }
    }

    // Resolved outside the try: an invalid shard must fail the run, not trigger the fallback
    const shard = this.getShard()

    try {
      // Walk each test's import graph to find the tests that reach a changed file
      const affectedTests = await this.findAffectedTests(relevantFiles)

      if (affectedTests.length === 0) {
        return {
          tests: [],
          reason: `Smart mode: ${nonSkipCount} non-skip file(s) changed, but no tests depend on them`
        }
      }

      console.log(`📊 Found ${affectedTests.length} tests affected by changes`)

      // Apply percentage control
      const percentage = this.config.burnInTestPercentage || 1

      // Validate percentage value
      if (percentage <= 0 || percentage > 1) {
        throw new Error(
          `Invalid burnInTestPercentage: ${percentage}. Must be greater than 0 and less than or equal to 1.`
        )
      }

      // Calculate how many tests to run
      const testsToRun = Math.ceil(affectedTests.length * percentage)
      const selectedTests = affectedTests.slice(0, testsToRun)

      return {
        tests: selectedTests,
        reason: `Smart mode: ${nonSkipCount} non-skip file(s) changed, found ${affectedTests.length} affected tests, running ${testsToRun} (${(percentage * 100).toFixed(0)}%)`
      }
    } catch (error) {
      console.warn(
        '⚠️  Custom dependency analysis failed, falling back to percentage mode:',
        error
      )

      // Fallback: Playwright picks the tests with --only-changed
      const percentage = this.config.burnInTestPercentage || 1
      const onlyChanged = `--only-changed=${this.options.baseBranch || 'main'}`

      // The user's shard replaces the percentage shard: both would be --shard flags. A total of
      // 1 is the whole run, so it keeps the percentage rules.
      if (shard && shard.total > 1) {
        if (percentage < 1) {
          console.warn(
            `⚠️  Skipping percentage sampling (${(percentage * 100).toFixed(0)}%) in fallback mode: the shard ${formatShard(shard)} is used instead.`
          )
        }
        return {
          tests: null,
          flags: [`--shard=${formatShard(shard)}`, onlyChanged],
          reason: `Smart mode: ${nonSkipCount} non-skip file(s) changed, using fallback mode with shard ${formatShard(shard)}`
        }
      }

      const shardCount = Math.ceil(1 / percentage)
      return {
        tests: null,
        flags: [`--shard=1/${shardCount}`, onlyChanged],
        reason: `Smart mode: ${nonSkipCount} non-skip file(s) changed, using fallback percentage mode (${(percentage * 100).toFixed(0)}%)`
      }
    }
  }

  private async findAffectedTests(changedFiles: string[]): Promise<string[]> {
    // Get all test files in the project
    const testPatterns = this.config.testPatterns || [
      '**/*.spec.ts',
      '**/*.test.ts'
    ]
    const allTestFiles = this.findTestFiles(testPatterns)

    if (allTestFiles.length === 0) {
      console.log('⚠️  No test files found')
      return []
    }

    console.log(
      `📁 Analyzing ${allTestFiles.length} test files for dependencies...`
    )

    // git reports changed files relative to the repository root; the working directory
    // can be a subdirectory of it
    const repoRoot = this.getRepoRoot()
    const changedPaths = new Set(
      changedFiles.map((file) => toComparablePath(path.resolve(repoRoot, file)))
    )
    const resolver = new DependencyResolver()
    const affectedTests = new Set<string>()

    // Find all tests that import any of the changed files (directly or indirectly)
    for (const testFile of allTestFiles) {
      if (this.testDependsOnChangedFiles(testFile, changedPaths, resolver)) {
        affectedTests.add(testFile)
      }
    }

    // Filter out any affected tests that match skip patterns
    const skipPatterns = this.config.skipBurnInPatterns || []
    const filteredAffectedTests = Array.from(affectedTests).filter(
      (testFile) =>
        !skipPatterns.some((skipPattern) =>
          this.matchesPattern(testFile, skipPattern)
        )
    )

    const skippedTestsCount = affectedTests.size - filteredAffectedTests.length
    if (skippedTestsCount > 0) {
      console.log(
        `🚫 Filtered out ${skippedTestsCount} affected test(s) matching skip patterns`
      )
    }

    return filteredAffectedTests
  }

  private getRepoRoot(): string {
    this.repoRoot ??= execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim()
    return this.repoRoot
  }

  private findTestFiles(testPatterns: string[]): string[] {
    try {
      // Tracked files under the working directory, relative to it
      const gitFiles = splitNullSeparated(
        execFileSync('git', ['ls-files', '-z'], {
          encoding: 'utf-8',
          stdio: 'pipe'
        })
      )

      const allTestFiles = gitFiles.filter((file) =>
        testPatterns.some((pattern) => this.matchesPattern(file, pattern))
      )

      // Filter out test files that match skip patterns
      const skipPatterns = this.config.skipBurnInPatterns || []
      const filteredTestFiles =
        skipPatterns.length > 0 && allTestFiles.length > 0
          ? allTestFiles.filter(
              (testFile) =>
                !skipPatterns.some((skipPattern) =>
                  this.matchesPattern(testFile, skipPattern)
                )
            )
          : allTestFiles

      const skippedCount = allTestFiles.length - filteredTestFiles.length
      if (skippedCount > 0) {
        console.log(
          `🚫 Filtered out ${skippedCount} test file(s) matching skip patterns`
        )
      }

      return filteredTestFiles
    } catch {
      console.warn('⚠️  Failed to get git files, using empty test list')
      return []
    }
  }

  private testDependsOnChangedFiles(
    testFile: string,
    changedPaths: Set<string>,
    resolver: DependencyResolver
  ): boolean {
    const visited = new Set<string>()
    const queue = [path.resolve(testFile)]

    while (queue.length > 0) {
      const currentFile = queue.shift()!
      const comparable = toComparablePath(currentFile)

      if (visited.has(comparable)) {
        continue
      }
      visited.add(comparable)

      if (changedPaths.has(comparable)) {
        return true
      }

      queue.push(...resolver.getDependencies(currentFile))
    }

    return false
  }

  /**
   * Arguments for the Playwright CLI, or null when no tests need to run. A plan with explicit
   * tests runs exactly those: when sharding, pass the plan with this leg's tests only (see
   * `partitionTests`). It always carries `--shard=1/1`, which overrides a `shard` set in the
   * project's playwright.config.ts so that config cannot skip the selected tests.
   */
  buildCommand(plan: TestRunPlan): string[] | null {
    if (plan.tests !== null && plan.tests.length === 0) {
      return null // No tests to run
    }

    const baseCmd = ['test']
    const burnInFlags = [
      `--repeat-each=${this.config.burnIn?.repeatEach || 3}`,
      `--retries=${this.config.burnIn?.retries || 0}`
    ]

    // Add any special flags
    if (plan.flags) {
      baseCmd.push(...plan.flags)
    }

    if (plan.tests !== null) baseCmd.push('--shard=1/1')

    if (plan.tests === null) {
      // Use --only-changed (fallback mode)
      const baseBranch = this.options.baseBranch || 'main'
      return [...baseCmd, `--only-changed=${baseBranch}`, ...burnInFlags]
    }

    // Specific test files
    return [...baseCmd, ...plan.tests.map(toFileFilter), ...burnInFlags]
  }
}

/**
 * Playwright reads each positional argument as a regular expression and tests it against
 * absolute test file paths. Anchoring the escaped absolute path selects exactly that file: an
 * unanchored relative path also matches longer paths ending in it, and `.` matches any character.
 * Starting with `^` also keeps a file name from being read as an option.
 */
export function toFileFilter(file: string): string {
  const absolute = path.resolve(file)
  return `^${absolute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
}

function splitNullSeparated(output: string): string[] {
  return output.split('\0').filter(Boolean)
}
