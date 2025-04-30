import type {
  GetMovieResponse,
  CreateMovieRequest,
  CreateMovieResponse,
  MovieNotFoundResponse,
  ConflictMovieResponse,
  DeleteMovieResponse,
  UpdateMovieRequest,
  UpdateMovieResponse
} from './@types'

// MovieRepository: this is the interface/contract that defines the methods
// for interacting with the data layer.
// It's a port in hexagonal architecture.

/*
  API (Driving Adapter - entry point)
                  |
                  v
    +----------------------------+
    |        MovieService        |
    | (Application Core/Hexagon) |
    +----------------------------+
                  |
                  v
      MovieRepository (Port)
                  |
                  v
MovieAdapter (Driven Adapter - 2ndary, interacts with outside)
                  |
                  v
              Database
*/

export interface MovieRepository {
  getMovies(): Promise<GetMovieResponse>
  getMovieById(id: number): Promise<GetMovieResponse | MovieNotFoundResponse>
  getMovieByName(
    name: string
  ): Promise<GetMovieResponse | MovieNotFoundResponse>
  deleteMovieById(
    id: number
  ): Promise<DeleteMovieResponse | MovieNotFoundResponse>
  addMovie(
    data: CreateMovieRequest,
    id?: number
  ): Promise<CreateMovieResponse | ConflictMovieResponse>
  updateMovie(
    data: UpdateMovieRequest,
    id: number
  ): Promise<
    UpdateMovieResponse | MovieNotFoundResponse | ConflictMovieResponse
  >
}
