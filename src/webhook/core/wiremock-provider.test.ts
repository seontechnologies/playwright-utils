import { WireMockWebhookProvider } from './wiremock-provider'

// Mock apiRequest
jest.mock('../../api-request', () => ({
  apiRequest: jest.fn()
}))

import { apiRequest } from '../../api-request'

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>

const WIREMOCK_URL = 'http://localhost:5025'

// Minimal mock for APIRequestContext — only needs to satisfy the type
const mockRequest = {}

type WireMockRequest = {
  id: string
  request: {
    url: string
    absoluteUrl: string
    method: string
    headers: Record<string, string>
    body: string
  }
  responseDefinition: Record<string, unknown>
  loggedDate: number
  loggedDateString: string
}

function makeWireMockRequest(
  id: string,
  body: Record<string, unknown>,
  overrides?: Partial<WireMockRequest['request']>
): WireMockRequest {
  return {
    id,
    request: {
      url: '/webhook',
      absoluteUrl: `${WIREMOCK_URL}/webhook`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...overrides
    },
    responseDefinition: {},
    loggedDate: Date.now(),
    loggedDateString: new Date().toISOString()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockApiResponse(body: unknown): any {
  return mockedApiRequest.mockResolvedValueOnce({
    status: 200,
    body,
    headers: {}
  } as unknown as Awaited<ReturnType<typeof apiRequest>>)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockApiResponseVoid(): any {
  return mockedApiRequest.mockResolvedValueOnce({
    status: 200,
    body: {},
    headers: {}
  } as unknown as Awaited<ReturnType<typeof apiRequest>>)
}

describe('WireMockWebhookProvider', () => {
  let provider: WireMockWebhookProvider

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider = new WireMockWebhookProvider(WIREMOCK_URL, mockRequest as any)
    mockedApiRequest.mockReset()
  })

  describe('getReceivedWebhooks', () => {
    it('should call apiRequest and map WireMock requests', async () => {
      const wmReq = makeWireMockRequest('req-1', { event: 'finished' })
      mockApiResponse({
        requests: [wmReq],
        meta: { total: 1 },
        requestJournalDisabled: false
      })

      const webhooks = await provider.getReceivedWebhooks()

      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/requests',
          baseUrl: `${WIREMOCK_URL}/__admin`
        })
      )
      expect(webhooks).toHaveLength(1)
      expect(webhooks[0]!.id).toBe('req-1')
      expect(webhooks[0]!.body).toEqual({ event: 'finished' })
      expect(webhooks[0]!.method).toBe('POST')
    })

    it('should handle non-JSON body gracefully', async () => {
      const wmReq = makeWireMockRequest('req-1', {})
      wmReq.request.body = 'not-json'
      mockApiResponse({
        requests: [wmReq],
        meta: { total: 1 },
        requestJournalDisabled: false
      })

      const webhooks = await provider.getReceivedWebhooks()
      expect(webhooks[0]!.body).toBe('not-json')
    })

    it('should filter by since', async () => {
      const oldReq = makeWireMockRequest('old', { event: 'old' })
      oldReq.loggedDate = new Date('2025-01-01').getTime()
      const newReq = makeWireMockRequest('new', { event: 'new' })
      newReq.loggedDate = new Date('2026-06-01').getTime()

      mockApiResponse({
        requests: [oldReq, newReq],
        meta: { total: 2 },
        requestJournalDisabled: false
      })

      const webhooks = await provider.getReceivedWebhooks({
        since: new Date('2026-01-01')
      })

      expect(webhooks).toHaveLength(1)
      expect(webhooks[0]!.id).toBe('new')
    })

    it('should filter by method', async () => {
      const postReq = makeWireMockRequest('p', { event: 'a' })
      const getReq = makeWireMockRequest('g', { event: 'b' }, {
        method: 'GET'
      } as Partial<WireMockRequest['request']>)

      mockApiResponse({
        requests: [postReq, getReq],
        meta: { total: 2 },
        requestJournalDisabled: false
      })

      const webhooks = await provider.getReceivedWebhooks({ method: 'POST' })
      expect(webhooks).toHaveLength(1)
      expect(webhooks[0]!.id).toBe('p')
    })

    it('should filter by urlPattern', async () => {
      const matchReq = makeWireMockRequest('m', { event: 'a' }, {
        absoluteUrl: `${WIREMOCK_URL}/webhook/v1`
      } as Partial<WireMockRequest['request']>)
      const noMatchReq = makeWireMockRequest('n', { event: 'b' }, {
        absoluteUrl: `${WIREMOCK_URL}/other`
      } as Partial<WireMockRequest['request']>)

      mockApiResponse({
        requests: [matchReq, noMatchReq],
        meta: { total: 2 },
        requestJournalDisabled: false
      })

      const webhooks = await provider.getReceivedWebhooks({
        urlPattern: '/webhook'
      })
      expect(webhooks).toHaveLength(1)
      expect(webhooks[0]!.id).toBe('m')
    })

    it('should throw on invalid urlPattern regex', async () => {
      mockApiResponse({
        requests: [makeWireMockRequest('1', {})],
        meta: { total: 1 },
        requestJournalDisabled: false
      })

      await expect(
        provider.getReceivedWebhooks({ urlPattern: '[invalid' })
      ).rejects.toThrow('Invalid urlPattern regex')
    })
  })

  describe('resetJournal', () => {
    it('should call apiRequest with DELETE /requests', async () => {
      mockApiResponseVoid()

      await provider.resetJournal()

      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          path: '/requests',
          baseUrl: `${WIREMOCK_URL}/__admin`
        })
      )
    })
  })

  describe('deleteById', () => {
    it('should call apiRequest with DELETE /requests/{id}', async () => {
      mockApiResponseVoid()

      await provider.deleteById('req-123')

      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          path: '/requests/req-123',
          baseUrl: `${WIREMOCK_URL}/__admin`
        })
      )
    })
  })

  describe('getCount', () => {
    it('should POST criteria and return count', async () => {
      mockApiResponse({ count: 5 })

      const criteria = { method: 'POST', url: '/webhook' }
      const count = await provider.getCount(criteria)

      expect(count).toBe(5)
      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/requests/count',
          body: criteria
        })
      )
    })

    it('should send empty object when no criteria', async () => {
      mockApiResponse({ count: 10 })

      await provider.getCount()

      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {}
        })
      )
    })
  })

  describe('removeByCriteria', () => {
    it('should POST criteria to remove endpoint', async () => {
      mockApiResponseVoid()

      const criteria = {
        method: 'POST',
        urlPattern: '/webhook.*',
        headers: { 'Content-Type': { matches: '.*/json' } }
      }
      await provider.removeByCriteria(criteria)

      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/requests/remove',
          body: criteria
        })
      )
    })
  })

  describe('URL normalization', () => {
    it('should strip trailing slash from base URL', async () => {
      const p = new WireMockWebhookProvider(
        'http://localhost:5025/',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockRequest as any
      )
      mockApiResponse({
        requests: [],
        meta: { total: 0 },
        requestJournalDisabled: false
      })

      await p.getReceivedWebhooks()

      expect(mockedApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://localhost:5025/__admin'
        })
      )
    })
  })
})
