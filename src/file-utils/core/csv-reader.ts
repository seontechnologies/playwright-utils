import { promises as fs } from 'fs'
import path from 'path'
import { parse } from 'papaparse'
import type {
  CSVReadOptions,
  CSVReadResult,
  CSVValidateOptions,
  CSVCellValidation
} from './types'

const DEFAULT_OPTIONS: CSVReadOptions = {
  encoding: 'utf8',
  parseHeaders: true,
  delimiter: ',',
  trim: true
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

  const parseResult = parse<T>(fileContent, {
    header: parseHeaders,
    delimiter,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (header) => (trim ? header.trim() : header)
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
    content: parseResult.data
  }
}

function validateCellValues(
  csvData: Array<Record<string, unknown>>,
  cellValidations?: CSVCellValidation[]
): boolean {
  if (!cellValidations || cellValidations.length === 0) {
    return true
  }

  for (const validation of cellValidations) {
    if (validation.row < 0 || validation.row >= csvData.length) {
      return false
    }

    const row = csvData[validation.row] as Record<string, unknown>
    let cellValue: unknown

    if (typeof validation.column === 'string') {
      if (!(validation.column in row)) {
        return false
      }
      cellValue = row[validation.column]
    } else {
      const columnKey = Object.keys(row)[validation.column]
      if (columnKey === undefined) {
        return false
      }
      cellValue = row[columnKey]
    }

    if (cellValue !== validation.value) {
      return false
    }
  }

  return true
}

/**
 * Validates a CSV file against expected structure and content criteria.
 * Throws an error if the file cannot be read, but returns false for
 * content validation failures.
 *
 * @param options - Options for CSV validation.
 * @returns True if the file passes all validation criteria, false otherwise.
 *
 * @example
 * ```ts
 * // Validate headers and row count
 * const isValid = await validateCSV({
 *   filePath: '/path/to/transactions.csv',
 *   expectedHeaders: ['date', 'amount', 'category'],
 *   expectedRowCount: 100,
 * });
 *
 * // Validate specific cell values
 * const isValid = await validateCSV({
 *   filePath: '/path/to/data.csv',
 *   cellValues: [
 *     { row: 0, column: 'name', value: 'John' },
 *     { row: 1, column: 2, value: 42 }
 *   ]
 * });
 * ```
 */
export async function validateCSV(
  options: { filePath: string } & CSVValidateOptions
): Promise<boolean> {
  const result = await readCSV(options)

  if (options.expectedHeaders && options.expectedHeaders.length > 0) {
    const actualHeaders =
      result.content.length > 0 ? Object.keys(result.content[0] || {}) : []
    const missingHeaders = options.expectedHeaders.filter(
      (header) => !actualHeaders.includes(header)
    )
    if (missingHeaders.length > 0) {
      return false
    }
  }

  if (
    options.expectedRowCount !== undefined &&
    result.content.length !== options.expectedRowCount
  ) {
    return false
  }

  if (
    options.cellValues &&
    !validateCellValues(result.content, options.cellValues)
  ) {
    return false
  }

  return true
}
