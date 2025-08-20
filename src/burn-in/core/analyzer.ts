import { execSync } from 'node:child_process'
import picomatch from 'picomatch'
import madge from 'madge'
import path from 'node:path'
import type { BurnInConfig, BurnInOptions } from './types'

// Internal types - not exposed to users
type ChangedFiles = {
  testFiles: string[]
  skipBurnInFiles: string[]
  otherFiles: string[]
  all: string[]
}

type TestRunPlan = {
  /** Tests to run, or null to use --only-changed */
  tests: string[] | null
  /** Special flags like --shard */
  flags?: string[]
  /** Reason for the test selection */
  reason: string
}

export class BurnInAnalyzer {
  constructor(
    private config: BurnInConfig,
    private options: BurnInOptions
  ) {}

  getChangedFiles(baseBranch: string): ChangedFiles {
    // Input validation
    if (!baseBranch || typeof baseBranch !== 'string') {
      throw new Error('baseBranch must be a non-empty string')
    }

    // Sanitize branch name to prevent shell injection
    const sanitizedBranch = baseBranch.replace(/[^a-zA-Z0-9._/-]/g, '')
    if (sanitizedBranch !== baseBranch) {
      throw new Error(
        `Invalid branch name: ${baseBranch}. Branch names can only contain letters, numbers, dots, underscores, hyphens, and forward slashes.`
      )
    }

    try {
      // Use sanitized input to prevent shell injection
      const diff = execSync(`git diff --name-only ${sanitizedBranch}...HEAD`, {
        encoding: 'utf-8'
      }).trim()

      const files = diff ? diff.split('\n') : []
      const result: ChangedFiles = {
        testFiles: [],
        skipBurnInFiles: [],
        otherFiles: [],
        all: files
      }

      files.forEach((file) => {
        if (this.isTestFile(file)) {
          result.testFiles.push(file)
        } else if (this.isSkipBurnInFile(file)) {
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
    return patterns.some((pattern) => this.matchesPattern(file, pattern))
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

    try {
      // Use madge to analyze dependencies and find which tests are affected
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

      // Fallback to percentage-based sharding if dependency analysis fails
      const percentage = this.config.burnInTestPercentage || 1
      const shardCount = Math.ceil(1 / percentage)

      return {
        tests: null,
        flags: [
          `--shard=1/${shardCount}`,
          `--only-changed=${this.options.baseBranch || 'main'}`
        ],
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

    // Use madge to analyze the dependency graph
    const res = await madge(process.cwd(), {
      fileExtensions: ['ts', 'js', 'tsx', 'jsx'],
      tsConfig: this.findTsConfig(),
      includeNpm: false,
      detectiveOptions: {
        skipTypeImports: false // Include type imports in analysis
      }
    })

    const dependencyGraph = res.obj()
    const affectedTests = new Set<string>()

    // Find all tests that import any of the changed files (directly or indirectly)
    for (const testFile of allTestFiles) {
      if (
        this.testDependsOnChangedFiles(testFile, changedFiles, dependencyGraph)
      ) {
        affectedTests.add(testFile)
      }
    }

    return Array.from(affectedTests)
  }

  private findTsConfig(): string {
    // Look for tsconfig files in common locations
    const locations = [
      'tsconfig.json',
      'tsconfig.build.json',
      'src/tsconfig.json'
    ]
    for (const location of locations) {
      try {
        execSync(`test -f ${location}`, { stdio: 'pipe' })
        return location
      } catch {
        // Continue looking
      }
    }
    return 'tsconfig.json' // Default fallback
  }

  private findTestFiles(testPatterns: string[]): string[] {
    try {
      // Use git to find all tracked files matching test patterns
      const gitFiles = execSync('git ls-files', {
        encoding: 'utf-8',
        stdio: 'pipe'
      })
        .trim()
        .split('\n')

      return gitFiles.filter((file) =>
        testPatterns.some((pattern) => this.matchesPattern(file, pattern))
      )
    } catch {
      console.warn('⚠️  Failed to get git files, using empty test list')
      return []
    }
  }

  private testDependsOnChangedFiles(
    testFile: string,
    changedFiles: string[],
    dependencyGraph: Record<string, string[]>
  ): boolean {
    const visited = new Set<string>()
    const queue = [path.resolve(testFile)]

    // Normalize changed files to absolute paths for comparison
    const normalizedChangedFiles = changedFiles.map((file) => {
      if (path.isAbsolute(file)) {
        return file
      }
      return path.resolve(process.cwd(), file)
    })

    while (queue.length > 0) {
      const currentFile = queue.shift()!

      if (visited.has(currentFile)) {
        continue
      }
      visited.add(currentFile)

      // Check if this file is one of our changed files
      if (
        normalizedChangedFiles.some((changed) => {
          // Compare normalized paths
          const normalizedCurrent = path.normalize(currentFile)
          const normalizedChanged = path.normalize(changed)
          return (
            normalizedCurrent === normalizedChanged ||
            normalizedCurrent.endsWith(
              path.sep + path.basename(normalizedChanged)
            ) ||
            normalizedChanged.endsWith(
              path.sep + path.basename(normalizedCurrent)
            )
          )
        })
      ) {
        return true
      }

      // Add dependencies to queue for further checking
      const dependencies = dependencyGraph[currentFile] || []
      for (const dep of dependencies) {
        const absoluteDep = path.isAbsolute(dep)
          ? dep
          : path.resolve(path.dirname(currentFile), dep)
        if (!visited.has(absoluteDep)) {
          queue.push(absoluteDep)
        }
      }
    }

    return false
  }

  buildCommand(plan: TestRunPlan): string[] | null {
    if (plan.tests !== null && plan.tests.length === 0) {
      return null // No tests to run
    }

    const baseCmd = ['npx', 'playwright', 'test']
    const burnInFlags = [
      `--repeat-each=${this.config.burnIn?.repeatEach || 3}`,
      `--retries=${this.config.burnIn?.retries || 0}`
    ]

    // Add any special flags
    if (plan.flags) {
      baseCmd.push(...plan.flags)
    }

    // Add shard flag if provided via environment
    if (process.env.PW_SHARD) {
      baseCmd.push(`--shard=${process.env.PW_SHARD}`)
    }

    if (plan.tests === null) {
      // Use --only-changed (fallback mode)
      const baseBranch = this.options.baseBranch || 'main'
      return [...baseCmd, `--only-changed=${baseBranch}`, ...burnInFlags]
    }

    // Specific test files
    return [...baseCmd, ...plan.tests, ...burnInFlags]
  }
}
