import { execSync } from 'node:child_process'
import picomatch from 'picomatch'
import type { BurnInConfig, BurnInOptions } from './types'

// Internal types - not exposed to users
type ChangedFiles = {
  testFiles: string[]
  commonBurnInFiles: string[]
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
        commonBurnInFiles: [],
        skipBurnInFiles: [],
        otherFiles: [],
        all: files
      }

      files.forEach((file) => {
        if (this.isTestFile(file)) {
          result.testFiles.push(file)
        } else if (this.isCommonBurnInFile(file)) {
          result.commonBurnInFiles.push(file)
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

  private isCommonBurnInFile(file: string): boolean {
    const patterns = this.config.commonBurnInPatterns || []
    return patterns.some((pattern) => this.matchesPattern(file, pattern))
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

  analyzeTestableDependencies(changedFiles: ChangedFiles): TestRunPlan {
    const { testFiles, commonBurnInFiles, skipBurnInFiles, otherFiles } =
      changedFiles

    // Case 1: Only skip burn-in files changed
    if (
      skipBurnInFiles.length > 0 &&
      commonBurnInFiles.length === 0 &&
      otherFiles.length === 0 &&
      testFiles.length === 0
    ) {
      return {
        tests: [],
        reason: 'Smart mode: Only skip burn-in files changed, no tests needed'
      }
    }

    // Case 2: Only common burn-in files changed
    if (
      commonBurnInFiles.length > 0 &&
      skipBurnInFiles.length === 0 &&
      otherFiles.length === 0 &&
      testFiles.length === 0
    ) {
      return this.handleCommonBurnInChanges()
    }

    // Case 3: Only test files changed (no other impactful files)
    if (
      testFiles.length > 0 &&
      commonBurnInFiles.length === 0 &&
      otherFiles.length === 0
    ) {
      return {
        tests: testFiles,
        reason:
          'Smart mode: Only test files changed, running those specific tests'
      }
    }

    // Case 4: Other files changed - use run-all mode
    if (otherFiles.length > 0) {
      return {
        tests: null,
        reason: `Smart mode: ${otherFiles.length} non-test files changed, using run-all mode`
      }
    }

    // Case 5: No files changed or only skip files
    return {
      tests: [],
      reason: 'Smart mode: No relevant files changed'
    }
  }

  private handleCommonBurnInChanges(): TestRunPlan {
    // Check for smoke test tag/pattern
    if (this.config.commonBurnInTestTag) {
      return {
        tests: [this.config.commonBurnInTestTag],
        reason: `Smart mode: Common burn-in files changed, running tests tagged with ${this.config.commonBurnInTestTag}`
      }
    }

    // Run a percentage of tests
    if (this.config.commonBurnInTestPercentage) {
      const percentage = this.config.commonBurnInTestPercentage

      // Validate percentage value
      if (percentage <= 0 || percentage > 1) {
        throw new Error(
          `Invalid commonBurnInTestPercentage: ${percentage}. Must be greater than 0 and less than or equal to 1.`
        )
      }

      const shardCount = Math.ceil(1 / percentage)
      return {
        tests: null,
        flags: [`--shard=1/${shardCount}`],
        reason: `Smart mode: Common burn-in files changed, running ${(percentage * 100).toFixed(1)}% of tests`
      }
    }

    // Default: skip burn-in for common burn-in files
    return {
      tests: [],
      reason: 'Smart mode: Common burn-in files changed, skipping burn-in'
    }
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
      // Use --only-changed
      const baseBranch = this.options.baseBranch || 'main'
      return [...baseCmd, `--only-changed=${baseBranch}`, ...burnInFlags]
    }

    // Specific test files or patterns
    const testArgs: string[] = []
    plan.tests.forEach((test) => {
      if (test.includes('*') || test.includes('(') || test.includes('|')) {
        // It's a pattern, use -g flag
        testArgs.push('-g', test)
      } else {
        // It's a file path
        testArgs.push(test)
      }
    })

    return [...baseCmd, ...testArgs, ...burnInFlags]
  }
}
