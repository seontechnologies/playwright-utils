/**
 * Fluent builder for creating webhook templates.
 *
 * @example
 * const template = webhookTemplate<MyPayload>('order-completed')
 *   .matchField('event', 'order.completed')
 *   .matchField('data.orderId', orderId)
 *   .matchPartial({ data: { status: 'CONFIRMED' } })
 *   .withTimeout(15_000)
 *   .build()
 */

import type { WebhookTemplate, PayloadMatcher, DeepPartial } from './types'

export function webhookTemplate<TPayload = unknown>(
  name: string
): WebhookTemplateBuilder<TPayload> {
  return new WebhookTemplateBuilder<TPayload>(name)
}

export class WebhookTemplateBuilder<TPayload = unknown> {
  private readonly matchers: PayloadMatcher<TPayload>[] = []
  private timeout?: number
  private interval?: number

  constructor(private readonly name: string) {}

  /** Match a specific field by dot-path to an exact value */
  matchField(path: string, value: unknown): this {
    this.matchers.push({ type: 'field', path, value })
    return this
  }

  /** Match a partial payload structure (deep subset check) */
  matchPartial(expected: DeepPartial<TPayload>): this {
    this.matchers.push({ type: 'partial', expected })
    return this
  }

  /** Match using a custom predicate function */
  matchPredicate(
    description: string,
    fn: (payload: TPayload) => boolean
  ): this {
    this.matchers.push({ type: 'predicate', description, fn })
    return this
  }

  /** Override the default timeout for this template */
  withTimeout(ms: number): this {
    if (ms <= 0) {
      throw new Error(`withTimeout(${ms}): timeout must be greater than 0`)
    }
    this.timeout = ms
    return this
  }

  /** Override the default polling interval for this template */
  withInterval(ms: number): this {
    if (ms <= 0) {
      throw new Error(`withInterval(${ms}): interval must be greater than 0`)
    }
    this.interval = ms
    return this
  }

  build(): WebhookTemplate<TPayload> {
    return {
      name: this.name,
      matchers: [...this.matchers],
      timeout: this.timeout,
      interval: this.interval
    }
  }
}
