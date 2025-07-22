/* eslint-disable @typescript-eslint/no-explicit-any */
// utilities for polling and retrying operations using Playwright's expect.poll mechanism
import { expect } from '@playwright/test'
import { getLogger } from '../internal'

/** default options for the recurse function */
const RecurseDefaults = {
  timeout: 30000, // 30 seconds
  interval: 1000, // 1 second
  log: false
}

/** data passed to log function */
type RecurseLogData = {
  value: any
  iteration: number
  elapsed: number
  timeout: number
  successful: boolean
}

/** data passed to post function */
type RecursePostData<T> = {
  value: T
  iteration: number
  elapsed: number
  timeout: number
  successful: boolean
}

type RecurseOptions = {
  timeout?: number
  interval?: number
  log?: boolean | string | ((value: any, data: RecurseLogData) => void)
  error?: string
  post?: (data: RecursePostData<any>) => void | Promise<void>
}

/** state object that contains all shared polling information */
type RecurseState<T> = {
  command: () => Promise<T>
  predicate: (value: T) => boolean | void
  options: RecurseOptions
  timeout: number
  interval: number
  errorMessage: string
  startTime: number
  iteration: number
  lastValue: T | null
  wasSuccessful: boolean
}

/**
 * Creates a state object with shared information for the polling operation
 * @example
 * const state = createPollingState(
 *   () => fetchData(),
 *   (data) => data.status === 'ready',
 *   { timeout: 5000, interval: 500 }
 * )
 */
const createPollingState = <T>(
  command: () => Promise<T>,
  predicate: (value: T) => boolean | void,
  options: RecurseOptions = {}
): RecurseState<T> => ({
  command,
  predicate,
  options,
  timeout: options.timeout ?? RecurseDefaults.timeout,
  interval: options.interval ?? RecurseDefaults.interval,
  errorMessage:
    options.error ??
    'Recursion timed out without finding a value that satisfies the predicate',
  startTime: Date.now(),
  iteration: 0,
  lastValue: null,
  wasSuccessful: false
})

const getElapsedTime = (startTime: number): number => Date.now() - startTime

/**
 * Logs attempts during polling with their status
 * @example
 * // logs: "Attempt #2 (1500ms): RETRY"
 * await logAttempt(state, value, false)
 *
 * // logs: "Attempt #3 (2000ms): SUCCESS"
 * await logAttempt(state, value, true)
 */
const logAttempt = async <T>(
  state: RecurseState<T>,
  value: T,
  successful: boolean
) => {
  if (!state.options.log) return

  const elapsed = getElapsedTime(state.startTime)
  const { iteration, timeout } = state

  if (typeof state.options.log === 'function') {
    state.options.log(value, {
      value,
      iteration,
      elapsed,
      timeout,
      successful
    })
  }

  if (typeof state.options.log === 'string') {
    // For string logs, we don't log individual attempts
    // The final success will be logged in logSuccess()
    return
  }

  if (successful) {
    await getLogger().success(`Attempt #${iteration} (${elapsed}ms): SUCCESS`)
  } else {
    await getLogger().info(`Attempt #${iteration} (${elapsed}ms): RETRY`)
  }
}

/**
 * Logs the beginning of a polling operation
 * @example
 * // logs: "Polling until condition is met (timeout: 30000ms, interval: 1000ms)"
 * await logInitialStep(state)
 */
const logInitialStep = async <T>(state: RecurseState<T>) => {
  const { options, timeout, interval } = state

  if (options.log && typeof options.log === 'string') {
    await getLogger().step(`Polling: ${options.log}`)
  } else {
    await getLogger().step(
      `Polling until condition is met (timeout: ${timeout}ms, interval: ${interval}ms)`
    )
  }
}

/**
 * Logs the successful completion of a polling operation
 * @example
 * // logs: "Polling completed successfully after 3 iterations"
 * await logSuccess(state)
 */
