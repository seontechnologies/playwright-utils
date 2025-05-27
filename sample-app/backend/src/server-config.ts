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

  // Set cookie with the token
  res.cookie('sample-app-token', timestamp, {
    maxAge: 3600 * 1000, // 1 hour in milliseconds
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax'
  })

  // Return success response
  return res
    .status(200)
    .json({ status: 200, message: 'Authentication successful' })
})

export { server }
