/**
 * Simple in-memory webhook receiver for E2E testing.
 *
 * Provides endpoints to:
 * - POST /webhooks         — receive a webhook (store it in memory)
 * - GET  /webhooks         — list all received webhooks
 * - DELETE /webhooks       — clear all received webhooks
 * - DELETE /webhooks/:id   — delete a single webhook by ID
 *
 * This acts as a minimal mock webhook server, similar to WireMock's
 * request journal, but built into the sample app for self-contained testing.
 */

import { Router } from 'express'
import crypto from 'node:crypto'

type StoredWebhook = {
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

const webhookJournal: StoredWebhook[] = []

export const webhookReceiverRoute = Router()

// Receive a webhook
webhookReceiverRoute.post('/', (req, res) => {
  const entry: StoredWebhook = {
    id: crypto.randomUUID(),
    request: {
      url: req.originalUrl,
      absoluteUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    },
    responseDefinition: {},
    loggedDate: Date.now(),
    loggedDateString: new Date().toISOString()
  }

  webhookJournal.push(entry)
  res.status(200).json({ status: 'ok' })
})

// List all received webhooks (WireMock-compatible format)
webhookReceiverRoute.get('/', (_req, res) => {
  res.status(200).json({
    requests: webhookJournal,
    meta: { total: webhookJournal.length },
    requestJournalDisabled: false
  })
})

// Clear all webhooks
webhookReceiverRoute.delete('/', (_req, res) => {
  webhookJournal.length = 0
  res.status(200).json({ status: 'ok' })
})

// Delete a single webhook by ID
webhookReceiverRoute.delete('/:id', (req, res) => {
  const index = webhookJournal.findIndex((w) => w.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Webhook not found' })
  }
  webhookJournal.splice(index, 1)
  return res.status(200).json({ status: 'ok' })
})

/**
 * Send a webhook to a target URL.
 * Called by the event system after movie CRUD operations.
 */
export async function sendWebhook(
  targetUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch {
    // Silently fail — webhook delivery is best-effort
  }
}
