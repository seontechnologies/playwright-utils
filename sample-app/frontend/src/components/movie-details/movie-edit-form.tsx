import styled from 'styled-components'
import { useMovieEditForm } from '@hooks/use-movie-edit-form'
import { SButton } from '@styles/styled-components'
import type { Movie } from '@shared/types/movie-types'
import ValidationErrorDisplay from '@components/validation-error-display'
import { MovieInput } from '@components/movie-form'

type MovieEditFormProps = Readonly<{
  movie: Movie
  onCancel: () => void
}>

export default function MovieEditForm({ movie, onCancel }: MovieEditFormProps) {
  const {
    movieName,
    setMovieName,
    movieYear,
    setMovieYear,
    movieRating,
    setMovieRating,
    handleUpdateMovie,
    movieLoading,
    validationError,
    movieDirector,
    setMovieDirector
  } = useMovieEditForm(movie)

  return (
    <div data-testid="movie-edit-form-comp">
      <SSubtitle>Edit Movie</SSubtitle>

      <ValidationErrorDisplay validationError={validationError} />

      <MovieInput
        type="text"
        value={movieName}
        placeholder="Movie name"
        onChange={(e) => setMovieName(e.target.value)}
      />
      <MovieInput
        type="number"
        value={movieYear}
        placeholder="Movie year"
        onChange={(e) => setMovieYear(Number(e.target.value))}
      />
      <MovieInput
        type="number"
        value={movieRating}
        placeholder="Movie rating"
        onChange={(e) => setMovieRating(Number(e.target.value))}
      />
      <MovieInput
        type="text"
        value={movieDirector}
        placeholder="Movie director"
        onChange={(e) => setMovieDirector(e.target.value)}
      />
      <SButton
        data-testid="update-movie"
        onClick={handleUpdateMovie}
        disabled={movieLoading}
      >
        {movieLoading ? 'Updating...' : 'Update Movie'}
      </SButton>
      <SButton data-testid="cancel" onClick={onCancel}>
        Cancel
      </SButton>
    </div>
  )
}

const SSubtitle = styled.h2`
  color: #333;
  font-size: 2rem;
  margin-bottom: 10px;
`
