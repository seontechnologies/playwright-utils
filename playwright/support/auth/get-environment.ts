import { type AuthOptions } from 'src/auth-session'

export function getEnvironment(options: AuthOptions = {}) {
  // Environment priority:
  // 1. Options passed from test via auth.useEnvironment({ environment: 'staging' })
  // 2. Environment variables
  // 3. Default environment
  return options.environment || process.env.TEST_ENV || 'localhost'
}
