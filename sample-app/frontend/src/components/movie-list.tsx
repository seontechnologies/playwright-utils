import ErrorComp from '@components/error-component'
import styled from 'styled-components'
import type { ErrorResponse } from '../consumer'
import MovieItem from './movie-item'
import { STitle } from '@styles/styled-components'
import type { Movie } from '@shared/types/movie-types'

type MovieListProps = Readonly<{
  movies: Movie[] | ErrorResponse | undefined
  onDelete: (id: number) => void
}>

export default function MovieList({ movies, onDelete }: MovieListProps) {
  if (Array.isArray(movies) && movies.length === 0) {
    return null
  }

  if (movies && 'error' in movies) {
    return <ErrorComp />
  }

  return (
    <>
      <STitle>Movie List</STitle>
      <SMovieList data-cy="movie-list-comp">
        {Array.isArray(movies) &&
          movies.map((movie) => (
            <MovieItem key={movie.id} {...movie} onDelete={onDelete} />
          ))}
      </SMovieList>
    </>
  )
}

const SMovieList = styled.ul`
  list-style: none;
  padding: 0;
  max-width: 600px;
  margin: 0 auto 20px;
`
