import { test, expect } from '../support/fixtures'

test.describe('describe network interception', () => {
  test('Spy on the network', async ({ page, interceptNetworkCall }) => {
    // Set up the interception before navigating
    const fruitsResponse = interceptNetworkCall({
      url: '**/fruits'
    })

    await page.goto('https://demo.playwright.dev/api-mocking')

    // Wait for the intercepted response
    const { responseJson, status } = await fruitsResponse
    // verify the network
    expect(responseJson.length).toBeGreaterThan(0)
    expect(status).toBe(200)
  })

  test('Stub the network', async ({ page, interceptNetworkCall }) => {
    const fruit = { name: 'Guava', id: 12 }

    // Set up the interception before navigating
    const fruitsResponse = interceptNetworkCall({
      url: '/api/*/fruits', // just a specificity on '**/fruits'
      fulfillResponse: {
        body: [fruit]
      }
    })

    await page.goto('https://demo.playwright.dev/api-mocking')

    // Wait for the intercepted response
    const { responseJson } = await fruitsResponse
    // verify the network
    expect(responseJson).toEqual([fruit])

    await expect(page.getByText(fruit.name)).toBeVisible()
  })

  test('Modify the API response', async ({ page, interceptNetworkCall }) => {
    const fruitResponse = interceptNetworkCall({
      url: '**/fruits',
      handler: async (route, _request) => {
        // Get the real response first
        const response = await route.fetch()
        const json = await response.json()
        // Modify the JSON by adding a new item
        json.push({ name: 'MAGIC FRUIT', id: 42 })
        // Fulfill using the original response, while patching the response body
        // with the given JSON object.
        await route.fulfill({ response, json })
      }
    })

    await page.goto('https://demo.playwright.dev/api-mocking')
    await fruitResponse
    await expect(page.getByText('MAGIC FRUIT')).toBeVisible()
  })
})
