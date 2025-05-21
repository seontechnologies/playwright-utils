import MovieForm from '@components/movie-form'
import MovieDetails from '@components/movie-details'
import MovieList from '@components/movie-list'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams
} from 'react-router-dom'
import type { ErrorResponse } from './consumer'
import type { Movie } from '@shared/types/movie-types'

type AppRoutesProps = Readonly<{
  movies: Movie[] | ErrorResponse | undefined
  onDelete: (id: number) => void
}>

export default function AppRoutes({ movies, onDelete }: AppRoutesProps) {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/movies"
          element={<MovieListWithForm movies={movies} onDelete={onDelete} />}
        />
        <Route path="/" element={<Navigate to="/movies" replace />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
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
