import { promises as fs } from 'fs'
import { logFilePath } from '../../../sample-app/backend/src/events/log-file-path'
import type { MovieEvent, MovieAction } from '../../../sample-app/shared/types'

/**
 * Reshapes the Kafka event entry into a simplified format for easier processing.
 *
 * @param {MovieEvent} entry - The Kafka event entry containing topic and message details.
 * @returns {{ topic: string; key: string; movie: Movie }} - Returns a simplified object with the topic, key, and movie details.
 */
const reshape = (entry: MovieEvent) => ({
  topic: entry.topic,
  key: entry.messages[0]?.key,
  movie: JSON.parse(entry.messages[0]?.value as unknown as string)
})

/**
 * Filters Kafka event entries by topic and movieId.
 *
 * @param {number} movieId - The ID of the movie to filter by.
 * @param {string} topic - The Kafka topic to filter by.
 * @param {Array<ReturnType<typeof reshape>>} entries - The list of reshaped Kafka event entries.
 * @returns {Array} - Filtered entries based on the topic and movieId.
 */
const filterByTopicAndId = (
  movieId: number,
  topic: string,
  entries: ReturnType<typeof reshape>[]
) =>
  entries.filter(
    (entry) => entry.topic === topic && entry.movie?.id === movieId
  )

/**
 * Parses the Kafka event log file and filters events based on the topic and movieId.
 *
 * @param {number} movieId - The ID of the movie to filter for.
 * @param {`movie-${MovieAction}`} topic - The Kafka topic to filter by.
 * @param {string} [filePath=logFilePath] - Optional file path for the Kafka event log file.
 * @returns {Promise<Array>} - A promise that resolves to the matching events.
 */
export const parseKafkaEvent = async (
  movieId: number,
  topic: `movie-${MovieAction}`,
  filePath = logFilePath
) => {
  try {
    // Read and process the Kafka log file
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const entries = fileContent
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .map(reshape)

    // Filter the entries by topic and movie ID
    return filterByTopicAndId(movieId, topic, entries)
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error parsing Kafka event log: ${error.message}`)
    } else {
      console.error('An unknown error occurred')
    }
    throw error
  }
}
