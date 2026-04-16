import { webhookTemplate, WebhookTemplateBuilder } from './webhook-template'

describe('webhookTemplate', () => {
  it('should create a builder instance', () => {
    const builder = webhookTemplate('test')
    expect(builder).toBeInstanceOf(WebhookTemplateBuilder)
  })

  it('should build a template with just a name', () => {
    const template = webhookTemplate('minimal').build()
    expect(template).toEqual({
      name: 'minimal',
      matchers: [],
      timeout: undefined,
      interval: undefined
    })
  })

  it('should add field matchers', () => {
    const template = webhookTemplate('test')
      .matchField('event', 'payment.completed')
      .matchField('data.id', '123')
      .build()

    expect(template.matchers).toEqual([
      { type: 'field', path: 'event', value: 'payment.completed' },
      { type: 'field', path: 'data.id', value: '123' }
    ])
  })

  it('should add a partial matcher', () => {
    const template = webhookTemplate('test')
      .matchPartial({ data: { status: 'SUCCESS' } })
      .build()

    expect(template.matchers).toEqual([
      { type: 'partial', expected: { data: { status: 'SUCCESS' } } }
    ])
  })

  it('should add a predicate matcher', () => {
    const fn = (p: unknown) => p !== null
    const template = webhookTemplate('test')
      .matchPredicate('not null', fn)
      .build()

    expect(template.matchers).toEqual([
      { type: 'predicate', description: 'not null', fn }
    ])
  })

  it('should set timeout and interval', () => {
    const template = webhookTemplate('test')
      .withTimeout(5000)
      .withInterval(500)
      .build()

    expect(template.timeout).toBe(5000)
    expect(template.interval).toBe(500)
  })

  it('should support fluent chaining of all methods', () => {
    const template = webhookTemplate<{ event: string; data: { id: string } }>(
      'full-chain'
    )
      .matchField('event', 'finished')
      .matchPartial({ data: { id: '123' } })
      .matchPredicate('always true', () => true)
      .withTimeout(10_000)
      .withInterval(250)
      .build()

    expect(template.name).toBe('full-chain')
    expect(template.matchers).toHaveLength(3)
    expect(template.timeout).toBe(10_000)
    expect(template.interval).toBe(250)
  })

  it('should not mutate the builder when building', () => {
    const builder = webhookTemplate('test').matchField('a', 1)
    const t1 = builder.build()
    const t2 = builder.matchField('b', 2).build()

    expect(t1.matchers).toHaveLength(1)
    expect(t2.matchers).toHaveLength(2)
  })
})
