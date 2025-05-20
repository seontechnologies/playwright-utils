// producing Kafka events is purely optional
// for them to be seen in action, the provider repo has to be started
// docker has to be started, and kafka:start script has be executed in the provider repo
// we have e2e tests in the provider that execute if kafka is up
// the real intent is to test events with pact while no kafka is running

import { Kafka } from 'kafkajs'
import fs from 'node:fs/promises'
import type { MovieEvent, MovieAction, Movie } from '@shared/types'
import { logFilePath } from './log-file-path'

// Configure Kafka with improved connection handling
const kafka = new Kafka({
  clientId: 'movie-provider',
  // Use only localhost which matches the EXTERNAL advertised listener
  brokers: ['localhost:29092'],
  retry: {
    retries: 5,
    initialRetryTime: 1000, // Start with a longer initial retry
    maxRetryTime: 10000 // Increase max retry time
  },
  // Increase connection timeout for unreliable networks
  connectionTimeout: 30000,
  // Modify socket settings for better resilience
  socketFactory: ({ host, port }) => {
    const socket = require('net').connect({
      host,
      port,
      timeout: 30000 // Match the connection timeout
    })
    // Enable TCP keepalive to maintain connection
    socket.setKeepAlive(true, 5000) // Keepalive after 5 seconds of inactivity
    return socket
  }
})
// console log it and write the event to a file, so we can somewhat verify them
// in the real world, you might check db, other services, or any other external side effects
const logEvent = async (event: MovieEvent, logFilePath: string) => {
  console.table(event)

  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      await fs.appendFile(logFilePath, `${JSON.stringify(event)}\n`)
      resolve()
    }, 1000)
  })
}

/**
 * Produces a movie event, with a fallback mechanism that ensures events
 * are always captured to a local file regardless of Kafka availability.
 *
 * This pragmatic approach ensures CRUD works correctly while also reliably
 * capturing events for testing and verification.
 */
export const produceMovieEvent = async (movie: Movie, action: MovieAction) => {
  const event: MovieEvent = {
    topic: `movie-${action}`,
    messages: [{ key: movie.id.toString(), value: JSON.stringify(movie) }]
  }

  // Always log event to file first for reliable capture
  console.log(`Processing ${action} event for movie ${movie.id}`)
  await logEvent(event, logFilePath)

  // Set up a flag to track if Kafka publication succeeded
  let kafkaSuccess = false

  // Create a separate producer for this specific event
  const producer = kafka.producer()

  try {
    // Try to connect with a shorter timeout to avoid blocking the API response
    const connectPromise = producer.connect()

    // Race the connection with a timeout so we don't hang
    await Promise.race([
      connectPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Manual connection timeout')), 3000)
      )
    ])

    // If we get here, connection succeeded
    console.log(`Connected to Kafka, sending ${action} event...`)
    await producer.send(event)

    // Gracefully disconnect
    await producer.disconnect()
    console.log(`Successfully published ${action} event to Kafka`)
    kafkaSuccess = true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    // Silently fail Kafka connection - no console noise
    // Events are already safely captured to the log file

    // Clean up connection if needed
    try {
      await producer.disconnect().catch(() => {
        // Silently handle disconnect errors
      })
    } catch {
      // Ignore any final errors
    }
  }

  // Always return the event, regardless of Kafka availability
  const parsedEvent = parseEvent(event)

  // Add a flag to indicate if the event was published to Kafka
  return {
    ...parsedEvent,
    _meta: {
      kafkaPublished: kafkaSuccess,
      timestamp: new Date().toISOString(),
      loggedToFile: true
    }
  }
}

/**
 * Parses the Kafka event for Pact testing.
 *
 * Kafka requires the `messages.value` field to be stringified when sending the event,
 * but for Pact testing, we want to return the parsed object version of the event
 * to simulate the original message.
 *
 * @param {MovieEvent} event - The event that was sent to Kafka.
 * @returns {MovieEvent} - The parsed event with `messages.value` converted from a string to an object. */
const parseEvent = (event: MovieEvent) => ({
  ...event,
  messages: event.messages.map((msg) => ({
    key: msg.key,
    value: typeof msg.value === 'string' ? JSON.parse(msg.value) : msg.value
  }))
})
