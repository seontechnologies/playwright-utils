import path from 'node:path'
import { toComparablePath } from './dependency-graph'
import type { BurnInShard } from './types'

const SHARD_PATTERN = /^(\d+)\/(\d+)$/

/** Message for a shard value that cannot be used, naming the value and the expected format */
function invalidShardError(value: string): Error {
  return new Error(
    `Invalid shard "${value}". Expected the format i/n with whole numbers where 1 <= i <= n, for example 2/3.`
  )
}

/** Checks a shard and returns it, or throws when it is not a valid leg of a run */
export function validateShard(shard: BurnInShard): BurnInShard {
  const { index, total } = shard
  if (
    !Number.isSafeInteger(index) ||
    !Number.isSafeInteger(total) ||
    index < 1 ||
    index > total
  ) {
    throw invalidShardError(`${index}/${total}`)
  }
  return { index, total }
}

/** Reads an "i/n" shard such as the `PW_SHARD` value */
export function parseShard(value: string): BurnInShard {
  const match = SHARD_PATTERN.exec(value.trim())
  if (!match) throw invalidShardError(value)
  return validateShard({ index: Number(match[1]), total: Number(match[2]) })
}

export function formatShard(shard: BurnInShard): string {
  return `${shard.index}/${shard.total}`
}

/** Test count per absolute test file path, keyed by {@link toComparablePath} */
export type TestWeights = ReadonlyMap<string, number>

/** Whether the listing reported any test for the file */
export function isListed(weights: TestWeights, file: string): boolean {
  return weights.has(toComparablePath(path.resolve(file)))
}

export function weightOf(weights: TestWeights, file: string): number {
  return weights.get(toComparablePath(path.resolve(file))) ?? 0
}

/**
 * Splits test files into `shard.total` balanced legs and returns the files of `shard.index`.
 *
 * Deterministic for the same inputs: files are sorted by weight (heaviest first), then by path,
 * and each goes to the currently lightest leg, the lowest index on a tie. Every leg, and so
 * every CI job, computes the same partition. Files keep their order from `tests` inside a leg.
 */
export function partitionTests(
  tests: readonly string[],
  weights: TestWeights,
  shard: BurnInShard
): string[] {
  const { index, total } = validateShard(shard)
  const weighted = tests.map((file) => ({
    file,
    weight: weightOf(weights, file)
  }))
  const sorted = [...weighted].sort(
    (a, b) => b.weight - a.weight || compareCodeUnits(a.file, b.file)
  )

  const legs = Array.from({ length: total }, () => ({ load: 0 }))
  const legOf = new Map<string, (typeof legs)[number]>()
  for (const { file, weight } of sorted) {
    // reduce keeps the earlier leg on a tie, so ties go to the lowest index
    const lightest = legs.reduce((best, leg) =>
      leg.load < best.load ? leg : best
    )
    lightest.load += weight
    legOf.set(file, lightest)
  }

  const mine = legs[index - 1]
  return tests.filter((file) => legOf.get(file) === mine)
}

/** Locale-independent order, so every machine sorts the same way */
function compareCodeUnits(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Counts tests per file in the output of `playwright test --list --reporter=json`. Each
 * project's copy of a test counts, so a file that runs in two projects weighs twice. Throws when
 * the output is not a Playwright JSON report or reports errors.
 */
export function parseTestWeights(output: string): TestWeights {
  let report: unknown
  try {
    report = JSON.parse(output)
  } catch {
    throw new Error(
      'Could not read the output of "playwright test --list --reporter=json" as JSON.'
    )
  }

  if (!isRecord(report) || !isRecord(report.config)) {
    throw new Error('Unexpected "playwright test --list" report: no config.')
  }
  const { rootDir } = report.config
  if (typeof rootDir !== 'string') {
    throw new Error('Unexpected "playwright test --list" report: no rootDir.')
  }
  if (!Array.isArray(report.suites)) {
    throw new Error('Unexpected "playwright test --list" report: no suites.')
  }
  if (Array.isArray(report.errors) && report.errors.length > 0) {
    const messages = report.errors.map((error: unknown) =>
      isRecord(error) && typeof error.message === 'string'
        ? error.message
        : String(error)
    )
    throw new Error(
      `"playwright test --list" reported errors:\n${messages.join('\n')}`
    )
  }

  const weights = new Map<string, number>()
  // Tests count against the top-level file suite, the spec file Playwright runs. A spec's own
  // `file` is where its tests were registered, which is a shared helper when a helper calls test()
  const count = (suite: unknown, key: string): void => {
    if (!isRecord(suite)) return
    const specs = Array.isArray(suite.specs) ? suite.specs : []
    for (const spec of specs) {
      if (isRecord(spec) && Array.isArray(spec.tests)) {
        weights.set(key, (weights.get(key) ?? 0) + spec.tests.length)
      }
    }
    if (Array.isArray(suite.suites)) {
      suite.suites.forEach((child: unknown) => count(child, key))
    }
  }
  for (const fileSuite of report.suites) {
    if (isRecord(fileSuite) && typeof fileSuite.file === 'string') {
      count(fileSuite, toComparablePath(path.resolve(rootDir, fileSuite.file)))
    }
  }
  return weights
}
