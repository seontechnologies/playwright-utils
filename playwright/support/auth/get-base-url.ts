import { getEnvironment } from './get-environment'

export function getBaseUrl() {
  const env = getEnvironment()

  // Example: Different URLs for different environments or roles
  if (env === 'local') {
    return 'http://localhost:3000'
  }

  if (env === 'staging') {
    return 'https://staging.example.com'
  }

  // Return undefined to fall back to browserContextOptions.baseURL or env vars
  return undefined
}
