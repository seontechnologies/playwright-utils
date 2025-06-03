import { type AuthOptions } from 'src/auth-session'
import { getEnvironment } from './get-environment'

export function getUserRole(options: AuthOptions = {}) {
  // Role priority:
  // 1. Options passed from test via auth.useRole({ userRole: 'admin' })
  // 2. Default role based on environment
  const environment = getEnvironment(options)
  // You could implement environment-specific default roles
  let defaultRole = 'admin' // Match the core library default role
  if (environment === 'staging') defaultRole = 'tester'
  if (environment === 'production') defaultRole = 'readonly'
  return options.userRole || process.env.TEST_USER_ROLE || defaultRole
}
