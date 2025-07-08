import type { Request, Response, NextFunction } from 'express'
import { requireUserIdentifier } from './user-identifier-middleware'

describe('requireUserIdentifier middleware', () => {
  let mockRequest: Partial<Request>
  // Use a more specific type that includes locals to prevent TypeScript errors
  type MockResponse = Partial<Response> & {
    locals: {
      user?: {
        identity?: {
          userId: string
          username: string
          userIdentifier: string
        }
      }
    }
  }
  let mockResponse: MockResponse
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {}
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        user: {
          identity: {
            userId: 'user_test',
            username: 'test',
            userIdentifier: 'admin'
          }
        }
      }
    }
    nextFunction = jest.fn()
  })

  it('should call next() when user has required identifier', () => {
    const middleware = requireUserIdentifier('admin')
    middleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(nextFunction).toHaveBeenCalledTimes(1)
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })

  it('should return 403 when user has wrong identifier', () => {
    // Set up a user with 'user' identifier
    mockResponse.locals = {
      user: {
        identity: {
          userId: 'user_test',
          username: 'test',
          userIdentifier: 'user'
        }
      }
    }

    const middleware = requireUserIdentifier('admin')
    middleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockResponse.status).toHaveBeenCalledWith(403)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error:
        // eslint-disable-next-line quotes
        "Access denied: User identifier 'user' is not authorized for this resource",
      status: 403
    })
    expect(nextFunction).not.toHaveBeenCalled()
  })

  it('should handle multiple allowed identifiers', () => {
    // Set up a user with 'editor' identifier
    mockResponse.locals = {
      user: {
        identity: {
          userId: 'user_test',
          username: 'test',
          userIdentifier: 'editor'
        }
      }
    }

    const middleware = requireUserIdentifier(['admin', 'editor'])
    middleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(nextFunction).toHaveBeenCalledTimes(1)
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })

  it('should return 403 when user identity is missing', () => {
    // Remove user identity
    mockResponse.locals = {}

    const middleware = requireUserIdentifier('admin')
    middleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockResponse.status).toHaveBeenCalledWith(403)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Access denied: Identity information missing',
      status: 403
    })
    expect(nextFunction).not.toHaveBeenCalled()
  })
})
