import { faker } from '@faker-js/faker'
import type { Movie } from '@shared/types/movie-types'

export const generateMovieWithoutId = (): Omit<Movie, 'id'> => {
  return {
    name: faker.lorem.words(3), // random 3-word title
    year: faker.date.past({ years: 50 }).getFullYear(), // random year within the past 50 years
    rating: faker.number.float({ min: 1, max: 10, fractionDigits: 1 }), // random rating between 1 and 10 with one decimal place,
    director: faker.lorem.words(3)
  }
}
