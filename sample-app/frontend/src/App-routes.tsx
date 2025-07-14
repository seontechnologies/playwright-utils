import MovieForm from '@components/movie-form'
import MovieDetails from '@components/movie-details'
import MovieList from '@components/movie-list'
import LoginForm from '@components/login/login-form'
import FileDownload from '@components/file-download/file-download'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
  useLocation
} from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { ErrorResponse } from './consumer'
import type { Movie } from '@shared/types/movie-types'
import { tokenService } from './services/token-service'
import UserHeader from '@components/header/user-header'

type AppRoutesProps = Readonly<{
  movies: Movie[] | ErrorResponse | undefined
  onDelete: (id: number) => void
}>

/**
 * Check if user is authenticated by using the token service
 * This now uses a backend API call to verify authentication status
 * @returns {Promise<boolean>} Promise resolving to true if authenticated
 */
async function isAuthenticated(): Promise<boolean> {
  // First try a quick check with existing data (for immediate response)
  const currentUser = tokenService.getCurrentUser()
  const token = tokenService.getToken()
  const hasExistingAuth =
    !!currentUser?.userId && token && Object.keys(token).length > 0

  if (hasExistingAuth) {
    // We have existing auth data, but let's validate with backend in the background
    // This ensures auth state stays in sync without blocking the UI
    tokenService.validateAuthWithBackend().catch((err) => {
      console.error('Background auth validation failed:', err)
    })
    return true
  }

  // No existing auth data, we need to validate with the backend
  try {
    return await tokenService.validateAuthWithBackend()
  } catch (error) {
    console.error('Auth validation error:', error)
    return false
  }
}

/**
 * Protected route component that redirects to login if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // Create an async function inside useEffect
    const checkAuth = async () => {
      try {
        // Check authentication with backend
        const auth = await isAuthenticated()
        setAuthenticated(auth)
      } catch (error) {
        console.error('Authentication check failed:', error)
        setAuthenticated(false)
      } finally {
        setChecking(false)
      }
    }

    // Call the async function and handle any errors
    checkAuth().catch((error) => {
      console.error('Error in checkAuth:', error)
      setAuthenticated(false)
      setChecking(false)
    })
  }, [location.pathname])

  if (checking) {
    return <div>Checking authentication...</div>
  }

  if (!authenticated) {
    // Redirect to login, saving the current location for redirect after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return (
    <>
      <UserHeader />
      {children}
    </>
  )
}

// This component ensures token state is updated from browser cookies on app load
function TokenSynchronizer() {
  useEffect(() => {
    // Update token state from browser cookies on initial load
    const updated = tokenService.updateFromBrowserCookies()
    console.log('Token state updated from browser cookies:', updated)
  }, [])
  return null
}

export default function AppRoutes({ movies, onDelete }: AppRoutesProps) {
  return (
    <BrowserRouter>
      <TokenSynchronizer />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginForm />} />

        {/* Protected routes */}
        <Route
          path="/movies"
          element={
            <ProtectedRoute>
              <MovieListWithForm movies={movies} onDelete={onDelete} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/movies/:id"
          element={
            <ProtectedRoute>
              <MovieDetails />
            </ProtectedRoute>
          }
        />

        {/* File Download route */}
        <Route
          path="/downloads"
          element={
            <ProtectedRoute>
              <FileDownload />
            </ProtectedRoute>
          }
        />

        {/* Default route */}
        <Route path="/" element={<Navigate to="/movies" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

/**
 * Renders both MovieList and MovieForm on the "/movies" route.
 *
 * @component
 * @param {Object} props - The properties passed to the component.
 * @param {Movie[] | ErrorResponse | undefined} props.movies - The list of movies or an error response.
 * @param {function} props.onDelete - A callback function for deleting a movie by its ID.
 * @returns {JSX.Element} - The rendered MovieList and MovieForm components.
 *
 * @example
 * // Example usage:
 * <MovieListWithForm movies={movieArray} onDelete={handleDeleteMovie} />
 */
function MovieListWithForm({ movies, onDelete }: AppRoutesProps) {
  const [searchParams] = useSearchParams()
  const movieName = searchParams.get('name')

  return movieName ? (
    <MovieDetails />
  ) : (
    <>
      <MovieList movies={movies} onDelete={onDelete} />
      <MovieForm />
    </>
  )
}
