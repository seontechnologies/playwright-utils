import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery
} from '@tanstack/react-query'
import {
  getMovies,
  addMovie,
  deleteMovieById,
  getMovieById,
  getMovieByName,
  updateMovie
} from '../consumer'
import type { Movie } from '@shared/types/movie-types'

export const useMovies = () =>
  useSuspenseQuery({
    queryKey: ['movies'],
    queryFn: getMovies,
    staleTime: 5000, // data considered fresh for 5 seconds
    retry: 2 // retry failed requests up to 2 times
  })

export const useMovie = (identifier: number | string) =>
  useQuery({
    queryKey: ['movie', identifier],
    queryFn: () => {
      if (!identifier) return Promise.resolve(null)
      const isNumericOnly = /^\d+$/.test(String(identifier))

      return isNumericOnly
        ? getMovieById(Number(identifier))
        : getMovieByName(String(identifier))
    },
    enabled: !!identifier, // Only enable the query when an identifier is set
    // By default, React Query will execute the query as soon as the component mounts
    // However, in this case, you only want to fetch data when there’s a valid identifier (either a non-empty string or a number)
    staleTime: 5000,
    retry: 2
  })

export const useAddMovie = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (movie: Omit<Movie, 'id'>) => addMovie(movie),

    // Invalidate cache when a new movie is added
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movies'] })
  })
}

export const useUpdateMovie = () => {
  const queryClient = useQueryClient()

  // note: react query expects a single argument for the mutationFn
  return useMutation({
    mutationFn: ({
      id,
      movie
    }: {
      id: number
      movie: Partial<Omit<Movie, 'id'>>
    }) => updateMovie(id, movie),
    // handles both error and success scenarios
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['movies'] }),
    // Optional: Handle errors globally if needed
    onError: (error) => {
      console.error('Update failed', error)
      // Optionally, display a toast or log the error somewhere
    }
  })
}

export const useDeleteMovie = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteMovieById(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movies'] })
  })
}

/*
react-query in a nutshell

Caching: react-query automatically caches query results, 
reducing unnecessary network requests and improving performance.

Automatic Refetching: stale queries can be automatically re-fetched when data might have changed, 
ensuring that your UI is always displaying the most up-to-date information.

Queries:
* purpose: used to fetch data. They are idempotent, meaning they don’t change the server's state when called.
* arguments: they match the function responsible for fetching the data

Mutations:
* purpose: used to modify data on the server (e.g., creating, updating, deleting data). 
they typically change the server's state.
* arguments: the mutationFn (or mutateAsync for async calls) takes arguments 
that match the function responsible
this allows for more flexibility in how and when the mutation is executed.
* onSuccess: when a mutation completes successfully 
(i.e., the API call was made, and the server responded without error), onSuccess is triggered. 
This function provides an opportunity to respond to the mutation’s success, 
often by updating the state or cache to reflect the new data.

-------------
Longer version

react-query (tanstack-query) offers a wide range of utilities and functions 
that help manage server-state in React applications.  


1. useQuery:
   - Purpose: Used to fetch and cache data.
   - Key Options: 
     - queryKey: Uniquely identifies the query.
     - queryFn: The function responsible for fetching data.
     - enabled: A boolean that can disable the query from automatically running.
     - staleTime: How long the data is considered fresh.
     - refetchOnWindowFocus: Whether the query should refetch when the window is focused.

2. useMutation:
   - Purpose: Used for creating, updating, or deleting data.
   - Key Options:
     - mutationFn: The function that performs the mutation.
     - onMutate: Called before the mutation function is fired, useful for optimistic updates.
     - onSuccess: Executes after a successful mutation, often used to update the cache or perform side effects.
     - onError: Called if the mutation encounters an error.
     - onSettled: Called when the mutation either succeeds or fails, useful for cleanup actions.
     - mutateAsync: An asynchronous alternative to mutate, returning a promise.
  
	isLoading, isError, data, error:
   - Purpose: Standard states and data provided by both useQuery and 
	   useMutation hooks to manage UI rendering based on the request's lifecycle.

  mutate:
   - Purpose: A method provided by useMutation to trigger a mutation with the required variables.

3. queryClient:
   - Purpose: A central place to manage queries and mutations.
   - Key Methods:
     - invalidateQueries: Invalidate and refetch queries.
     - setQueryData: Manually set the data for a query in the cache.
     - getQueryData: Retrieve the data for a query from the cache.
     - resetQueries: Reset a query's state to its initial state.
     - removeQueries: Remove queries from the cache.

These utilities collectively provide a robust framework for managing server-state in React applications,
making data fetching, caching, synchronization, and mutations efficient and easy to implement.

notes:

useSuspenseQuery: integrates directly with React's Suspense.
It doesn't return isLoading or isError states; instead, 
React Suspense automatically shows the fallback component when the query is loading 
and throws an error boundary when an error occurs.

useQuery: you are responsible for managing the loading, error, and data states in your component.
Has more control on when he query is executed, with options like 'enabled'
*/
