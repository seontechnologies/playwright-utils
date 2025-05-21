import LoadingMessage from '@components/loading-message'
import { SButton, STitle } from '@styles/styled-components'
import styled from 'styled-components'
import MovieManager from './movie-manager'
import { useMovieDetails } from '@hooks/use-movie-detail'
import { useDeleteMovie } from '@hooks/use-movies'
import { useNavigate } from 'react-router-dom'
import type { Movie } from '@shared/types/movie-types'
import type { ErrorResponse } from '../../consumer'

export default function MovieDetails() {
  const { data, isLoading, hasIdentifier } = useMovieDetails()
  const deleteMovieMutation = useDeleteMovie()
  const navigate = useNavigate()

  const handleDeleteMovie = (id: number) =>
    deleteMovieMutation.mutate(id, {
      onSuccess: () => navigate('/movies') // Redirect to /movies after delete success
    })

  if (!hasIdentifier) return <p>No movie selected</p>
  if (isLoading) return <LoadingMessage />

  const movieData = (data as unknown as { data: Movie }).data
  const movieError = (data as unknown as { error: ErrorResponse }).error?.error

  return (
    <SMovieDetails data-cy="movie-details-comp">
      <STitle>Movie Details</STitle>

      {movieData && 'name' in movieData ? (
        <MovieManager movie={movieData} onDelete={handleDeleteMovie} />
      ) : (
        <p>{movieError || 'Unexpected error occurred'}</p>
      )}

      <SButton onClick={() => navigate(-1)} data-cy="back">
        Back
      </SButton>
    </SMovieDetails>
  )
}

const SMovieDetails = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
`
