import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const port = import.meta.env.VITE_PORT
const apiUrl = import.meta.env.VITE_API_URL
console.log(`React app is running on port: ${port}`)
console.log(`API should be running on: ${apiUrl}`)

const root = createRoot(document.getElementById('root') as HTMLElement)

const queryClient = new QueryClient()

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
