import type { Request, Response, NextFunction } from 'express'
import { authMiddleware } from './auth-middleware'

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {
      headers: {}
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    nextFunction = jest.fn()
  })

  it('should call next() exactly once for valid token', () => {
    const validDate = new Date()
    mockRequest.headers = { authorization: `Bearer ${validDate.toISOString()}` }
    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )

    expect(nextFunction).toHaveBeenCalledTimes(1)
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })

  it('should return 401 when no token is provided', () => {
    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )

    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unauthorized; no Authorization header.',
      status: 401
    })
    expect(nextFunction).not.toHaveBeenCalled()
  })

  it('should return 401 for expired token', () => {
    const expiredDate = new Date(Date.now() - 3601 * 1000) // 1 hour and 1 second ago
    mockRequest.headers = {
      authorization: `Bearer ${expiredDate.toISOString()}`
    }
    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    )

    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unauthorized; not valid timestamp.',
      status: 401
    })
    expect(nextFunction).not.toHaveBeenCalled()
  })
})
