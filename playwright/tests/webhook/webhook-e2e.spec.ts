/**
 * E2E test demonstrating the webhook testing module.
 *
 * Uses the sample-app's built-in webhook receiver (WireMock-compatible format)
 * to verify that movie CRUD operations trigger webhooks with correct payloads.
 */

import { test as base, mergeTests, expect } from '@playwright/test'
import { test as apiRequestFixture } from '../../../src/api-request/fixtures'
import { test as webhookFixture } from '../../../src/webhook/fixtures'
import {
  WireMockWebhookProvider,
  WebhookTimeoutError,
  webhookTemplate
} from '../../../src/webhook'
import { generateMovieWithoutId } from '../../support/utils/movie-factories'

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001'

// Wire up the webhook provider pointing to the sample-app's built-in receiver
const providerFixture = base.extend<{
  webhookProvider: WireMockWebhookProvider
}>({
  webhookProvider: async ({ request }, use) => {
    const provider = new WireMockWebhookProvider(API_URL, request)
    await use(provider)
  }
})

const test = mergeTests(
  base,
  apiRequestFixture,
  webhookFixture,
  providerFixture
)

// Use matched-only cleanup to prevent a concurrent test's full-reset from
// wiping the journal between our two sequential waitFor calls (race condition
// with fullyParallel: true). Each test only deletes the webhooks it matched.
test.use({ webhookConfig: { cleanupStrategy: 'matched-only' } })

// Auth helper — sample-app uses cookie-based auth with identity
async function getAdminAuthToken(
  apiRequest: Parameters<Parameters<typeof test>[2]>[0]['apiRequest']
): Promise<string> {
  const { body } = await apiRequest<{ token: string }>({
    method: 'POST',
    path: '/auth/identity-token',
    baseUrl: API_URL,
    body: { username: 'admin', password: 'admin', userIdentifier: 'admin' }
  })
  return body.token
}

// Template factories for movie webhooks
const movieCreated = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.created')
    .matchField('event', 'movie.created')
    .matchField('data.id', movieId)
    .withTimeout(10_000)
    .withInterval(500)
    .build()

const movieDeleted = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.deleted')
    .matchField('event', 'movie.deleted')
    .matchField('data.id', movieId)
    .withTimeout(10_000)
    .withInterval(500)
    .build()

