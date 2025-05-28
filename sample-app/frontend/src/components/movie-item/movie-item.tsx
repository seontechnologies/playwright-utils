import { Link } from 'react-router-dom'
import { SButton } from '@styles/styled-components'
import styled from 'styled-components'
import type { Movie } from '@shared/types/movie-types'

type MovieItemProps = Movie & { onDelete: (id: number) => void }

export default function MovieItem({
  id,
  name,
  year,
  rating,
  director,
  onDelete
}: MovieItemProps) {
  return (
    <SMovieItem data-qa="movie-item-comp">
      <Link to={`/movies/${id}`} data-qa={`link-${id}`}>
        {name} ({year}) {rating} {director}
      </Link>
      <SButton data-qa={`delete-movie-${name}`} onClick={() => onDelete(id)}>
        Delete
      </SButton>
    </SMovieItem>
  )
}

const SMovieItem = styled.li`
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 10px 20px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`
