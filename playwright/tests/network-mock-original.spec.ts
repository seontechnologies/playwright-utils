import { test, expect } from '@playwright/test'

test.describe('describe network interception - original', () => {
  test('Spy on the network - original', async ({ page }) => {
    // Set up the interception before navigating
    await page.route('*/**/api/v1/fruits', (route) => route.continue())

    await page.goto('https://demo.playwright.dev/api-mocking')

    // Wait for the intercepted response
    const fruitsResponse = await page.waitForResponse('*/**/api/v1/fruits')
    // verify the network
    const fruitsResponseBody = await fruitsResponse.json()
    const status = fruitsResponse.status()
    expect(fruitsResponseBody.length).toBeGreaterThan(0)
    expect(status).toBe(200)
  })

  test('Stub the network - original', async ({ page }) => {
    const fruit = { name: 'Guava', id: 12 }

    // Set up the interception before navigating
    await page.route('*/**/api/v1/fruits', (route) =>
      route.fulfill({
        json: [fruit]
      })
    )

    await page.goto('https://demo.playwright.dev/api-mocking')

    // Wait for the intercepted response
    const fruitsResponse = await page.waitForResponse('*/**/api/v1/fruits')
    // verify the network
    const fruitsResponseBody = await fruitsResponse.json()
    expect(fruitsResponseBody).toEqual([fruit])

    await expect(page.getByText(fruit.name)).toBeVisible()
  })

  test('Modify the API response - original', async ({ page }) => {
    const fruitResponse = page.route(
      '*/**/api/v1/fruits',
      async (route, _request) => {
        // Get the response and add to it
        const response = await route.fetch()
        const json = await response.json()
        // Modify the JSON by adding a new item
        json.push({ name: 'MAGIC FRUIT', id: 42 })
        // Fulfill using the original response, while patching the response body
        // with the given JSON object.
        await route.fulfill({ response, json })
      }
    )

    await page.goto('https://demo.playwright.dev/api-mocking')
    await fruitResponse
    await expect(page.getByText('MAGIC FRUIT')).toBeVisible()
  })
})
