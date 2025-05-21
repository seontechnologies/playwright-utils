import { useState } from 'react'
import { useUpdateMovie } from '@hooks/use-movies'
import type { ZodError } from 'zod'
import type { Movie } from '@shared/types/movie-types'
import { UpdateMovieSchema } from '@shared/types/schema'

export function useMovieEditForm(initialMovie: Movie) {
  const [movieName, setMovieName] = useState(initialMovie.name)
  const [movieYear, setMovieYear] = useState(initialMovie.year)
  const [movieRating, setMovieRating] = useState(initialMovie.rating)
  const [movieDirector, setMovieDirector] = useState(initialMovie.director)
  const [validationError, setValidationError] = useState<ZodError | null>(null)

  const { status, mutate } = useUpdateMovie()
  const movieLoading = status === 'pending'

  // Zod Key feature 3: safeParse
  // Zod note: if you have a frontend, you can use the schema + safeParse there
  // in order to perform form validation before sending the data to the server

  const handleUpdateMovie = () => {
    const payload = {
      name: movieName,
      year: movieYear,
      rating: movieRating,
      director: movieDirector
    }
    const result = UpdateMovieSchema.safeParse(payload)

    // Zod key feature 4: you can utilize
    // and expose the validation state to be used at a component
    if (!result.success) {
      setValidationError(result.error)
      return
    }

    mutate({
      id: initialMovie.id,
      movie: payload
    })

    setValidationError(null)
  }

  return {
    movieName,
    movieYear,
    movieRating,
    setMovieName,
    setMovieYear,
    setMovieRating,
    handleUpdateMovie,
    movieLoading,
    validationError,
    movieDirector,
    setMovieDirector
  }
}
