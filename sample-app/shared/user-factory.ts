import { API_URL } from '@playwright/config/local.config'
import { apiRequest } from 'src/api-request'
import { request } from '@playwright/test'
import type { AuthResponse } from 'sample-app/frontend/src/consumer'

export async function createTestUser({
  username,
  password,
  userIdentifier
}: {
  username: string
  password: string
  userIdentifier: string
}): Promise<{
  token: string
  userId: string
  username: string
  password: string
}> {
  // Make authentication request directly without involving storage
  // this would reuse storage:  request.newContext({ storageState: storageStatePath })
  const context = await request.newContext()
  try {
    const { status, body } = await apiRequest<AuthResponse>({
      request: context,
      method: 'POST',
      path: '/auth/identity-token',
      baseUrl: API_URL,
      body: {
        username,
        password,
        userIdentifier
      }
    })

    if (status !== 200) {
      throw new Error(`Failed to create ephemeral test user ${username}`)
    }

    return {
      token: body.token,
      userId: body.identity.userId,
      username: body.identity.username,
      password
    }
  } finally {
    await context.dispose()
  }
}

const generateUsername = (userIdentifier: string) =>
  `${userIdentifier}-${Date.now()}`
const generatePassword = () =>
  `pwd-${Math.random().toString(36).substring(2, 10)}`

export const generateUserData = (userIdentifier: string) => ({
  username: generateUsername(userIdentifier),
  password: generatePassword(),
  userIdentifier
})

export type UserData = {
  token: string
  userId: string
  username: string
  password: string
}
