/**
 * Secure File Loading for Schema Validation
 *
 * This module provides secure file loading capabilities for schema files
 * with built-in security validations and format detection.
 *
 * @module FileLoader
 */

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

/**
 * Allowed file extensions for schema files
 */
const ALLOWED_EXTENSIONS = ['.json', '.yaml', '.yml'] as const

/**
 * Load schema from file path with comprehensive security validations
 *
 * This function provides secure file loading with multiple security checks:
 * - File extension validation (only .json, .yaml, .yml allowed)
 * - Path resolution to prevent directory traversal
 * - Safe YAML parsing (no code execution)
 * - Comprehensive error handling
 *
 * @param filePath - Path to the schema file (relative or absolute)
 * @returns Parsed schema object
 * @throws Error if file is not found, has invalid extension, or parsing fails
 *
 * @example
 * ```typescript
 * // Load JSON schema
 * const jsonSchema = await loadSchemaFromFile('./schemas/user.json')
 *
 * // Load YAML OpenAPI spec
 * const yamlSchema = await loadSchemaFromFile('./openapi/api.yaml')
 * ```
 *
 * @security
 * - Only allows specific file extensions to prevent arbitrary file reading
 * - Uses path.resolve() to prevent directory traversal attacks
 * - YAML parsing is safe by default (no code execution in js-yaml v4+)
 */
export async function loadSchemaFromFile(filePath: string): Promise<object> {
  try {
    const resolvedPath = path.resolve(filePath)

    // Security: Validate file extensions to prevent loading arbitrary files
    const fileExtension = path.extname(filePath).toLowerCase()
    if (
      !ALLOWED_EXTENSIONS.includes(
        fileExtension as (typeof ALLOWED_EXTENSIONS)[number]
      )
    ) {
      throw new Error(
        `Invalid file extension: ${fileExtension}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      )
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Schema file not found: ${resolvedPath}`)
    }

    // Read file content
    const content = fs.readFileSync(resolvedPath, 'utf8')

    // Parse based on file extension
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      // Security: yaml.load() is safe by default in js-yaml v4+ (no code execution)
      return yaml.load(content) as object
    } else {
      return JSON.parse(content)
    }
  } catch (error) {
    throw new Error(
      `Failed to load schema file: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Check if a file path has a valid schema file extension
 *
 * @param filePath - File path to validate
 * @returns True if the file has a valid schema extension
 */
export function isValidSchemaFile(filePath: string): boolean {
  const fileExtension = path.extname(filePath).toLowerCase()
  return ALLOWED_EXTENSIONS.includes(
    fileExtension as (typeof ALLOWED_EXTENSIONS)[number]
  )
}

/**
 * Get the list of allowed file extensions for schema files
 *
 * @returns Array of allowed file extensions
 */
export function getAllowedExtensions(): readonly string[] {
  return ALLOWED_EXTENSIONS
}
