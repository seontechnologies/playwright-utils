import { WebhookRegistry } from './webhook-registry'
import { WebhookTimeoutError } from './core/types'
import type {
  WebhookProvider,
  ReceivedWebhook,
  WebhookTemplate
} from './core/types'

// Mock recurse to avoid Playwright dependency in unit tests
jest.mock('../recurse', () => ({
  recurse: jest.fn(),
  RecurseTimeoutError: class RecurseTimeoutError extends Error {
    constructor(
      message: string,
      public readonly timeout: number,
      public readonly iterations: number,
      public readonly lastValue?: unknown
    ) {
      super(message)
      this.name = 'RecurseTimeoutError'
    }
  }
}))

import { recurse, RecurseTimeoutError } from '../recurse'

const mockedRecurse = recurse as jest.MockedFunction<typeof recurse>

function createMockProvider(
  webhooks: ReceivedWebhook[] = []
): WebhookProvider & { webhooks: ReceivedWebhook[] } {
  const state = { webhooks }
  const provider = {
    get webhooks() {
      return state.webhooks
    },
    set webhooks(v: ReceivedWebhook[]) {
      state.webhooks = v
    },
    getReceivedWebhooks: jest.fn(async () => state.webhooks),
    resetJournal: jest.fn(async () => {}),
    deleteById: jest.fn(async (id: string) => {
      state.webhooks = state.webhooks.filter((w) => w.id !== id)
    }),
    getCount: jest.fn(async () => state.webhooks.length)
  }
  return provider
}

function makeWebhook<T>(id: string, body: T): ReceivedWebhook<T> {
  return {
    id,
    url: 'http://mock/webhook',
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    receivedAt: new Date()
  }
}

