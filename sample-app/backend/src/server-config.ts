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
  const timestamp = new Date().toISOString()
  const tokenValue = `Bearer ${timestamp}`
  const expires = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  const expiresDate = new Date(expires * 1000) // Convert to milliseconds for Date object

  // Set the cookie directly in the response header, just like a real login endpoint would
  res.cookie('seon-jwt', tokenValue, {
    domain: 'localhost',
    path: '/',
    expires: expiresDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  // Also return token info in the response body for compatibility and visibility
  return res.status(200).json({
    token: tokenValue,
    expiresAt: expiresDate.toISOString(),
    status: 200,
    message: 'Authentication successful. Cookie has been set.'
  })
})

export { server }
