import { test as base } from '@playwright/test'
import { apiRequest as apiRequestFunction } from './api-request'
import type {
  ApiRequestParams,
  OperationShape,
  OperationRequestParams
} from './api-request'
import type { EnhancedApiPromise } from './schema-validation/internal/promise-extension'
import { capturePageContext, clearPageContext } from '../internal/page-context'

/**
 * Type for the apiRequest fixture parameters - exactly like ApiRequestParams but without the 'request' property
 * which is handled internally by the fixture.
 */
export type ApiRequestFixtureParams = Omit<ApiRequestParams, 'request'>

/** Operation fixture params — like OperationRequestParams but without 'request' (injected by fixture) */
export type OperationRequestFixtureParams<Op extends OperationShape> = Omit<
  OperationRequestParams<Op>,
  'request'
>

type ApiRequestFixtureFn = {
  <Op extends OperationShape>(
    params: OperationRequestFixtureParams<Op>
  ): EnhancedApiPromise<Op['response']>
  <T = unknown>(params: ApiRequestFixtureParams): EnhancedApiPromise<T>
}

export const test = base.extend<{
  /**
   * Simplified helper for making API requests and returning the status and JSON body.
   * This helper automatically performs the request based on the provided method, path, body, and headers.
   * It handles URL construction with proper slash handling and response parsing based on content type.
   *
   * Supports two overloads:
   * - Classic: pass method, path, body, headers directly
   * - Operation-based: pass an operation object for automatic type inference
   *
   * IMPORTANT: When using the fixture version, you do NOT need to provide the 'request' parameter,
   * as it's automatically injected by the fixture.
   *
   * @example
   * // Classic: GET request to an endpoint
   * test('fetch user data', async ({ apiRequest }) => {
   *   const { status, body } = await apiRequest<UserResponse>({
   *     method: 'GET',
   *     path: '/api/users/123',
   *     headers: { 'Authorization': 'Bearer token' }
   *   });
   *
   *   expect(status).toBe(200);
   *   expect(body.name).toBe('John Doe');
   * });
   *
   * @example
   * // Operation-based: types inferred from the operation
   * test('create person', async ({ apiRequest }) => {
   *   const { status, body } = await apiRequest({
   *     operation: upsertPersonv2({ customerId }),
   *     headers: getHeaders(customerId),
   *     body: personInput,
   *   });
   *   // body is typed as the operation's response type
   * });
   */
  apiRequest: ApiRequestFixtureFn
}>({
  apiRequest: async ({ request, baseURL, page }, use) => {
    // Capture page context for plain function UI display support
    capturePageContext(page)

    const apiRequest: ApiRequestFixtureFn = ((
      params:
        | ApiRequestFixtureParams
        | OperationRequestFixtureParams<OperationShape>
    ) => {
      return apiRequestFunction({
        ...params,
        request,
        configBaseUrl:
          (params as ApiRequestFixtureParams).configBaseUrl ?? baseURL,
        body: (params as ApiRequestFixtureParams).body ?? null,
        uiMode: params.uiMode ?? false,
        page
      } as ApiRequestParams)
    }) as ApiRequestFixtureFn

    await use(apiRequest)

    // Clear page context to avoid stale references between tests
    clearPageContext()
  }
})
