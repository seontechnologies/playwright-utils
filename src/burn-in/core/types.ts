export type BurnInConfig = {
  /** Patterns for commonly used files that should trigger light burn-in (smoke tests or small percentage) */
  commonBurnInPatterns?: string[]

  /** Patterns for files that should skip burn-in entirely */
  skipBurnInPatterns?: string[]

  /** Patterns to identify test files */
  testPatterns?: string[]

  /** Max depth for dependency tracking before triggering run-all mode */
  maxDepthForRunAll?: number

  /** Burn-in test execution settings */
  burnIn?: {
    /** Number of times to repeat each test */
    repeatEach?: number
    /** Number of retries for failed tests */
    retries?: number
  }

  /** Percentage of tests to run for common files (e.g., 0.1 for 10%) */
  commonBurnInTestPercentage?: number

  /** Test tag/pattern to run for common files (e.g., '@smoke') */
  commonBurnInTestTag?: string

  /** Maximum number of changed files before triggering run-all mode */
  maxFilesForSmartMode?: number
}

export type BurnInOptions = {
  /** Base branch to compare against */
  baseBranch?: string

  /** Path to configuration file */
  configPath?: string
}
