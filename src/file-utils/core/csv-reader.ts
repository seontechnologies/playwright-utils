import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse } from 'papaparse'
import type { CSVReadOptions, CSVReadResult } from './types'

const DEFAULT_OPTIONS: CSVReadOptions = {
  encoding: 'utf8',
  parseHeaders: true,
  delimiter: 'auto', // Auto-detect delimiter
  trim: true
}

/**
 * Detects the most likely delimiter in a CSV string
 * @param fileContent The CSV content to analyze
 * @returns The detected delimiter or ',' as fallback
 */
const detectDelimiter = (fileContent: string): string => {
  // Simple heuristic: check first line for common delimiters
  const firstLine = fileContent.split('\n')[0] || ''
  const delimiters = [';', ',', '\t', '|']

  // Count occurrences of each delimiter in the first line
  // Escape special regex characters
  const counts = delimiters.map((d) => {
    const escapedDelimiter = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return (firstLine.match(new RegExp(escapedDelimiter, 'g')) || []).length
  })

  // Find the delimiter with the highest count
  const delimiterCounts = delimiters.map((delimiter, index) => ({
    delimiter,
    count: counts[index] || 0
  }))

  // Sort by count descending and take the first (most frequent)
  const sorted = delimiterCounts.sort((a, b) => b.count - a.count)

  // Return the most frequent delimiter or comma as fallback
  return sorted.length > 0 && sorted[0] && sorted[0].count > 0
    ? sorted[0].delimiter
    : ','
}

/**
 * Reads a CSV file and parses it into an array of objects.
 *
 * @param options - Options for CSV reading
 *   - filePath: Path to the CSV file
 *   - delimiter: Character used to separate values (default: ',')
 *   - encoding: File encoding (default: 'utf8')
 *   - parseHeaders: Whether to use the first row as headers (default: true)
 *   - trim: Whether to trim whitespace from values (default: true)
 * @returns A promise resolving to a CSVReadResult with typed content.
 *
 * @example
 * ```ts
 * // Read with default options
 * const result = await readCSV({ filePath: 'path/to/data.csv' });
 *
 * // Read with strong types
 * interface User {
 *   id: number;
 *   name: string;
 * }
 * const result = await readCSV<User>({ filePath: 'path/to/users.csv' });
 * ```
 */
export async function readCSV<T = Record<string, unknown>>(
  options: { filePath: string } & Partial<CSVReadOptions>
): Promise<CSVReadResult<T>> {
  const { filePath, ...userOptions } = options
  const opts = { ...DEFAULT_OPTIONS, ...userOptions }
  const { encoding, delimiter, parseHeaders, trim } = opts

  let fileContent: string
  try {
    fileContent = await fs.readFile(filePath, {
      encoding: encoding as BufferEncoding
    })
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to read CSV file at ${filePath}: ${error.message}`
      )
    }
    throw error
  }

  // Auto-detect delimiter if set to 'auto'
  const effectiveDelimiter =
    delimiter === 'auto' ? detectDelimiter(fileContent) : delimiter

  if (delimiter === 'auto') {
    console.log(`Auto-detected CSV delimiter: '${effectiveDelimiter}'`)
    console.log(
      `First line of CSV: ${fileContent.split('\n')[0]?.substring(0, 200)}`
    )
  }

  const parseResult = parse<T>(fileContent, {
    header: parseHeaders,
    delimiter: effectiveDelimiter,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (header) => (trim ? header.trim() : header),
    // Handle quoted fields and empty values better
    quoteChar: '"',
    escapeChar: '"'
  })

  if (parseResult.errors.length > 0) {
    const firstError = parseResult.errors[0]
    if (firstError) {
      throw new Error(
        `Failed to parse CSV: ${firstError.message} on row ${firstError.row}`
      )
    }
    throw new Error('Failed to parse CSV due to an unknown error.')
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    extension: 'csv',
    content: {
      data: parseResult.data,
      headers: parseResult.meta.fields || []
    }
  }
}
