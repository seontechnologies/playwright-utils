import { test as base } from '@playwright/test'
import { apiRequest as apiRequestFunction } from './api-request'
import type { ApiRequestParams, ApiRequestResponse } from './api-request'

export const test = base.extend<{
  /**
   * Simplified helper for making API requests and returning the status and JSON body.
   * This helper automatically performs the request based on the provided method, path, body, and headers.
   * It handles URL construction with proper slash handling and response parsing based on content type.
   *
   * @example
   * // GET request to an endpoint
   * test('fetch user data', async ({ apiRequest }) => {
   *   const { status, body } = await apiRequest<UserResponse>({
   *     method: 'GET',
   *     url: '/api/users/123',
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
   *     url: '/api/items',
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
    params: ApiRequestParams
  ) => Promise<ApiRequestResponse<T>>
}>({
  apiRequest: async ({ request, baseURL }, use) => {
    const apiRequest = async <T = unknown>({
      method,
      path,
      baseUrl,
      configBaseUrl = baseURL,
      body = null,
      headers,
      params
    }: ApiRequestParams): Promise<ApiRequestResponse<T>> => {
      const response = await apiRequestFunction({
        request,
        method,
        path,
        baseUrl,
        configBaseUrl,
        body,
        headers,
        params
      })

      return {
        status: response.status,
        body: response.body as T
      }
    }

    await use(apiRequest)
  }
})