const logSuccess = async <T>(state: RecurseState<T>) => {
  const { options, iteration, wasSuccessful } = state

  if (!wasSuccessful || !options.log) return

  if (typeof options.log === 'string') {
    await getLogger().step(
      `✅ ${options.log} - completed successfully after ${iteration} iterations`
    )
  } else {
    await getLogger().step(
      `✅ Polling completed successfully after ${iteration} iterations`
    )
  }
}

/**
 * Executes the post callback function if configured
 * @example
 * // Will call options.post with the result data
 * await executePostCallback(state)
 */
const executePostCallback = async <T>(state: RecurseState<T>) => {
  const { options, wasSuccessful, lastValue, startTime, iteration, timeout } =
    state

  if (!options.post || !wasSuccessful || !lastValue) return

  const elapsed = getElapsedTime(startTime)
  const postData: RecursePostData<T> = {
    value: lastValue,
    iteration,
    elapsed,
    timeout,
    successful: wasSuccessful
  }

  await options.post(postData)
}

/**
 * Core polling implementation using Playwright's `expect.poll`
 * https://playwright.dev/docs/test-assertions#expectpoll
 * @example
 * // Repeatedly calls the command function until predicate returns true
 * await executePolling(state)
 */
const executePolling = async <T>(state: RecurseState<T>) => {
  await expect
    .poll(
      async () => {
        state.iteration += 1
        const value = await state.command()
        state.lastValue = value

        let successful = false
        try {
          // Handle both boolean returns and assertions that might throw
          const result = state.predicate(value)
          // If predicate doesn't return anything but has assertions,
          // treat as true since it didn't throw
          successful = result === undefined ? true : !!result
        } catch {
          // If assertion fails, treat as false
          successful = false
        }

        await logAttempt(state, value, successful)

        if (successful) {
          state.wasSuccessful = true
          return true
        }

        return false
      },
      {
        message: state.errorMessage,
        timeout: state.timeout,
        intervals: [state.interval]
      }
    )
    .toBeTruthy()
}

// Legacy type for compatibility with existing code that might use it
export type RecurseParams<T> = {
  command: () => Promise<T>
  predicate: (value: T) => boolean | void
  options?: RecurseOptions
}

/**
 * Re-runs a function until the predicate returns true or timeout is reached
 * Similar to cypress-recurse API but using Playwright's expect.poll
 *
 * @param command Function that returns a value to test
 * @param predicate Function that tests the value and returns true when the condition is met
 * @param options Configuration options
 * @returns The value from the command function when predicate returns true
 *
 * @example
 * // Poll until session becomes active
 * test('wait for activation', async ({ recurse }) => {
 *   const session = await recurse(
 *     () => apiRequest({ method: 'GET', url: '/session' }),
 *     (response) => response.body.status === 'ACTIVE',
 *     { timeout: 60000, interval: 2000 }
 *   );
 *
 *   expect(session.body.id).toBeDefined();
 * });
 *
 * @example
 * // Poll with custom logging
 * test('custom logging', async ({ recurse }) => {
 *   await recurse(
 *     () => fetchData(),
 *     (data) => data.isReady,
 *     {
 *       log: 'Waiting for data to be ready',
 *       timeout: 15000
 *     }
 *   );
 * });
 */
/**
 * Re-runs a function until the predicate returns true or timeout is reached
 * This follows the cypress-recurse API but uses Playwright's expect.poll
 *
 * @param command Function that returns a value to test
 * @param predicate Function that tests the value and returns true when the condition is met
 * @param options Configuration options
 * @returns The value from the command function when predicate returns true
 */
export async function recurse<T>(
  command: () => Promise<T>,
  predicate: (value: T) => boolean | void,
  options: RecurseOptions = {}
): Promise<T> {
  // create the shared polling state
  const state = createPollingState(command, predicate, options)

  await logInitialStep(state)

  await executePolling(state)

  await logSuccess(state)

  await executePostCallback(state)

  // validate and return the result
  if (!state.lastValue) {
    throw new Error('Recursion completed but no value was stored')
  }

  return state.lastValue
}
