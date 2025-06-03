import type { Movie } from '@shared/types/movie-types'
import { log } from 'src/log'
import {
  createTestUser,
  generateUserData,
  type UserData
} from '../../../../sample-app/shared/user-factory'
import { expect, test } from '../../../support/merged-fixtures'
import { generateMovieWithoutId } from '../../../support/utils/movie-factories'

test.describe('CRUD movie with ephemeral users', () => {
  let AdminUser: UserData
  let ReadUser: UserData

  const movie = generateMovieWithoutId()
  const updatedMovie = generateMovieWithoutId()

  const movieProps: Omit<Movie, 'id'> = {
    name: movie.name,
    year: movie.year,
    rating: movie.rating,
    director: movie.director
  }

  const AdminUserData = generateUserData('admin')
  const ReadUserData = generateUserData('read')

  test.beforeAll(async ({}) => {
    AdminUser = await createTestUser(AdminUserData)
    ReadUser = await createTestUser(ReadUserData)
  })

  test.use({
    authSessionEnabled: false
  })
  // this is the same as vanilla PW
  // test.use({ storageState: {
  //   cookies: [],
  //   origins: [],
  // } }

  test('should crud with ephemeral users', async ({
    addMovie,
    getAllMovies,
    getMovieById,
    getMovieByName,
    updateMovie,
    deleteMovie
  }) => {
    await log.step(
      'WITH API TESTING, users on the fly is similar to vanilla PW'
    )
    await log.step('AdminUser adds a movie')
    const { body: createResponse, status: createStatus } = await addMovie(
      AdminUser.token,
      movie
    )
    await log.step('ReadUser cannot add a movie')
    const { status: readUserAddStatus } = await addMovie(ReadUser.token, movie)
    expect(readUserAddStatus).toBe(403)

    const movieId = createResponse.data.id
    expect(createStatus).toBe(200)
    expect(createResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    await log.step('ReadUser can get all movies')
    const { body: getAllResponse, status: getAllStatus } = await getAllMovies(
      ReadUser.token
    )
    expect(getAllStatus).toBe(200)
    expect(getAllResponse).toMatchObject({
      status: 200,
      data: expect.arrayContaining([
        expect.objectContaining({ id: movieId, name: movie.name })
      ])
    })

    await log.step('ReadUser can get movie by id')
    const { body: getByIdResponse, status: getByIdStatus } = await getMovieById(
      ReadUser.token,
      movieId
    )
    expect(getByIdStatus).toBe(200)
    expect(getByIdResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    await log.step('ReadUser can get movie by name')
    const { body: getByNameResponse, status: getByNameStatus } =
      await getMovieByName(ReadUser.token, movie.name)
    expect(getByNameStatus).toBe(200)
    expect(getByNameResponse).toMatchObject({
      status: 200,
      data: { ...movieProps, id: movieId }
    })

    await log.step('AdminUser updates movie')
    const { body: updateResponse, status: updateStatus } = await updateMovie(
      AdminUser.token,
      movieId,
      updatedMovie
    )
    expect(updateStatus).toBe(200)
    expect(updateResponse).toMatchObject({
      status: 200,
      data: {
        id: movieId,
        name: updatedMovie.name,
        year: updatedMovie.year,
        rating: updatedMovie.rating,
        director: updatedMovie.director
      }
    })
    await log.step('ReadUser cannot update movie')
    const { status: readUserUpdateStatus } = await updateMovie(
      ReadUser.token,
      movieId,
      updatedMovie
    )
    expect(readUserUpdateStatus).toBe(403)

    await log.step('AdminUser deletes movie')
    const {
      status: deleteStatus,
      body: { message }
    } = await deleteMovie(AdminUser.token, movieId)
    expect(deleteStatus).toBe(200)
    expect(message).toBe(`Movie ${movieId} has been deleted`)

    const { body: allMoviesAfterDelete } = await getAllMovies(AdminUser.token)
    expect(allMoviesAfterDelete).toMatchObject({
      status: 200,
      data: expect.not.arrayContaining([
        expect.objectContaining({ id: movieId })
      ])
    })
    await log.step('ReadUser cannot delete movie')
    const { status: readUserDeleteStatus } = await deleteMovie(
      ReadUser.token,
      movieId
    )
    expect(readUserDeleteStatus).toBe(403)

    const { status: deleteNonExistentStatus, body: deleteNonExistentBody } =
      await deleteMovie(AdminUser.token, movieId)
    expect(deleteNonExistentStatus).toBe(404)
    expect(deleteNonExistentBody).toMatchObject({
      error: `Movie with ID ${movieId} not found`
    })
  })
})
