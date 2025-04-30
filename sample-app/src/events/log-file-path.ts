import { existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'

// Use test-events folder to match the kafka:reset-logs script
const eventsDir = resolve(process.cwd(), 'test-events')

// Ensure the directory exists
if (!existsSync(eventsDir)) {
  try {
    console.log(`Creating events directory at: ${eventsDir}`)
    mkdirSync(eventsDir, { recursive: true })
  } catch (error) {
    console.error(
      `Failed to create events directory: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

// Export the full path to the log file
export const logFilePath = join(eventsDir, 'movie-events.log')
console.log(`Events will be logged to: ${logFilePath}`)
