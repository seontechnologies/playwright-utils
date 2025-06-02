import type { Request, Response, NextFunction } from 'express'

/**
 * Middleware to check if a user has the required role(s)
 * @param requiredRoles - One or more roles that are allowed to access the route
 * @returns Middleware function that checks if the user has one of the required roles
 */
export function requireRole(requiredRoles: string | string[]) {
  // Convert single role to array
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  return function roleMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // Get the user identity from the auth middleware
    const user = res.locals.user

    // No user identity found
    if (!user || !user.identity || !user.identity.role) {
      return res.status(403).json({
        error: 'Access denied: Identity information missing',
        status: 403
      })
    }

    // Check if user has one of the required roles
    const userRole = user.identity.role

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied: Role '${userRole}' is not authorized for this resource`,
        status: 403
      })
    }

    // User has required role, proceed
    next()
  }
}
