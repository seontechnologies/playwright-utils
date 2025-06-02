import MovieForm from '@components/movie-form'
import MovieDetails from '@components/movie-details'
import MovieList from '@components/movie-list'
import LoginForm from '@components/login/login-form'
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
 * This verifies both the token existence and user identity
 * @returns {boolean} True if authenticated
 */
function isAuthenticated(): boolean {
  // Check if we have a current user identity in the token service
  const currentUser = tokenService.getCurrentUser()

  // Simple authentication check: we need a valid user identity
  // with a userId, and a valid token for API calls
  const token = tokenService.getToken()
  const hasValidToken = token && Object.keys(token).length > 0

  return !!currentUser && !!currentUser.userId && hasValidToken
}

/**
 * Protected route component that redirects to login if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication
    const auth = isAuthenticated()
    setAuthenticated(auth)
    setChecking(false)
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

export default function AppRoutes({ movies, onDelete }: AppRoutesProps) {
  return (
    <BrowserRouter>
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
