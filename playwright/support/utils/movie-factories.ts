import { faker } from '@faker-js/faker'
import type { Movie } from '@prisma/client'

export const generateMovieWithoutId = (): Omit<Movie, 'id'> => {
  return {
    name: faker.lorem.words(3), // random 3-word title
    year: faker.date.past({ years: 50 }).getFullYear(), // random year between the past 50 years
    rating: faker.number.float({ min: 1, max: 10, fractionDigits: 1 }), // random rating between 1 and 10 with 1 decimal place
    director: faker.lorem.words(3)
  }
}

export const generateMovieWithId = (): Movie => {
  return {
    id: faker.number.int({ min: 1, max: 1000 }), // random ID between 1 and 1000
    name: faker.lorem.words(3),
    year: faker.date.past({ years: 50 }).getFullYear(),
    rating: faker.number.float({ min: 1, max: 10, fractionDigits: 1 }),
    director: faker.lorem.words(3)
  }
}
