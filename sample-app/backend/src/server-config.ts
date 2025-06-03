import cors from 'cors'
import express, { json } from 'express'
import cookieParser from 'cookie-parser'
import { moviesRoute } from './routes'

const server = express()
server.use(
  cors({
    origin: 'http://localhost:3000', // allow only your React app, add other urls if you have deployments
    credentials: true // allow cookies to be sent and received
  })
)

// Add cookie-parser middleware
server.use(cookieParser())

server.use(json())

server.get('/', (_, res) => {
  res.status(200).json({ message: 'Server is running' })
})

server.use('/movies', moviesRoute)

server.post('/auth/fake-token', (_req, res) => {
  // JWT token - short lived (5 minutes)
  const timestamp = new Date().toISOString()
  const jwtToken = `Bearer ${timestamp}`
  const jwtExpires = Math.floor(Date.now() / 1000) + 300 // 5 minutes
  const jwtExpiresDate = new Date(jwtExpires * 1000)

  // Refresh token - long lived (1 day)
  // In a real app, this would be a secure random string
  const refreshTimestamp = new Date().toISOString()
  const refreshToken = `Refresh-${refreshTimestamp}-${Math.random().toString(36).substring(2, 15)}`
  const refreshExpires = Math.floor(Date.now() / 1000) + 86400 // 24 hours
  const refreshExpiresDate = new Date(refreshExpires * 1000)

  // Set both cookies
  res.cookie('seon-jwt', jwtToken, {
    domain: 'localhost',
    path: '/',
    expires: jwtExpiresDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  res.cookie('seon-refresh', refreshToken, {
    domain: 'localhost',
    path: '/',
    expires: refreshExpiresDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  // Return token info in the response body
  return res.status(200).json({
    token: jwtToken,
    expiresAt: jwtExpiresDate.toISOString(),
    refreshToken: refreshToken,
    refreshExpiresAt: refreshExpiresDate.toISOString(),
    status: 200,
    message: 'Authentication successful. Cookies have been set.'
  })
})

// Identity-based authentication endpoint
server.post('/auth/identity-token', (req, res) => {
  const { username, password, role } = req.body

  // Validate required fields
  if (!username || !password) {
    return res.status(400).json({
      error: 'Username and password are required',
      status: 400
    })
  }

  // In a real app, we would validate credentials against a database
  // For this sample, we'll accept any credentials and use the provided role

  // Generate a user ID based on the username (in a real app this would come from a database)
  const userId = `user_${username.replace(/\s+/g, '_').toLowerCase()}`

  // Create identity object
  const identity = {
    userId,
    username,
    role: role || 'user' // Default to 'user' if no role provided
  }

  // JWT token - short lived (5 minutes)
  const timestamp = new Date().toISOString()
  // Include identity in the token (in a real app, this would be a proper JWT with claims)
  const jwtToken = `Bearer ${timestamp}:${JSON.stringify(identity)}`
  const jwtExpires = Math.floor(Date.now() / 1000) + 300 // 5 minutes
  const jwtExpiresDate = new Date(jwtExpires * 1000)

  // Refresh token - long lived (1 day)
  const refreshTimestamp = new Date().toISOString()
  // Include identity in the refresh token as well
  const refreshToken = `Refresh-${refreshTimestamp}-${JSON.stringify(identity)}-${Math.random().toString(36).substring(2, 15)}`
  const refreshExpires = Math.floor(Date.now() / 1000) + 86400 // 24 hours
  const refreshExpiresDate = new Date(refreshExpires * 1000)

  // Set both cookies
  res.cookie('seon-jwt', jwtToken, {
    domain: 'localhost',
    path: '/',
    expires: jwtExpiresDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  res.cookie('seon-refresh', refreshToken, {
    domain: 'localhost',
    path: '/',
    expires: refreshExpiresDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  // Return token info in the response body
  return res.status(200).json({
    token: jwtToken,
    expiresAt: jwtExpiresDate.toISOString(),
    refreshToken: refreshToken,
    refreshExpiresAt: refreshExpiresDate.toISOString(),
    identity,
    status: 200,
    message: 'Authentication successful. Cookies have been set.'
  })
})

// Validate authentication endpoint
server.get('/auth/validate', (req, res) => {
  const jwtToken = req.cookies?.['seon-jwt']

  if (!jwtToken) {
    return res.status(200).json({
      authenticated: false,
      message: 'No authentication token found'
    })
  }

  // In a real app, validate the JWT signature and check expiration
  // For this sample app, we'll just check the format and extract the identity

  try {
    // Parse the token (Bearer <timestamp>:<identity>)
    let decoded = jwtToken

    // Strip Bearer prefix if present
    if (decoded.toLowerCase().startsWith('bearer ')) {
      decoded = decoded.slice(7)
    }

    // Check token expiration - extract timestamp
    const sepIndex = decoded.indexOf(':{')
    let timestamp: Date | null = null

    if (sepIndex > 0) {
      // Token has timestamp and identity parts
      const timestampStr = decoded.substring(0, sepIndex)
      timestamp = new Date(timestampStr)

      // Validate timestamp is valid and not expired
      if (isNaN(timestamp.getTime())) {
        return res.status(200).json({
          authenticated: false,
          message: 'Invalid token timestamp format'
        })
      }

      // Check if token is expired - 24-hour expiration window
      const now = new Date()
      const expirationTime = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000) // 24 hours
      if (now > expirationTime) {
        return res.status(200).json({
          authenticated: false,
          message: 'Token expired'
        })
      }

      // Extract and parse the identity JSON
      const identityJson = decoded.slice(sepIndex + 1)
      const identity = JSON.parse(identityJson)

      return res.status(200).json({
        authenticated: true,
        user: identity,
        message: 'Authentication valid'
      })
    } else {
      // Token doesn't have identity, but it's still valid
      // In a real app, you might want to require identity
      return res.status(200).json({
        authenticated: true,
        user: {
          userId: 'anonymous',
          username: 'Anonymous User',
          role: 'user'
        },
        message: 'Authentication valid (no identity)'
      })
    }
  } catch (error) {
    return res.status(200).json({
      authenticated: false,
      message: 'Invalid authentication token',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

server.post('/auth/renew', (req, res) => {
  const refreshToken = req.cookies?.['seon-refresh']

  if (!refreshToken) {
    return res.status(401).json({
      error: 'No refresh token provided',
      status: 401
    })
  }

  // In a real app, we would validate the refresh token against a database
  // Here we'll just check if it starts with "Refresh-"
  if (!refreshToken.startsWith('Refresh-')) {
    return res.status(401).json({
      error: 'Invalid refresh token format',
      status: 401
    })
  }

  // Extract identity information from the refresh token if present
  // Refresh token format: Refresh-{timestamp}-{identityJson}-{randomString}
  let identity = undefined
  const parts = refreshToken.split('-')

  // More robust validation of token structure
  if (parts.length >= 4 && parts[0] === 'Refresh') {
    // Validate timestamp is a number
    const timestamp = Number(parts[1])
    if (!isNaN(timestamp)) {
      try {
        // The identity part is all parts between the timestamp and the random string
        // Since the identity JSON itself might contain hyphens, we need to rejoin
        const identityJson = parts.slice(2, parts.length - 1).join('-')
        const parsedIdentity = JSON.parse(identityJson)

        // Validate the parsed identity has the expected structure
        if (parsedIdentity && typeof parsedIdentity === 'object') {
          // Minimum validation - check for required fields
          // Adjust these requirements based on your specific identity structure
          if (
            parsedIdentity.userId ||
            (parsedIdentity.username && parsedIdentity.role)
          ) {
            identity = parsedIdentity
          } else {
            console.warn('Invalid identity structure in refresh token')
          }
        } else {
          console.warn('Identity in refresh token is not a valid object')
        }
      } catch (error) {
        // Log specific error for security monitoring and debugging
        console.warn(
          'Failed to parse identity in refresh token:',
          error instanceof Error ? error.message : 'Unknown parsing error'
        )
        // Continue without identity
      }
    } else {
      console.warn('Invalid timestamp format in refresh token')
    }
  } else {
    console.warn('Invalid refresh token structure')
  }

  // Generate a new JWT token
  const timestamp = new Date().toISOString()
  // Include identity in the token if it exists
  const jwtToken = identity
    ? `Bearer ${timestamp}:${JSON.stringify(identity)}`
    : `Bearer ${timestamp}`
  const jwtExpires = Math.floor(Date.now() / 1000) + 300 // 5 minutes
  const jwtExpiresDate = new Date(jwtExpires * 1000)

  // Set the JWT cookie
  res.cookie('seon-jwt', jwtToken, {
    domain: 'localhost',
    path: '/',
    expires: jwtExpiresDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  // Return token info
  return res.status(200).json({
    token: jwtToken,
    expiresAt: jwtExpiresDate.toISOString(),
    identity: identity || undefined,
    message: 'Token renewed successfully. New JWT cookie has been set.',
    status: 200
  })
})

export { server }
