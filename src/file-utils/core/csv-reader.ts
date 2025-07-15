import { promises as fs } from 'fs'
import path from 'path'
import type {
  CSVReadOptions,
  CSVReadResult,
  CSVValidateOptions,
  CSVCellValidation
} from './types'

/**
 * Default options for CSV reading
 */
const DEFAULT_OPTIONS: CSVReadOptions = {
  encoding: 'utf8',
  parseHeaders: true,
  delimiter: ',',
  trim: true
}

/**
 * Reads the contents of a CSV file
 *
 * @param filePath - Path to the CSV file
 * @param encoding - Character encoding of the file
 * @returns The file content as a string
 */
async function readCSVFileContent(
  filePath: string,
  encoding: BufferEncoding
): Promise<string> {
  try {
    return (await fs.readFile(filePath, { encoding })) as string
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read CSV file: ${error.message}`)
    }
    throw error
  }
}

/**
 * Splits CSV content into lines, filtering out empty ones
 *
 * @param content - Raw CSV file content
 * @returns Array of non-empty lines
 */
const splitIntoLines = (content: string): string[] =>
  content.split(/\r?\n/).filter((line) => line.trim().length > 0)

/**
 * Extracts headers from the first line if needed
 *
 * @param lines - Array of CSV lines
 * @param delimiter - Delimiter character
 * @param trim - Whether to trim whitespace
 * @returns Object containing headers and starting row index
 */
function extractHeaders(
  lines: string[],
  delimiter: string | undefined,
  trim: boolean | undefined
): { headers: string[]; startRowIndex: number } {
  let headers: string[] = []
  let startRowIndex = 0

  if (lines.length > 0) {
    const headerLine = lines[0]
    if (headerLine && delimiter) {
      headers = headerLine
        .split(delimiter)
        .map((header) => (trim ? header.trim() : header))
      startRowIndex = 1
    }
  }

  return { headers, startRowIndex }
}

/**
 * Creates a row object with headers as keys
 *
 * @param headers - Array of header names
 * @param values - Array of cell values
 * @returns Record with header keys and cell values
 */
function createRowWithHeaders(
  headers: string[],
  values: string[]
): Record<string, unknown> {
  const row: Record<string, unknown> = {}

  for (let j = 0; j < headers.length; j++) {
    const header = headers[j]
    if (header !== undefined) {
      row[header] = j < values.length ? values[j] : ''
    }
  }

  return row
}

/**
 * Creates a row object with numeric indices as keys
 *
 * @param values - Array of cell values
 * @returns Record with numeric keys and cell values
 */
function createRowWithIndices(values: string[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}

  for (let j = 0; j < values.length; j++) {
    row[j.toString()] = values[j]
  }

  return row
}

/**
 * Reads a CSV file and parses it into an array of objects
 *
 * @param options - Options for CSV reading
 *   - filePath: Path to the CSV file
 *   - delimiter: Character used to separate values (default: ',')
 *   - encoding: File encoding (default: 'utf8')
 *   - parseHeaders: Whether to use first row as headers (default: true)
 *   - trim: Whether to trim whitespace from values (default: true)
 * @returns Promise resolving to a CSVReadResult
 *
 * @example
 * ```ts
 * // Read CSV with default options (headers as keys)
 * const result = await readCSV({ filePath: '/path/to/file.csv' });
 * console.log(result.content); // Array of objects, one per row
 *
 * // Read CSV with custom options
 * const result = await readCSV({
 *   filePath: '/path/to/file.csv',
 *   delimiter: ';',
 *   parseHeaders: false
 * });
 * ```
 */
export async function readCSV(
  options: { filePath: string } & Partial<CSVReadOptions>
): Promise<CSVReadResult> {
  // Merge default options with provided options
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const filePath = options.filePath

  try {
    // Read and parse the CSV file
    const fileContent = await readCSVFileContent(
      filePath,
      opts.encoding as BufferEncoding
    )
    const lines = splitIntoLines(fileContent)

    // Handle empty files
    if (lines.length === 0) {
      return {
        filePath,
        fileName: path.basename(filePath),
        extension: 'csv',
        content: []
      }
    }

    // Extract headers if needed
    const { headers, startRowIndex } = opts.parseHeaders
      ? extractHeaders(lines, opts.delimiter, opts.trim)
      : { headers: [], startRowIndex: 0 }

    // Parse each data row
    const rows: Array<Record<string, unknown>> = []

    for (let i = startRowIndex; i < lines.length; i++) {
      const values = parseCSVLine(lines[i] as string, opts.delimiter, opts.trim)

      // Create row object (either with headers or numeric indices)
      const row = opts.parseHeaders
        ? createRowWithHeaders(headers, values)
        : createRowWithIndices(values)

      rows.push(row)
    }

    return {
      filePath,
      fileName: path.basename(filePath),
      extension: 'csv',
      content: rows
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read CSV file: ${error.message}`)
    }
    throw error
  }
}

