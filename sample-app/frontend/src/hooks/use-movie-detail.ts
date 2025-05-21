import { useMovie } from '@hooks/use-movies'
import { useParams, useSearchParams } from 'react-router-dom'

export function useMovieDetails() {
  // Get the id from the route params or query parameters
  // .../movies/{{movieId}}
  const { id } = useParams<{ id: string }>()
  // .../movies?name={{movieName}}
  const [searchParams] = useSearchParams()
  const movieName = searchParams.get('name')

  const identifier =
    movieName ?? (id && !isNaN(Number(id)) ? parseInt(id, 10) : null)
  if (!identifier)
    return { movie: null, isLoading: false, hasIdentifier: false }

  const { data, isLoading } = useMovie(identifier)

  return { data, isLoading, hasIdentifier: true }
}