describe('WebhookRegistry', () => {
  beforeEach(() => {
    mockedRecurse.mockReset()
  })

  describe('waitFor', () => {
    it('should call recurse with correct timeout and interval', async () => {
      const webhook = makeWebhook('1', {
        event: 'finished',
        data: { id: 'item-1' }
      })
      const provider = createMockProvider([webhook])
      const registry = new WebhookRegistry(provider)

      mockedRecurse.mockResolvedValueOnce([webhook])

      const template: WebhookTemplate = {
        name: 'test',
        matchers: [{ type: 'field', path: 'data.id', value: 'item-1' }],
        timeout: 5000,
        interval: 250
      }

      await registry.waitFor(template)

      expect(mockedRecurse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          timeout: 5000,
          interval: 250,
          error: 'Webhook "test" not received within 5000ms'
        }
      )
    })

    it('should return the matching webhook from recurse result', async () => {
      const matchingWebhook = makeWebhook('2', {
        event: 'finished',
        data: { id: 'item-1' }
      })
      const nonMatching = makeWebhook('1', {
        event: 'other',
        data: { id: 'item-2' }
      })
      const provider = createMockProvider([nonMatching, matchingWebhook])
      const registry = new WebhookRegistry(provider)

      mockedRecurse.mockResolvedValueOnce([nonMatching, matchingWebhook])

      const template: WebhookTemplate = {
        name: 'test',
        matchers: [{ type: 'field', path: 'data.id', value: 'item-1' }]
      }

      const result = await registry.waitFor(template)
      expect(result.id).toBe('2')
    })

    it('should throw WebhookTimeoutError when recurse times out', async () => {
      const nonMatching = makeWebhook('1', { event: 'other' })
      const provider = createMockProvider([nonMatching])
      const registry = new WebhookRegistry(provider)

      mockedRecurse.mockRejectedValueOnce(
        new RecurseTimeoutError('timeout', 1000, 5)
      )

      const template: WebhookTemplate = {
        name: 'my-webhook',
        matchers: [{ type: 'field', path: 'event', value: 'finished' }],
        timeout: 1000
      }

      await expect(registry.waitFor(template)).rejects.toThrow(
        WebhookTimeoutError
      )

      try {
        mockedRecurse.mockRejectedValueOnce(
          new RecurseTimeoutError('timeout', 1000, 5)
        )
        await registry.waitFor(template)
      } catch (error) {
        const timeoutError = error as WebhookTimeoutError
        expect(timeoutError.templateName).toBe('my-webhook')
        expect(timeoutError.timeoutMs).toBe(1000)
        expect(timeoutError.receivedWebhooks).toHaveLength(1)
      }
    })

    it('should use default timeout when template has none', async () => {
      const provider = createMockProvider([])
      const registry = new WebhookRegistry(provider, {
        defaultTimeout: 15_000,
        defaultInterval: 500
      })

      mockedRecurse.mockResolvedValueOnce([makeWebhook('1', { x: 'y' })])

      const template: WebhookTemplate = {
        name: 'test',
        matchers: [{ type: 'field', path: 'x', value: 'y' }]
      }

      await registry.waitFor(template)

      expect(mockedRecurse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          timeout: 15_000,
          interval: 500
        })
      )
    })

    it('should re-throw non-timeout errors', async () => {
      const provider = createMockProvider([])
      const registry = new WebhookRegistry(provider)

      const error = new Error('network failure')
      mockedRecurse.mockRejectedValueOnce(error)

      const template: WebhookTemplate = {
        name: 'test',
        matchers: [{ type: 'field', path: 'x', value: 'y' }]
      }

      await expect(registry.waitFor(template)).rejects.toThrow(
        'network failure'
      )
    })
  })

  describe('waitForCount', () => {
    it('should return N matching webhooks when count is reached', async () => {
      const w1 = makeWebhook('1', { event: 'finished', data: { id: 'a' } })
      const w2 = makeWebhook('2', { event: 'finished', data: { id: 'b' } })
      const w3 = makeWebhook('3', { event: 'other', data: { id: 'c' } })
      const provider = createMockProvider([w1, w2, w3])
      const registry = new WebhookRegistry(provider)

      mockedRecurse.mockImplementationOnce(async (_fetcher, predicate) => {
        predicate([w1, w2, w3])
        return [w1, w2, w3]
      })

      const template: WebhookTemplate = {
        name: 'batch',
        matchers: [{ type: 'field', path: 'event', value: 'finished' }],
        timeout: 5000,
        interval: 250
      }

      const result = await registry.waitForCount(template, 2)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('2')
      expect(mockedRecurse).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          timeout: 5000,
          interval: 250,
          error: '2 webhook(s) "batch" not received within 5000ms'
        }
      )
    })

    it('should throw WebhookTimeoutError when not enough matches', async () => {
      const w1 = makeWebhook('1', { event: 'finished' })
      const provider = createMockProvider([w1])
      const registry = new WebhookRegistry(provider)

      mockedRecurse.mockRejectedValueOnce(
        new RecurseTimeoutError('timeout', 5000, 10)
      )

      const template: WebhookTemplate = {
        name: 'batch',
        matchers: [{ type: 'field', path: 'event', value: 'finished' }],
        timeout: 5000
      }

      await expect(registry.waitForCount(template, 3)).rejects.toThrow(
        WebhookTimeoutError
      )

      mockedRecurse.mockRejectedValueOnce(
        new RecurseTimeoutError('timeout', 5000, 10)
      )

      try {
        await registry.waitForCount(template, 3)
      } catch (error) {
        const timeoutError = error as WebhookTimeoutError
        expect(timeoutError.templateName).toBe('batch')
        expect(timeoutError.timeoutMs).toBe(5000)
      }
    })
  })

  describe('getReceived', () => {
    it('should pass through to provider', async () => {
      const webhook = makeWebhook('1', { event: 'test' })
      const provider = createMockProvider([webhook])
      const registry = new WebhookRegistry(provider)

      const result = await registry.getReceived()
      expect(result).toEqual([webhook])
    })

    it('should pass filter to provider', async () => {
      const provider = createMockProvider([])
      const registry = new WebhookRegistry(provider)

      const filter = { method: 'POST' }
      await registry.getReceived(filter)
      expect(provider.getReceivedWebhooks).toHaveBeenCalledWith(filter)
    })
  })

  describe('cleanup', () => {
    it('should reset entire journal by default (full-reset strategy)', async () => {
      const provider = createMockProvider()
      const registry = new WebhookRegistry(provider)

      await registry.cleanup()
      expect(provider.resetJournal).toHaveBeenCalled()
      expect(provider.deleteById).not.toHaveBeenCalled()
    })

    it('should delete only matched webhooks with matched-only strategy', async () => {
      const webhook = makeWebhook('matched-1', { event: 'test' })
      const provider = createMockProvider([webhook])
      const registry = new WebhookRegistry(provider, {
        cleanupStrategy: 'matched-only'
      })

      // Simulate a match by calling waitFor
      mockedRecurse.mockImplementationOnce(async (_fetcher, predicate) => {
        predicate([webhook])
        return [webhook]
      })

      await registry.waitFor({
        name: 'test',
        matchers: [{ type: 'field', path: 'event', value: 'test' }]
      })

      await registry.cleanup()
      expect(provider.deleteById).toHaveBeenCalledWith('matched-1')
      expect(provider.resetJournal).not.toHaveBeenCalled()
    })
  })

  describe('resetJournal', () => {
    it('should delegate to provider resetJournal and clear matched IDs', async () => {
      const provider = createMockProvider()
      const registry = new WebhookRegistry(provider)

      await registry.resetJournal()
      expect(provider.resetJournal).toHaveBeenCalled()
    })
  })
})
