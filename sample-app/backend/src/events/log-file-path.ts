import { existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'

// Get the project root (backend directory)
const getProjectRoot = () => {
  // If we're running in the backend directory, use it
  if (__dirname.includes('backend')) {
    // Go up from src/events to backend directory
    return resolve(__dirname, '../../')
  }
  // Fallback to current working directory
  return process.cwd()
}

const projectRoot = getProjectRoot()
// Create test-events directory in the backend
const eventsDir = resolve(projectRoot, 'test-events')

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
