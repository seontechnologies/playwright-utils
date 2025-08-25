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

  /** Percentage of tests to run AFTER skip patterns filter (e.g., 0.1 for 10%) */
  burnInTestPercentage?: number

  /** Enable verbose debug output for pattern matching (can also use BURN_IN_DEBUG env var) */
  debug?: boolean
}

export type BurnInOptions = {
  /** Base branch to compare against */
  baseBranch?: string

  /** Path to configuration file */
  configPath?: string
}
