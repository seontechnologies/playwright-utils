/**
 * E2E test demonstrating the webhook testing module.
 *
 * Uses the sample-app's built-in webhook receiver (WireMock-compatible format)
 * to verify that movie CRUD operations trigger webhooks with correct payloads.
 */

import { test as base, mergeTests, expect } from '@playwright/test'
import { test as apiRequestFixture } from '../../../src/api-request/fixtures'
import { test as webhookFixture } from '../../../src/webhook/fixtures'
import { WireMockWebhookProvider, webhookTemplate } from '../../../src/webhook'
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

    // Create a movie via API
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

    // Wait for the webhook using the registry
    const webhook = await webhookRegistry.waitFor(movieCreated(movieId))

    // Assert on the webhook payload
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

    // Cleanup: delete the movie
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${movieId}`,
      baseUrl: API_URL,
      headers: { Cookie: `app-jwt=${token}` }
    })
  })

  test('movie deletion triggers a webhook with correct payload', async ({
    apiRequest,
    webhookRegistry
  }) => {
    const token = await getAdminAuthToken(apiRequest)
    const movie = generateMovieWithoutId()

    // Create a movie first
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

    // Wait for create webhook to arrive (so it doesn't interfere with delete check)
    await webhookRegistry.waitFor(movieCreated(movieId))

    // Delete the movie
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${movieId}`,
      baseUrl: API_URL,
      headers: { Cookie: `app-jwt=${token}` }
    })

    // Wait for the delete webhook
    const webhook = await webhookRegistry.waitFor(movieDeleted(movieId))

    expect(webhook.body).toMatchObject({
      event: 'movie.deleted',
      data: { id: movieId, name: movie.name }
    })
  })

  test('getReceived returns all webhooks', async ({
    apiRequest,
    webhookRegistry
  }) => {
    const token = await getAdminAuthToken(apiRequest)
    const movie = generateMovieWithoutId()

    // Create a movie
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

    // Wait for webhook to arrive
    await webhookRegistry.waitFor(movieCreated(movieId))

    // Query all received webhooks
    const all = await webhookRegistry.getReceived()
    expect(all.length).toBeGreaterThanOrEqual(1)

    const match = all.find(
      (w) =>
        (w.body as { event: string; data: { id: number } }).data.id === movieId
    )
    expect(match).toBeDefined()

    // Cleanup
    await apiRequest({
      method: 'DELETE',
      path: `/movies/${movieId}`,
      baseUrl: API_URL,
      headers: { Cookie: `app-jwt=${token}` }
    })
  })
})
