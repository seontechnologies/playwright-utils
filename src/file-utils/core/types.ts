/**
 * Type definitions for file reading and validation operations
 *
 * This file contains shared type definitions used by the specialized readers:
 * - csv-reader.ts
 * - xlsx-reader.ts
 * - pdf-reader.ts
 * - zip-reader.ts
 */

// =========================================================================
// General & File Result Types
// =========================================================================

/**
 * Supported file types for reading
 */
export type SupportedFileType = 'csv' | 'xlsx' | 'pdf' | 'zip'

/**
 * Base result type for file reading operations
 */
export type FileReadResult<T> = {
  filePath: string
  fileName: string
  extension: SupportedFileType
  content: T
}

/**
 * Result type for CSV files
 */
export type CSVReadResult = FileReadResult<Array<Record<string, unknown>>>

/**
 * Result type for XLSX files
 */
export type XLSXReadResult = FileReadResult<{
  sheetNames: string[]
  sheets: Record<string, Array<Record<string, unknown>>>
  activeSheet: Array<Record<string, unknown>>
}>

/**
 * Result type for PDF files
 */
export type PDFReadResult = FileReadResult<string> & {
  pagesCount: number
  info: {
    creator: string
    producer: string
    creationDate: string
    version: string
  }
}

/**
 * Result type for ZIP files
 */
export type ZIPReadResult = FileReadResult<{
  entries: string[]
  extractedFiles?: Record<string, Buffer>
}>

// =========================================================================
// File Reading Options
// =========================================================================

/**
 * Options for reading CSV files
 */
export type CSVReadOptions = {
  encoding?: BufferEncoding
  parseHeaders?: boolean
  delimiter?: string
  trim?: boolean
}

/**
 * Options for reading XLSX files
 */
export type XLSXReadOptions = {
  sheetName?: string
  parseHeaders?: boolean
  includeFormulas?: boolean
}

/**
 * Options for reading PDF files
 */
export type PDFReadOptions = {
  maxPages?: number
  extractText?: boolean
}

/**
 * Options for reading ZIP files
 */
export type ZIPReadOptions = {
  extractAll?: boolean
  extractFiles?: string[]
  extractToDir?: string
}

/**
 * Options for waiting for a file to exist.
 */
export type WaitFileOptions = {
  /** Maximum time to wait in milliseconds */
  timeout?: number
  /** Interval between checks in milliseconds */
  interval?: number
  /** Custom message for logging */
  log?: boolean | string
}

// =========================================================================
// File Validation Options
// =========================================================================

/**
 * Defines a coordinate-based validation for a single cell in a CSV file.
 */
export type CSVCellValidation = {
  row: number
  column: number | string
  value: unknown
}

/**
 * Options for validating CSV files.
 */
export type CSVValidateOptions = CSVReadOptions & {
  expectedHeaders?: string[]
  expectedRowCount?: number
  cellValues?: CSVCellValidation[]
}

/**
 * Defines a coordinate-based validation for a single cell in an XLSX file.
 */
export type XLSXCellValidation = {
  row: number
  column: number | string
  value: unknown
}

/**
 * Options for validating XLSX files.
 */
export type XLSXValidateOptions = {
  sheetName?: string
  expectedHeaders?: string[]
  expectedRowCount?: number
  cellValues?: XLSXCellValidation[]
  readOptions?: XLSXReadOptions
}

/**
 * Options for validating PDF files.
 */
export type PDFValidateOptions = {
  expectedText?: string | RegExp
  readOptions?: PDFReadOptions
}

/**
 * Options for validating ZIP files.
 */
export type ZIPValidateOptions = {
  expectedEntries?: string[]
  readOptions?: Omit<ZIPReadOptions, 'extractToDir'>
}
