export { interceptNetworkCall } from './intercept-network-call'
export type {
  InterceptNetworkCall,
  InterceptOptionsFixture,
  InterceptNetworkCallFn
} from './intercept-network-call'

// Export enhanced types and error classes
export type { NetworkCallResult } from './core/types'
export { NetworkInterceptError, NetworkTimeoutError } from './core/types'

// Note: Fixtures are exported separately via 'playwright-utils/fixtures'
// to avoid conflicts in the main index that only exports plain functions