test.describe('Webhook module E2E', () => {
  test('movie creation triggers a webhook with correct payload', async ({
    apiRequest,
    webhookRegistry
  }) => {
    const token = await getAdminAuthToken(apiRequest)
    const movie = generateMovieWithoutId()

    const { body: createResponse } = await apiRequest<{
      data: { id: number; name: string }
    }>({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movie,
      headers: { Cookie: `app-jwt=${token}` }
    })

    const movieId = createResponse.data.id

    try {
      const webhook = await webhookRegistry.waitFor(movieCreated(movieId))

      expect(webhook.body).toMatchObject({
        event: 'movie.created',
        timestamp: expect.any(String),
        data: {
          id: movieId,
          name: movie.name,
          year: movie.year,
          rating: movie.rating
        }
      })
    } finally {
      await apiRequest({
        method: 'DELETE',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: { Cookie: `app-jwt=${token}` }
      })
    }
  })

  test('movie deletion triggers a webhook with correct payload', async ({
    apiRequest,
    webhookRegistry
  }) => {
    const token = await getAdminAuthToken(apiRequest)
    const movie = generateMovieWithoutId()

    const { body: createResponse } = await apiRequest<{
      data: { id: number }
    }>({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movie,
      headers: { Cookie: `app-jwt=${token}` }
    })

    const movieId = createResponse.data.id
    let wasDeleted = false

    try {
      // Drain the create webhook before testing the delete path
      await webhookRegistry.waitFor(movieCreated(movieId))

      await apiRequest({
        method: 'DELETE',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: { Cookie: `app-jwt=${token}` }
      })
      wasDeleted = true

      const webhook = await webhookRegistry.waitFor(movieDeleted(movieId))

      expect(webhook.body).toMatchObject({
        event: 'movie.deleted',
        data: { id: movieId, name: movie.name }
      })
    } finally {
      if (!wasDeleted) {
        await apiRequest({
          method: 'DELETE',
          path: `/movies/${movieId}`,
          baseUrl: API_URL,
          headers: { Cookie: `app-jwt=${token}` }
        })
      }
    }
  })

  test('getReceived returns all webhooks since test start', async ({
    apiRequest,
    webhookRegistry
  }) => {
    const token = await getAdminAuthToken(apiRequest)
    const movie = generateMovieWithoutId()

    const { body: createResponse } = await apiRequest<{
      data: { id: number }
    }>({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movie,
      headers: { Cookie: `app-jwt=${token}` }
    })

    const movieId = createResponse.data.id

    try {
      await webhookRegistry.waitFor(movieCreated(movieId))

      const all = await webhookRegistry.getReceived()
      expect(all.length).toBeGreaterThanOrEqual(1)

      const match = all.find(
        (w) =>
          (w.body as { event: string; data: { id: number } }).data.id ===
          movieId
      )
      expect(match).toBeDefined()

      // Method filter — all sample-app webhooks are delivered via POST
      const postOnly = await webhookRegistry.getReceived({ method: 'POST' })
      expect(postOnly.length).toBeGreaterThanOrEqual(1)
      expect(postOnly.every((w) => w.method === 'POST')).toBe(true)
    } finally {
      await apiRequest({
        method: 'DELETE',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: { Cookie: `app-jwt=${token}` }
      })
    }
  })

  test('matchPartial matches a subset of the webhook payload', async ({
    apiRequest,
    webhookRegistry
  }) => {
    const token = await getAdminAuthToken(apiRequest)
    const movie = generateMovieWithoutId()

    const { body: createResponse } = await apiRequest<{
      data: { id: number }
    }>({
      method: 'POST',
      path: '/movies',
      baseUrl: API_URL,
      body: movie,
      headers: { Cookie: `app-jwt=${token}` }
    })

    const movieId = createResponse.data.id

    // matchPartial checks a subset — extra fields in the payload are ignored
    const partialTemplate = webhookTemplate<{
      event: string
      data: { id: number; name: string }
    }>('movie.created.partial')
      .matchPartial({ event: 'movie.created', data: { id: movieId } })
      .withTimeout(10_000)
      .withInterval(500)
      .build()

    try {
      const webhook = await webhookRegistry.waitFor(partialTemplate)

      expect(webhook.body.data.id).toBe(movieId)
      expect(webhook.body.data.name).toBe(movie.name)
    } finally {
      await apiRequest({
        method: 'DELETE',
        path: `/movies/${movieId}`,
        baseUrl: API_URL,
        headers: { Cookie: `app-jwt=${token}` }
      })
    }
  })

  test('waitForCount collects multiple matching webhooks', async ({
    apiRequest,
    webhookRegistry
  }) => {
    const token = await getAdminAuthToken(apiRequest)

    // Create two movies concurrently
    const [{ body: res1 }, { body: res2 }] = await Promise.all([
      apiRequest<{ data: { id: number } }>({
        method: 'POST',
        path: '/movies',
        baseUrl: API_URL,
        body: generateMovieWithoutId(),
        headers: { Cookie: `app-jwt=${token}` }
      }),
      apiRequest<{ data: { id: number } }>({
        method: 'POST',
        path: '/movies',
        baseUrl: API_URL,
        body: generateMovieWithoutId(),
        headers: { Cookie: `app-jwt=${token}` }
      })
    ])

    const [id1, id2] = [res1.data.id, res2.data.id]

    // Template filters by ID so parallel workers don't cross-contaminate
    const batchTemplate = webhookTemplate<{
      event: string
      data: { id: number }
    }>('movie.created.batch')
      .matchField('event', 'movie.created')
      .matchPredicate(
        `data.id is ${id1} or ${id2}`,
        (p) => p.data.id === id1 || p.data.id === id2
      )
      .withTimeout(15_000)
      .withInterval(500)
      .build()

    try {
      const webhooks = await webhookRegistry.waitForCount(batchTemplate, 2)

      expect(webhooks).toHaveLength(2)
      const receivedIds = webhooks.map((w) => w.body.data.id)
      expect(receivedIds).toContain(id1)
      expect(receivedIds).toContain(id2)
    } finally {
      await Promise.all([
        apiRequest({
          method: 'DELETE',
          path: `/movies/${id1}`,
          baseUrl: API_URL,
          headers: { Cookie: `app-jwt=${token}` }
        }),
        apiRequest({
          method: 'DELETE',
          path: `/movies/${id2}`,
          baseUrl: API_URL,
          headers: { Cookie: `app-jwt=${token}` }
        })
      ])
    }
  })

  test('waitFor throws WebhookTimeoutError with matcher details when no matching webhook arrives', async ({
    webhookRegistry
  }) => {
    const neverArrivingTemplate = webhookTemplate('never.arrives')
      .matchField('event', 'event.that.never.happens')
      .withTimeout(500)
      .withInterval(100)
      .build()

    // Use .catch to capture the error for field-level assertions
    const error = await webhookRegistry
      .waitFor(neverArrivingTemplate)
      .catch((e) => e)

    expect(error).toBeInstanceOf(WebhookTimeoutError)
    expect(error.templateName).toBe('never.arrives')
    expect(error.timeoutMs).toBe(500)
    expect(error.toJSON()).toMatchObject({
      name: 'WebhookTimeoutError',
      templateName: 'never.arrives',
      timeoutMs: 500,
      totalReceived: expect.any(Number),
      matcherDetails: ['field(event="event.that.never.happens")']
    })
  })
})
