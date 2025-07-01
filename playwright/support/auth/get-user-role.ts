import type { AuthOptions } from '@seontechnologies/playwright-utils/auth-session'
import { VALID_TEST_USERS } from '../global-setup'

export const getUserRole = (options: Partial<AuthOptions> = {}) => {
  // Default to admin if no role specified
  const testUser = options.userRole || 'admin'

  // Check if the user is a valid key in VALID_ROLES object
  return Object.keys(VALID_TEST_USERS).includes(testUser) ? testUser : 'admin'
}
