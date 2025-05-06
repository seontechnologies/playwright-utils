import { existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'

// Determine the sample-app root directory
const findProjectRoot = () => {
  // Get the directory of the current file (works in CommonJS)
  const currentDir = __dirname

  // Detect if we're in sample-app or in a different location
  const projectRoot = currentDir.includes('sample-app')
    ? resolve(currentDir, currentDir.split('sample-app')[0] + 'sample-app')
    : resolve(process.cwd(), 'sample-app')

  return projectRoot
}
const projectRoot = findProjectRoot()

// Use test-events folder to match the kafka:reset-logs script
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
console.log(`Events will be logged to: ${logFilePath}`)
