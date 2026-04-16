import { matchesTemplate, getFieldValue, deepPartialMatch } from './matchers'
import type { PayloadMatcher } from './types'

describe('getFieldValue', () => {
  it('should traverse a simple path', () => {
    expect(getFieldValue({ a: 1 }, 'a')).toBe(1)
  })

  it('should traverse a nested path', () => {
    expect(getFieldValue({ data: { id: '123' } }, 'data.id')).toBe('123')
  })

  it('should traverse deeply nested paths', () => {
    const obj = { a: { b: { c: { d: 'deep' } } } }
    expect(getFieldValue(obj, 'a.b.c.d')).toBe('deep')
  })

  it('should return undefined for missing paths', () => {
    expect(getFieldValue({ a: 1 }, 'b')).toBeUndefined()
    expect(getFieldValue({ a: 1 }, 'a.b')).toBeUndefined()
  })

  it('should handle null values in the path', () => {
    expect(getFieldValue({ a: null }, 'a.b')).toBeUndefined()
  })

  it('should handle array indices', () => {
    expect(getFieldValue({ a: [10, 20, 30] }, 'a.1')).toBe(20)
  })

  it('should return undefined for non-object intermediate values', () => {
    expect(getFieldValue({ a: 'string' }, 'a.b')).toBeUndefined()
  })
})

describe('deepPartialMatch', () => {
  it('should match identical primitives', () => {
    expect(deepPartialMatch(42, 42)).toBe(true)
    expect(deepPartialMatch('hello', 'hello')).toBe(true)
    expect(deepPartialMatch(true, true)).toBe(true)
  })

  it('should not match different primitives', () => {
    expect(deepPartialMatch(42, 43)).toBe(false)
    expect(deepPartialMatch('hello', 'world')).toBe(false)
  })

  it('should match null/undefined exactly', () => {
    expect(deepPartialMatch(null, null)).toBe(true)
    expect(deepPartialMatch(undefined, undefined)).toBe(true)
    expect(deepPartialMatch(null, undefined)).toBe(false)
    expect(deepPartialMatch(undefined, null)).toBe(false)
  })

  it('should match a subset of an object', () => {
    const actual = { a: 1, b: 2, c: 3 }
    const expected = { a: 1, c: 3 }
    expect(deepPartialMatch(actual, expected)).toBe(true)
  })

  it('should fail when a key does not match', () => {
    const actual = { a: 1, b: 2 }
    const expected = { a: 999 }
    expect(deepPartialMatch(actual, expected)).toBe(false)
  })

  it('should match nested objects partially', () => {
    const actual = { data: { id: '123', status: 'SUCCESS', extra: true } }
    const expected = { data: { status: 'SUCCESS' } }
    expect(deepPartialMatch(actual, expected)).toBe(true)
  })

  it('should match arrays element-by-element', () => {
    expect(deepPartialMatch([1, 2, 3], [1, 2, 3])).toBe(true)
  })

  it('should fail on array length mismatch', () => {
    expect(deepPartialMatch([1, 2], [1, 2, 3])).toBe(false)
  })

  it('should fail when actual is not an object but expected is', () => {
    expect(deepPartialMatch('string', { a: 1 })).toBe(false)
    expect(deepPartialMatch(null, { a: 1 })).toBe(false)
  })
})

describe('matchesTemplate', () => {
  const payload = {
    event: 'order.completed',
    timestamp: '2026-01-01T00:00:00Z',
    data: {
      id: 'item-123',
      status: 'SUCCESS',
      order: { id: 'ord-1', name: 'premium-plan' }
    }
  }

  it('should match with a single field matcher', () => {
    const matchers: PayloadMatcher<typeof payload>[] = [
      { type: 'field', path: 'data.id', value: 'item-123' }
    ]
    expect(matchesTemplate(payload, matchers)).toBe(true)
  })

  it('should fail when a field matcher does not match', () => {
    const matchers: PayloadMatcher<typeof payload>[] = [
      { type: 'field', path: 'data.id', value: 'wrong-id' }
    ]
    expect(matchesTemplate(payload, matchers)).toBe(false)
  })

  it('should match with multiple field matchers', () => {
    const matchers: PayloadMatcher<typeof payload>[] = [
      { type: 'field', path: 'event', value: 'order.completed' },
      { type: 'field', path: 'data.id', value: 'item-123' },
      { type: 'field', path: 'data.status', value: 'SUCCESS' }
    ]
    expect(matchesTemplate(payload, matchers)).toBe(true)
  })

  it('should fail when one of multiple matchers fails', () => {
    const matchers: PayloadMatcher<typeof payload>[] = [
      { type: 'field', path: 'event', value: 'order.completed' },
      { type: 'field', path: 'data.status', value: 'FAILED' }
    ]
    expect(matchesTemplate(payload, matchers)).toBe(false)
  })

  it('should match with a partial matcher', () => {
    const matchers: PayloadMatcher<typeof payload>[] = [
      {
        type: 'partial',
        expected: { data: { order: { name: 'premium-plan' } } }
      }
    ]
    expect(matchesTemplate(payload, matchers)).toBe(true)
  })

  it('should match with a predicate matcher', () => {
    const matchers: PayloadMatcher<typeof payload>[] = [
      {
        type: 'predicate',
        description: 'status is SUCCESS',
        fn: (p) => p.data.status === 'SUCCESS'
      }
    ]
    expect(matchesTemplate(payload, matchers)).toBe(true)
  })

  it('should match with mixed matcher types', () => {
    const matchers: PayloadMatcher<typeof payload>[] = [
      { type: 'field', path: 'data.id', value: 'item-123' },
      { type: 'partial', expected: { data: { status: 'SUCCESS' } } },
      {
        type: 'predicate',
        description: 'has timestamp',
        fn: (p) => typeof p.timestamp === 'string'
      }
    ]
    expect(matchesTemplate(payload, matchers)).toBe(true)
  })

  it('should match when matchers array is empty', () => {
    expect(matchesTemplate(payload, [])).toBe(true)
  })
})
