import { test as base } from '@playwright/test'
import {
  interceptNetworkCall as interceptNetworkCallOriginal,
  type InterceptOptionsFixture,
  type InterceptNetworkCallFn
} from './intercept-network-call'

type InterceptNetworkMethods = {
  interceptNetworkCall: InterceptNetworkCallFn
}

export const test = base.extend<InterceptNetworkMethods>({
  interceptNetworkCall: async ({ page }, use) => {
    const interceptNetworkCallFn: InterceptNetworkCallFn = ({
      method,
      url,
      fulfillResponse,
      handler
    }: InterceptOptionsFixture) =>
      interceptNetworkCallOriginal({
        method,
        url,
        fulfillResponse,
        handler,
        page
      })

    await use(interceptNetworkCallFn)
  }
})
