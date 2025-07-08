import type { Request, Response, NextFunction } from 'express'

/**
 * Middleware to check if a user has the required user identifier(s)
 * @param requiredIdentifiers - One or more user identifiers that are allowed to access the route
 * @returns Middleware function that checks if the user has one of the required identifiers
 */
export function requireUserIdentifier(requiredIdentifiers: string | string[]) {
  // Convert single identifier to array
  const identifiers = Array.isArray(requiredIdentifiers)
    ? requiredIdentifiers
    : [requiredIdentifiers]

  return function userIdentifierMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // Get the user identity from the auth middleware
    const user = res.locals.user

    // No user identity found
    if (!user || !user.identity || !user.identity.userIdentifier) {
      return res.status(403).json({
        error: 'Access denied: Identity information missing',
        status: 403
      })
    }

    // Check if user has one of the required identifiers
    const userIdentifier = user.identity.userIdentifier

    if (!identifiers.includes(userIdentifier)) {
      return res.status(403).json({
        error: `Access denied: User identifier '${userIdentifier}' is not authorized for this resource`,
        status: 403
      })
    }

    // User has required user identifier, proceed
    next()
  }
}
