import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse } from 'papaparse'
import type { CSVReadOptions, CSVReadResult } from './types'
import { CSVError, FileValidationError } from './types'

const DEFAULT_OPTIONS: CSVReadOptions = {
  encoding: 'utf8',
  parseHeaders: true,
  delimiter: 'auto',
  trim: true
}

/**
 * Reads CSV data and parses it into an array of objects.
 *
 * @param options - Options for CSV reading
 *   - filePath: Path to the CSV file (mutually exclusive with content)
 *   - content: Direct CSV content as string or Buffer (mutually exclusive with filePath)
 *   - delimiter: Character used to separate values (default: ',')
 *   - encoding: File encoding (default: 'utf8')
 *   - parseHeaders: Whether to use the first row as headers (default: true)
 *   - trim: Whether to trim whitespace from values (default: true)
 * @returns A promise resolving to a CSVReadResult with typed content.
 *
 * @example
 * ```ts
 * // Read from file
 * const result = await readCSV({ filePath: 'path/to/data.csv' });
 *
 * // Read from buffer (e.g., extracted from ZIP)
 * const result = await readCSV({ content: buffer });
 *
 * // Read from string content
 * const csvString = 'name,age\nJohn,25\nJane,30';
 * const result = await readCSV({ content: csvString });
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
  options: CSVReadOptions
): Promise<CSVReadResult<T>> {
  const { filePath, content, ...userOptions } = options

  // Validate that either filePath or content is provided, but not both
  if (!filePath && !content) {
    throw new FileValidationError(
      'Either filePath or content must be provided',
      undefined,
      'missing'
    )
  }
  if (filePath && content) {
    throw new FileValidationError(
      'Cannot provide both filePath and content - choose one',
      filePath,
      'conflict'
    )
  }

  const opts = { ...DEFAULT_OPTIONS, ...userOptions }
  const { encoding, delimiter, parseHeaders, trim } = opts

  // Get CSV content from either file or direct content
  const fileContent: string = filePath
    ? await readFileSafely(filePath, encoding)
    : content instanceof Buffer
      ? content.toString(encoding || 'utf8')
      : (content as string)

  // auto-detect delimiter if set to 'auto'
  const effectiveDelimiter =
    delimiter === 'auto' ? detectDelimiter(fileContent) : delimiter

  const parseResult = parse<T>(fileContent, {
    header: parseHeaders,
    delimiter: effectiveDelimiter,
    skipEmptyLines: true,
    dynamicTyping: true,
    // ensure the resulting object keys are clean and consistent
    transformHeader: (header) => (trim ? header.trim() : header),
    // handle quoted fields and empty values better
    quoteChar: '"',
    escapeChar: '"'
  })

  if (parseResult.errors.length > 0) {
    const firstError = parseResult.errors[0]
    if (firstError) {
      throw new CSVError(
        `Failed to parse CSV: ${firstError.message}`,
        firstError.row,
        undefined // papaparse ParseError doesn't have field property
      )
    }
    throw new CSVError('Failed to parse CSV due to an unknown parsing error')
  }

  // Handle metadata when reading from content vs file
  const resultFilePath = filePath || '<content>'
  const resultFileName = filePath
    ? path.basename(filePath)
    : content instanceof Buffer
      ? '<buffer-content>'
      : '<string-content>'

  return {
    filePath: resultFilePath,
    fileName: resultFileName,
    extension: 'csv',
    content: {
      data: parseResult.data,
      headers: parseResult.meta.fields || []
    }
  }
}

/**
 * Detects the most likely delimiter in a CSV string using improved multi-line analysis
 * @param fileContent The CSV content to analyze
 * @returns The detected delimiter or ',' as fallback
 */
function detectDelimiter(fileContent: string): string {
  const lines = fileContent.split('\n').filter((line) => line.trim().length > 0)
  const delimiters = [',', ';', '\t', '|']

  // If no content, return default
  if (lines.length === 0) return ','

  // Analyze up to first 5 lines for better accuracy
  const linesToAnalyze = lines.slice(0, Math.min(5, lines.length))

  const delimiterScores = delimiters.map((delimiter) => {
    const scores = linesToAnalyze.map((line) =>
      analyzeLineForDelimiter(line, delimiter)
    )

    // Calculate consistency score - high if all lines have similar field counts
    const fieldCounts = scores.map((s) => s.fieldCount)
    const avgFields =
      fieldCounts.reduce((a, b) => a + b, 0) / fieldCounts.length
    const variance =
      fieldCounts.reduce(
        (sum, count) => sum + Math.pow(count - avgFields, 2),
        0
      ) / fieldCounts.length
    const consistencyScore = avgFields > 1 ? 1 / (1 + variance) : 0

    // Calculate total delimiter count
    const totalCount = scores.reduce((sum, s) => sum + s.delimiterCount, 0)

    return {
      delimiter,
      totalCount,
      avgFieldCount: avgFields,
      consistencyScore,
      // Combined score: higher field count + high consistency + prefer common delimiters
      finalScore:
        totalCount * consistencyScore * avgFields +
        getDelimiterPreferenceBonus(delimiter)
    }
  })

  // Sort by final score and return the best delimiter
  const sorted = delimiterScores.sort((a, b) => b.finalScore - a.finalScore)
  const bestMatch = sorted[0]

  // Return best match if it has a reasonable score, otherwise fallback to comma
  return bestMatch && bestMatch.finalScore > 0 ? bestMatch.delimiter : ','
}

/**
 * Analyzes a single line to count delimiters and estimate field count
 */
function analyzeLineForDelimiter(
  line: string,
  delimiter: string
): { delimiterCount: number; fieldCount: number } {
  // Handle quoted fields that might contain delimiters
  let delimiterCount = 0
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    // Track quote state
    // eslint-disable-next-line quotes
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true
      quoteChar = char
    } else if (char === quoteChar && inQuotes) {
      // Check for escaped quotes
      if (i + 1 < line.length && line[i + 1] === quoteChar) {
        i++ // Skip the escaped quote
      } else {
        inQuotes = false
        quoteChar = ''
      }
    } else if (!inQuotes && char === delimiter) {
      delimiterCount++
    }
  }

  return {
    delimiterCount,
    fieldCount: delimiterCount + 1 // Field count is delimiter count + 1
  }
}

/**
 * Provides preference bonus for common delimiters
 */
function getDelimiterPreferenceBonus(delimiter: string): number {
  switch (delimiter) {
    case ',':
      return 0.1 // Slight preference for comma (most common)
    case ';':
      return 0.05 // Second preference for semicolon
    case '\t':
      return 0.02 // Tab is less common but valid
    case '|':
      return 0.01 // Pipe is least common
    default:
      return 0
  }
}

async function readFileSafely(
  filePath: string,
  encoding: string | undefined
): Promise<string> {
  const effectiveEncoding = encoding || 'utf8' // Provide default
  try {
    return await fs.readFile(filePath, {
      encoding: effectiveEncoding as BufferEncoding
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    throw new FileValidationError(
      `Failed to read CSV file: ${errorMessage}`,
      filePath,
      'access'
    )
  }
}
