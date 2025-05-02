import { test, expect } from '../support/merged-fixtures'

test.describe('token acquisition', () => {
  test('sanity', async ({ apiRequest }) => {
    const {
      status,
      body: { message }
    } = await apiRequest<{ message: string }>({
      method: 'GET',
      path: '/'
    })

    expect(status).toBe(200)
    expect(message).toEqual('Server is running')
  })

  test('should get a token with basic PW api', async ({ request }) => {
    const tokenRes = await request.get('/auth/fake-token')
    const tokenResBody = await tokenRes.json()
    const tokenResStatus = tokenRes.status()
    const token = tokenResBody.token

    expect(tokenResStatus).toBe(200)
    expect(token).toEqual(expect.any(String))
  })

  test('should get a token with helper', async ({ apiRequest }) => {
    const {
      body: { token },
      status
    } = await apiRequest<{ token: string }>({
      method: 'GET',
      path: '/auth/fake-token'
    })

    expect(status).toBe(200)
    expect(token).toEqual(expect.any(String))
  })
})
