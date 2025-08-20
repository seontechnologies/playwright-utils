export type BurnInConfig = {
  /** Patterns for files that should skip burn-in entirely */
  skipBurnInPatterns?: string[]

  /** Patterns to identify test files */
  testPatterns?: string[]

  /** Burn-in test execution settings */
  burnIn?: {
    /** Number of times to repeat each test */
    repeatEach?: number
    /** Number of retries for failed tests */
    retries?: number
  }

  /** Percentage of tests to run for common files (e.g., 0.1 for 10%) */
  commonBurnInTestPercentage?: number
}

export type BurnInOptions = {
  /** Base branch to compare against */
  baseBranch?: string

  /** Path to configuration file */
  configPath?: string
}
