/**
 * Pure payload matching functions for webhook templates.
 * No external dependencies — fully testable in isolation.
 */

import type { PayloadMatcher, DeepPartial } from './types'

/**
 * Check if a payload matches all matchers in a template.
 * Returns true only if every matcher passes.
 */
export function matchesTemplate<T>(
  payload: T,
  matchers: PayloadMatcher<T>[]
): boolean {
  return matchers.every((matcher) => matchesSingle(payload, matcher))
}

/**
 * Traverse a nested object by dot-separated path.
 * Returns undefined if any segment is missing.
 *
 * @example
 * getFieldValue({ data: { id: '123' } }, 'data.id') // '123'
 * getFieldValue({ a: [{ b: 1 }] }, 'a.0.b') // 1
 */
export function getFieldValue(obj: unknown, path: string): unknown {
  const segments = path.split('.')
  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Recursive subset check: every defined key in `expected` must exist
 * with an equal value in `actual`. Extra keys in `actual` are ignored.
 *
 * - Primitives are compared with strict equality.
 * - Arrays are compared element-by-element (length must match).
 * - Objects are compared recursively.
 * - null/undefined in expected must match exactly in actual.
 */
export function deepPartialMatch(actual: unknown, expected: unknown): boolean {
  if (expected === null || expected === undefined) {
    return actual === expected
  }

  if (typeof expected !== 'object') {
    return actual === expected
  }

  if (typeof actual !== 'object' || actual === null) {
    return false
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return false
    }
    return expected.every((item, index) =>
      deepPartialMatch(actual[index], item)
    )
  }

  const expectedObj = expected as Record<string, unknown>
  const actualObj = actual as Record<string, unknown>

  return Object.keys(expectedObj).every((key) =>
    deepPartialMatch(actualObj[key], expectedObj[key])
  )
}

function matchesSingle<T>(payload: T, matcher: PayloadMatcher<T>): boolean {
  switch (matcher.type) {
    case 'field': {
      const actual = getFieldValue(payload, matcher.path)
      if (actual === undefined) return false
      return actual === matcher.value
    }

    case 'partial':
      return deepPartialMatch(payload, matcher.expected as DeepPartial<unknown>)

    case 'predicate':
      return matcher.fn(payload)

    default:
      throw new Error(
        `Unknown matcher type: ${(matcher as { type: string }).type}`
      )
  }
}
