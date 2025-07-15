/* eslint-disable @typescript-eslint/no-explicit-any */
import type { XLSXReadOptions, XLSXReadResult } from './types'
import path from 'path'
import * as ExcelJS from 'exceljs'

/**
 * Default options for XLSX reading
 */
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
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)

    const worksheets = workbook.worksheets.map((sheet) => ({
      name: sheet.name,
      data: convertWorksheetToArray<T>(sheet, opts)
    }))

    // Find the active sheet based on sheetName option or default to first sheet
    const activeSheetIndex = opts.sheetName
      ? worksheets.findIndex((sheet) => sheet.name === opts.sheetName)
      : 0

    // Ensure we have at least one worksheet to use as active sheet
    let activeSheet = { name: '', data: [] as T[] }

    if (worksheets.length > 0) {
      // Use found sheet or fallback to first sheet if named sheet wasn't found
      const sheetIndex =
        activeSheetIndex >= 0 && activeSheetIndex < worksheets.length
          ? activeSheetIndex
          : 0

      // This ensures we're safely accessing an existing element
      activeSheet =
        worksheets[sheetIndex] !== undefined
          ? worksheets[sheetIndex]
          : { name: '', data: [] as T[] }
    }

    return {
      filePath,
      fileName: path.basename(filePath),
      extension: 'xlsx',
      content: {
        worksheets,
        activeSheet
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read Excel file: ${error.message}`)
    }
    throw error
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
      (cell: ExcelJS.Cell, colNumber: number) => {
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

function getCellValue(cell: ExcelJS.Cell, options: XLSXReadOptions): unknown {
  if (!cell) {
    return null
  }

  switch (cell.type) {
    case ExcelJS.ValueType.Number:
    case ExcelJS.ValueType.String:
    case ExcelJS.ValueType.Boolean:
    case ExcelJS.ValueType.Date:
    case ExcelJS.ValueType.Hyperlink:
      return cell.value
    case ExcelJS.ValueType.Formula:
      return options.includeFormulas
        ? { formula: cell.formula, result: cell.result }
        : cell.result
    case ExcelJS.ValueType.Error:
    default:
      return null
  }
}
