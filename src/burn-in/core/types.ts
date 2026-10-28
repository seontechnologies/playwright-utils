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

/** One leg of a sharded burn-in run: `index` is 1-based, `total` is the number of legs */
export type BurnInShard = {
  index: number
  total: number
}

/** A leg as `{ index, total }` or the string `'i/n'`, so a CLI value passes straight through */
export type BurnInShardOption = BurnInShard | string

export type BurnInOptions = {
  /** Base branch to compare against */
  baseBranch?: string

  /** Path to configuration file */
  configPath?: string

  /**
   * Run only this leg of the affected tests: `{ index, total }` or `'i/n'`. The legs of one run
   * split the affected test files into balanced, disjoint groups. Falls back to the `PW_SHARD`
   * environment variable ("i/n") when not set. Without a shard, or with a total of 1, every
   * affected test file runs.
   */
  shard?: BurnInShardOption
}
