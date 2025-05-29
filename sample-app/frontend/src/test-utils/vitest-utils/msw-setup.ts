import { setupWorker } from 'msw/browser'
import { http } from 'msw'
import { authHandlers } from './auth-handlers'

// Create worker with default handlers for auth endpoints
export const worker = setupWorker(...authHandlers)

export { http }
