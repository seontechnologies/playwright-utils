import { afterEach, beforeAll, afterAll } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { worker } from './msw-setup'

configure({ testIdAttribute: 'data-testid' })

afterEach(() => {
  cleanup()
})

// we need all this so msw works without flake in headless mode

beforeAll(async () => {
  await worker.start({ onUnhandledRequest: 'bypass' })
  if ('serviceWorker' in navigator) {
    await waitForServiceWorkerControl()
  }
})

afterAll(() => {
  // If you want to stop the worker eventually, do it here:
  worker.stop()
})

async function waitForServiceWorkerControl() {
  // If the page is already controlled, great
  if (navigator.serviceWorker.controller) return

  // Otherwise, wait up to ~2 seconds for it
  let attempts = 0
  while (!navigator.serviceWorker.controller && attempts < 20) {
    await new Promise((r) => setTimeout(r, 100))
    attempts++
  }
}
