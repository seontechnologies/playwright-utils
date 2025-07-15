/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  XLSXReadOptions,
  XLSXReadResult,
  XLSXValidateOptions,
  XLSXCellValidation
} from './types'
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

    const sheetNames = workbook.worksheets.map((sheet) => sheet.name)

    const activeWorksheet = opts.sheetName
      ? workbook.getWorksheet(opts.sheetName)
      : workbook.worksheets[0]

    if (!activeWorksheet) {
      if (opts.sheetName) {
        throw new Error(`Sheet "${opts.sheetName}" not found in workbook`)
      } else {
        throw new Error('No worksheets found in workbook')
      }
    }

    const sheets: Record<string, Array<T>> = {}
    for (const worksheet of workbook.worksheets) {
      sheets[worksheet.name] = convertWorksheetToArray(worksheet, opts)
    }

    const activeSheet = sheets[activeWorksheet.name] ?? []

    return {
      filePath,
      fileName: path.basename(filePath),
      extension: 'xlsx',
      content: {
        sheetNames,
        sheets,
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
  let headers: string[] = []

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

function getSheetDataForValidation(
  result: XLSXReadResult<any>,
  sheetName?: string
): Array<Record<string, unknown>> | null {
  if (result.content.sheetNames.length === 0) {
    return null
  }

  const targetSheetName = sheetName || result.content.sheetNames[0]
  if (!targetSheetName) {
    return null
  }

  return result.content.sheets[targetSheetName] || null
}

function validateHeaders(
  sheetData: Array<Record<string, unknown>> | null,
  expectedHeaders: string[]
): boolean {
  if (!sheetData || expectedHeaders.length === 0) {
    return true
  }

  let actualHeaders: string[] = []
  if (sheetData.length > 0 && sheetData[0]) {
    actualHeaders = Object.keys(sheetData[0])
  }

  return expectedHeaders.every((header) => actualHeaders.includes(header))
}

function validateRowCount(
  sheetData: Array<Record<string, unknown>> | null,
  expectedRowCount?: number
): boolean {
  if (!sheetData || expectedRowCount === undefined) {
    return true
  }

  return sheetData.length === expectedRowCount
}

function validateCellValues(
  sheetData: Array<Record<string, unknown>> | null,
  cellValidations?: XLSXCellValidation[]
): boolean {
  if (!sheetData || !cellValidations || cellValidations.length === 0) {
    return true
  }

  for (const validation of cellValidations) {
    if (validation.row < 0 || validation.row >= sheetData.length) {
      return false
    }

    const row = sheetData[validation.row] as Record<string, unknown>
    let cellValue: unknown

    if (typeof validation.column === 'string') {
      if (!(validation.column in row)) {
        return false
      }
      cellValue = row[validation.column]
    } else {
      const columnKey = Object.keys(row)[validation.column]
      if (!columnKey) {
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
 * Validates an Excel file against expected structure and content.
 * Throws an error if the file cannot be read, but returns false for
 * content validation failures.
 *
 * @example
 * // Validate that the Excel file has required headers
 * const isValid = await validateXLSX({
 *   filePath: 'path/to/file.xlsx',
 *   expectedHeaders: ['Name', 'Email', 'Phone']
 * });
 *
 * @param options - Configuration options for validation
 * @returns true if the file passes all validations, false otherwise
 */
export async function validateXLSX(
  options: { filePath: string } & XLSXValidateOptions
): Promise<boolean> {
  const result = await readXLSX({
    filePath: options.filePath,
    ...(options.readOptions || {})
  })

  const sheetData = getSheetDataForValidation(result, options.sheetName)

  if (!sheetData) {
    return false
  }

  if (
    options.expectedHeaders &&
    !validateHeaders(sheetData, options.expectedHeaders)
  ) {
    return false
  }

  if (!validateRowCount(sheetData, options.expectedRowCount)) {
    return false
  }

  if (
    options.cellValues &&
    !validateCellValues(sheetData, options.cellValues)
  ) {
    return false
  }

  return true
}
