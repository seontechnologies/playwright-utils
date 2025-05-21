import type { FC, ReactNode } from 'react'
import { Suspense } from 'react'
import type { RenderOptions } from '@testing-library/react'
import { render } from 'vitest-browser-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ErrorComponent from '@components/error-component'
import LoadingMessage from '@components/loading-message'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

interface WrapperProps {
  children: ReactNode
  route?: string
  path?: string
}

const AllTheProviders: FC<WrapperProps> = ({
  children,
  route = '/',
  path = '/'
}) => {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <ErrorBoundary fallback={<ErrorComponent />}>
        <Suspense fallback={<LoadingMessage />}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route element={children} path={path} />
            </Routes>
          </MemoryRouter>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}

/**
 * Custom render function that wraps component with all necessary providers:
 * - QueryClientProvider
 * - ErrorBoundary
 * - Suspense
 * - MemoryRouter with Routes
 */
export function wrappedRender(
  ui: ReactNode,
  {
    route = '/',
    path = '/',
    ...options
  }: Omit<RenderOptions, 'wrapper'> & {
    route?: string
    path?: string
  } = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders route={route} path={path}>
        {children}
      </AllTheProviders>
    ),
    ...options
  })
}

// re-export everything
export * from '@testing-library/react'
export * from './msw-setup'
export { describe, it, expect, vi, userEvent }
