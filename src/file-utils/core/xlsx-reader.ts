import * as ExcelJS from 'exceljs'
import path from 'path'
import type { XLSXReadOptions, XLSXReadResult } from './types'
import { XLSXError, FileValidationError } from './types'

const DEFAULT_OPTIONS: XLSXReadOptions = {
  parseHeaders: true,
  sheetName: undefined,
  includeFormulas: false
}

/**
 * Reads an Excel file and parses it into a structured format
 *
 * @param options - Options for Excel parsing
 *   - filePath: Path to the Excel file
 *   - sheetName: Name of sheet to set as active (defaults to first sheet)
 *   - Other reading options
 * @returns Promise resolving to an XLSXReadResult
 *
 * @example
 * ```ts
 * // Read Excel with default options (first sheet active)
 * const result = await readXLSX({ filePath: '/path/to/file.xlsx' });
 * console.log(result.content.activeSheet); // Data from active sheet
 *
 * // Read Excel with custom sheet name and strong types
 * interface User {
 *   ID: number;
 *   Name: string;
 * }
 * const result = await readXLSX<User>({
 *   filePath: '/path/to/file.xlsx',
 *   sheetName: 'Users'
 * });
 * ```
 */
export async function readXLSX<T = Record<string, unknown>>(
  options: { filePath: string } & Partial<XLSXReadOptions>
): Promise<XLSXReadResult<T>> {
  const { filePath, ...userOptions } = options
  const opts = { ...DEFAULT_OPTIONS, ...userOptions }

  try {
    const workbook = await loadWorkbook(filePath)
    const worksheets = processWorksheets<T>(workbook, opts)
    const activeSheet = determineActiveSheet(worksheets, opts.sheetName)

    return buildXLSXResult(filePath, worksheets, activeSheet)
  } catch (error) {
    // Re-throw existing custom errors
    if (error instanceof FileValidationError || error instanceof XLSXError) {
      throw error
    }

    if (error instanceof Error) {
      throw new XLSXError(
        `Failed to read Excel file: ${error.message}`,
        opts.sheetName
      )
    }
    throw new XLSXError(
      'Unknown error occurred while reading Excel file',
      opts.sheetName
    )
  }
}

async function loadWorkbook(filePath: string): Promise<ExcelJS.Workbook> {
  try {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    return workbook
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    throw new FileValidationError(
      `Failed to load Excel file: ${errorMessage}`,
      filePath,
      'access'
    )
  }
}

function processWorksheets<T>(
  workbook: ExcelJS.Workbook,
  options: XLSXReadOptions
) {
  return workbook.worksheets.map((sheet) => ({
    name: sheet.name,
    data: convertWorksheetToArray<T>(sheet, options)
  }))
}

function determineActiveSheet<T>(
  worksheets: Array<{ name: string; data: T[] }>,
  sheetName?: string
): { name: string; data: T[] } {
  if (worksheets.length === 0) {
    return { name: '', data: [] as T[] }
  }

  const activeSheetIndex = sheetName
    ? worksheets.findIndex((sheet) => sheet.name === sheetName)
    : 0

  const sheetIndex =
    activeSheetIndex >= 0 && activeSheetIndex < worksheets.length
      ? activeSheetIndex
      : 0

  // Add a null check to ensure we never return undefined
  const selectedSheet = worksheets[sheetIndex]
  return selectedSheet || { name: '', data: [] as T[] }
}

function buildXLSXResult<T>(
  filePath: string,
  worksheets: Array<{ name: string; data: T[] }>,
  activeSheet: { name: string; data: T[] }
): XLSXReadResult<T> {
  return {
    filePath,
    fileName: path.basename(filePath),
    extension: 'xlsx',
    content: { worksheets, activeSheet }
  }
}

function convertWorksheetToArray<T = Record<string, unknown>>(
  worksheet: ExcelJS.Worksheet,
  options: XLSXReadOptions
): Array<T> {
  const result: Array<T> = []
  let headers: string[]
  const rowCount = worksheet.rowCount || 0
  if (rowCount === 0) {
    return []
  }

  if (options.parseHeaders) {
    const headerRow = worksheet.getRow(1)
    // First, collect all column numbers to determine the proper array size
    const columnNumbers: number[] = []

    headerRow.eachCell(
      { includeEmpty: true },
      (_cell: ExcelJS.Cell, colNumber: number) => {
        columnNumbers.push(colNumber)
      }
    )

    // Initialize the array with proper size to avoid sparse array
    const maxCol = Math.max(...columnNumbers, 0)
    headers = Array(maxCol)
      .fill('')
      .map((_, idx) => `Column${idx + 1}`)

    // Now populate with actual header values
    headerRow.eachCell(
      { includeEmpty: true },
      (cell: ExcelJS.Cell, colNumber: number) => {
        const header = getCellValue(cell, options)
        const headerStr =
          header !== null && header !== undefined
            ? String(header)
            : `Column${colNumber}`

        let headerName: string = headerStr
        const baseHeader: string = headerName
        let suffix = 1
        while (headers.slice(0, colNumber - 1).includes(headerName)) {
          headerName = `${baseHeader}_${suffix}`
          suffix++
        }
        headers[colNumber - 1] = headerName
      }
    )

    for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber)
      const rowData: Record<string, unknown> = {}

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1]
        if (header) {
          rowData[header] = getCellValue(cell, options)
        }
      })

      headers.forEach((header) => {
        if (!(header in rowData)) {
          rowData[header] = null
        }
      })

      result.push(rowData as T)
    }
  } else {
    for (let rowNumber = 1; rowNumber <= rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber)
      const rowData: Record<string, unknown> = {}

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[String(colNumber)] = getCellValue(cell, options)
      })

      result.push(rowData as T)
    }
  }

  return result
}

const cellValueHandlers = new Map<
  ExcelJS.ValueType | 'default',
  (cell: ExcelJS.Cell, options: XLSXReadOptions) => unknown
>([
  [ExcelJS.ValueType.Number, (cell) => cell.value],
  [ExcelJS.ValueType.String, (cell) => cell.value],
  [ExcelJS.ValueType.Boolean, (cell) => cell.value],
  [ExcelJS.ValueType.Date, (cell) => cell.value],
  [ExcelJS.ValueType.Hyperlink, (cell) => cell.value],
  [
    ExcelJS.ValueType.Formula,
    (cell, options) =>
      options.includeFormulas
        ? { formula: cell.formula, result: cell.result }
        : cell.result
  ],
  ['default', () => null]
])

function getCellValue(cell: ExcelJS.Cell, options: XLSXReadOptions): unknown {
  if (!cell) return null
  const handler =
    cellValueHandlers.get(cell.type) || cellValueHandlers.get('default')!
  return handler(cell, options)
}
