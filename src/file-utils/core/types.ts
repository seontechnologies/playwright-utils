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
export type CSVReadResult<T = Record<string, unknown>> = FileReadResult<{
  data: Array<T>
  headers: string[]
}>

/**
 * Result type for XLSX files
 */
export type XLSXReadResult<T = Record<string, unknown>> = FileReadResult<{
  worksheets: Array<{ name: string; data: T[] }>
  activeSheet: { name: string; data: T[] }
}>

/**
 * Result type for PDF files
 */
export type PDFReadResult = FileReadResult<string> & {
  pagesCount: number
  info: Record<string, unknown>
  metadata: Record<string, unknown>
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
  /**
   * Character used to separate values
   * - Specific character like ',', ';', '\t', '|'
   * - 'auto' to auto-detect the delimiter (default)
   */
  delimiter?: string | 'auto'
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
  /**
   * Enable debug logging for PDF extraction
   */
  debug?: boolean
  /**
   * Whether to merge text from all pages into a single string
   * @default true
   */
  mergePages?: boolean
  /**
   * Range of pages to extract text from (future feature)
   */
  pages?: [number, number]
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
 * Custom error for ZIP-related operations to allow for specific try/catch blocks.
 */
export class ZipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipError'
  }
}
