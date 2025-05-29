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

server.use('/auth/fake-token', (_req, res) => {
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

// Token renewal endpoint - uses refresh token to get a new JWT token
server.use('/auth/renew', (req, res) => {
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

  // Generate a new JWT token
  const timestamp = new Date().toISOString()
  const jwtToken = `Bearer ${timestamp}`
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
    status: 200,
    message: 'Token renewed successfully'
  })
})

export { server }
