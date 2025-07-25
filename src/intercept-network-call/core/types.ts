import type { Request, Response } from '@playwright/test'

/**
 * Generic network call result with typed request and response data
 */
export type NetworkCallResult<TRequest = unknown, TResponse = unknown> = {
  request: Request | null
  response: Response | null
  responseJson: TResponse
  status: number
  requestJson: TRequest
}

/**
 * Custom error for network interception operations
 */
export class NetworkInterceptError extends Error {
  constructor(
    message: string,
    public readonly operation: 'observe' | 'fulfill',
    public readonly url?: string,
    public readonly method?: string
  ) {
    super(message)
    this.name = 'NetworkInterceptError'
  }
}

/**
 * Timeout error for network operations
 */
export class NetworkTimeoutError extends NetworkInterceptError {
  constructor(
    message: string,
    operation: 'observe' | 'fulfill',
    public readonly timeoutMs: number,
    url?: string,
    method?: string
  ) {
    super(message, operation, url, method)
    this.name = 'NetworkTimeoutError'
  }
}
