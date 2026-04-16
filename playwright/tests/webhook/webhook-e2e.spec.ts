/**
 * E2E test demonstrating the webhook testing module.
 *
 * Uses the sample-app's built-in webhook receiver (WireMock-compatible format)
 * to verify that movie CRUD operations trigger webhooks with correct payloads.
 */

import { test, expect } from '../../support/merged-fixtures'
import { WebhookTimeoutError, webhookTemplate } from '../../../src/webhook'
import { generateMovieWithoutId } from '../../support/utils/movie-factories'
import { log } from 'src/log'

// Template factories for movie webhooks
// 15s timeout: the Kafka → HTTP webhook delivery pipeline can back up under
// high CI concurrency (burn-in with many parallel workers). 10s was occasionally
// not enough; 15s gives the pipeline headroom without slowing normal runs.
const movieCreated = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.created')
    .matchField('event', 'movie.created')
    .matchField('data.id', movieId)
    .withTimeout(15_000)
    .withInterval(500)
    .build()

const movieDeleted = (movieId: number) =>
  webhookTemplate<{ event: string; data: { id: number } }>('movie.deleted')
    .matchField('event', 'movie.deleted')
    .matchField('data.id', movieId)
    .withTimeout(15_000)
    .withInterval(500)
    .build()

test.describe('Webhook module E2E', () => {
  test('movie creation triggers a webhook with correct payload', async ({
    authToken,
    addMovie,
    deleteMovie,
    webhookRegistry
  }) => {
    const movie = generateMovieWithoutId()
    const { body: createResponse } = await addMovie(authToken, movie)
    const movieId = createResponse.data.id

    await log.step('Wait for the create webhook')
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

    await deleteMovie(authToken, movieId)
  })

  test('movie deletion triggers a webhook with correct payload', async ({
    authToken,
    addMovie,
    deleteMovie,
    webhookRegistry
  }) => {
    const movie = generateMovieWithoutId()
    const { body: createResponse } = await addMovie(authToken, movie)
    const movieId = createResponse.data.id

    await log.step('Drain the create webhook before testing the delete path')
    await webhookRegistry.waitFor(movieCreated(movieId))

    await deleteMovie(authToken, movieId)

    await log.step('Wait for the delete webhook')
    const webhook = await webhookRegistry.waitFor(movieDeleted(movieId))

    expect(webhook.body).toMatchObject({
      event: 'movie.deleted',
      data: { id: movieId, name: movie.name }
    })
  })

  test('getReceived returns all webhooks since test start', async ({
    authToken,
    addMovie,
    deleteMovie,
    webhookRegistry
  }) => {
    const movie = generateMovieWithoutId()
    const { body: createResponse } = await addMovie(authToken, movie)
    const movieId = createResponse.data.id

    await log.step('Wait for the create webhook')
    await webhookRegistry.waitFor(movieCreated(movieId))

    const all = await webhookRegistry.getReceived()
    expect(all.length).toBeGreaterThanOrEqual(1)

    const match = all.find(
      (w) =>
        (w.body as { event: string; data: { id: number } }).data.id === movieId
    )
    expect(match).toBeDefined()

    await log.step(
      'Method filter — all sample-app webhooks are delivered via POST'
    )
    const postOnly = await webhookRegistry.getReceived({ method: 'POST' })
    expect(postOnly.length).toBeGreaterThanOrEqual(1)
    expect(postOnly.every((w) => w.method === 'POST')).toBe(true)

    await log.step('URL pattern filter — match the webhooks endpoint path')
    const byUrl = await webhookRegistry.getReceived({ urlPattern: '/webhooks' })
    expect(byUrl.length).toBeGreaterThanOrEqual(1)
    expect(byUrl.every((w) => w.url.includes('/webhooks'))).toBe(true)

    await deleteMovie(authToken, movieId)
  })

  test('matchPartial matches a subset of the webhook payload', async ({
    authToken,
    addMovie,
    deleteMovie,
    webhookRegistry
  }) => {
    const movie = generateMovieWithoutId()
    const { body: createResponse } = await addMovie(authToken, movie)
    const movieId = createResponse.data.id

    await log.step(
      'matchPartial checks a subset — extra fields in the payload are ignored'
    )
    const partialTemplate = webhookTemplate<{
      event: string
      data: { id: number; name: string }
    }>('movie.created.partial')
      .matchPartial({ event: 'movie.created', data: { id: movieId } })
      .withTimeout(10_000)
      .withInterval(500)
      .build()

    const webhook = await webhookRegistry.waitFor(partialTemplate)

    expect(webhook.body.data.id).toBe(movieId)
    expect(webhook.body.data.name).toBe(movie.name)

    await deleteMovie(authToken, movieId)
  })

  test('waitForCount collects multiple matching webhooks', async ({
    authToken,
    addMovie,
    deleteMovie,
    webhookRegistry
  }) => {
    await log.step('Create two movies concurrently')
    const [{ body: res1 }, { body: res2 }] = await Promise.all([
      addMovie(authToken, generateMovieWithoutId()),
      addMovie(authToken, generateMovieWithoutId())
    ])

    const [id1, id2] = [res1.data.id, res2.data.id]

    await log.step(
      'Template filters by ID so parallel workers don not cross-contaminate'
    )
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

    const webhooks = await webhookRegistry.waitForCount(batchTemplate, 2)

    expect(webhooks).toHaveLength(2)
    const receivedIds = webhooks.map((w) => w.body.data.id)
    expect(receivedIds).toContain(id1)
    expect(receivedIds).toContain(id2)

    await Promise.all([
      deleteMovie(authToken, id1),
      deleteMovie(authToken, id2)
    ])
  })

  test('waitFor throws WebhookTimeoutError with matcher details when no matching webhook arrives', async ({
    webhookRegistry
  }) => {
    const neverArrivingTemplate = webhookTemplate('never.arrives')
      .matchField('event', 'event.that.never.happens')
      .withTimeout(500)
      .withInterval(100)
      .build()

    const [waitResult] = await Promise.allSettled([
      webhookRegistry.waitFor(neverArrivingTemplate)
    ])

    expect(waitResult.status).toBe('rejected')
    if (waitResult.status !== 'rejected') {
      throw new Error(
        'Expected webhook wait to reject with WebhookTimeoutError'
      )
    }

    const error = waitResult.reason as WebhookTimeoutError
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

  test('movie update triggers a webhook — combined field and partial matchers', async ({
    authToken,
    addMovie,
    updateMovie,
    deleteMovie,
    webhookRegistry
  }) => {
    const movie = generateMovieWithoutId()
    const { body: createResponse } = await addMovie(authToken, movie)
    const movieId = createResponse.data.id

    await log.step('Drain the create webhook before testing the update path')
    await webhookRegistry.waitFor(movieCreated(movieId))

    const nameUpdate = { name: 'Updated: ' + movie.name }
    await updateMovie(authToken, movieId, nameUpdate)

    await log.step(
      'Combined field + partial: both matchers must pass for a webhook to match'
    )
    const updateTemplate = webhookTemplate<{
      event: string
      data: { id: number; name: string }
    }>('movie.updated')
      .matchField('event', 'movie.updated')
      .matchPartial({ data: { id: movieId, name: nameUpdate.name } })
      .withTimeout(10_000)
      .withInterval(500)
      .build()

    const webhook = await webhookRegistry.waitFor(updateTemplate)

    expect(webhook.body).toMatchObject({
      event: 'movie.updated',
      timestamp: expect.any(String),
      data: {
        id: movieId,
        name: nameUpdate.name
      }
    })

    await deleteMovie(authToken, movieId)
  })

  test('matchPredicate filters by business data in the payload', async ({
    authToken,
    addMovie,
    deleteMovie,
    webhookRegistry
  }) => {
    // Pin rating above 9 so the predicate does real filtering work
    const movie = { ...generateMovieWithoutId(), rating: 9.5 }
    const { body: createResponse } = await addMovie(authToken, movie)
    const movieId = createResponse.data.id

    const highRatingTemplate = webhookTemplate<{
      event: string
      data: { id: number; rating: number }
    }>('movie.created.high-rating')
      .matchField('event', 'movie.created')
      .matchPredicate(
        `data.id is ${movieId} and data.rating >= 9`,
        (p) => p.data.id === movieId && p.data.rating >= 9
      )
      .withTimeout(10_000)
      .withInterval(500)
      .build()

    const webhook = await webhookRegistry.waitFor(highRatingTemplate)

    expect(webhook.body.data.id).toBe(movieId)
    expect(webhook.body.data.rating).toBeGreaterThanOrEqual(9)

    await deleteMovie(authToken, movieId)
  })

  test('WebhookTimeoutError.receivedWebhooks contains the actual received payloads', async ({
    authToken,
    addMovie,
    deleteMovie,
    webhookRegistry
  }) => {
    const movie = generateMovieWithoutId()
    const { body: createResponse } = await addMovie(authToken, movie)
    const movieId = createResponse.data.id

    await log.step('Wait for create webhook — puts it in the journal')
    await webhookRegistry.waitFor(movieCreated(movieId))

    await log.step(
      'Wait for a delete webhook that will never arrive — no delete was called'
    )
    const undeliveredDelete = webhookTemplate<{
      event: string
      data: { id: number }
    }>('movie.deleted.not.delivered')
      .matchField('event', 'movie.deleted')
      .matchField('data.id', movieId)
      .withTimeout(2_000)
      .withInterval(200)
      .build()

    const [waitResult] = await Promise.allSettled([
      webhookRegistry.waitFor(undeliveredDelete)
    ])

    expect(waitResult.status).toBe('rejected')
    if (waitResult.status !== 'rejected') {
      throw new Error('Expected WebhookTimeoutError')
    }

    const error = waitResult.reason as WebhookTimeoutError
    expect(error).toBeInstanceOf(WebhookTimeoutError)
    expect(error.totalReceived).toBeGreaterThanOrEqual(1)
    expect(error.receivedWebhooks.length).toBeGreaterThanOrEqual(1)

    await log.step(
      'The movie.created webhook that did arrive should be visible in the error'
    )
    const createdWebhook = error.receivedWebhooks.find(
      (w) =>
        (w.body as { event: string; data: { id: number } }).data.id === movieId
    )
    expect(createdWebhook).toBeDefined()
    expect((createdWebhook!.body as { event: string }).event).toBe(
      'movie.created'
    )

    await deleteMovie(authToken, movieId)
  })
})
