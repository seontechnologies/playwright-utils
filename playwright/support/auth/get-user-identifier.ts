import type { AuthOptions } from '@seontechnologies/playwright-utils/auth-session'
import { VALID_TEST_USERS } from '../global-setup'

export const getUserIdentifier = (options: Partial<AuthOptions> = {}) => {
  // Default to admin if no user identifier specified
  const testUser = options.userIdentifier || 'admin'

  // Check if the user is a valid key in VALID_TEST_USERS object
  return Object.keys(VALID_TEST_USERS).includes(testUser) ? testUser : 'admin'
}
