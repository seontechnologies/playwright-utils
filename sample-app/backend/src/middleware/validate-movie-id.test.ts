import type { Request, Response, NextFunction } from 'express'
import { validateId } from './validate-movie-id'

describe('validateId middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {
      params: {}
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(), // mocked to return this (the mockResponse object), allowing method chaining like res.status().json().
      json: jest.fn()
    }
    nextFunction = jest.fn()
  })

  it('should pass valid movie ID', () => {
    mockRequest.params = { id: '123' }
    validateId(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockRequest.params.id).toBe('123')
    expect(nextFunction).toHaveBeenCalled()
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid movie ID', () => {
    mockRequest.params = { id: 'abc' }
    validateId(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid movie ID provided'
    })
    expect(nextFunction).not.toHaveBeenCalled()
  })

  it('should handle missing ID parameter', () => {
    validateId(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid movie ID provided'
    })
    expect(nextFunction).not.toHaveBeenCalled()
  })
})
