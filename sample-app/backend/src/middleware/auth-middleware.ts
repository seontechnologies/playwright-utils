import type { Request, Response, NextFunction } from 'express'

// In Express, a middleware is a function that sits between a request and the response.
// It checks or modifies the request as it moves along.
// Think of it as a "checkpoint" where the request stops briefly, gets processed,
// and then moves on to the next step or to the final response.

// Define a type for the identity information in the token
type Identity = {
  userId: string
  username: string
  userIdentifier: string
}

// Define a type for the token's structure, which contains the issuedAt date and identity.
type Token = {
  issuedAt: Date // the token contains a precise Date object
  identity?: Identity // identity information with user identifier
}

// Cookie name that contains the authentication token
const AUTH_COOKIE_NAME = 'seon-jwt'

// Function to check if the token's timestamp is valid
// In development environment, we're completely lenient to make testing easier
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

// Express middleware function that checks for valid authentication token in cookies or Authorization header
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Try to extract token from cookies first
  let tokenValue = req.cookies?.[AUTH_COOKIE_NAME]

  // If no cookie, try Authorization header
  if (!tokenValue && req.headers.authorization) {
    tokenValue = req.headers.authorization
    console.log('Using Authorization header for token')
  } else if (tokenValue) {
    console.log('Using cookie for token')
  }

  if (!tokenValue) {
    return res.status(401).json({
      error: 'Unauthorized; no authentication token found.',
      status: 401
    })
  }

  console.log('Raw token value:', tokenValue)

  try {
    // Remove the 'Bearer ' prefix if present
    const originalToken = tokenValue
    tokenValue = tokenValue.replace(/^Bearer\s+/i, '')
    if (originalToken !== tokenValue) {
      console.log('Removed Bearer prefix from token')
    }

    // Check if token contains identity info (format: timestamp:identityObject)
    // Find the position of the first '{' character which marks the start of JSON
    const jsonStartPos = tokenValue.indexOf('{')
    console.log(`JSON start position: ${jsonStartPos}`)

    let timestamp: string
    let identity: Identity | undefined

    if (jsonStartPos > 0 && tokenValue[jsonStartPos - 1] === ':') {
      // Format is timestamp:{json} - extract timestamp without the trailing colon
      timestamp = tokenValue.substring(0, jsonStartPos - 1)
      console.log('Extracted timestamp:', timestamp)

      // Extract and parse the JSON part
      try {
        const identityJson = tokenValue.substring(jsonStartPos)
        console.log('Identity JSON:', identityJson)
        identity = JSON.parse(identityJson)
        console.log('Parsed identity:', identity)
      } catch (e) {
        // If identity parsing fails, continue with just timestamp validation
        console.error('Failed to parse identity JSON:', e)
      }
    } else {
      // If no JSON part found, assume the entire token is a timestamp
      timestamp = tokenValue
      console.log('Using entire token as timestamp:', timestamp)
    }

    // Create token object from the timestamp and optional identity
    console.log('Creating token with timestamp:', timestamp)
    const token: Token = {
      issuedAt: new Date(timestamp),
      identity
    }
    console.log('Token object created:', token)

    if (!isValidAuthTimeStamp(token)) {
      console.log('Token timestamp validation failed')
      // Clear the invalid cookie
      res.clearCookie(AUTH_COOKIE_NAME)

      return res
        .status(401)
        .json({ error: 'Unauthorized; not valid timestamp.', status: 401 })
    }

    // Attach identity information to the request object for use in route handlers
    if (identity) {
      // Use a local variable approach instead of mutating the request directly
      // This information will be available in the request context for route handlers
      res.locals.user = { identity }
    }

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