/**
 * Parse a CSV line into an array of values, handling quoted values correctly
 *
 * @param line - The CSV line to parse
 * @param delimiter - The delimiter character
 * @param trim - Whether to trim whitespace from values
 * @returns Array of values
 */
function parseCSVLine(
  line: string,
  delimiter: string | undefined,
  trim = true
): string[] {
  const values: string[] = []
  let currentValue = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = i < line.length - 1 ? line[i + 1] : null

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Handle escaped quotes
        currentValue += '"'
        i++ // Skip the next quote
      } else {
        // Toggle quote mode
        insideQuotes = !insideQuotes
      }
    } else if (delimiter && char === delimiter && !insideQuotes) {
      // End of value
      values.push(trim ? currentValue.trim() : currentValue)
      currentValue = ''
    } else {
      // Add character to current value
      currentValue += char
    }
  }

  // Add the last value
  values.push(trim ? currentValue.trim() : currentValue)

  return values
}

/**
 * Validates specific cell values in CSV data
 *
 * @param csvData - The CSV data to validate
 * @param cellValidations - Cell validations to perform
 * @returns Whether all cell validations pass
 */
function validateCellValues(
  csvData: Array<Record<string, unknown>>,
  cellValidations?: CSVCellValidation[]
): boolean {
  if (!csvData || !cellValidations || cellValidations.length === 0) {
    return true // No cell values to validate
  }

  for (const validation of cellValidations) {
    // Check if row exists
    if (validation.row < 0 || validation.row >= csvData.length) {
      return false
    }

    const row = csvData[validation.row] as Record<string, unknown>

    // Handle column access (by index or name)
    let cellValue: unknown
    if (typeof validation.column === 'string') {
      // By column name
      if (!(validation.column in row)) {
        return false // Column doesn't exist
      }
      cellValue = row[validation.column]
    } else {
      // By column index - convert to column key
      const columnKey = Object.keys(row)[validation.column]
      if (!columnKey) {
        return false // Column index out of bounds
      }
      cellValue = row[columnKey]
    }

    // Check cell value
    if (cellValue !== validation.value) {
      return false
    }
  }

  return true // All validations passed
}

/**
 * Validates a CSV file against expected structure and content criteria
 *
 * This function allows you to verify if a CSV file meets specific requirements:
 * - Contains all required column headers
 * - Has the expected number of data rows
 * - Contains specific cell values at given coordinates
 *
 * Use this function for test assertions or to validate files before processing them further.
 *
 * @example
 * ```ts
 * // Validate that a CSV has the required headers
 * const isValid = await validateCSV({
 *   filePath: '/path/to/users.csv',
 *   expectedHeaders: ['id', 'name', 'email']
 * });
 *
 * // Validate both headers and row count with custom delimiter
 * const isValid = await validateCSV({
 *   filePath: '/path/to/transactions.csv',
 *   expectedHeaders: ['date', 'amount', 'category'],
 *   expectedRowCount: 100,
 *   delimiter: ';'
 * });
 *
 * // Validate specific cell values
 * const isValid = await validateCSV({
 *   filePath: '/path/to/data.csv',
 *   cellValues: [
 *     { row: 0, column: 0, value: 'John' }, // First cell in first row
 *     { row: 1, column: 2, value: 42 }      // Third cell in second row
 *   ]
 * });
 * ```
 *
 * @param options - Options for CSV validation
 *   - filePath: Path to the CSV file to validate
 *   - expectedHeaders: Array of column headers that must exist in the file
 *   - expectedRowCount: Exact number of data rows the file should contain
 *   - cellValues: Array of cell validations to perform
 *   - Other CSV read options (delimiter, encoding, etc.)
 * @returns true if the file passes all validation criteria, false otherwise
 */
export async function validateCSV(
  options: {
    filePath: string
  } & CSVValidateOptions
): Promise<boolean> {
  try {
    const result = await readCSV(options)

    // Validate headers if provided
    if (options.expectedHeaders && options.expectedHeaders.length > 0) {
      // Get actual headers (keys of the first object)
      let actualHeaders: string[] = []
      if (result.content.length > 0 && result.content[0]) {
        actualHeaders = Object.keys(
          result.content[0] as Record<string, unknown>
        )
      }

      // Check if all expected headers exist
      const missingHeaders = options.expectedHeaders.filter(
        (header: string) => !actualHeaders.includes(header)
      )

      if (missingHeaders.length > 0) {
        return false
      }
    }

    // Validate row count if provided
    if (options.expectedRowCount !== undefined) {
      if (result.content.length !== options.expectedRowCount) {
        return false
      }
    }

    // Validate specific cell values if provided
    if (
      options.cellValues &&
      !validateCellValues(result.content, options.cellValues)
    ) {
      return false
    }

    return true
  } catch {
    // Errors are not thrown, return false for validation failure
    return false
  }
}
