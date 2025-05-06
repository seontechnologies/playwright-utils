import { execSync } from 'node:child_process'

/**
 * Runs a shell command and returns the output.
 * Handles errors gracefully and returns null if the command fails.
 * @param {string} command - The command to run.
 * @returns {string | null} - The output of the command or null if it fails.
 */
export function runCommand(command: string): string | null {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim()
  } catch (error) {
    const typedError = error as Error
    console.error(typedError.message)
    return null // Return null to signify failure
  }
}
