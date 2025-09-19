import { test as base } from '@playwright/test'
import { apiRequest as apiRequestFunction } from './api-request'
import type { ApiRequestParams } from './api-request'
import type { EnhancedApiPromise } from './schema-validation/internal/promise-extension'

/**
 * Type for the apiRequest fixture parameters - exactly like ApiRequestParams but without the 'request' property
 * which is handled internally by the fixture.
 */
export type ApiRequestFixtureParams = Omit<ApiRequestParams, 'request'>

export const test = base.extend<{
  /**
   * Simplified helper for making API requests and returning the status and JSON body.
   * This helper automatically performs the request based on the provided method, path, body, and headers.
   * It handles URL construction with proper slash handling and response parsing based on content type.
   *
   * IMPORTANT: When using the fixture version, you do NOT need to provide the 'request' parameter,
   * as it's automatically injected by the fixture.
   *
   * @example
   * // GET request to an endpoint
   * test('fetch user data', async ({ apiRequest }) => {
   *   const { status, body } = await apiRequest<UserResponse>({
   *     method: 'GET',
   *     path: '/api/users/123',  // Note: use 'path' not 'url'
   *     headers: { 'Authorization': 'Bearer token' }
   *   });
   *
   *   expect(status).toBe(200);
   *   expect(body.name).toBe('John Doe');
   * });
   *
   * @example
   * // POST request with a body
   * test('create new item', async ({ apiRequest }) => {
   *   const { status, body } = await apiRequest<CreateItemResponse>({
   *     method: 'POST',
   *     path: '/api/items',  // Note: use 'path' not 'url'
   *     baseUrl: 'https://api.example.com', // override default baseURL
   *     body: { name: 'New Item', price: 19.99 },
   *     headers: { 'Content-Type': 'application/json' }
   *   });
   *
   *   expect(status).toBe(201);
   *   expect(body.id).toBeDefined();
   * });
   */
  apiRequest: <T = unknown>(
    params: ApiRequestFixtureParams
  ) => EnhancedApiPromise<T>
}>({
  apiRequest: async ({ request, baseURL, page }, use) => {
    const apiRequest = <T = unknown>({
      method,
      path,
      baseUrl,
      configBaseUrl = baseURL,
      body = null,
      headers,
      params,
      uiMode = false,
      testStep
    }: ApiRequestFixtureParams): EnhancedApiPromise<T> => {
      return apiRequestFunction<T>({
        request,
        method,
        path,
        baseUrl,
        configBaseUrl,
        body,
        headers,
        params,
        uiMode,
        testStep,
        page // Pass page context for UI mode
      })
    }

    await use(apiRequest)
  }
})
