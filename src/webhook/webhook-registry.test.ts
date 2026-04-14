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
    resetJournal: jest.fn(async () => {})
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
    it('should call provider resetJournal', async () => {
      const provider = createMockProvider()
      const registry = new WebhookRegistry(provider)

      await registry.cleanup()
      expect(provider.resetJournal).toHaveBeenCalled()
    })
  })
})
