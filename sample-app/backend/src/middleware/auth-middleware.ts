import type { Request, Response, NextFunction } from 'express'

// In Express, a middleware is a function that sits between a request and the response.
// It checks or modifies the request as it moves along.
// Think of it as a "checkpoint" where the request stops briefly, gets processed,
// and then moves on to the next step or to the final response.

// define a type for the token's structure, which contains the issuedAt date.
type Token = {
  issuedAt: Date // the token contains a precise Date object
  identity?: string // optional identity information for future use
}

// Cookie name that contains the authentication token
const AUTH_COOKIE_NAME = 'seon-jwt'

// Function to check if the token's timestamp is within 1 hour
const isValidAuthTimeStamp = (token: Token): boolean => {
  // Check if token has a valid date
  if (!(token.issuedAt instanceof Date) || isNaN(token.issuedAt.getTime())) {
    return false
  }
  const tokenTime = token.issuedAt.getTime() // get time in milliseconds
  const currentTime = new Date().getTime() // current time in milliseconds
  const diff = (currentTime - tokenTime) / 1000 // difference in seconds

  return diff >= 0 && diff <= 3600 // Token valid for 1 hour
}

// Express middleware function that checks for valid authentication token in cookies
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Extract token from cookies
  const tokenCookie = req.cookies?.[AUTH_COOKIE_NAME]

  if (!tokenCookie) {
    return res.status(401).json({
      error: 'Unauthorized; no authentication cookie found.',
      status: 401
    })
  }

  try {
    // Extract timestamp from the cookie value by removing the 'Bearer ' prefix if present
    const timestamp = tokenCookie.replace(/^Bearer\s+/i, '')

    // Create token object from the cleaned timestamp
    const token: Token = { issuedAt: new Date(timestamp) }

    if (!isValidAuthTimeStamp(token)) {
      // Clear the invalid cookie
      res.clearCookie(AUTH_COOKIE_NAME)

      return res
        .status(401)
        .json({ error: 'Unauthorized; not valid timestamp.', status: 401 })
    }

    // For future use: Extract identity information if needed
    // req.user = { identity: token.identity };

    next() // proceed if valid
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    // Error ignored as we just return a generic 401
    // Clear the invalid cookie
    res.clearCookie(AUTH_COOKIE_NAME)

    return res.status(401).json({
      error: 'Unauthorized; invalid token format.',
      status: 401
    })
  }
}
