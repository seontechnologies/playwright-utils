import { setupWorker } from 'msw/browser'
import { http } from 'msw'

// Create worker with no default handlers
export const worker = setupWorker()

export { http }
