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

    return {
      filePath,
      fileName: path.basename(filePath),
      extension: 'xlsx',
      content: {
        worksheets
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
    headers = []

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
        while (headers.includes(headerName)) {
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
